#!/usr/bin/env node

/**
 * Maestro MCP Server
 *
 * Provides MCP (Model Context Protocol) interface for the Maestro plugin.
 * Enables advanced orchestration capabilities through standardized protocol.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import plugin components
const { MaestroHooks, AgentRouter } = require('../hooks');
const TaskAnalyzer = require('../skills/task-analyzer');
const ResultAggregator = require('../skills/result-aggregator');

// Import sync components
let SyncEngine;
try {
  SyncEngine = require('../skills/platform-sync/sync-engine');
} catch (e) {
  // Sync engine not available
  SyncEngine = null;
}

// Import CDD Activator
let CDDActivator;
try {
  CDDActivator = require('../skills/cdd-activator');
} catch (e) {
  // CDD Activator not available
  CDDActivator = null;
}

class MaestroMCPServer {
  constructor() {
    this.config = this.loadConfig();

    // Initialize unified hooks manager (includes learning system)
    this.hooks = new MaestroHooks({
      enableLearning: true,
      maestroDir: 'maestro',
      logDir: '.maestro/logs',
      metricsDir: '.maestro/metrics'
    });

    // Use router from hooks for consistency
    this.router = this.hooks.agentRouter;
    this.analyzer = new TaskAnalyzer();
    this.aggregator = new ResultAggregator();

    this.executions = new Map();
    this.workflows = new Map();

    // Initialize sync engine if available
    this.syncEngine = null;
    this.initializeSyncEngine();

    // Initialize CDD activator if available
    this.cddActivator = null;
    if (CDDActivator) {
      this.cddActivator = new CDDActivator({
        maestroDir: 'maestro',
        enableLearning: true
      });
    }
  }

  /**
   * Initialize the sync engine
   */
  async initializeSyncEngine() {
    if (!SyncEngine) {
      return;
    }

    try {
      const projectRoot = process.cwd();
      this.syncEngine = new SyncEngine(projectRoot);

      // Try to load sync config
      const syncConfigPath = path.join(projectRoot, '.cdd', 'sync-config.json');
      if (fs.existsSync(syncConfigPath)) {
        const syncConfig = JSON.parse(fs.readFileSync(syncConfigPath, 'utf8'));
        await this.syncEngine.initialize(syncConfig);
      }
    } catch (error) {
      console.error('Failed to initialize sync engine:', error.message);
    }
  }

  /**
   * Load server configuration
   */
  loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load config:', error.message);
      return { settings: {} };
    }
  }

  /**
   * Start the MCP server
   */
  start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        this.sendResponse(response);
      } catch (error) {
        this.sendError(error);
      }
    });

    rl.on('close', () => {
      process.exit(0);
    });

    // Send initialization message
    this.sendResponse({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.config.capabilities,
        serverInfo: {
          name: this.config.name,
          version: this.config.version
        }
      }
    });
  }

  /**
   * Handle incoming MCP requests
   */
  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case 'initialize':
          result = this.handleInitialize(params);
          break;

        case 'tools/list':
          result = this.handleListTools();
          break;

        case 'tools/call':
          result = await this.handleToolCall(params);
          break;

        case 'resources/list':
          result = this.handleListResources();
          break;

        case 'resources/read':
          result = await this.handleReadResource(params);
          break;

        case 'prompts/list':
          result = this.handleListPrompts();
          break;

        case 'prompts/get':
          result = await this.handleGetPrompt(params);
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result
      };

    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  /**
   * Handle initialize request
   */
  handleInitialize(params) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: this.config.capabilities,
      serverInfo: {
        name: this.config.name,
        version: this.config.version
      }
    };
  }

  /**
   * Handle tools/list request
   */
  handleListTools() {
    return {
      tools: this.config.tools
    };
  }

  /**
   * Handle tools/call request
   */
  async handleToolCall(params) {
    const { name, arguments: args } = params;

    switch (name) {
      case 'list_agents':
        return this.toolListAgents(args);

      case 'get_agent_info':
        return this.toolGetAgentInfo(args);

      case 'analyze_task':
        return this.toolAnalyzeTask(args);

      case 'execute_workflow':
        return await this.toolExecuteWorkflow(args);

      case 'get_execution_status':
        return this.toolGetExecutionStatus(args);

      case 'complete_execution':
        return await this.toolCompleteExecution(args);

      case 'get_metrics':
        return this.toolGetMetrics(args);

      case 'sync_status':
        return await this.toolSyncStatus(args);

      case 'sync_push':
        return await this.toolSyncPush(args);

      case 'sync_pull':
        return await this.toolSyncPull(args);

      case 'sync_link':
        return await this.toolSyncLink(args);

      case 'sync_test':
        return await this.toolSyncTest(args);

      case 'sync_config':
        return await this.toolSyncConfig(args);

      // CDD activation tool
      case 'cdd_activate':
        return this.toolCDDActivate(args);

      // Learning system tools
      case 'learning_init':
        return this.toolLearningInit(args);

      case 'learning_finalize':
        return this.toolLearningFinalize(args);

      case 'learning_status':
        return this.toolLearningStatus(args);

      case 'learning_capture':
        return this.toolLearningCapture(args);

      case 'learning_get_knowledge':
        return this.toolLearningGetKnowledge(args);

      case 'learning_phase_complete':
        return this.toolLearningPhaseComplete(args);

      case 'health_check':
        return this.toolHealthCheck(args);

      case 'kb_backup':
        return await this.toolKbBackup(args);

      case 'kb_restore':
        return await this.toolKbRestore(args);

      case 'generate_diagram':
        return this.toolGenerateDiagram(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Tool: List agents
   */
  toolListAgents(args) {
    let agents = this.router.getAllAgents();

    if (args.category) {
      agents = agents.filter(a =>
        a.categoryId.includes(args.category) ||
        a.category.toLowerCase().includes(args.category.toLowerCase())
      );
    }

    if (args.search) {
      agents = this.router.searchAgents(args.search);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: agents.length,
          agents: agents.map(a => ({
            id: a.id,
            category: a.category,
            tools: a.tools
          }))
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Get agent info
   */
  toolGetAgentInfo(args) {
    const agent = this.router.getAgentInfo(args.agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${args.agentId}`);
    }

    // Try to load full agent definition
    const agentPath = path.join(__dirname, '../subagents', agent.file);
    let fullDefinition = null;

    if (fs.existsSync(agentPath)) {
      fullDefinition = fs.readFileSync(agentPath, 'utf8');
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...agent,
          definition: fullDefinition ? 'Available' : 'Not found'
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Analyze task
   */
  toolAnalyzeTask(args) {
    const analysis = this.analyzer.analyze(args.task);
    const routing = this.router.route(args.task);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          analysis,
          routing,
          suggestedAgents: routing.agents.map(a => ({
            agent: a.agent,
            confidence: (a.score * 100).toFixed(1) + '%'
          }))
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Execute workflow
   */
  async toolExecuteWorkflow(args) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Parse workflow
    let workflow;
    try {
      workflow = typeof args.workflow === 'string'
        ? JSON.parse(args.workflow)
        : args.workflow;
    } catch (e) {
      // Try YAML parsing if available
      workflow = { steps: [{ task: args.workflow }] };
    }

    // Create execution context
    const context = {
      executionId,
      workflow,
      variables: args.variables || {},
      task: workflow.task || workflow.steps?.[0]?.task || 'workflow execution',
      trackId: args.trackId,
      taskId: args.taskId
    };

    // Execute pre-execution hook (injects knowledge if learning is active)
    let preResult = { success: true };
    try {
      preResult = await this.hooks.beforeExecution(context);
      if (preResult.knowledgeInjection) {
        context.injectedKnowledge = preResult.knowledgeInjection;
      }
    } catch (error) {
      console.error('Pre-execution hook error:', error.message);
    }

    // Store execution
    this.executions.set(executionId, {
      id: executionId,
      workflow,
      variables: args.variables || {},
      status: 'pending',
      startTime: Date.now(),
      steps: [],
      preExecutionResult: preResult,
      injectedKnowledge: context.injectedKnowledge
    });

    // Note: Actual execution would be async and involve sub-agent invocation
    // The post-execution hook should be called when execution completes

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          executionId,
          status: 'created',
          message: 'Workflow execution queued',
          workflow,
          learningActive: this.hooks.isLearningActive(),
          knowledgeInjected: !!context.injectedKnowledge
        }, null, 2)
      }]
    };
  }

  /**
   * Complete workflow execution and run post-execution hooks
   */
  async completeWorkflowExecution(executionId, results) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Create context with results
    const context = {
      executionId,
      workflow: execution.workflow,
      variables: execution.variables,
      results,
      success: results.success !== false,
      duration: Date.now() - execution.startTime
    };

    // Execute post-execution hook (captures decisions if learning is active)
    let postResult = { success: true };
    try {
      postResult = await this.hooks.afterExecution(context);
    } catch (error) {
      console.error('Post-execution hook error:', error.message);
    }

    // Update execution record
    execution.status = results.success !== false ? 'completed' : 'failed';
    execution.endTime = Date.now();
    execution.results = results;
    execution.postExecutionResult = postResult;

    return {
      executionId,
      status: execution.status,
      duration: context.duration,
      learningCaptured: postResult.decisionsCaptures || 0
    };
  }

  /**
   * Tool: Get execution status
   */
  toolGetExecutionStatus(args) {
    const execution = this.executions.get(args.executionId);

    if (!execution) {
      // Try to load from disk
      const logPath = path.join(__dirname, '../.maestro/logs', `${args.executionId}.json`);
      if (fs.existsSync(logPath)) {
        const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(log, null, 2)
          }]
        };
      }

      throw new Error(`Execution not found: ${args.executionId}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(execution, null, 2)
      }]
    };
  }

  /**
   * Tool: Complete execution and run post-hooks
   */
  async toolCompleteExecution(args) {
    const { executionId, results } = args;

    if (!executionId) {
      throw new Error('Execution ID is required');
    }

    const completionResult = await this.completeWorkflowExecution(
      executionId,
      results || { success: true }
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'complete_execution',
          ...completionResult
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Get metrics
   */
  toolGetMetrics(args) {
    const metricsDir = path.join(__dirname, '../.maestro/metrics');
    const metrics = {};

    if (fs.existsSync(metricsDir)) {
      const files = fs.readdirSync(metricsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const agentId = file.replace('.json', '');
          if (!args.agentId || agentId === args.agentId) {
            try {
              metrics[agentId] = JSON.parse(
                fs.readFileSync(path.join(metricsDir, file), 'utf8')
              );
            } catch (e) {
              // Skip invalid files
            }
          }
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          timeRange: args.timeRange || 'all',
          metrics
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Get sync status
   */
  async toolSyncStatus(args) {
    if (!this.syncEngine) {
      return this.syncNotAvailable();
    }

    try {
      const status = await this.syncEngine.getSyncStatus();

      if (args.platform) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              platform: args.platform,
              status: status.platforms[args.platform] || { enabled: false }
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }

  /**
   * Tool: Push to external platforms
   */
  async toolSyncPush(args) {
    if (!this.syncEngine) {
      return this.syncNotAvailable();
    }

    try {
      const { platform, trackId, force, dryRun } = args;
      const results = [];

      const platforms = platform
        ? [platform]
        : this.syncEngine.getEnabledPlatforms();

      for (const plat of platforms) {
        if (trackId) {
          const result = await this.syncEngine.pushTrack(plat, trackId, { force, dryRun });
          results.push({ platform: plat, trackId, ...result });
        } else {
          const tracks = await this.syncEngine.getAllTracks();
          for (const track of tracks) {
            const result = await this.syncEngine.pushTrack(plat, track.id, { force, dryRun });
            results.push({ platform: plat, trackId: track.id, ...result });
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'push',
            dryRun: dryRun || false,
            results
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Sync push failed: ${error.message}`);
    }
  }

  /**
   * Tool: Pull from external platforms
   */
  async toolSyncPull(args) {
    if (!this.syncEngine) {
      return this.syncNotAvailable();
    }

    try {
      const { platform, force, dryRun } = args;
      const results = [];

      const platforms = platform
        ? [platform]
        : this.syncEngine.getEnabledPlatforms();

      for (const plat of platforms) {
        const items = await this.syncEngine.pullItems(plat);

        for (const item of items) {
          if (!dryRun) {
            const result = await this.syncEngine.importItem(plat, item, { force });
            results.push({ platform: plat, externalId: item.id, ...result });
          } else {
            results.push({
              platform: plat,
              externalId: item.id,
              name: item.name,
              action: 'would_import'
            });
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'pull',
            dryRun: dryRun || false,
            results
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Sync pull failed: ${error.message}`);
    }
  }

  /**
   * Tool: Link track to external item
   */
  async toolSyncLink(args) {
    if (!this.syncEngine) {
      return this.syncNotAvailable();
    }

    try {
      const { trackId, platform, externalId } = args;

      await this.syncEngine.linkTrack(trackId, platform, externalId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            trackId,
            platform,
            externalId,
            message: `Track ${trackId} linked to ${platform}:${externalId}`
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to link track: ${error.message}`);
    }
  }

  /**
   * Tool: Test platform connections
   */
  async toolSyncTest(args) {
    if (!this.syncEngine) {
      return this.syncNotAvailable();
    }

    try {
      const results = [];
      const platforms = args.platform
        ? [args.platform]
        : this.syncEngine.getEnabledPlatforms();

      for (const platform of platforms) {
        const result = await this.syncEngine.testConnection(platform);
        results.push({
          platform,
          connected: result.success,
          user: result.user,
          error: result.error
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'test',
            results
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Tool: Get or update sync configuration
   */
  async toolSyncConfig(args) {
    const { action = 'get', platform } = args;
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, '.cdd', 'sync-config.json');
    const templatePath = path.join(__dirname, '../templates/sync-config.json');

    try {
      switch (action) {
        case 'init':
          // Copy template to project
          const cddDir = path.join(projectRoot, '.cdd');
          if (!fs.existsSync(cddDir)) {
            fs.mkdirSync(cddDir, { recursive: true });
          }
          fs.copyFileSync(templatePath, configPath);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Sync configuration initialized',
                path: configPath
              }, null, 2)
            }]
          };

        case 'validate':
          if (!fs.existsSync(configPath)) {
            throw new Error('Sync configuration not found. Run with action=init first.');
          }

          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const validation = this.validateSyncConfig(config);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings
              }, null, 2)
            }]
          };

        case 'get':
        default:
          if (!fs.existsSync(configPath)) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  configured: false,
                  message: 'Sync not configured. Use action=init to create configuration.'
                }, null, 2)
              }]
            };
          }

          const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

          if (platform) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  platform,
                  config: currentConfig.platforms[platform] || null
                }, null, 2)
              }]
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                configured: true,
                sync: currentConfig.sync,
                enabledPlatforms: Object.entries(currentConfig.platforms)
                  .filter(([_, p]) => p.enabled)
                  .map(([name]) => name)
              }, null, 2)
            }]
          };
      }
    } catch (error) {
      throw new Error(`Sync config error: ${error.message}`);
    }
  }

  /**
   * Validate sync configuration
   */
  validateSyncConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config.sync) {
      errors.push('Missing sync settings');
    }

    if (!config.platforms) {
      errors.push('Missing platforms configuration');
    } else {
      for (const [name, platform] of Object.entries(config.platforms)) {
        if (platform.enabled) {
          if (!platform.connection) {
            errors.push(`${name}: Missing connection configuration`);
          } else if (platform.connection.type === 'api') {
            // Check for API credentials
            const hasPlaceholders = JSON.stringify(platform.connection).includes('${');
            if (hasPlaceholders) {
              warnings.push(`${name}: Contains environment variable placeholders`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Return sync not available message
   */
  syncNotAvailable() {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Sync engine not available',
          message: 'Platform sync is not configured or initialized'
        }, null, 2)
      }]
    };
  }

  // ==========================================
  // CDD Activation Tool
  // ==========================================

  /**
   * Tool: Activate CDD mode with Knowledge System initialization
   * This is the main entry point called when /maestro:cdd is invoked
   */
  toolCDDActivate(args) {
    if (!this.cddActivator) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'cdd_activate',
            success: false,
            error: 'CDD Activator not available',
            message: 'The CDD activation system is not properly initialized'
          }, null, 2)
        }]
      };
    }

    const { branch, sessionId, trackId } = args;

    // Activate CDD mode with full knowledge system initialization
    const result = this.cddActivator.activate({
      branch: branch,
      sessionId: sessionId,
      trackId: trackId
    });

    // Also initialize the hooks learning session for execution tracking
    if (result.success && result.knowledgeSystem.initialized) {
      this.hooks.initializeLearningSession(
        result.branch,
        result.sessionId,
        { trackId: trackId }
      );
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'cdd_activate',
          ...result,
          // Include formatted status for display
          formattedKnowledgeStatus: this.cddActivator.getFormattedKnowledgeStatus()
        }, null, 2)
      }]
    };
  }

  // ==========================================
  // Learning System Tools
  // ==========================================

  /**
   * Tool: Initialize learning session
   */
  toolLearningInit(args) {
    const { branch, sessionId, options = {} } = args;

    if (!branch) {
      throw new Error('Branch name is required');
    }

    const result = this.hooks.initializeLearningSession(
      branch,
      sessionId || `session_${Date.now()}`,
      options
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_init',
          ...result
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Finalize learning session
   */
  toolLearningFinalize(args) {
    const { options = {} } = args;

    const result = this.hooks.finalizeLearningSession(options);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_finalize',
          ...result
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Get learning session status
   */
  toolLearningStatus(args) {
    const isActive = this.hooks.isLearningActive();
    const summary = this.hooks.getLearningSessionSummary();
    const pendingEnrichments = this.hooks.getPendingEnrichments();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_status',
          active: isActive,
          summary: summary || 'No active session',
          pendingEnrichments: pendingEnrichments.length
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Capture learning (decision, research, or discovery)
   */
  toolLearningCapture(args) {
    const { type, data } = args;

    if (!type || !data) {
      throw new Error('Type and data are required');
    }

    let result;
    switch (type) {
      case 'decision':
        result = this.hooks.captureDecision(data);
        break;
      case 'research':
        result = this.hooks.captureResearch(data);
        break;
      case 'discovery':
        result = this.hooks.captureDiscovery(data);
        break;
      default:
        throw new Error(`Unknown capture type: ${type}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_capture',
          type,
          ...result
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Get knowledge for task context
   */
  toolLearningGetKnowledge(args) {
    const { taskContext = {} } = args;

    const knowledge = this.hooks.getKnowledgeInjection(taskContext);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_get_knowledge',
          hasKnowledge: !!knowledge,
          knowledge: knowledge || 'No relevant knowledge found'
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Handle phase completion
   */
  toolLearningPhaseComplete(args) {
    const { phase, track } = args;

    if (!phase) {
      throw new Error('Phase information is required');
    }

    const result = this.hooks.onPhaseCompletion(phase, track || {});

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'learning_phase_complete',
          phase: phase.name || phase.id || phase,
          ...result
        }, null, 2)
      }]
    };
  }

  /**
   * Tool: Health check
   */
  toolHealthCheck(args) {
    const verbose = args.verbose || false;
    const startTime = Date.now();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.config.version,
      components: {}
    };

    // Check learning system
    try {
      const learningActive = this.hooks.isLearningActive();
      const learningSummary = learningActive ? this.hooks.getLearningSessionSummary() : null;

      health.components.learning = {
        status: 'healthy',
        active: learningActive,
        sessionId: learningSummary?.sessionId || null,
        branch: learningSummary?.branch || null
      };

      if (verbose && learningSummary) {
        health.components.learning.stats = learningSummary.stats;
        health.components.learning.knowledgeStats = learningSummary.knowledgeStats;
      }
    } catch (error) {
      health.components.learning = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Check sync engine
    try {
      if (this.syncEngine) {
        health.components.sync = {
          status: 'healthy',
          available: true,
          platforms: this.syncEngine.getEnabledPlatforms ? this.syncEngine.getEnabledPlatforms() : []
        };
      } else {
        health.components.sync = {
          status: 'healthy',
          available: false,
          message: 'Sync engine not configured'
        };
      }
    } catch (error) {
      health.components.sync = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Check CDD activator
    try {
      health.components.cdd = {
        status: 'healthy',
        available: !!this.cddActivator
      };

      if (verbose && this.cddActivator) {
        health.components.cdd.active = this.cddActivator.isActive ? this.cddActivator.isActive() : false;
      }
    } catch (error) {
      health.components.cdd = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Check agent router
    try {
      const agents = this.router.getAllAgents();
      health.components.agents = {
        status: 'healthy',
        totalAgents: agents.length,
        categories: [...new Set(agents.map(a => a.categoryId))].length
      };
    } catch (error) {
      health.components.agents = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Memory usage
    if (verbose) {
      const memUsage = process.memoryUsage();
      health.memory = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
      };
    }

    // Active executions
    health.executions = {
      active: this.executions.size,
      workflows: this.workflows.size
    };

    // Response time
    health.responseTime = Date.now() - startTime + 'ms';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(health, null, 2)
      }]
    };
  }

  /**
   * Tool: Knowledge backup
   */
  async toolKbBackup(args) {
    const { outputPath, branch, includeIndex } = args;
    const projectRoot = process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    try {
      // Initialize knowledge store if needed
      const KnowledgeStore = require('../skills/knowledge-store');
      const store = new KnowledgeStore({
        maestroDir: path.join(projectRoot, 'maestro')
      });

      // Export all knowledge
      const exportResult = store.exportAll(branch || null);

      if (!exportResult.success) {
        throw new Error(exportResult.message);
      }

      // Build backup data
      const backup = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        branch: branch || 'global',
        maestroVersion: this.config.version,
        entries: exportResult.entries,
        totalEntries: exportResult.total,
        stats: store.getStats(branch || null)
      };

      // Include index if requested
      if (includeIndex) {
        backup.index = store.loadIndex(branch || null);
      }

      // Determine output path
      const backupDir = path.join(projectRoot, 'maestro', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const fileName = `kb-backup-${branch || 'global'}-${timestamp}.json`;
      const filePath = outputPath || path.join(backupDir, fileName);

      // Write backup file
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'kb_backup',
            success: true,
            path: filePath,
            branch: branch || 'global',
            entriesBackedUp: backup.totalEntries,
            stats: backup.stats,
            message: `Knowledge backup created at ${filePath}`
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'kb_backup',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Tool: Knowledge restore
   */
  async toolKbRestore(args) {
    const { inputPath, branch, merge, dryRun } = args;
    const projectRoot = process.cwd();

    try {
      // Read backup file
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Backup file not found: ${inputPath}`);
      }

      const backupData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

      // Validate backup format
      if (!backupData.version || !backupData.entries) {
        throw new Error('Invalid backup file format');
      }

      // Preview mode
      if (dryRun) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              action: 'kb_restore',
              dryRun: true,
              success: true,
              backupInfo: {
                version: backupData.version,
                createdAt: backupData.createdAt,
                originalBranch: backupData.branch,
                entriesCount: backupData.totalEntries,
                maestroVersion: backupData.maestroVersion
              },
              targetBranch: branch || backupData.branch,
              mergeMode: merge || false,
              message: `Would restore ${backupData.totalEntries} entries`
            }, null, 2)
          }]
        };
      }

      // Initialize knowledge store
      const KnowledgeStore = require('../skills/knowledge-store');
      const store = new KnowledgeStore({
        maestroDir: path.join(projectRoot, 'maestro')
      });

      const targetBranch = branch || backupData.branch === 'global' ? null : backupData.branch;

      // Ensure directories exist
      store.ensureDirectories(targetBranch);

      // Restore entries
      let restored = 0;
      let skipped = 0;
      let errors = [];

      for (const entry of backupData.entries) {
        try {
          if (merge) {
            // Check if entry exists
            const existing = store.get(entry.id, targetBranch);
            if (existing) {
              // Skip if existing is newer
              const existingTime = new Date(existing.metadata?.updatedAt || 0).getTime();
              const backupTime = new Date(entry.metadata?.updatedAt || 0).getTime();
              if (existingTime > backupTime) {
                skipped++;
                continue;
              }
            }
          }

          const result = store.save(entry, targetBranch);
          if (result.success) {
            restored++;
          } else {
            errors.push({ id: entry.id, error: result.error });
          }
        } catch (e) {
          errors.push({ id: entry.id, error: e.message });
        }
      }

      // Rebuild index
      store.buildIndex(targetBranch);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'kb_restore',
            success: errors.length === 0,
            restored: restored,
            skipped: skipped,
            errors: errors.length,
            errorDetails: errors.slice(0, 5), // First 5 errors
            targetBranch: targetBranch || 'global',
            message: `Restored ${restored} entries${skipped > 0 ? `, skipped ${skipped}` : ''}${errors.length > 0 ? `, ${errors.length} errors` : ''}`
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'kb_restore',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Tool: Generate Mermaid diagram
   */
  toolGenerateDiagram(args) {
    const { type = 'flowchart', trackId, includeCompleted } = args;
    const projectRoot = process.cwd();

    try {
      // Load tracks
      const tracksDir = path.join(projectRoot, 'maestro', 'tracks');
      const tracks = [];

      if (fs.existsSync(tracksDir)) {
        const trackDirs = fs.readdirSync(tracksDir);
        for (const dir of trackDirs) {
          const specPath = path.join(tracksDir, dir, 'spec.md');
          const metaPath = path.join(tracksDir, dir, 'metadata.json');

          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              if (trackId && meta.id !== trackId) continue;
              if (!includeCompleted && meta.status === 'completed') continue;
              tracks.push(meta);
            } catch (e) {
              // Skip invalid tracks
            }
          }
        }
      }

      if (tracks.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              action: 'generate_diagram',
              success: true,
              diagram: '',
              message: 'No tracks found to diagram'
            }, null, 2)
          }]
        };
      }

      let diagram = '';

      switch (type) {
        case 'flowchart':
          diagram = this.generateFlowchartDiagram(tracks);
          break;
        case 'gantt':
          diagram = this.generateGanttDiagram(tracks);
          break;
        case 'mindmap':
          diagram = this.generateMindmapDiagram(tracks);
          break;
        default:
          diagram = this.generateFlowchartDiagram(tracks);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'generate_diagram',
            success: true,
            type: type,
            tracksIncluded: tracks.length,
            diagram: diagram,
            message: `Generated ${type} diagram with ${tracks.length} tracks`
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: 'generate_diagram',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Generate flowchart diagram
   */
  generateFlowchartDiagram(tracks) {
    const lines = ['flowchart TD'];

    // Define nodes
    for (const track of tracks) {
      const id = this.sanitizeId(track.id);
      const label = track.title || track.id;
      const status = track.status || 'pending';

      // Style based on status
      let style = '';
      switch (status) {
        case 'completed':
          style = ':::completed';
          break;
        case 'in-progress':
          style = ':::inprogress';
          break;
        case 'blocked':
          style = ':::blocked';
          break;
        default:
          style = ':::pending';
      }

      lines.push(`    ${id}["${label}"]${style}`);
    }

    // Define dependencies
    for (const track of tracks) {
      const id = this.sanitizeId(track.id);
      if (track.dependencies && track.dependencies.length > 0) {
        for (const dep of track.dependencies) {
          const depId = this.sanitizeId(dep);
          lines.push(`    ${depId} --> ${id}`);
        }
      }
    }

    // Add styles
    lines.push('');
    lines.push('    classDef completed fill:#90EE90,stroke:#228B22');
    lines.push('    classDef inprogress fill:#87CEEB,stroke:#4169E1');
    lines.push('    classDef blocked fill:#FFB6C1,stroke:#DC143C');
    lines.push('    classDef pending fill:#F5F5F5,stroke:#808080');

    return lines.join('\n');
  }

  /**
   * Generate Gantt diagram
   */
  generateGanttDiagram(tracks) {
    const lines = [
      'gantt',
      '    title Track Progress',
      '    dateFormat YYYY-MM-DD'
    ];

    // Group by type or status
    const sections = {};
    for (const track of tracks) {
      const section = track.type || 'Tasks';
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(track);
    }

    for (const [section, sectionTracks] of Object.entries(sections)) {
      lines.push(`    section ${section}`);

      for (const track of sectionTracks) {
        const label = track.title || track.id;
        const id = this.sanitizeId(track.id);
        const status = track.status || 'pending';

        let statusMarker = '';
        if (status === 'completed') statusMarker = 'done, ';
        else if (status === 'in-progress') statusMarker = 'active, ';
        else if (status === 'blocked') statusMarker = 'crit, ';

        // Estimate duration (default to 1 day)
        const duration = track.estimatedDays || '1d';

        lines.push(`    ${label} :${statusMarker}${id}, after start, ${duration}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate mindmap diagram
   */
  generateMindmapDiagram(tracks) {
    const lines = ['mindmap', '    root((Tracks))'];

    // Group by type
    const byType = {};
    for (const track of tracks) {
      const type = track.type || 'other';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(track);
    }

    for (const [type, typeTracks] of Object.entries(byType)) {
      lines.push(`        ${type}`);
      for (const track of typeTracks) {
        const label = track.title || track.id;
        const status = track.status || 'pending';
        const icon = status === 'completed' ? '✓' : status === 'in-progress' ? '→' : '○';
        lines.push(`            ${icon} ${label}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Sanitize ID for Mermaid
   */
  sanitizeId(id) {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Handle resources/list request
   */
  handleListResources() {
    return {
      resources: this.config.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType
      }))
    };
  }

  /**
   * Handle resources/read request
   */
  async handleReadResource(params) {
    const { uri } = params;

    if (uri === 'maestro://agents') {
      const registryPath = path.join(__dirname, '../subagents/registry.json');
      const registry = fs.readFileSync(registryPath, 'utf8');
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: registry
        }]
      };
    }

    if (uri === 'maestro://workflows') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(Array.from(this.workflows.entries()), null, 2)
        }]
      };
    }

    if (uri.startsWith('maestro://logs/')) {
      const executionId = uri.replace('maestro://logs/', '');
      const logPath = path.join(__dirname, '../.maestro/logs', `${executionId}.json`);

      if (fs.existsSync(logPath)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: fs.readFileSync(logPath, 'utf8')
          }]
        };
      }
    }

    if (uri === 'maestro://sync/config') {
      const projectRoot = process.cwd();
      const configPath = path.join(projectRoot, '.cdd', 'sync-config.json');

      if (fs.existsSync(configPath)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: fs.readFileSync(configPath, 'utf8')
          }]
        };
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ configured: false })
        }]
      };
    }

    if (uri === 'maestro://sync/status') {
      if (this.syncEngine) {
        const status = await this.syncEngine.getSyncStatus();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2)
          }]
        };
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ available: false })
        }]
      };
    }

    if (uri === 'maestro://sync/links') {
      const projectRoot = process.cwd();
      const linksPath = path.join(projectRoot, '.cdd', 'sync-links.json');

      if (fs.existsSync(linksPath)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: fs.readFileSync(linksPath, 'utf8')
          }]
        };
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ links: [] })
        }]
      };
    }

    // Learning system resources
    if (uri === 'maestro://learning/status') {
      const isActive = this.hooks.isLearningActive();
      const summary = this.hooks.getLearningSessionSummary();

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            active: isActive,
            summary: summary || null
          }, null, 2)
        }]
      };
    }

    if (uri === 'maestro://learning/knowledge') {
      const projectRoot = process.cwd();
      const knowledgePath = path.join(projectRoot, 'maestro', 'knowledge', 'index.json');

      if (fs.existsSync(knowledgePath)) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: fs.readFileSync(knowledgePath, 'utf8')
          }]
        };
      }

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            entries: [],
            message: 'No knowledge stored yet'
          })
        }]
      };
    }

    throw new Error(`Resource not found: ${uri}`);
  }

  /**
   * Handle prompts/list request
   */
  handleListPrompts() {
    return {
      prompts: this.config.prompts
    };
  }

  /**
   * Handle prompts/get request
   */
  async handleGetPrompt(params) {
    const { name, arguments: args } = params;
    const prompt = this.config.prompts.find(p => p.name === name);

    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }

    if (name === 'orchestrate') {
      const analysis = this.analyzer.analyze(args.task);
      const routing = this.router.route(args.task);

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Orchestrate the following task using Maestro:\n\nTask: ${args.task}\n\nAnalysis:\n${JSON.stringify(analysis, null, 2)}\n\nSuggested agents: ${routing.agents.map(a => a.agent).join(', ')}`
          }
        }]
      };
    }

    if (name === 'create_workflow') {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Create a workflow for: ${args.description}\n\nUse the available agents and define steps with dependencies.`
          }
        }]
      };
    }

    throw new Error(`Prompt not implemented: ${name}`);
  }

  /**
   * Send response to stdout
   */
  sendResponse(response) {
    console.log(JSON.stringify(response));
  }

  /**
   * Send error response
   */
  sendError(error) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error.message
      }
    }));
  }
}

// Start server
const server = new MaestroMCPServer();
server.start();
