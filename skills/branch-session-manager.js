/**
 * Branch Session Manager Skill
 *
 * Manages multi-branch parallel session support with proper isolation,
 * locking, and state management for CDD (Context-Driven Development).
 *
 * Key Features:
 * - Session ID generation and tracking
 * - Branch-specific lock file management
 * - Stale session detection and cleanup
 * - Git branch detection (gitignore-aware)
 * - Session registry management
 * - Heartbeat mechanism for active sessions
 */

const crypto = require('crypto');
const os = require('os');
const path = require('path');

class BranchSessionManager {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      staleLockThreshold: config.staleLockThreshold || 300000, // 5 minutes
      lockRetryAttempts: config.lockRetryAttempts || 3,
      lockRetryDelay: config.lockRetryDelay || 1000, // 1 second
      ...config
    };

    this.sessionId = null;
    this.currentBranch = null;
    this.heartbeatTimer = null;
    this.isGitignoreAware = false;
  }

  /**
   * Generate a unique session ID
   * @returns {string} UUID-based session identifier
   */
  generateSessionId() {
    const uuid = crypto.randomUUID();
    const timestamp = Date.now().toString(36);
    return `session-${timestamp}-${uuid.slice(0, 8)}`;
  }

  /**
   * Get the current git branch name
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {
    // This would be executed via shell command: git branch --show-current
    // In the plugin context, this is handled by the command executor
    // Returns the branch name or 'HEAD' for detached state
    return {
      command: 'git branch --show-current',
      fallback: 'git rev-parse --abbrev-ref HEAD'
    };
  }

  /**
   * Check if maestro/ directory is gitignored
   * @returns {Promise<boolean>} True if gitignored
   */
  async isGitignored() {
    // Check if maestro/ is in .gitignore
    // Command: git check-ignore -q maestro/
    return {
      command: 'git check-ignore -q maestro/',
      interpretation: 'exit_code_0_means_ignored'
    };
  }

  /**
   * Get the path to branch-specific context directory
   * @param {string} branch - Branch name
   * @returns {string} Path to branch context
   */
  getBranchContextPath(branch) {
    const sanitizedBranch = this.sanitizeBranchName(branch);
    return path.join(this.config.maestroDir, 'branches', sanitizedBranch);
  }

  /**
   * Sanitize branch name for use in file paths
   * @param {string} branch - Raw branch name
   * @returns {string} Sanitized branch name
   */
  sanitizeBranchName(branch) {
    // Replace slashes with double dashes, remove special chars
    return branch
      .replace(/\//g, '--')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
  }

  /**
   * Get lock file path for a branch
   * @param {string} branch - Branch name
   * @returns {string} Path to lock file
   */
  getLockFilePath(branch) {
    return path.join(this.getBranchContextPath(branch), 'active-session.lock');
  }

  /**
   * Get session registry path
   * @returns {string} Path to session registry
   */
  getRegistryPath() {
    return path.join(this.config.maestroDir, 'sessions', 'registry.json');
  }

  /**
   * Create lock file content
   * @param {string} sessionId - Session identifier
   * @returns {Object} Lock file data
   */
  createLockData(sessionId) {
    return {
      sessionId: sessionId,
      pid: process.pid,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      user: os.userInfo().username,
      host: os.hostname(),
      terminal: process.env.TERM_PROGRAM || process.env.TERMINAL || 'unknown',
      cwd: process.cwd()
    };
  }

  /**
   * Attempt to acquire lock for a branch
   * @param {string} branch - Branch name
   * @returns {Object} Lock acquisition result
   */
  acquireLock(branch) {
    const lockPath = this.getLockFilePath(branch);
    const sessionId = this.generateSessionId();
    const lockData = this.createLockData(sessionId);

    return {
      action: 'acquire_lock',
      branch: branch,
      lockPath: lockPath,
      lockData: lockData,
      steps: [
        {
          step: 1,
          description: 'Check if lock file exists',
          command: `test -f "${lockPath}"`,
          on_exists: 'check_staleness'
        },
        {
          step: 2,
          description: 'If lock exists, check staleness',
          action: 'read_and_validate_lock',
          staleness_threshold_ms: this.config.staleLockThreshold
        },
        {
          step: 3,
          description: 'If stale or no lock, create directory and write lock',
          commands: [
            `mkdir -p "$(dirname "${lockPath}")"`,
            `echo '${JSON.stringify(lockData, null, 2)}' > "${lockPath}"`
          ]
        }
      ],
      success_response: {
        acquired: true,
        sessionId: sessionId,
        message: `Session started on branch '${branch}'`
      },
      blocked_response_template: {
        acquired: false,
        blockedBy: '{{existing_lock_data}}',
        message: `Branch '${branch}' is locked by another session`,
        options: [
          'Switch to a different branch: /maestro:branch switch <other-branch>',
          'View session details: /maestro:session info {{session_id}}',
          'Release stale lock: /maestro:session release ${branch} --force'
        ]
      }
    };
  }

  /**
   * Check if a lock is stale
   * @param {Object} lockData - Lock file data
   * @returns {Object} Staleness check result
   */
  checkLockStaleness(lockData) {
    const lastHeartbeat = new Date(lockData.lastHeartbeat).getTime();
    const now = Date.now();
    const age = now - lastHeartbeat;
    const isStale = age > this.config.staleLockThreshold;

    return {
      isStale: isStale,
      age: age,
      threshold: this.config.staleLockThreshold,
      lastHeartbeat: lockData.lastHeartbeat,
      message: isStale
        ? `Lock is stale (no heartbeat for ${Math.round(age / 60000)} minutes)`
        : `Lock is active (last heartbeat ${Math.round(age / 1000)} seconds ago)`
    };
  }

  /**
   * Update heartbeat for current session
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier
   * @returns {Object} Heartbeat update action
   */
  updateHeartbeat(branch, sessionId) {
    const lockPath = this.getLockFilePath(branch);

    return {
      action: 'update_heartbeat',
      branch: branch,
      lockPath: lockPath,
      updates: {
        lastHeartbeat: new Date().toISOString()
      },
      command_template: `
        if [ -f "${lockPath}" ]; then
          jq '.lastHeartbeat = "{{timestamp}}"' "${lockPath}" > "${lockPath}.tmp" && mv "${lockPath}.tmp" "${lockPath}"
        fi
      `
    };
  }

  /**
   * Release lock for a branch
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier (optional, for validation)
   * @param {boolean} force - Force release even if not owner
   * @returns {Object} Lock release action
   */
  releaseLock(branch, sessionId = null, force = false) {
    const lockPath = this.getLockFilePath(branch);

    return {
      action: 'release_lock',
      branch: branch,
      lockPath: lockPath,
      sessionId: sessionId,
      force: force,
      steps: [
        {
          step: 1,
          description: 'Read current lock',
          command: `cat "${lockPath}" 2>/dev/null`
        },
        {
          step: 2,
          description: 'Validate ownership (unless force)',
          condition: !force ? 'lock.sessionId === sessionId' : 'always'
        },
        {
          step: 3,
          description: 'Remove lock file',
          command: `rm -f "${lockPath}"`
        },
        {
          step: 4,
          description: 'Update session registry',
          action: 'remove_from_registry'
        }
      ],
      success_response: {
        released: true,
        message: `Lock released for branch '${branch}'`
      },
      error_responses: {
        not_owner: {
          released: false,
          message: 'Cannot release lock: not the owner. Use --force to override.'
        },
        no_lock: {
          released: true,
          message: `No lock exists for branch '${branch}'`
        }
      }
    };
  }

  /**
   * Initialize a new session
   * @param {string} branch - Branch name
   * @returns {Object} Session initialization data
   */
  initializeSession(branch) {
    const sessionId = this.generateSessionId();
    const branchContextPath = this.getBranchContextPath(branch);

    return {
      action: 'initialize_session',
      sessionId: sessionId,
      branch: branch,
      paths: {
        branchContext: branchContextPath,
        tracks: path.join(branchContextPath, 'tracks'),
        context: path.join(branchContextPath, 'context.json'),
        lock: this.getLockFilePath(branch)
      },
      directories_to_create: [
        branchContextPath,
        path.join(branchContextPath, 'tracks'),
        path.join(this.config.maestroDir, 'sessions'),
        path.join(this.config.maestroDir, 'notifications', 'pending'),
        path.join(this.config.maestroDir, 'notifications', 'archive')
      ],
      initial_context: {
        branch: branch,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        tracks: [],
        activeTrack: null,
        sessionHistory: []
      },
      registry_entry: {
        sessionId: sessionId,
        branch: branch,
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        activeTrack: null,
        status: 'active'
      }
    };
  }

  /**
   * Get session registry data structure
   * @returns {Object} Empty registry template
   */
  getRegistryTemplate() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      sessions: {}
    };
  }

  /**
   * Update session registry
   * @param {string} sessionId - Session identifier
   * @param {Object} data - Session data to update
   * @returns {Object} Registry update action
   */
  updateRegistry(sessionId, data) {
    const registryPath = this.getRegistryPath();

    return {
      action: 'update_registry',
      registryPath: registryPath,
      sessionId: sessionId,
      data: data,
      steps: [
        {
          step: 1,
          description: 'Ensure sessions directory exists',
          command: `mkdir -p "$(dirname "${registryPath}")"`
        },
        {
          step: 2,
          description: 'Read or create registry',
          command: `cat "${registryPath}" 2>/dev/null || echo '${JSON.stringify(this.getRegistryTemplate())}'`
        },
        {
          step: 3,
          description: 'Update session entry',
          jq_command: `.sessions["${sessionId}"] = ${JSON.stringify(data)} | .lastUpdated = "${new Date().toISOString()}"`
        },
        {
          step: 4,
          description: 'Write updated registry',
          command_template: `echo '{{updated_json}}' > "${registryPath}"`
        }
      ]
    };
  }

  /**
   * Remove session from registry
   * @param {string} sessionId - Session identifier
   * @returns {Object} Registry removal action
   */
  removeFromRegistry(sessionId) {
    const registryPath = this.getRegistryPath();

    return {
      action: 'remove_from_registry',
      registryPath: registryPath,
      sessionId: sessionId,
      jq_command: `del(.sessions["${sessionId}"]) | .lastUpdated = "${new Date().toISOString()}"`
    };
  }

  /**
   * List all active sessions
   * @returns {Object} Session list action
   */
  listSessions() {
    const registryPath = this.getRegistryPath();

    return {
      action: 'list_sessions',
      registryPath: registryPath,
      steps: [
        {
          step: 1,
          description: 'Read registry',
          command: `cat "${registryPath}" 2>/dev/null || echo '{"sessions":{}}'`
        },
        {
          step: 2,
          description: 'Parse and format sessions',
          format: 'table',
          columns: ['Session ID', 'Branch', 'Active Track', 'Last Activity', 'Status']
        }
      ],
      output_template: `
┌─────────────────────────────────────────────────────────────┐
│                   ACTIVE SESSIONS                            │
├─────────────────────────────────────────────────────────────┤
│ Session     │ Branch       │ Track      │ Last Activity     │
│─────────────│──────────────│────────────│───────────────────│
{{#each sessions}}
│ {{sessionId}} │ {{branch}} │ {{activeTrack}} │ {{lastActivity}} │
{{/each}}
└─────────────────────────────────────────────────────────────┘
`
    };
  }

  /**
   * Cleanup stale sessions
   * @returns {Object} Cleanup action
   */
  cleanupStaleSessions() {
    return {
      action: 'cleanup_stale_sessions',
      threshold: this.config.staleLockThreshold,
      steps: [
        {
          step: 1,
          description: 'Read all lock files',
          glob_pattern: `${this.config.maestroDir}/branches/*/active-session.lock`
        },
        {
          step: 2,
          description: 'Check each lock for staleness',
          for_each: 'lock_file',
          action: 'check_staleness'
        },
        {
          step: 3,
          description: 'Remove stale locks and update registry',
          for_each: 'stale_lock',
          actions: ['remove_lock', 'remove_from_registry']
        }
      ],
      output_template: `
Cleanup completed:
- Checked: {{total}} sessions
- Removed: {{removed}} stale sessions
- Active: {{active}} sessions remain
`
    };
  }

  /**
   * Get detailed session info
   * @param {string} sessionIdOrBranch - Session ID or branch name
   * @returns {Object} Session info action
   */
  getSessionInfo(sessionIdOrBranch) {
    return {
      action: 'get_session_info',
      identifier: sessionIdOrBranch,
      steps: [
        {
          step: 1,
          description: 'Determine if identifier is session ID or branch',
          check: sessionIdOrBranch.startsWith('session-') ? 'session_id' : 'branch'
        },
        {
          step: 2,
          description: 'Read session data',
          from_registry: sessionIdOrBranch.startsWith('session-'),
          from_lock: !sessionIdOrBranch.startsWith('session-')
        }
      ],
      output_template: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SESSION INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session ID:    {{sessionId}}
Branch:        {{branch}}
Status:        {{status}}
Started:       {{startedAt}}
Last Activity: {{lastActivity}}
Active Track:  {{activeTrack || 'None'}}

Host Info:
  User:     {{user}}
  Host:     {{host}}
  Terminal: {{terminal}}
  PID:      {{pid}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    };
  }

  /**
   * Check for branch context existence
   * @param {string} branch - Branch name
   * @returns {Object} Branch context check action
   */
  checkBranchContext(branch) {
    const branchPath = this.getBranchContextPath(branch);

    return {
      action: 'check_branch_context',
      branch: branch,
      branchPath: branchPath,
      checks: [
        {
          file: path.join(branchPath, 'context.json'),
          required: false,
          description: 'Branch context state'
        },
        {
          directory: path.join(branchPath, 'tracks'),
          required: false,
          description: 'Branch tracks directory'
        },
        {
          file: this.getLockFilePath(branch),
          required: false,
          description: 'Active session lock'
        }
      ]
    };
  }

  /**
   * Get warning message for locked branch
   * @param {Object} lockData - Existing lock data
   * @param {string} branch - Branch name
   * @returns {string} Formatted warning message
   */
  getLockedBranchWarning(lockData, branch) {
    const age = Date.now() - new Date(lockData.startedAt).getTime();
    const ageMinutes = Math.round(age / 60000);
    const lastActivityAge = Date.now() - new Date(lockData.lastHeartbeat).getTime();
    const lastActivityMinutes = Math.round(lastActivityAge / 60000);

    return `
⚠️  Branch '${branch}' is locked by another session

   Session ID: ${lockData.sessionId}
   Started: ${ageMinutes} minutes ago
   Last Activity: ${lastActivityMinutes} minutes ago
   User: ${lockData.user}@${lockData.host}
   Terminal: ${lockData.terminal}

   Options:
   1. Switch to a different branch: /maestro:branch switch <other-branch>
   2. View session details: /maestro:session info ${lockData.sessionId}
   3. Release stale lock: /maestro:session release ${branch} --force
`;
  }

  /**
   * Get list of branches with CDD context
   * @returns {Object} Branch list action
   */
  listBranchesWithContext() {
    return {
      action: 'list_branches_with_context',
      glob_pattern: `${this.config.maestroDir}/branches/*/context.json`,
      steps: [
        {
          step: 1,
          description: 'Find all branch context files',
          command: `find ${this.config.maestroDir}/branches -name "context.json" -type f 2>/dev/null`
        },
        {
          step: 2,
          description: 'Extract branch names from paths',
          parse: 'directory_name'
        },
        {
          step: 3,
          description: 'Check lock status for each branch',
          for_each: 'branch',
          action: 'check_lock_exists'
        },
        {
          step: 4,
          description: 'Get current git branch',
          command: 'git branch --show-current'
        }
      ],
      output_template: `
┌─────────────────────────────────────────────────────────────┐
│                  BRANCHES WITH CDD CONTEXT                   │
├─────────────────────────────────────────────────────────────┤
│ Branch           │ Has Context │ Active Session │ Tracks    │
│──────────────────│─────────────│────────────────│───────────│
{{#each branches}}
│ {{name}} {{#if current}}*{{/if}} │ {{hasContext}} │ {{sessionStatus}} │ {{trackCount}} │
{{/each}}
└─────────────────────────────────────────────────────────────┘

* = current branch
`
    };
  }

  /**
   * Migrate legacy context to branch-aware structure
   * @param {string} targetBranch - Branch to migrate context to
   * @returns {Object} Migration action
   */
  migrateLegacyContext(targetBranch) {
    const branchPath = this.getBranchContextPath(targetBranch);

    return {
      action: 'migrate_legacy_context',
      targetBranch: targetBranch,
      targetPath: branchPath,
      steps: [
        {
          step: 1,
          description: 'Check for legacy tracks directory',
          check: `${this.config.maestroDir}/tracks`
        },
        {
          step: 2,
          description: 'Create branch context directory',
          command: `mkdir -p "${branchPath}/tracks"`
        },
        {
          step: 3,
          description: 'Move tracks to branch context (if no branch-specific tracks exist)',
          condition: 'no_existing_branch_tracks',
          command: `cp -r "${this.config.maestroDir}/tracks/"* "${branchPath}/tracks/" 2>/dev/null || true`
        },
        {
          step: 4,
          description: 'Create migration marker',
          file: `${this.config.maestroDir}/.gitignore-aware`,
          content: JSON.stringify({
            migratedAt: new Date().toISOString(),
            fromLegacy: true,
            initialBranch: targetBranch
          }, null, 2)
        }
      ],
      output_template: `
Migration completed:
- Created branch context: ${branchPath}
- Migrated tracks: {{trackCount}} tracks
- Legacy tracks preserved at: ${this.config.maestroDir}/tracks/

Note: The legacy tracks directory is preserved. You can remove it
after verifying the migration was successful.
`
    };
  }

  /**
   * Start heartbeat timer for session
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier
   * @returns {Object} Heartbeat start action
   */
  startHeartbeat(branch, sessionId) {
    return {
      action: 'start_heartbeat',
      branch: branch,
      sessionId: sessionId,
      interval: this.config.heartbeatInterval,
      description: `Start heartbeat every ${this.config.heartbeatInterval / 1000} seconds`,
      onTick: this.updateHeartbeat(branch, sessionId)
    };
  }

  /**
   * Stop heartbeat timer
   * @returns {Object} Heartbeat stop action
   */
  stopHeartbeat() {
    return {
      action: 'stop_heartbeat',
      description: 'Stop heartbeat timer and release lock'
    };
  }
}

module.exports = BranchSessionManager;
