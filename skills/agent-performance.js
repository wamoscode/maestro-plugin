/**
 * Agent Performance Tracking Skill
 *
 * Tracks agent performance metrics, learns from task outcomes,
 * and provides intelligent agent selection based on historical data.
 */

class AgentPerformance {
  constructor(config = {}) {
    this.config = {
      metricsFile: config.metricsFile || 'maestro/agent-metrics.json',
      learningRate: config.learningRate || 0.1,
      minSamples: config.minSamples || 5,
      decayFactor: config.decayFactor || 0.95,
      ...config
    };

    this.metrics = new Map();
    this.taskHistory = [];
  }

  /**
   * Record task completion by agent
   * @param {Object} taskResult - Task completion data
   */
  recordTaskCompletion(taskResult) {
    const {
      agentId,
      taskType,
      taskDomain,
      duration,
      success,
      quality,
      iterations,
      complexity
    } = taskResult;

    const key = `${agentId}:${taskDomain}`;
    const existing = this.metrics.get(key) || this.createMetricEntry(agentId, taskDomain);

    // Update metrics
    existing.totalTasks += 1;
    existing.successCount += success ? 1 : 0;
    existing.successRate = existing.successCount / existing.totalTasks;

    // Update average duration with exponential moving average
    existing.avgDuration = this.updateEMA(existing.avgDuration, duration, existing.totalTasks);

    // Update quality score
    if (quality !== undefined) {
      existing.avgQuality = this.updateEMA(existing.avgQuality, quality, existing.totalTasks);
    }

    // Update iteration count (fewer is better)
    existing.avgIterations = this.updateEMA(existing.avgIterations, iterations, existing.totalTasks);

    // Update complexity handling
    existing.complexityHandling[complexity] = existing.complexityHandling[complexity] || { count: 0, success: 0 };
    existing.complexityHandling[complexity].count += 1;
    existing.complexityHandling[complexity].success += success ? 1 : 0;

    // Calculate effectiveness score
    existing.effectivenessScore = this.calculateEffectiveness(existing);

    existing.lastUpdated = new Date().toISOString();
    this.metrics.set(key, existing);

    // Record in history
    this.taskHistory.push({
      timestamp: new Date().toISOString(),
      ...taskResult
    });

    return existing;
  }

