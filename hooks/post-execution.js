/**
 * Post-Execution Hook
 *
 * This hook runs after sub-agent execution completes.
 * It handles result processing, logging, cleanup,
 * and captures learnings for the knowledge system.
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
      enableLearning: config.enableLearning !== false,
      ...config
    };

    this.executionHistory = [];

    // Reference to learning controller (set by pre-execution hook)
    this.learningController = null;
  }

  /**
   * Set learning controller reference
   * @param {Object} controller - SessionLearningController instance
   */
  setLearningController(controller) {
    this.learningController = controller;
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
      warnings = [],
      injectedKnowledgeIds = [],
      trackId,
      phase
    } = context;

    const endTime = Date.now();
    const duration = endTime - startTime;

    try {
      // Step 1: Process result
      const processedResult = await this.processResult(context);

      // Step 2: Calculate metrics
      const metrics = this.calculateMetrics(context, duration);

      // Step 3: Capture learnings from agent output (NEW)
      let learningsCapture = { captured: 0 };
      if (this.learningController && this.config.enableLearning) {
        learningsCapture = await this.captureLearnings(context, processedResult);
      }

      // Step 4: Record outcomes for injected knowledge (NEW)
      if (this.learningController && injectedKnowledgeIds.length > 0) {
        await this.recordKnowledgeOutcomes(context, injectedKnowledgeIds, !error);
      }

      // Step 5: Log completion
      await this.logCompletion({
        executionId,
        agent,
        task,
        duration,
        success: !error,
        metrics,
        warnings,
        learningsCapture
      });

      // Step 6: Save results if configured
      if (this.config.saveResults && processedResult) {
        await this.saveResults(executionId, processedResult);
      }

      // Step 7: Update aggregated metrics
      if (this.config.aggregateMetrics) {
        await this.updateAggregatedMetrics(agent, metrics);
      }

      // Step 8: Notify if configured
      if (this.config.notifyOnComplete) {
        await this.notify(context, processedResult);
      }

      // Step 9: Cleanup
      await this.cleanup(context);

      return {
        success: !error,
        executionId,
        agent,
        duration,
        result: processedResult,
        metrics,
        warnings,
        learningsCapture
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
   * Capture learnings from agent output
   * @param {Object} context - Execution context
   * @param {Object} processedResult - Processed execution result
   * @returns {Object} Capture results
   */
  async captureLearnings(context, processedResult) {
    if (!this.learningController) {
      return { captured: 0 };
    }

    const { agent, task, trackId, phase, executionId } = context;
    const resultText = typeof processedResult?.raw === 'string'
      ? processedResult.raw
      : JSON.stringify(processedResult?.raw || '');

    const captures = {
      decisions: 0,
      discoveries: 0,
      research: 0,
      blockers: 0
    };

    try {
      // Extract and capture decisions
      const decisions = this.extractDecisionsFromOutput(resultText);
      for (const decision of decisions) {
        this.learningController.captureDecision({
          title: decision.title,
          summary: decision.summary,
          rationale: decision.rationale,
          choice: decision.choice,
          agentId: agent,
          taskId: executionId,
          trackId: trackId,
          phase: phase,
          confidence: decision.confidence || 0.7,
          autoExtracted: true
        });
        captures.decisions++;
      }

      // Extract and capture discoveries/patterns
      const discoveries = this.extractDiscoveriesFromOutput(resultText);
      for (const discovery of discoveries) {
        this.learningController.captureDiscovery({
          insight: discovery.insight,
          summary: discovery.summary,
          pattern: discovery.pattern,
          agentId: agent,
          taskId: executionId,
          trackId: trackId,
          phase: phase,
          confidence: discovery.confidence || 0.6
        });
        captures.discoveries++;
      }

      // Extract and capture blockers
      const blockers = this.extractBlockersFromOutput(resultText);
      for (const blocker of blockers) {
        this.learningController.captureBlocker({
          issue: blocker.issue,
          summary: blocker.summary,
          resolution: blocker.resolution,
          resolved: blocker.resolved,
          agentId: agent,
          taskId: executionId,
          trackId: trackId,
          phase: phase
        });
        captures.blockers++;
      }

      return {
        captured: captures.decisions + captures.discoveries + captures.blockers,
        details: captures
      };
    } catch (error) {
      console.warn('[Maestro] Failed to capture learnings:', error.message);
      return { captured: 0, error: error.message };
    }
  }

  /**
   * Record outcomes for injected knowledge
   * @param {Object} context - Execution context
   * @param {Array} knowledgeIds - IDs of injected knowledge
   * @param {boolean} success - Whether task succeeded
   */
  async recordKnowledgeOutcomes(context, knowledgeIds, success) {
    if (!this.learningController) return;

    try {
      const outcome = {
        taskId: context.executionId,
        trackId: context.trackId,
        success: success,
        impact: success ? 'positive' : 'neutral',
        notes: success ? 'Task completed successfully' : 'Task had issues'
      };

      this.learningController.recordKnowledgeOutcome(knowledgeIds, outcome);
    } catch (error) {
      console.warn('[Maestro] Failed to record knowledge outcome:', error.message);
    }
  }

  /**
   * Extract decisions from agent output
   * @param {string} output - Agent output text
   * @returns {Array} Extracted decisions
   */
  extractDecisionsFromOutput(output) {
    const decisions = [];
    const decisionPatterns = [
      { pattern: /decided to (.+?)(?:\.|$)/gi, confidence: 0.8 },
      { pattern: /chose to (.+?)(?:\.|$)/gi, confidence: 0.8 },
      { pattern: /will use (.+?) (?:for|to|because)(.+?)(?:\.|$)/gi, confidence: 0.7 },
      { pattern: /going with (.+?)(?:\.|$)/gi, confidence: 0.7 },
      { pattern: /selected (.+?) (?:as|for|because)(.+?)(?:\.|$)/gi, confidence: 0.75 },
      { pattern: /prefer(?:red|ring)? (.+?) over (.+?)(?:\.|$)/gi, confidence: 0.8 }
    ];

    for (const { pattern, confidence } of decisionPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const fullMatch = match[0].trim();
        if (fullMatch.length > 10 && fullMatch.length < 500) {
          decisions.push({
            title: this.truncate(fullMatch, 100),
            summary: fullMatch,
            choice: match[1] || fullMatch,
            rationale: match[2] || null,
            confidence: confidence
          });
        }
      }
    }

    // Deduplicate by summary
    const unique = [];
    const seen = new Set();
    for (const d of decisions) {
      const key = d.summary.toLowerCase().substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(d);
      }
    }

    return unique.slice(0, 5); // Limit to 5 decisions per execution
  }

  /**
   * Extract discoveries from agent output
   * @param {string} output - Agent output text
   * @returns {Array} Extracted discoveries
   */
  extractDiscoveriesFromOutput(output) {
    const discoveries = [];
    const discoveryPatterns = [
      { pattern: /discovered (?:that )?(.+?)(?:\.|$)/gi, confidence: 0.7 },
      { pattern: /found (?:that )?(.+?)(?:\.|$)/gi, confidence: 0.6 },
      { pattern: /noticed (?:that )?(.+?)(?:\.|$)/gi, confidence: 0.6 },
      { pattern: /realized (?:that )?(.+?)(?:\.|$)/gi, confidence: 0.7 },
      { pattern: /pattern:?\s*(.+?)(?:\.|$)/gi, confidence: 0.8 },
      { pattern: /insight:?\s*(.+?)(?:\.|$)/gi, confidence: 0.8 }
    ];

    for (const { pattern, confidence } of discoveryPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const fullMatch = match[0].trim();
        if (fullMatch.length > 15 && fullMatch.length < 500) {
          discoveries.push({
            insight: match[1] || fullMatch,
            summary: fullMatch,
            pattern: fullMatch.toLowerCase().includes('pattern') ? match[1] : null,
            confidence: confidence
          });
        }
      }
    }

    return discoveries.slice(0, 3); // Limit to 3 discoveries per execution
  }

  /**
   * Extract blockers from agent output
   * @param {string} output - Agent output text
   * @returns {Array} Extracted blockers
   */
  extractBlockersFromOutput(output) {
    const blockers = [];
    const blockerPatterns = [
      { pattern: /blocked by (.+?)(?:\.|$)/gi },
      { pattern: /issue:?\s*(.+?)(?:\.|$)/gi },
      { pattern: /problem:?\s*(.+?)(?:\.|$)/gi },
      { pattern: /error:?\s*(.+?)(?:\.|$)/gi },
      { pattern: /resolved (?:the )?(?:issue|problem|error):?\s*(.+?)(?:\.|$)/gi }
    ];

    for (const { pattern } of blockerPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const fullMatch = match[0].trim();
        const isResolved = fullMatch.toLowerCase().includes('resolved');

        if (fullMatch.length > 10 && fullMatch.length < 500) {
          blockers.push({
            issue: match[1] || fullMatch,
            summary: fullMatch,
            resolved: isResolved,
            resolution: isResolved ? fullMatch : null
          });
        }
      }
    }

    return blockers.slice(0, 3); // Limit to 3 blockers per execution
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} length - Max length
   * @returns {string} Truncated text
   */
  truncate(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length - 3) + '...';
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
    const { executionId, agent, task, duration, success, metrics, warnings, learningsCapture } = data;

    const logEntry = {
      executionId,
      agent,
      task: task.substring(0, 200),
      duration,
      success,
      metrics,
      warnings,
      learningsCapture: learningsCapture || { captured: 0 },
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

    // Log learnings capture
    if (learningsCapture && learningsCapture.captured > 0) {
      console.log(`[Maestro]   Learnings captured: ${learningsCapture.captured}`);
      if (learningsCapture.details) {
        const { decisions, discoveries, blockers } = learningsCapture.details;
        if (decisions > 0) console.log(`[Maestro]     - Decisions: ${decisions}`);
        if (discoveries > 0) console.log(`[Maestro]     - Discoveries: ${discoveries}`);
        if (blockers > 0) console.log(`[Maestro]     - Blockers: ${blockers}`);
      }
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
