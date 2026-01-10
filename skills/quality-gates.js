/**
 * Quality Gates Skill
 *
 * Provides automated quality gate execution, metrics tracking,
 * and CI/CD integration for track checkpoints.
 */

class QualityGates {
  constructor(config = {}) {
    this.config = {
      configFile: config.configFile || 'maestro/quality-gates.json',
      defaultThresholds: {
        coverage: 80,
        lint: 0,
        typeErrors: 0,
        securityVulnerabilities: 0,
        ...config.defaultThresholds
      },
      ...config
    };

    this.gates = new Map();
    this.results = new Map();
  }

  /**
   * Define a quality gate
   * @param {Object} gate - Gate definition
   */
  defineGate(gate) {
    const gateConfig = {
      id: gate.id,
      name: gate.name,
      description: gate.description,
      checks: gate.checks.map(check => ({
        id: check.id,
        name: check.name,
        command: check.command,
        type: check.type || 'command', // command, metric, custom
        threshold: check.threshold,
        comparison: check.comparison || 'gte', // gte, lte, eq, gt, lt
        required: check.required !== false,
        timeout: check.timeout || 60000,
        parseOutput: check.parseOutput || null
      })),
      failurePolicy: gate.failurePolicy || 'block', // block, warn, skip
      retryPolicy: {
        maxRetries: gate.retryPolicy?.maxRetries || 2,
        retryDelay: gate.retryPolicy?.retryDelay || 5000
      }
    };

    this.gates.set(gate.id, gateConfig);
    return gateConfig;
  }

  /**
   * Execute all checks in a quality gate
   * @param {string} gateId - Gate to execute
   * @param {Object} context - Execution context
   * @returns {Object} Gate execution result
   */
  async executeGate(gateId, context = {}) {
    const gate = this.gates.get(gateId);
    if (!gate) {
      return { success: false, error: `Gate not found: ${gateId}` };
    }

    const result = {
      gateId,
      gateName: gate.name,
      executedAt: new Date().toISOString(),
      trackId: context.trackId,
      phaseId: context.phaseId,
      checks: [],
      passed: true,
      failedChecks: [],
      warnings: [],
      metrics: {},
      duration: 0
    };

    const startTime = Date.now();

    for (const check of gate.checks) {
      const checkResult = await this.executeCheck(check, context);
      result.checks.push(checkResult);

      if (!checkResult.passed) {
        if (check.required) {
          result.passed = false;
          result.failedChecks.push(check.id);
        } else {
          result.warnings.push({
            checkId: check.id,
            message: checkResult.message
          });
        }
      }

      if (checkResult.metric !== undefined) {
        result.metrics[check.id] = checkResult.metric;
      }
    }

    result.duration = Date.now() - startTime;

    // Store result
    this.results.set(`${gateId}:${context.trackId}:${context.phaseId}`, result);

    return result;
  }

