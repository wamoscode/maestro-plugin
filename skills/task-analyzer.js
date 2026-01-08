/**
 * Task Analyzer Skill
 *
 * Analyzes user tasks to determine optimal sub-agent routing,
 * task decomposition, and execution strategy.
 */

class TaskAnalyzer {
  constructor(config = {}) {
    this.config = {
      minTaskLength: 3,
      maxSubtasks: 10,
      enableSemanticAnalysis: true,
      ...config
    };

    // Initialize keyword patterns for domain detection
    this.domainPatterns = this.initializeDomainPatterns();
    this.actionPatterns = this.initializeActionPatterns();
  }

  /**
   * Initialize domain detection patterns
   */
  initializeDomainPatterns() {
    return {
      frontend: {
        keywords: ['react', 'vue', 'angular', 'frontend', 'ui', 'ux', 'css', 'html', 'component', 'browser', 'dom', 'responsive', 'tailwind'],
        weight: 1.0
      },
      backend: {
        keywords: ['api', 'server', 'backend', 'endpoint', 'rest', 'graphql', 'database', 'auth', 'middleware', 'route'],
        weight: 1.0
      },
      devops: {
        keywords: ['deploy', 'ci/cd', 'docker', 'kubernetes', 'pipeline', 'infrastructure', 'aws', 'azure', 'gcp', 'terraform'],
        weight: 1.0
      },
      security: {
        keywords: ['security', 'vulnerability', 'audit', 'penetration', 'authentication', 'authorization', 'encryption', 'ssl', 'owasp'],
        weight: 1.0
      },
      testing: {
        keywords: ['test', 'qa', 'coverage', 'e2e', 'unit', 'integration', 'jest', 'playwright', 'cypress', 'mock'],
        weight: 1.0
      },
      data: {
        keywords: ['data', 'ml', 'machine learning', 'ai', 'analytics', 'etl', 'pipeline', 'model', 'training', 'dataset'],
        weight: 1.0
      },
      documentation: {
        keywords: ['document', 'readme', 'docs', 'api docs', 'guide', 'tutorial', 'comment', 'specification'],
        weight: 0.8
      },
      performance: {
        keywords: ['performance', 'optimize', 'speed', 'latency', 'cache', 'profiling', 'benchmark', 'slow'],
        weight: 0.9
      }
    };
  }

  /**
   * Initialize action detection patterns
   */
  initializeActionPatterns() {
    return {
      create: {
        patterns: ['create', 'build', 'implement', 'add', 'new', 'develop', 'write', 'generate'],
        type: 'creation'
      },
      modify: {
        patterns: ['update', 'modify', 'change', 'refactor', 'improve', 'enhance', 'fix', 'adjust'],
        type: 'modification'
      },
      review: {
        patterns: ['review', 'check', 'audit', 'analyze', 'inspect', 'examine', 'validate', 'assess'],
        type: 'review'
      },
      delete: {
        patterns: ['remove', 'delete', 'clean', 'deprecate', 'eliminate'],
        type: 'deletion'
      },
      research: {
        patterns: ['research', 'investigate', 'explore', 'find', 'discover', 'study', 'compare'],
        type: 'research'
      }
    };
  }

  /**
   * Main analysis entry point
   * @param {string} task - Task description
   * @param {Object} context - Additional context
   * @returns {Object} Analysis results
   */
  analyze(task, context = {}) {
    if (!task || task.length < this.config.minTaskLength) {
      return {
        valid: false,
        error: 'Task description too short or empty'
      };
    }

    const normalized = this.normalizeTask(task);

    // Perform various analyses
    const domains = this.detectDomains(normalized);
    const actions = this.detectActions(normalized);
    const complexity = this.assessComplexity(normalized, domains, actions);
    const subtasks = this.decomposeTask(normalized, domains, actions);
    const strategy = this.determineStrategy(domains, actions, complexity, subtasks);
    const dependencies = this.detectDependencies(subtasks);

    return {
      valid: true,
      original: task,
      normalized,
      analysis: {
        domains,
        actions,
        complexity,
        subtasks,
        dependencies,
        strategy
      },
      recommendations: this.generateRecommendations(domains, actions, complexity)
    };
  }

