/**
 * Pre-Execution Hook
 *
 * This hook runs before any sub-agent execution.
 * It handles validation, logging, and context preparation.
 */

const fs = require('fs');
const path = require('path');

class PreExecutionHook {
  constructor(config = {}) {
    this.config = {
      logDir: config.logDir || '.maestro/logs',
      validateAgents: config.validateAgents !== false,
      checkConflicts: config.checkConflicts !== false,
      maxConcurrentAgents: config.maxConcurrentAgents || 5,
      ...config
    };

    this.activeAgents = new Set();
    this.executionLog = [];
  }

  /**
   * Main hook entry point
   * @param {Object} context - Execution context
   * @returns {Object} Modified context or rejection
   */
  async execute(context) {
    const { agent, task, options = {} } = context;

    try {
      // Step 1: Validate agent exists
      if (this.config.validateAgents) {
        await this.validateAgent(agent);
      }

      // Step 2: Check concurrent execution limits
      if (this.activeAgents.size >= this.config.maxConcurrentAgents) {
        throw new Error(
          `Maximum concurrent agents (${this.config.maxConcurrentAgents}) reached. ` +
          `Active agents: ${Array.from(this.activeAgents).join(', ')}`
        );
      }

      // Step 3: Check for resource conflicts
      if (this.config.checkConflicts) {
        const conflicts = await this.checkResourceConflicts(context);
        if (conflicts.length > 0) {
          context.warnings = context.warnings || [];
          context.warnings.push(...conflicts);
        }
      }

      // Step 4: Prepare execution context
      const executionId = this.generateExecutionId();
      context.executionId = executionId;
      context.startTime = Date.now();

      // Step 5: Log execution start
      await this.logExecutionStart(context);

      // Step 6: Register active agent
      this.activeAgents.add(agent);

      // Step 7: Prepare isolated context if needed
      if (options.isolatedContext) {
        context.isolatedContext = this.createIsolatedContext(context);
      }

      return {
        proceed: true,
        context
      };

    } catch (error) {
      await this.logError(context, error);

      return {
        proceed: false,
        error: error.message,
        context
      };
    }
  }

  /**
   * Validate that the specified agent exists
   */
  async validateAgent(agentId) {
    const registryPath = path.join(__dirname, '../subagents/registry.json');

    if (!fs.existsSync(registryPath)) {
      throw new Error('Agent registry not found');
    }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

    const agentExists = Object.values(registry.categories).some(category =>
      category.agents.some(agent => agent.id === agentId)
    );

    if (!agentExists) {
      const available = Object.values(registry.categories)
        .flatMap(cat => cat.agents.map(a => a.id))
        .slice(0, 10)
        .join(', ');

      throw new Error(
        `Agent "${agentId}" not found. Available agents include: ${available}...`
      );
    }
  }

  /**
   * Check for potential resource conflicts with active agents
   */
  async checkResourceConflicts(context) {
    const conflicts = [];
    const { agent, task } = context;

    // Check if similar agent is already running
    for (const activeAgent of this.activeAgents) {
      if (this.agentsConflict(agent, activeAgent)) {
        conflicts.push({
          type: 'potential_conflict',
          message: `Agent "${agent}" may conflict with running agent "${activeAgent}"`,
          severity: 'warning'
        });
      }
    }

    // Check for file-based conflicts based on task keywords
    const filePatterns = this.extractFilePatterns(task);
    for (const log of this.executionLog) {
      if (log.status === 'running') {
        const activePatterns = this.extractFilePatterns(log.task);
        const overlap = filePatterns.filter(p => activePatterns.includes(p));
        if (overlap.length > 0) {
          conflicts.push({
            type: 'file_conflict',
            message: `Potential file conflict: ${overlap.join(', ')}`,
            severity: 'warning'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two agents might conflict
   */
  agentsConflict(agent1, agent2) {
    const conflictGroups = [
      ['backend-developer', 'api-designer'],
      ['frontend-developer', 'react-specialist', 'vue-expert'],
      ['database-administrator', 'sql-pro', 'database-optimizer']
    ];

    for (const group of conflictGroups) {
      if (group.includes(agent1) && group.includes(agent2)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract file patterns from task description
   */
  extractFilePatterns(task) {
    const patterns = [];
    const fileRegex = /\b[\w\-]+\.(ts|js|py|go|rs|java|sql|yaml|json|md)\b/g;
    const matches = task.match(fileRegex);
    if (matches) {
      patterns.push(...matches);
    }
    return patterns;
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `exec_${timestamp}_${random}`;
  }

  /**
   * Create isolated execution context
   */
  createIsolatedContext(context) {
    return {
      id: context.executionId,
      agent: context.agent,
      task: context.task,
      state: {},
      outputs: [],
      logs: []
    };
  }

  /**
   * Log execution start
   */
  async logExecutionStart(context) {
    const logEntry = {
      executionId: context.executionId,
      agent: context.agent,
      task: context.task,
      startTime: new Date().toISOString(),
      status: 'running'
    };

    this.executionLog.push(logEntry);

    // Ensure log directory exists
    const logDir = this.config.logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Write to file
    const logFile = path.join(logDir, `${context.executionId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

    console.log(`[Maestro] Starting execution: ${context.executionId}`);
    console.log(`[Maestro] Agent: ${context.agent}`);
    console.log(`[Maestro] Task: ${context.task.substring(0, 100)}...`);
  }

  /**
   * Log error
   */
  async logError(context, error) {
    console.error(`[Maestro] Pre-execution error: ${error.message}`);

    const logEntry = {
      executionId: context.executionId || 'unknown',
      agent: context.agent,
      task: context.task,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      status: 'failed'
    };

    const logDir = this.config.logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const errorFile = path.join(logDir, `error_${Date.now()}.json`);
    fs.writeFileSync(errorFile, JSON.stringify(logEntry, null, 2));
  }

  /**
   * Cleanup after agent completes
   */
  cleanup(agentId) {
    this.activeAgents.delete(agentId);
  }
}

module.exports = PreExecutionHook;