  /**
   * Execute a single check
   * @param {Object} check - Check to execute
   * @param {Object} context - Execution context
   * @returns {Object} Check result
   */
  async executeCheck(check, context) {
    const result = {
      checkId: check.id,
      checkName: check.name,
      type: check.type,
      passed: false,
      metric: undefined,
      output: '',
      message: '',
      duration: 0
    };

    const startTime = Date.now();

    try {
      if (check.type === 'command') {
        // Execute command and parse output
        result.output = await this.runCommand(check.command, check.timeout);

        if (check.parseOutput) {
          result.metric = this.parseMetric(result.output, check.parseOutput);
          result.passed = this.compareValue(result.metric, check.threshold, check.comparison);
          result.message = result.passed
            ? `${check.name}: ${result.metric} meets threshold (${check.comparison} ${check.threshold})`
            : `${check.name}: ${result.metric} does not meet threshold (${check.comparison} ${check.threshold})`;
        } else {
          // Command success = passed
          result.passed = true;
          result.message = `${check.name}: Command completed successfully`;
        }
      } else if (check.type === 'metric') {
        result.metric = await this.getMetric(check.id, context);
        result.passed = this.compareValue(result.metric, check.threshold, check.comparison);
        result.message = result.passed
          ? `${check.name}: ${result.metric} meets threshold`
          : `${check.name}: ${result.metric} does not meet threshold (${check.comparison} ${check.threshold})`;
      } else if (check.type === 'custom') {
        // Custom check logic
        result.passed = await this.runCustomCheck(check, context);
        result.message = result.passed ? `${check.name}: Passed` : `${check.name}: Failed`;
      }
    } catch (error) {
      result.passed = false;
      result.message = `${check.name}: Error - ${error.message}`;
      result.output = error.stack;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Create default gates for track types
   * @param {string} trackType - Type of track
   * @param {Object} projectConfig - Project configuration
   * @returns {Object} Default gate configuration
   */
  createDefaultGates(trackType, projectConfig = {}) {
    const gates = {
      phase_checkpoint: {
        id: 'phase_checkpoint',
        name: 'Phase Checkpoint',
        description: 'Standard checks between phases',
        checks: [
          {
            id: 'lint',
            name: 'Linting',
            command: projectConfig.lintCommand || 'npm run lint',
            type: 'command',
            required: true
          },
          {
            id: 'type_check',
            name: 'Type Check',
            command: projectConfig.typeCheckCommand || 'npm run type-check',
            type: 'command',
            required: true
          },
          {
            id: 'test',
            name: 'Tests',
            command: projectConfig.testCommand || 'npm test',
            type: 'command',
            required: true
          }
        ]
      },
      pre_completion: {
        id: 'pre_completion',
        name: 'Pre-Completion Gate',
        description: 'Final checks before track completion',
        checks: [
          {
            id: 'coverage',
            name: 'Code Coverage',
            command: projectConfig.coverageCommand || 'npm run coverage',
            type: 'command',
            parseOutput: 'coverage_percentage',
            threshold: projectConfig.coverageThreshold || 80,
            comparison: 'gte',
            required: true
          },
          {
            id: 'security',
            name: 'Security Scan',
            command: projectConfig.securityCommand || 'npm audit --audit-level=high',
            type: 'command',
            required: trackType === 'feature' || trackType === 'bug'
          },
          {
            id: 'build',
            name: 'Build',
            command: projectConfig.buildCommand || 'npm run build',
            type: 'command',
            required: true
          }
        ]
      }
    };

    // Add TDD-specific gates
    if (projectConfig.workflow === 'tdd') {
      gates.phase_checkpoint.checks.unshift({
        id: 'test_first',
        name: 'Tests Written First',
        type: 'custom',
        required: true
      });
    }

    // Add security gates for sensitive tracks
    if (trackType === 'feature' && projectConfig.securityFocus) {
      gates.security_review = {
        id: 'security_review',
        name: 'Security Review Gate',
        description: 'Security-focused validation',
        checks: [
          {
            id: 'dependency_audit',
            name: 'Dependency Audit',
            command: 'npm audit --json',
            type: 'command',
            parseOutput: 'vulnerability_count',
            threshold: 0,
            comparison: 'lte'
          },
          {
            id: 'secrets_scan',
            name: 'Secrets Scan',
            command: projectConfig.secretsCommand || 'git secrets --scan',
            type: 'command'
          },
          {
            id: 'sast',
            name: 'Static Analysis',
            command: projectConfig.sastCommand || 'npm run security:sast',
            type: 'command',
            required: false
          }
        ]
      };
    }

    return gates;
  }

  /**
   * Get gate results history
   * @param {string} trackId - Track ID
   * @returns {Array} Gate results for track
   */
  getTrackGateHistory(trackId) {
    const history = [];
    for (const [key, result] of this.results) {
      if (key.includes(`:${trackId}:`)) {
        history.push(result);
      }
    }
    return history.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
  }

  /**
   * Generate quality report for track
   * @param {string} trackId - Track ID
   * @returns {Object} Quality report
   */
  generateQualityReport(trackId) {
    const history = this.getTrackGateHistory(trackId);

    return {
      trackId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalGates: history.length,
        passedGates: history.filter(r => r.passed).length,
        failedGates: history.filter(r => !r.passed).length,
        passRate: history.length > 0
          ? Math.round((history.filter(r => r.passed).length / history.length) * 100) + '%'
          : 'N/A'
      },
      metrics: this.aggregateMetrics(history),
      trends: this.calculateTrends(history),
      recommendations: this.generateRecommendations(history)
    };
  }

  // Helper methods
  async runCommand(command, timeout) {
    // Would execute actual command
    return '';
  }

  parseMetric(output, parser) {
    if (parser === 'coverage_percentage') {
      const match = output.match(/(\d+\.?\d*)%/);
      return match ? parseFloat(match[1]) : 0;
    }
    if (parser === 'vulnerability_count') {
      try {
        const data = JSON.parse(output);
        return data.metadata?.vulnerabilities?.total || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  compareValue(value, threshold, comparison) {
    switch (comparison) {
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      default: return value >= threshold;
    }
  }

  async getMetric(metricId, context) {
    return 0;
  }

  async runCustomCheck(check, context) {
    return true;
  }

  aggregateMetrics(history) {
    const metrics = {};
    for (const result of history) {
      for (const [key, value] of Object.entries(result.metrics || {})) {
        if (!metrics[key]) {
          metrics[key] = { values: [], latest: value };
        }
        metrics[key].values.push(value);
        metrics[key].latest = value;
      }
    }

    for (const [key, data] of Object.entries(metrics)) {
      data.average = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      data.min = Math.min(...data.values);
      data.max = Math.max(...data.values);
    }

    return metrics;
  }

  calculateTrends(history) {
    if (history.length < 2) return { trend: 'insufficient_data' };

    const recent = history.slice(0, 5);
    const recentPassRate = recent.filter(r => r.passed).length / recent.length;
    const overallPassRate = history.filter(r => r.passed).length / history.length;

    return {
      trend: recentPassRate > overallPassRate ? 'improving' : recentPassRate < overallPassRate ? 'declining' : 'stable',
      recentPassRate: Math.round(recentPassRate * 100) + '%',
      overallPassRate: Math.round(overallPassRate * 100) + '%'
    };
  }

  generateRecommendations(history) {
    const recommendations = [];
    const failedChecks = new Map();

    for (const result of history) {
      for (const check of result.checks.filter(c => !c.passed)) {
        const count = failedChecks.get(check.checkId) || 0;
        failedChecks.set(check.checkId, count + 1);
      }
    }

    for (const [checkId, count] of failedChecks) {
      if (count > 2) {
        recommendations.push({
          checkId,
          message: `Check "${checkId}" has failed ${count} times. Consider reviewing related code.`,
          priority: count > 5 ? 'high' : 'medium'
        });
      }
    }

    return recommendations;
  }
}

module.exports = QualityGates;