  /**
   * Normalize task for analysis
   */
  normalizeTask(task) {
    return task
      .toLowerCase()
      .replace(/[^\w\s/-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect relevant domains from task
   */
  detectDomains(task) {
    const detected = [];

    for (const [domain, config] of Object.entries(this.domainPatterns)) {
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of config.keywords) {
        if (task.includes(keyword)) {
          score += config.weight;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        detected.push({
          domain,
          score: Math.min(score, 1.0),
          keywords: matchedKeywords
        });
      }
    }

    // Sort by score
    detected.sort((a, b) => b.score - a.score);

    return detected;
  }

  /**
   * Detect actions from task
   */
  detectActions(task) {
    const detected = [];

    for (const [action, config] of Object.entries(this.actionPatterns)) {
      const matchedPatterns = [];

      for (const pattern of config.patterns) {
        if (task.includes(pattern)) {
          matchedPatterns.push(pattern);
        }
      }

      if (matchedPatterns.length > 0) {
        detected.push({
          action,
          type: config.type,
          patterns: matchedPatterns
        });
      }
    }

    return detected;
  }

  /**
   * Assess task complexity
   */
  assessComplexity(task, domains, actions) {
    let complexityScore = 0;
    const factors = [];

    // Multiple domains increase complexity
    if (domains.length > 1) {
      complexityScore += domains.length * 0.2;
      factors.push(`${domains.length} domains involved`);
    }

    // Multiple actions increase complexity
    if (actions.length > 1) {
      complexityScore += actions.length * 0.15;
      factors.push(`${actions.length} action types`);
    }

    // Long task descriptions suggest complexity
    const wordCount = task.split(' ').length;
    if (wordCount > 20) {
      complexityScore += 0.2;
      factors.push('Detailed description');
    }
    if (wordCount > 50) {
      complexityScore += 0.2;
      factors.push('Very detailed description');
    }

    // Specific keywords indicating complexity
    const complexityIndicators = ['integration', 'migration', 'architecture', 'system', 'full', 'complete', 'comprehensive'];
    for (const indicator of complexityIndicators) {
      if (task.includes(indicator)) {
        complexityScore += 0.1;
        factors.push(`Contains "${indicator}"`);
      }
    }

    // Classify complexity level
    let level;
    if (complexityScore < 0.3) {
      level = 'simple';
    } else if (complexityScore < 0.6) {
      level = 'moderate';
    } else if (complexityScore < 0.8) {
      level = 'complex';
    } else {
      level = 'very_complex';
    }

    return {
      score: Math.min(complexityScore, 1.0),
      level,
      factors
    };
  }

  /**
   * Decompose task into subtasks
   */
  decomposeTask(task, domains, actions) {
    const subtasks = [];

    // If task contains "and" or "then", split into subtasks
    const conjunctions = ['and then', ' then ', ' and ', ', and ', '; '];
    let parts = [task];

    for (const conjunction of conjunctions) {
      const newParts = [];
      for (const part of parts) {
        if (part.includes(conjunction)) {
          newParts.push(...part.split(conjunction).map(p => p.trim()).filter(p => p.length > 0));
        } else {
          newParts.push(part);
        }
      }
      parts = newParts;
    }

    // Create subtasks from parts
    for (let i = 0; i < parts.length && i < this.config.maxSubtasks; i++) {
      const part = parts[i];
      const partDomains = this.detectDomains(part);
      const partActions = this.detectActions(part);

      subtasks.push({
        id: `subtask_${i + 1}`,
        description: part,
        domains: partDomains.slice(0, 3),
        actions: partActions.slice(0, 2),
        order: i + 1
      });
    }

    // If no natural splits, create domain-based subtasks
    if (subtasks.length <= 1 && domains.length > 1) {
      for (const domain of domains.slice(0, this.config.maxSubtasks)) {
        subtasks.push({
          id: `subtask_${domain.domain}`,
          description: `${domain.domain} aspects of the task`,
          domains: [domain],
          actions,
          order: subtasks.length + 1
        });
      }
    }

    return subtasks;
  }

  /**
   * Detect dependencies between subtasks
   */
  detectDependencies(subtasks) {
    const dependencies = [];

    // Simple heuristic: later subtasks depend on earlier ones of different domains
    for (let i = 1; i < subtasks.length; i++) {
      const current = subtasks[i];
      const previous = subtasks[i - 1];

      // Backend before frontend is common pattern
      const currentDomains = current.domains.map(d => d.domain);
      const prevDomains = previous.domains.map(d => d.domain);

      if (currentDomains.includes('frontend') && prevDomains.includes('backend')) {
        dependencies.push({
          from: previous.id,
          to: current.id,
          reason: 'Frontend depends on backend API'
        });
      }

      // Testing after implementation
      if (currentDomains.includes('testing') && (prevDomains.includes('frontend') || prevDomains.includes('backend'))) {
        dependencies.push({
          from: previous.id,
          to: current.id,
          reason: 'Testing requires implementation'
        });
      }

      // Deployment after development
      if (currentDomains.includes('devops') && (prevDomains.includes('frontend') || prevDomains.includes('backend'))) {
        dependencies.push({
          from: previous.id,
          to: current.id,
          reason: 'Deployment after development'
        });
      }
    }

    return dependencies;
  }

  /**
   * Determine execution strategy
   */
  determineStrategy(domains, actions, complexity, subtasks) {
    // Single domain, single action = single agent
    if (domains.length === 1 && actions.length === 1 && subtasks.length <= 1) {
      return {
        type: 'single',
        reason: 'Simple, single-domain task'
      };
    }

    // Multiple independent domains = parallel
    if (domains.length > 1 && subtasks.length > 1 && complexity.level !== 'very_complex') {
      const domainSet = new Set(domains.map(d => d.domain));
      if (domainSet.has('frontend') && domainSet.has('backend')) {
        return {
          type: 'parallel',
          reason: 'Independent frontend and backend work'
        };
      }
    }

    // Complex with dependencies = sequential
    if (complexity.level === 'complex' || complexity.level === 'very_complex') {
      return {
        type: 'sequential',
        reason: 'Complex task requires ordered execution'
      };
    }

    // Default to hybrid for moderate complexity
    return {
      type: 'hybrid',
      reason: 'Mixed dependencies, using hybrid approach'
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(domains, actions, complexity) {
    const recommendations = [];

    // Suggest breaking down complex tasks
    if (complexity.level === 'very_complex') {
      recommendations.push({
        type: 'decomposition',
        message: 'Consider breaking this task into smaller, focused tasks for better results'
      });
    }

    // Suggest review for creation tasks
    const hasCreation = actions.some(a => a.type === 'creation');
    if (hasCreation && domains.some(d => d.domain === 'backend' || d.domain === 'security')) {
      recommendations.push({
        type: 'review',
        message: 'Consider adding security review after implementation'
      });
    }

    // Suggest testing
    const hasModification = actions.some(a => a.type === 'modification');
    const hasTestingDomain = domains.some(d => d.domain === 'testing');
    if ((hasCreation || hasModification) && !hasTestingDomain) {
      recommendations.push({
        type: 'testing',
        message: 'Consider adding tests for the implemented changes'
      });
    }

    // Suggest documentation
    if (hasCreation && domains.length > 1) {
      recommendations.push({
        type: 'documentation',
        message: 'Consider documenting the new feature or API'
      });
    }

    return recommendations;
  }
}

module.exports = TaskAnalyzer;
