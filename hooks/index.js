/**
 * Maestro Hooks Index
 *
 * Central integration point for all hooks.
 * Provides unified initialization and coordination between
 * pre-execution, post-execution, and learning system hooks.
 */

const PreExecutionHook = require('./pre-execution');
const PostExecutionHook = require('./post-execution');
const AgentRouter = require('./agent-router');
const ErrorHandler = require('./error-handler');

/**
 * MaestroHooks - Unified hook manager
 *
 * Coordinates all hooks and integrates the learning system.
 */
class MaestroHooks {
  constructor(config = {}) {
    this.config = {
      enableLearning: config.enableLearning !== false,
      maestroDir: config.maestroDir || 'maestro',
      logDir: config.logDir || '.maestro/logs',
      metricsDir: config.metricsDir || '.maestro/metrics',
      ...config
    };

    // Initialize hooks
    this.preExecution = new PreExecutionHook({
      ...this.config,
      enableLearning: this.config.enableLearning
    });

    this.postExecution = new PostExecutionHook({
      ...this.config,
      enableLearning: this.config.enableLearning
    });

    this.agentRouter = new AgentRouter(config);

    try {
      this.errorHandler = new ErrorHandler(config);
    } catch (e) {
      this.errorHandler = null;
    }

    // Link learning controller between hooks
    this._linkLearningController();
  }

  /**
   * Link learning controller from pre-execution to post-execution
   */
  _linkLearningController() {
    if (this.preExecution.getLearningController()) {
      this.postExecution.setLearningController(
        this.preExecution.getLearningController()
      );
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
    const result = this.preExecution.initializeLearningSession(branch, sessionId, options);

    // Re-link after initialization
    if (result.success) {
      this._linkLearningController();
    }

    return result;
  }

  /**
   * Set active track for learning context
   * @param {string} trackId - Track identifier
   */
  setActiveTrack(trackId) {
    this.preExecution.setActiveTrack(trackId);
  }

  /**
   * Check if learning session is active
   * @returns {boolean}
   */
  isLearningActive() {
    return this.preExecution.isLearningActive();
  }

  /**
   * Get the learning controller
   * @returns {Object|null}
   */
  getLearningController() {
    return this.preExecution.getLearningController();
  }

  /**
   * Execute pre-execution hook
   * @param {Object} context - Execution context
   * @returns {Object} Hook result
   */
  async beforeExecution(context) {
    return this.preExecution.execute(context);
  }

  /**
   * Execute post-execution hook
   * @param {Object} context - Execution context with results
   * @returns {Object} Hook result
   */
  async afterExecution(context) {
    return this.postExecution.execute(context);
  }

  /**
   * Route task to appropriate agents
   * @param {string} task - Task description
   * @param {Object} options - Routing options
   * @returns {Object} Routing decision
   */
  routeTask(task, options = {}) {
    return this.agentRouter.route(task, options);
  }

  /**
   * Handle execution error
   * @param {Error} error - Error object
   * @param {Object} context - Execution context
   * @returns {Object} Error handling result
   */
  async handleError(error, context) {
    if (this.errorHandler) {
      return this.errorHandler.handle(error, context);
    }
    return { handled: false, error: error.message };
  }

  /**
   * Finalize learning session
   * @param {Object} options - Finalization options
   * @returns {Object} Finalization result
   */
  finalizeLearningSession(options = {}) {
    const controller = this.getLearningController();
    if (!controller) {
      return {
        success: false,
        error: 'No learning session active',
        message: 'Learning session not initialized'
      };
    }

    return controller.finalizeSession(options);
  }

  /**
   * Get learning session summary
   * @returns {Object} Session summary
   */
  getLearningSessionSummary() {
    const controller = this.getLearningController();
    if (!controller) {
      return null;
    }

    return controller.getSessionSummary();
  }

  /**
   * Handle phase completion in learning system
   * @param {Object} phase - Completed phase
   * @param {Object} track - Track data
   * @returns {Object} Phase completion result
   */
  onPhaseCompletion(phase, track) {
    const controller = this.getLearningController();
    if (!controller) {
      return { success: false, error: 'Learning not active' };
    }

    return controller.onPhaseCompletion(phase, track);
  }

  /**
   * Get knowledge injection for a task
   * @param {Object} taskContext - Task context
   * @returns {string} Formatted knowledge injection
   */
  getKnowledgeInjection(taskContext) {
    const controller = this.getLearningController();
    if (!controller) {
      return '';
    }

    return controller.getKnowledgeInjection(taskContext);
  }

  /**
   * Manually capture a decision
   * @param {Object} decision - Decision data
   * @returns {Object} Capture result
   */
  captureDecision(decision) {
    const controller = this.getLearningController();
    if (!controller) {
      return { success: false, error: 'Learning not active' };
    }

    return controller.captureDecision(decision);
  }

  /**
   * Manually capture research
   * @param {Object} research - Research data
   * @returns {Object} Capture result
   */
  captureResearch(research) {
    const controller = this.getLearningController();
    if (!controller) {
      return { success: false, error: 'Learning not active' };
    }

    return controller.captureResearch(research);
  }

  /**
   * Manually capture a discovery
   * @param {Object} discovery - Discovery data
   * @returns {Object} Capture result
   */
  captureDiscovery(discovery) {
    const controller = this.getLearningController();
    if (!controller) {
      return { success: false, error: 'Learning not active' };
    }

    return controller.captureDiscovery(discovery);
  }

  /**
   * Get pending context enrichments
   * @returns {Array} Pending enrichments
   */
  getPendingEnrichments() {
    const controller = this.getLearningController();
    if (!controller) {
      return [];
    }

    return controller.getPendingEnrichments();
  }

  /**
   * Apply context enrichments
   * @param {Array} enrichmentIds - IDs to apply
   * @param {Object} options - Application options
   * @returns {Object} Application result
   */
  applyEnrichments(enrichmentIds, options = {}) {
    const controller = this.getLearningController();
    if (!controller) {
      return { success: false, error: 'Learning not active' };
    }

    return controller.applyEnrichments(enrichmentIds, options);
  }

  /**
   * Cleanup hook for agent completion
   * @param {string} agentId - Agent identifier
   */
  cleanup(agentId) {
    this.preExecution.cleanup(agentId);
  }
}

// Export individual hooks for backward compatibility
module.exports = {
  MaestroHooks,
  PreExecutionHook,
  PostExecutionHook,
  AgentRouter,
  ErrorHandler
};