  /**
   * Get optimal agent(s) for a task
   * @param {Object} task - Task details
   * @returns {Object} Agent recommendations
   */
  getOptimalAgents(task) {
    const { domain, taskType, complexity, techStack } = task;
    const candidates = [];

    // Find all agents that have handled similar tasks
    for (const [key, metrics] of this.metrics) {
      if (key.includes(`:${domain}`)) {
        const agentId = key.split(':')[0];
        candidates.push({
          agentId,
          metrics,
          score: this.calculateMatchScore(metrics, task)
        });
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Get primary and secondary agents
    const primary = candidates[0] || null;
    const secondary = candidates.slice(1, 3);

    return {
      primary: primary ? {
        agentId: primary.agentId,
        confidence: primary.score,
        metrics: this.summarizeMetrics(primary.metrics)
      } : null,
      secondary: secondary.map(s => ({
        agentId: s.agentId,
        confidence: s.score,
        metrics: this.summarizeMetrics(s.metrics)
      })),
      alternatives: candidates.slice(3).map(c => c.agentId),
      reasoning: this.generateReasoning(primary, task),
      noData: candidates.length === 0
    };
  }

  /**
   * Get agent combination effectiveness
   * @param {Array} agents - List of agent IDs
   * @param {string} taskType - Type of task
   * @returns {Object} Combination effectiveness
   */
  getCombinationEffectiveness(agents, taskType) {
    const combinationKey = agents.sort().join('+');

    // Find historical tasks with this combination
    const relevantTasks = this.taskHistory.filter(t => {
      const taskAgents = Array.isArray(t.agentId) ? t.agentId.sort().join('+') : t.agentId;
      return taskAgents === combinationKey;
    });

    if (relevantTasks.length < this.config.minSamples) {
      return {
        combination: agents,
        hasData: false,
        message: `Insufficient data (${relevantTasks.length}/${this.config.minSamples} samples)`
      };
    }

    const successRate = relevantTasks.filter(t => t.success).length / relevantTasks.length;
    const avgDuration = relevantTasks.reduce((sum, t) => sum + t.duration, 0) / relevantTasks.length;
    const avgQuality = relevantTasks.reduce((sum, t) => sum + (t.quality || 0), 0) / relevantTasks.length;

    return {
      combination: agents,
      hasData: true,
      samples: relevantTasks.length,
      successRate,
      avgDuration,
      avgQuality,
      recommendation: successRate > 0.8 ? 'highly_effective' : successRate > 0.6 ? 'effective' : 'needs_review'
    };
  }

  /**
   * Learn from task outcome and update models
   * @param {Object} outcome - Task outcome data
   */
  learn(outcome) {
    const { taskId, agentId, success, feedback, improvements } = outcome;

    // Update agent metrics
    if (feedback && feedback.qualityScore !== undefined) {
      const key = `${agentId}:${outcome.domain}`;
      const metrics = this.metrics.get(key);
      if (metrics) {
        // Adjust effectiveness based on feedback
        metrics.feedbackScore = this.updateEMA(
          metrics.feedbackScore || 0.5,
          feedback.qualityScore,
          metrics.totalTasks
        );
        this.metrics.set(key, metrics);
      }
    }

    // Store improvements for future reference
    if (improvements && improvements.length > 0) {
      this.storeImprovements(agentId, improvements);
    }
  }

  /**
   * Get performance report for all agents
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      totalTasks: this.taskHistory.length,
      agents: [],
      topPerformers: [],
      needsImprovement: [],
      combinations: []
    };

    // Aggregate by agent
    const agentStats = new Map();
    for (const [key, metrics] of this.metrics) {
      const agentId = key.split(':')[0];
      if (!agentStats.has(agentId)) {
        agentStats.set(agentId, {
          agentId,
          domains: [],
          overallScore: 0,
          totalTasks: 0
        });
      }
      const stat = agentStats.get(agentId);
      stat.domains.push({
        domain: key.split(':')[1],
        ...this.summarizeMetrics(metrics)
      });
      stat.totalTasks += metrics.totalTasks;
      stat.overallScore += metrics.effectivenessScore * metrics.totalTasks;
    }

    // Calculate overall scores and sort
    for (const [agentId, stat] of agentStats) {
      stat.overallScore = stat.overallScore / stat.totalTasks;
      report.agents.push(stat);
    }

    report.agents.sort((a, b) => b.overallScore - a.overallScore);
    report.topPerformers = report.agents.slice(0, 5).map(a => a.agentId);
    report.needsImprovement = report.agents.filter(a => a.overallScore < 0.6).map(a => a.agentId);

    return report;
  }

  // Helper methods
  createMetricEntry(agentId, domain) {
    return {
      agentId,
      domain,
      totalTasks: 0,
      successCount: 0,
      successRate: 0,
      avgDuration: 0,
      avgQuality: 0,
      avgIterations: 0,
      effectivenessScore: 0.5,
      complexityHandling: {},
      lastUpdated: new Date().toISOString()
    };
  }

  updateEMA(oldValue, newValue, count) {
    if (count === 1) return newValue;
    const alpha = Math.min(this.config.learningRate, 2 / (count + 1));
    return oldValue * (1 - alpha) + newValue * alpha;
  }

  calculateEffectiveness(metrics) {
    const weights = {
      successRate: 0.4,
      quality: 0.3,
      speed: 0.2,
      efficiency: 0.1
    };

    const normalizedDuration = Math.max(0, 1 - (metrics.avgDuration / 3600000)); // Normalize to 1 hour
    const normalizedIterations = Math.max(0, 1 - (metrics.avgIterations / 10)); // Normalize to 10 iterations

    return (
      weights.successRate * metrics.successRate +
      weights.quality * (metrics.avgQuality || 0.5) +
      weights.speed * normalizedDuration +
      weights.efficiency * normalizedIterations
    );
  }

  calculateMatchScore(metrics, task) {
    let score = metrics.effectivenessScore;

    // Boost for complexity match
    if (metrics.complexityHandling[task.complexity]) {
      const complexitySuccess = metrics.complexityHandling[task.complexity].success /
        metrics.complexityHandling[task.complexity].count;
      score = score * 0.7 + complexitySuccess * 0.3;
    }

    // Adjust for sample size confidence
    const sampleConfidence = Math.min(1, metrics.totalTasks / this.config.minSamples);
    score = score * sampleConfidence + 0.5 * (1 - sampleConfidence);

    return score;
  }

  summarizeMetrics(metrics) {
    return {
      successRate: Math.round(metrics.successRate * 100) + '%',
      avgQuality: metrics.avgQuality ? Math.round(metrics.avgQuality * 100) + '%' : 'N/A',
      totalTasks: metrics.totalTasks,
      effectivenessScore: Math.round(metrics.effectivenessScore * 100) + '%'
    };
  }

  generateReasoning(primary, task) {
    if (!primary) {
      return 'No historical data available. Using default agent selection.';
    }

    const metrics = primary.metrics;
    return `Selected ${primary.agentId} based on ${metrics.successRate} success rate ` +
      `across ${metrics.totalTasks} similar tasks with ${metrics.effectivenessScore} effectiveness.`;
  }

  storeImprovements(agentId, improvements) {
    // Store for future reference
  }
}

module.exports = AgentPerformance;
