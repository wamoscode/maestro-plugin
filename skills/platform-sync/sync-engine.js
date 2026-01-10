/**
 * Platform Sync Engine
 *
 * Orchestrates synchronization between CDD tracks and external platforms.
 * Supports both direct API integration and MCP-based connections.
 */

const fs = require('fs');
const path = require('path');

class SyncEngine {
  constructor(config = {}) {
    this.config = {
      configPath: config.configPath || 'maestro/sync-config.json',
      statePath: config.statePath || 'maestro/sync-state.json',
      queuePath: config.queuePath || 'maestro/.sync-queue.json',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      batchSize: config.batchSize || 50,
      ...config
    };

    this.adapters = new Map();
    this.syncQueue = [];
    this.syncState = {};
    this.mcpClients = new Map();
  }

  /**
   * Register a platform adapter
   * @param {string} platform - Platform identifier
   * @param {Object} adapter - Adapter instance
   */
  registerAdapter(platform, adapter) {
    this.adapters.set(platform, adapter);
  }

  /**
   * Register an MCP client for a platform
   * @param {string} platform - Platform identifier
   * @param {Object} mcpClient - MCP client configuration
   */
  registerMCPClient(platform, mcpClient) {
    this.mcpClients.set(platform, mcpClient);
  }

  /**
   * Load sync configuration
   * @returns {Object} Configuration
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.config.configPath)) {
        return JSON.parse(fs.readFileSync(this.config.configPath, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load sync config:', error.message);
    }
    return { platforms: {}, defaults: {} };
  }

  /**
   * Save sync configuration
   * @param {Object} config - Configuration to save
   */
  saveConfig(config) {
    const dir = path.dirname(this.config.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.config.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Load sync state
   * @returns {Object} Sync state
   */
  loadState() {
    try {
      if (fs.existsSync(this.config.statePath)) {
        this.syncState = JSON.parse(fs.readFileSync(this.config.statePath, 'utf8'));
        return this.syncState;
      }
    } catch (error) {
      console.error('Failed to load sync state:', error.message);
    }
    this.syncState = {
      lastSync: {},
      entityMapping: {},
      conflicts: [],
      history: []
    };
    return this.syncState;
  }

  /**
   * Save sync state
   */
  saveState() {
    const dir = path.dirname(this.config.statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.config.statePath, JSON.stringify(this.syncState, null, 2));
  }

  /**
   * Get adapter for a platform (MCP or direct)
   * @param {string} platform - Platform identifier
   * @param {Object} platformConfig - Platform configuration
   * @returns {Object} Adapter instance
   */
  async getAdapter(platform, platformConfig) {
    // Check if MCP-based connection is configured
    if (platformConfig.mcp) {
      return this.getMCPAdapter(platform, platformConfig.mcp);
    }

    // Use direct API adapter
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }

    await adapter.initialize(platformConfig);
    return adapter;
  }

  /**
   * Get MCP-based adapter
   * @param {string} platform - Platform identifier
   * @param {Object} mcpConfig - MCP configuration
   * @returns {Object} MCP adapter wrapper
   */
  getMCPAdapter(platform, mcpConfig) {
    return new MCPAdapterWrapper(platform, mcpConfig, this);
  }

  /**
   * Sync tracks with a platform
   * @param {string} platform - Platform to sync with
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  async sync(platform, options = {}) {
    const config = this.loadConfig();
    const platformConfig = config.platforms[platform];

    if (!platformConfig || !platformConfig.enabled) {
      throw new Error(`Platform ${platform} is not configured or enabled`);
    }

    const adapter = await this.getAdapter(platform, platformConfig);
    const direction = options.direction || platformConfig.sync?.direction || 'push';
    const trackId = options.trackId;

    this.loadState();

    const result = {
      platform,
      direction,
      startedAt: new Date().toISOString(),
      completedAt: null,
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: []
    };

    try {
      // Test connection first
      const connected = await adapter.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to platform');
      }

      if (direction === 'push' || direction === 'mirror') {
        const pushResult = await this.pushToPlatform(adapter, platformConfig, trackId);
        result.pushed = pushResult.synced;
        result.errors.push(...pushResult.errors);
      }

      if (direction === 'pull' || direction === 'mirror') {
        const pullResult = await this.pullFromPlatform(adapter, platformConfig, trackId);
        result.pulled = pullResult.synced;
        result.errors.push(...pullResult.errors);
      }

      if (direction === 'mirror') {
        // Resolve any conflicts
        const conflictResult = await this.resolveConflicts(
          adapter,
          platformConfig,
          platformConfig.sync?.conflictStrategy || 'latest_wins'
        );
        result.conflicts = conflictResult.resolved;
        result.errors.push(...conflictResult.errors);
      }

      result.completedAt = new Date().toISOString();
      result.success = result.errors.length === 0;

      // Update sync state
      this.syncState.lastSync[platform] = {
        timestamp: result.completedAt,
        direction,
        result: result.success ? 'success' : 'partial'
      };

      this.syncState.history.unshift({
        platform,
        timestamp: result.completedAt,
        direction,
        pushed: result.pushed.length,
        pulled: result.pulled.length,
        conflicts: result.conflicts.length,
        errors: result.errors.length
      });

      // Keep only last 100 history entries
      this.syncState.history = this.syncState.history.slice(0, 100);

      this.saveState();

    } catch (error) {
      result.errors.push({
        type: 'sync_error',
        message: error.message,
        stack: error.stack
      });
      result.success = false;
    }

    return result;
  }

  /**
   * Push CDD tracks to external platform
   * @param {Object} adapter - Platform adapter
   * @param {Object} config - Platform configuration
   * @param {string} trackId - Optional specific track to push
   * @returns {Object} Push result
   */
  async pushToPlatform(adapter, config, trackId = null) {
    const result = { synced: [], errors: [] };
    const tracks = this.loadTracks(trackId);

    for (const track of tracks) {
      try {
        // Check if already synced
        const mappingKey = `${config.platform}:${track.id}`;
        const existingMapping = this.syncState.entityMapping[mappingKey];

        if (existingMapping) {
          // Update existing
          await adapter.updateTrack(existingMapping.externalId, track, config.mapping);
          result.synced.push({
            trackId: track.id,
            externalId: existingMapping.externalId,
            action: 'updated'
          });
        } else {
          // Create new
          const externalId = await adapter.createTrack(track, config.mapping);
          this.syncState.entityMapping[mappingKey] = {
            externalId,
            lastSynced: new Date().toISOString(),
            checksum: this.calculateChecksum(track)
          };
          result.synced.push({
            trackId: track.id,
            externalId,
            action: 'created'
          });
        }

        // Sync tasks within track
        if (config.sync?.syncTasks !== false) {
          const taskResult = await this.pushTasks(adapter, track, config);
          result.synced.push(...taskResult.synced);
          result.errors.push(...taskResult.errors);
        }

      } catch (error) {
        result.errors.push({
          trackId: track.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Push tasks for a track
   * @param {Object} adapter - Platform adapter
   * @param {Object} track - Track data
   * @param {Object} config - Platform configuration
   * @returns {Object} Task push result
   */
  async pushTasks(adapter, track, config) {
    const result = { synced: [], errors: [] };
    const tasks = this.extractTasks(track);

    for (const task of tasks) {
      try {
        const mappingKey = `${config.platform}:${track.id}:${task.id}`;
        const existingMapping = this.syncState.entityMapping[mappingKey];
        const trackMapping = this.syncState.entityMapping[`${config.platform}:${track.id}`];

        if (!trackMapping) continue;

        if (existingMapping) {
          await adapter.updateTask(existingMapping.externalId, task, config.mapping);
          result.synced.push({
            taskId: task.id,
            externalId: existingMapping.externalId,
            action: 'updated'
          });
        } else {
          const externalId = await adapter.createTask(
            trackMapping.externalId,
            task,
            config.mapping
          );
          this.syncState.entityMapping[mappingKey] = {
            externalId,
            lastSynced: new Date().toISOString()
          };
          result.synced.push({
            taskId: task.id,
            externalId,
            action: 'created'
          });
        }
      } catch (error) {
        result.errors.push({
          taskId: task.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Pull updates from external platform
   * @param {Object} adapter - Platform adapter
   * @param {Object} config - Platform configuration
   * @param {string} trackId - Optional specific track to pull
   * @returns {Object} Pull result
   */
  async pullFromPlatform(adapter, config, trackId = null) {
    const result = { synced: [], errors: [] };

    try {
      // Get external items
      const externalItems = await adapter.listItems(config.mapping);

      for (const item of externalItems) {
        try {
          // Find local mapping
          const localTrackId = this.findLocalTrackId(config.platform, item.id);

          if (localTrackId) {
            // Update existing local track
            if (!trackId || trackId === localTrackId) {
              await this.updateLocalTrack(localTrackId, item, config.mapping);
              result.synced.push({
                trackId: localTrackId,
                externalId: item.id,
                action: 'updated'
              });
            }
          } else if (config.sync?.createLocal !== false) {
            // Create new local track from external
            const newTrackId = await this.createLocalTrack(item, config);
            this.syncState.entityMapping[`${config.platform}:${newTrackId}`] = {
              externalId: item.id,
              lastSynced: new Date().toISOString()
            };
            result.synced.push({
              trackId: newTrackId,
              externalId: item.id,
              action: 'created'
            });
          }
        } catch (error) {
          result.errors.push({
            externalId: item.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      result.errors.push({
        type: 'pull_error',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Resolve sync conflicts
   * @param {Object} adapter - Platform adapter
   * @param {Object} config - Platform configuration
   * @param {string} strategy - Conflict resolution strategy
   * @returns {Object} Resolution result
   */
  async resolveConflicts(adapter, config, strategy) {
    const result = { resolved: [], errors: [] };
    const conflicts = this.detectConflicts(config.platform);

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict, strategy, adapter, config);
        result.resolved.push(resolution);

        // Remove from conflicts list
        this.syncState.conflicts = this.syncState.conflicts.filter(
          c => c.id !== conflict.id
        );
      } catch (error) {
        result.errors.push({
          conflictId: conflict.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Resolve a single conflict
   * @param {Object} conflict - Conflict data
   * @param {string} strategy - Resolution strategy
   * @param {Object} adapter - Platform adapter
   * @param {Object} config - Platform configuration
   * @returns {Object} Resolution result
   */
  async resolveConflict(conflict, strategy, adapter, config) {
    let winner;

    switch (strategy) {
      case 'cdd_wins':
        winner = 'local';
        break;
      case 'platform_wins':
        winner = 'remote';
        break;
      case 'latest_wins':
        winner = new Date(conflict.localUpdated) > new Date(conflict.remoteUpdated)
          ? 'local'
          : 'remote';
        break;
      case 'merge':
        return this.mergeConflict(conflict, adapter, config);
      default:
        throw new Error(`Unknown conflict strategy: ${strategy}`);
    }

    if (winner === 'local') {
      await adapter.updateTrack(conflict.externalId, conflict.localData, config.mapping);
    } else {
      await this.updateLocalTrack(conflict.trackId, conflict.remoteData, config.mapping);
    }

    return {
      conflictId: conflict.id,
      winner,
      trackId: conflict.trackId
    };
  }

  /**
   * Detect conflicts between local and remote
   * @param {string} platform - Platform identifier
   * @returns {Array} Conflicts
   */
  detectConflicts(platform) {
    // Implementation would compare checksums and timestamps
    return this.syncState.conflicts.filter(c => c.platform === platform);
  }

  /**
   * Load CDD tracks
   * @param {string} trackId - Optional specific track ID
   * @returns {Array} Tracks
   */
  loadTracks(trackId = null) {
    const tracks = [];
    const tracksDir = 'maestro/tracks';

    if (!fs.existsSync(tracksDir)) {
      return tracks;
    }

    const trackDirs = fs.readdirSync(tracksDir);

    for (const dir of trackDirs) {
      if (trackId && dir !== trackId) continue;

      const metadataPath = path.join(tracksDir, dir, 'metadata.json');
      const specPath = path.join(tracksDir, dir, 'spec.md');
      const planPath = path.join(tracksDir, dir, 'plan.md');

      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : null;
          const plan = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : null;

          tracks.push({
            ...metadata,
            spec,
            plan,
            _dir: dir
          });
        } catch (error) {
          console.error(`Failed to load track ${dir}:`, error.message);
        }
      }
    }

    return tracks;
  }

  /**
   * Extract tasks from track plan
   * @param {Object} track - Track data
   * @returns {Array} Tasks
   */
  extractTasks(track) {
    const tasks = [];

    if (!track.plan) return tasks;

    // Parse markdown plan for tasks
    const taskRegex = /- \[([ x~])\] \*\*Task ([\d.]+)\*\*: (.+?)(?=\n|$)/g;
    let match;

    while ((match = taskRegex.exec(track.plan)) !== null) {
      const status = match[1] === 'x' ? 'completed'
        : match[1] === '~' ? 'in_progress'
          : 'pending';

      tasks.push({
        id: match[2],
        title: match[3].trim(),
        status,
        trackId: track.id
      });
    }

    return tasks;
  }

  /**
   * Find local track ID from external ID
   * @param {string} platform - Platform identifier
   * @param {string} externalId - External ID
   * @returns {string|null} Local track ID
   */
  findLocalTrackId(platform, externalId) {
    for (const [key, mapping] of Object.entries(this.syncState.entityMapping)) {
      if (key.startsWith(`${platform}:`) && mapping.externalId === externalId) {
        return key.replace(`${platform}:`, '').split(':')[0];
      }
    }
    return null;
  }

  /**
   * Update local track from external data
   * @param {string} trackId - Track ID
   * @param {Object} externalData - External data
   * @param {Object} mapping - Field mapping
   */
  async updateLocalTrack(trackId, externalData, mapping) {
    const metadataPath = `maestro/tracks/${trackId}/metadata.json`;

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // Apply reverse mapping
    if (mapping.statusMapping) {
      const reverseStatus = Object.entries(mapping.statusMapping)
        .find(([, v]) => v === externalData.status);
      if (reverseStatus) {
        metadata.status = reverseStatus[0];
      }
    }

    if (mapping.priorityMapping) {
      const reversePriority = Object.entries(mapping.priorityMapping)
        .find(([, v]) => v === externalData.priority);
      if (reversePriority) {
        metadata.priority = reversePriority[0];
      }
    }

    metadata.updated = new Date().toISOString();
    metadata.externalSync = {
      lastPulled: new Date().toISOString(),
      externalId: externalData.id
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Create local track from external data
   * @param {Object} externalData - External data
   * @param {Object} config - Platform configuration
   * @returns {string} New track ID
   */
  async createLocalTrack(externalData, config) {
    const trackId = this.generateTrackId();
    const trackDir = `maestro/tracks/${trackId}`;

    fs.mkdirSync(trackDir, { recursive: true });

    const metadata = {
      id: trackId,
      title: externalData.name || externalData.title,
      type: 'feature',
      priority: 'medium',
      status: 'pending',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      externalSync: {
        platform: config.platform,
        externalId: externalData.id,
        importedAt: new Date().toISOString()
      }
    };

    fs.writeFileSync(
      path.join(trackDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create basic spec
    const spec = `# Specification: ${metadata.title}

**Track ID**: ${trackId}
**Type**: ${metadata.type}
**Priority**: ${metadata.priority}
**Imported From**: ${config.platform}

---

## Overview

${externalData.description || 'Imported from external platform.'}

## Requirements

- [ ] Define requirements

## Acceptance Criteria

- [ ] Define acceptance criteria
`;

    fs.writeFileSync(path.join(trackDir, 'spec.md'), spec);

    return trackId;
  }

  /**
   * Generate new track ID
   * @returns {string} Track ID
   */
  generateTrackId() {
    const tracks = this.loadTracks();
    const maxNum = tracks.reduce((max, t) => {
      const match = t.id.match(/TRACK-(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    return `TRACK-${String(maxNum + 1).padStart(3, '0')}`;
  }

  /**
   * Calculate checksum for change detection
   * @param {Object} data - Data to checksum
   * @returns {string} Checksum
   */
  calculateChecksum(data) {
    const str = JSON.stringify({
      title: data.title,
      status: data.status,
      priority: data.priority,
      updated: data.updated
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Get sync status for all platforms
   * @returns {Object} Sync status
   */
  getStatus() {
    this.loadState();
    const config = this.loadConfig();

    const status = {
      platforms: {},
      lastSync: this.syncState.lastSync,
      pendingConflicts: this.syncState.conflicts.length,
      recentHistory: this.syncState.history.slice(0, 10)
    };

    for (const [platform, platformConfig] of Object.entries(config.platforms || {})) {
      status.platforms[platform] = {
        enabled: platformConfig.enabled,
        connectionType: platformConfig.mcp ? 'mcp' : 'direct',
        direction: platformConfig.sync?.direction || 'push',
        lastSync: this.syncState.lastSync[platform] || null,
        mappedEntities: Object.keys(this.syncState.entityMapping)
          .filter(k => k.startsWith(`${platform}:`)).length
      };
    }

    return status;
  }
}

/**
 * MCP Adapter Wrapper
 *
 * Wraps MCP client calls to provide the same interface as direct adapters.
 */
class MCPAdapterWrapper {
  constructor(platform, mcpConfig, engine) {
    this.platform = platform;
    this.mcpConfig = mcpConfig;
    this.engine = engine;
    this.serverName = mcpConfig.server;
    this.toolPrefix = mcpConfig.toolPrefix || platform;
  }

  async initialize() {
    // MCP client initialization would happen here
    // In practice, this would connect to the MCP server
    return true;
  }

  async testConnection() {
    // Would call MCP tool to test connection
    return this.callMCPTool('test_connection', {});
  }

  async createTrack(track, mapping) {
    const mappedData = this.mapTrackToExternal(track, mapping);
    const result = await this.callMCPTool('create_item', mappedData);
    return result.id;
  }

  async updateTrack(externalId, track, mapping) {
    const mappedData = this.mapTrackToExternal(track, mapping);
    return this.callMCPTool('update_item', { id: externalId, ...mappedData });
  }

  async createTask(parentId, task, mapping) {
    const mappedData = this.mapTaskToExternal(task, mapping);
    const result = await this.callMCPTool('create_subtask', {
      parentId,
      ...mappedData
    });
    return result.id;
  }

  async updateTask(externalId, task, mapping) {
    const mappedData = this.mapTaskToExternal(task, mapping);
    return this.callMCPTool('update_subtask', { id: externalId, ...mappedData });
  }

  async listItems(mapping) {
    const result = await this.callMCPTool('list_items', {
      workspace: mapping.workspaceId,
      project: mapping.projectId
    });
    return result.items || [];
  }

  /**
   * Call MCP tool via configured server
   * @param {string} tool - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Object} Tool result
   */
  async callMCPTool(tool, args) {
    // This would integrate with Claude Code's MCP infrastructure
    // The actual implementation depends on how MCP clients are exposed

    // For now, return a structure that indicates MCP should be used
    return {
      _mcp: true,
      server: this.serverName,
      tool: `${this.toolPrefix}_${tool}`,
      arguments: args
    };
  }

  mapTrackToExternal(track, mapping) {
    return {
      name: track.title,
      description: track.spec?.substring(0, 500) || '',
      status: mapping.statusMapping?.[track.status] || track.status,
      priority: mapping.priorityMapping?.[track.priority] || 3,
      tags: [
        `cdd:${track.id}`,
        `type:${track.type}`,
        ...(track.tags || [])
      ]
    };
  }

  mapTaskToExternal(task, mapping) {
    return {
      name: task.title,
      status: mapping.statusMapping?.[task.status] || task.status,
      tags: [`cdd:task:${task.id}`]
    };
  }
}

module.exports = { SyncEngine, MCPAdapterWrapper };
