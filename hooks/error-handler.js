/**
 * Error Handler Hook
 *
 * This hook handles errors during sub-agent execution.
 * It provides retry logic, fallback strategies, and error reporting.
 */

const fs = require('fs');
const path = require('path');

class ErrorHandler {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      exponentialBackoff: config.exponentialBackoff !== false,
      logErrors: config.logErrors !== false,
      errorLogDir: config.errorLogDir || '.maestro/errors',
      fallbackEnabled: config.fallbackEnabled !== false,
      circuitBreaker: {
        enabled: config.circuitBreaker?.enabled !== false,
        threshold: config.circuitBreaker?.threshold || 5,
        resetTimeout: config.circuitBreaker?.resetTimeout || 60000
      },
      ...config
    };

    this.errorCounts = new Map();
    this.circuitStates = new Map();
    this.errorHistory = [];
  }

  /**
   * Main error handling entry point
   * @param {Object} context - Execution context with error
   * @returns {Object} Error handling result
   */
  async handle(context) {
    const { executionId, agent, task, error, retryCount = 0 } = context;

    try {
      // Step 1: Classify the error
      const classification = this.classifyError(error);

      // Step 2: Check circuit breaker
      if (this.isCircuitOpen(agent)) {
        return {
          action: 'abort',
          reason: 'circuit_breaker_open',
          message: `Circuit breaker open for agent "${agent}". Too many recent failures.`,
          retryAfter: this.getCircuitResetTime(agent)
        };
      }

      // Step 3: Update error count
      this.incrementErrorCount(agent);

      // Step 4: Log the error
      if (this.config.logErrors) {
        await this.logError(context, classification);
      }

      // Step 5: Determine recovery strategy
      const strategy = this.determineStrategy(classification, retryCount);

      // Step 6: Execute strategy
      return await this.executeStrategy(strategy, context, classification);

    } catch (handlerError) {
      console.error(`[Maestro] Error handler failed: ${handlerError.message}`);
      return {
        action: 'abort',
        reason: 'handler_failure',
        message: handlerError.message
      };
    }
  }

  /**
   * Classify the error type
   */
  classifyError(error) {
    const message = error.message || error.toString();
    const stack = error.stack || '';

    // Timeout errors
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        type: 'timeout',
        retryable: true,
        severity: 'warning'
      };
    }

    // Network errors
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return {
        type: 'network',
        retryable: true,
        severity: 'warning'
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        type: 'rate_limit',
        retryable: true,
        severity: 'warning',
        delayMultiplier: 2
      };
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'auth',
        retryable: false,
        severity: 'error'
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('403')) {
      return {
        type: 'permission',
        retryable: false,
        severity: 'error'
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: 'validation',
        retryable: false,
        severity: 'error'
      };
    }

    // Resource not found
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: 'not_found',
        retryable: false,
        severity: 'warning'
      };
    }

    // Default classification
    return {
      type: 'unknown',
      retryable: true,
      severity: 'error'
    };
  }

  /**
   * Determine recovery strategy based on error classification
   */
  determineStrategy(classification, retryCount) {
    const { type, retryable, delayMultiplier = 1 } = classification;

    // Non-retryable errors
    if (!retryable) {
      if (this.config.fallbackEnabled) {
        return { action: 'fallback', type };
      }
      return { action: 'abort', type };
    }

    // Check retry limit
    if (retryCount >= this.config.maxRetries) {
      if (this.config.fallbackEnabled) {
        return { action: 'fallback', type };
      }
      return { action: 'abort', type, reason: 'max_retries_exceeded' };
    }

    // Calculate retry delay
    let delay = this.config.retryDelay * delayMultiplier;
    if (this.config.exponentialBackoff) {
      delay = delay * Math.pow(2, retryCount);
    }

    return {
      action: 'retry',
      type,
      retryCount: retryCount + 1,
      delay
    };
  }

  /**
   * Execute the recovery strategy
   */
  async executeStrategy(strategy, context, classification) {
    switch (strategy.action) {
      case 'retry':
        console.log(
          `[Maestro] Retrying ${context.agent} (attempt ${strategy.retryCount}/${this.config.maxRetries}) ` +
          `after ${strategy.delay}ms`
        );
        await this.delay(strategy.delay);
        return {
          action: 'retry',
          retryCount: strategy.retryCount,
          delay: strategy.delay,
          context: {
            ...context,
            retryCount: strategy.retryCount
          }
        };

      case 'fallback':
        const fallbackAgent = this.findFallbackAgent(context.agent);
        if (fallbackAgent) {
          console.log(`[Maestro] Falling back from ${context.agent} to ${fallbackAgent}`);
          return {
            action: 'fallback',
            originalAgent: context.agent,
            fallbackAgent,
            context: {
              ...context,
              agent: fallbackAgent,
              originalAgent: context.agent
            }
          };
        }
        return {
          action: 'abort',
          reason: 'no_fallback_available',
          classification
        };

      case 'abort':
      default:
        return {
          action: 'abort',
          reason: strategy.reason || 'unrecoverable_error',
          classification,
          message: `Execution aborted: ${classification.type} error`
        };
    }
  }

  /**
   * Find a fallback agent for the failed agent
   */
  findFallbackAgent(agent) {
    const fallbackMap = {
      'backend-developer': 'fullstack-developer',
      'frontend-developer': 'fullstack-developer',
      'react-specialist': 'frontend-developer',
      'vue-expert': 'frontend-developer',
      'typescript-pro': 'javascript-pro',
      'django-developer': 'python-pro',
      'nextjs-developer': 'react-specialist',
      'kubernetes-specialist': 'devops-engineer',
      'terraform-engineer': 'cloud-architect',
      'security-auditor': 'code-reviewer',
      'ml-engineer': 'data-scientist'
    };

    return fallbackMap[agent] || null;
  }

  /**
   * Check if circuit breaker is open for an agent
   */
  isCircuitOpen(agent) {
    if (!this.config.circuitBreaker.enabled) {
      return false;
    }

    const state = this.circuitStates.get(agent);
    if (!state) {
      return false;
    }

    if (state.status === 'open') {
      const elapsed = Date.now() - state.openedAt;
      if (elapsed >= this.config.circuitBreaker.resetTimeout) {
        // Half-open state - allow one request
        state.status = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get time until circuit resets
   */
  getCircuitResetTime(agent) {
    const state = this.circuitStates.get(agent);
    if (!state || state.status !== 'open') {
      return 0;
    }
    const elapsed = Date.now() - state.openedAt;
    return Math.max(0, this.config.circuitBreaker.resetTimeout - elapsed);
  }

  /**
   * Increment error count for an agent
   */
  incrementErrorCount(agent) {
    const count = (this.errorCounts.get(agent) || 0) + 1;
    this.errorCounts.set(agent, count);

    // Check circuit breaker threshold
    if (
      this.config.circuitBreaker.enabled &&
      count >= this.config.circuitBreaker.threshold
    ) {
      this.openCircuit(agent);
    }
  }

  /**
   * Open circuit breaker for an agent
   */
  openCircuit(agent) {
    console.log(`[Maestro] Circuit breaker opened for agent: ${agent}`);
    this.circuitStates.set(agent, {
      status: 'open',
      openedAt: Date.now()
    });
  }

  /**
   * Reset circuit breaker after successful execution
   */
  resetCircuit(agent) {
    this.errorCounts.delete(agent);
    this.circuitStates.delete(agent);
  }

  /**
   * Log error to file
   */
  async logError(context, classification) {
    const { executionId, agent, task, error } = context;

    const errorEntry = {
      executionId,
      agent,
      task: task.substring(0, 200),
      error: {
        message: error.message || error.toString(),
        stack: error.stack,
        classification
      },
      timestamp: new Date().toISOString()
    };

    this.errorHistory.push(errorEntry);

    // Ensure error log directory exists
    if (!fs.existsSync(this.config.errorLogDir)) {
      fs.mkdirSync(this.config.errorLogDir, { recursive: true });
    }

    // Write to error log
    const errorFile = path.join(
      this.config.errorLogDir,
      `error_${executionId || Date.now()}.json`
    );
    fs.writeFileSync(errorFile, JSON.stringify(errorEntry, null, 2));
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByAgent: {},
      errorsByType: {},
      circuitBreakers: {}
    };

    for (const [agent, count] of this.errorCounts) {
      stats.errorsByAgent[agent] = count;
    }

    for (const entry of this.errorHistory) {
      const type = entry.error.classification.type;
      stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
    }

    for (const [agent, state] of this.circuitStates) {
      stats.circuitBreakers[agent] = state.status;
    }

    return stats;
  }
}

module.exports = ErrorHandler;
