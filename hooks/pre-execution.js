/**
 * Pre-Execution Hook
 *
 * This hook runs before any sub-agent execution.
 * It handles validation, logging, context preparation,
 * and knowledge injection from the learning system.
 */

const fs = require('fs');
const path = require('path');

// Import learning system components
let SessionLearningController;
try {
  SessionLearningController = require('../skills/session-learning-controller');
} catch (e) {
  console.warn('[Maestro] Learning system not available:', e.message);
}

class PreExecutionHook {
  constructor(config = {}) {
    this.config = {
      logDir: config.logDir || '.maestro/logs',
      maestroDir: config.maestroDir || 'maestro',
      validateAgents: config.validateAgents !== false,
      checkConflicts: config.checkConflicts !== false,
      maxConcurrentAgents: config.maxConcurrentAgents || 5,
      enableLearning: config.enableLearning !== false,
      ...config
    };

    this.activeAgents = new Set();
    this.executionLog = [];

    // Initialize learning controller if available
    this.learningController = null;
    this.learningSessionActive = false;
    if (SessionLearningController && this.config.enableLearning) {
      try {
        this.learningController = new SessionLearningController({
          maestroDir: this.config.maestroDir
        });
      } catch (e) {
        console.warn('[Maestro] Failed to initialize learning controller:', e.message);
      }
    }
  }

  /**
   * Initialize learning session for CDD mode
   * @param {string} branch - Git branch name
   * @param {string} sessionId - Session identifier
   * @param {Object} options - Initialization options
   * @returns {Object} Initialization result
   */
  initializeLearningSession(branch, sessionId, options = {}) {
    if (!this.learningController) {
      return {
        success: false,
        error: 'Learning controller not available',
        message: 'Learning system is not initialized'
      };
    }

    const result = this.learningController.initializeSession(branch, sessionId, options);
    if (result.success) {
      this.learningSessionActive = true;
    }
    return result;
  }

  /**
   * Set active track for learning context
   * @param {string} trackId - Track identifier
   */
  setActiveTrack(trackId) {
    if (this.learningController && this.learningSessionActive) {
      this.learningController.setActiveTrack(trackId);
    }
  }

  /**
   * Get learning controller for external access
   * @returns {SessionLearningController|null}
   */
  getLearningController() {
    return this.learningController;
  }

  /**
   * Check if learning session is active
   * @returns {boolean}
   */
  isLearningActive() {
    return this.learningSessionActive && this.learningController !== null;
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

      // Step 5: Inject knowledge from learning system (NEW)
      if (this.learningSessionActive && this.learningController) {
        const knowledgeInjection = await this.injectKnowledge(context);
        if (knowledgeInjection.success && knowledgeInjection.enriched) {
          context.knowledgeInjection = knowledgeInjection;
          context.injectedKnowledgeIds = knowledgeInjection.knowledgeIds || [];
          // Append knowledge to task description for agent context
          if (knowledgeInjection.formattedContext) {
            context.enrichedTask = task + '\n\n' + knowledgeInjection.formattedContext;
          }
        }
      }

      // Step 6: Log execution start
      await this.logExecutionStart(context);

      // Step 7: Register active agent
      this.activeAgents.add(agent);

      // Step 8: Prepare isolated context if needed
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
   * Inject relevant knowledge into the execution context
   * @param {Object} context - Execution context
   * @returns {Object} Knowledge injection result
   */
  async injectKnowledge(context) {
    if (!this.learningController) {
      return { success: false, enriched: false };
    }

    try {
      const taskContext = {
        id: context.executionId,
        title: context.task?.substring(0, 200) || 'Unknown task',
        description: context.task,
        agentId: context.agent,
        trackId: context.trackId,
        phase: context.phase
      };

      // Get relevant knowledge
      const recallResult = this.learningController.getRelevantKnowledge(taskContext);

      if (!recallResult.success || !recallResult.knowledge || recallResult.knowledge.length === 0) {
        return { success: true, enriched: false, reason: 'No relevant knowledge found' };
      }

      // Get formatted context for injection
      const formattedContext = this.learningController.getKnowledgeInjection(taskContext);

      // Track which knowledge IDs were injected for feedback loop
      const knowledgeIds = recallResult.knowledge.map(k => k.id);

      return {
        success: true,
        enriched: true,
        knowledgeIds: knowledgeIds,
        knowledgeCount: recallResult.knowledge.length,
        formattedContext: formattedContext,
        recommendations: recallResult.recommendations
      };
    } catch (error) {
      console.warn('[Maestro] Knowledge injection failed:', error.message);
      return { success: false, enriched: false, error: error.message };
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
