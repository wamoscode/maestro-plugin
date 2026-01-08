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
const AgentRouter = require('../hooks/agent-router');
const TaskAnalyzer = require('../skills/task-analyzer');
const ResultAggregator = require('../skills/result-aggregator');

class MaestroMCPServer {
  constructor() {
    this.config = this.loadConfig();
    this.router = new AgentRouter();
    this.analyzer = new TaskAnalyzer();
    this.aggregator = new ResultAggregator();

    this.executions = new Map();
    this.workflows = new Map();
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

      case 'get_metrics':
        return this.toolGetMetrics(args);

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

    // Store execution
    this.executions.set(executionId, {
      id: executionId,
      workflow,
      variables: args.variables || {},
      status: 'pending',
      startTime: Date.now(),
      steps: []
    });

    // Note: Actual execution would be async and involve sub-agent invocation
    // This is a placeholder that returns the execution plan

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          executionId,
          status: 'created',
          message: 'Workflow execution queued',
          workflow
        }, null, 2)
      }]
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
