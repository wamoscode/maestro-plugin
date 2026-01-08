/**
 * Post-Execution Hook
 *
 * This hook runs after sub-agent execution completes.
 * It handles result processing, logging, and cleanup.
 */

const fs = require('fs');
const path = require('path');

class PostExecutionHook {
  constructor(config = {}) {
    this.config = {
      logDir: config.logDir || '.maestro/logs',
      metricsDir: config.metricsDir || '.maestro/metrics',
      saveResults: config.saveResults !== false,
      aggregateMetrics: config.aggregateMetrics !== false,
      notifyOnComplete: config.notifyOnComplete || false,
      ...config
    };

    this.executionHistory = [];
  }

  /**
   * Main hook entry point
   * @param {Object} context - Execution context with results
   * @returns {Object} Processed results
   */
  async execute(context) {
    const {
      executionId,
      agent,
      task,
      startTime,
      result,
      error,
      warnings = []
    } = context;

    const endTime = Date.now();
    const duration = endTime - startTime;

    try {
      // Step 1: Process result
      const processedResult = await this.processResult(context);

      // Step 2: Calculate metrics
      const metrics = this.calculateMetrics(context, duration);

      // Step 3: Log completion
      await this.logCompletion({
        executionId,
        agent,
        task,
        duration,
        success: !error,
        metrics,
        warnings
      });

      // Step 4: Save results if configured
      if (this.config.saveResults && processedResult) {
        await this.saveResults(executionId, processedResult);
      }

      // Step 5: Update aggregated metrics
      if (this.config.aggregateMetrics) {
        await this.updateAggregatedMetrics(agent, metrics);
      }

      // Step 6: Notify if configured
      if (this.config.notifyOnComplete) {
        await this.notify(context, processedResult);
      }

      // Step 7: Cleanup
      await this.cleanup(context);

      return {
        success: !error,
        executionId,
        agent,
        duration,
        result: processedResult,
        metrics,
        warnings
      };

    } catch (hookError) {
      console.error(`[Maestro] Post-execution hook error: ${hookError.message}`);

      return {
        success: false,
        executionId,
        agent,
        duration,
        error: hookError.message,
        originalError: error?.message
      };
    }
  }

  /**
   * Process and validate the execution result
   */
  async processResult(context) {
    const { result, agent } = context;

    if (!result) {
      return null;
    }

    // Extract structured data from result
    const processed = {
      raw: result,
      summary: this.extractSummary(result),
      codeChanges: this.extractCodeChanges(result),
      recommendations: this.extractRecommendations(result),
      artifacts: this.extractArtifacts(result)
    };

    return processed;
  }

  /**
   * Extract summary from result
   */
  extractSummary(result) {
    if (typeof result === 'string') {
      // Take first paragraph as summary
      const paragraphs = result.split('\n\n');
      return paragraphs[0].substring(0, 500);
    }
    return result.summary || null;
  }

  /**
   * Extract code changes from result
   */
  extractCodeChanges(result) {
    const changes = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    let match;

    while ((match = codeBlockRegex.exec(resultStr)) !== null) {
      changes.push({
        language: match[1] || 'unknown',
        code: match[2]
      });
    }

    return changes;
  }

  /**
   * Extract recommendations from result
   */
  extractRecommendations(result) {
    const recommendations = [];
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

    // Look for recommendation patterns
    const patterns = [
      /recommendation[s]?:\s*(.+)/gi,
      /suggest[s]?:\s*(.+)/gi,
      /consider:\s*(.+)/gi,
      /- \[ \] (.+)/g  // Unchecked todo items
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(resultStr)) !== null) {
        recommendations.push(match[1].trim());
      }
    }

    return recommendations;
  }

  /**
   * Extract artifacts (files created/modified)
   */
  extractArtifacts(result) {
    const artifacts = [];
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

    // Look for file paths
    const filePathRegex = /(?:created|modified|updated|wrote)[\s:]+([\/\w\-\.]+\.\w+)/gi;
    let match;

    while ((match = filePathRegex.exec(resultStr)) !== null) {
      artifacts.push({
        type: 'file',
        path: match[1]
      });
    }

    return artifacts;
  }

  /**
   * Calculate execution metrics
   */
  calculateMetrics(context, duration) {
    const { result, error } = context;

    return {
      duration,
      durationSeconds: (duration / 1000).toFixed(2),
      success: !error,
      resultSize: result ? JSON.stringify(result).length : 0,
      codeBlockCount: this.extractCodeChanges(result).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log execution completion
   */
  async logCompletion(data) {
    const { executionId, agent, task, duration, success, metrics, warnings } = data;

    const logEntry = {
      executionId,
      agent,
      task: task.substring(0, 200),
      duration,
      success,
      metrics,
      warnings,
      completedAt: new Date().toISOString()
    };

    // Update execution history
    this.executionHistory.push(logEntry);

    // Ensure log directory exists
    const logDir = this.config.logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Update log file
    const logFile = path.join(logDir, `${executionId}.json`);
    if (fs.existsSync(logFile)) {
      const existing = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      Object.assign(existing, logEntry);
      fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));
    } else {
      fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
    }

    // Console output
    const status = success ? '✓' : '✗';
    console.log(`[Maestro] ${status} Execution completed: ${executionId}`);
    console.log(`[Maestro]   Agent: ${agent}`);
    console.log(`[Maestro]   Duration: ${metrics.durationSeconds}s`);

    if (warnings.length > 0) {
      console.log(`[Maestro]   Warnings: ${warnings.length}`);
    }
  }

  /**
   * Save execution results
   */
  async saveResults(executionId, result) {
    const resultsDir = path.join(this.config.logDir, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultFile = path.join(resultsDir, `${executionId}_result.json`);
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  }

  /**
   * Update aggregated metrics for agent
   */
  async updateAggregatedMetrics(agent, metrics) {
    const metricsDir = this.config.metricsDir;
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const metricsFile = path.join(metricsDir, `${agent}.json`);
    let aggregated = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastExecution: null
    };

    if (fs.existsSync(metricsFile)) {
      aggregated = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    }

    // Update aggregated metrics
    aggregated.totalExecutions++;
    if (metrics.success) {
      aggregated.successfulExecutions++;
    } else {
      aggregated.failedExecutions++;
    }
    aggregated.totalDuration += metrics.duration;
    aggregated.averageDuration = Math.round(
      aggregated.totalDuration / aggregated.totalExecutions
    );
    aggregated.lastExecution = metrics.timestamp;

    fs.writeFileSync(metricsFile, JSON.stringify(aggregated, null, 2));
  }

  /**
   * Send notification on completion
   */
  async notify(context, result) {
    // Placeholder for notification implementation
    // Could integrate with Slack, email, webhooks, etc.
    console.log(`[Maestro] Notification: Agent ${context.agent} completed`);
  }

  /**
   * Cleanup after execution
   */
  async cleanup(context) {
    // Release any held resources
    // Clean up temporary files if needed
  }

  /**
   * Get execution history
   */
  getHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }
}

module.exports = PostExecutionHook;
