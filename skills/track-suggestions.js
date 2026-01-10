/**
 * Track Suggestions Skill
 *
 * Provides intelligent track suggestions based on context analysis,
 * detects similar/duplicate tracks, and estimates scope.
 */

class TrackSuggestions {
  constructor(config = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.7,
      scopeEstimationModel: config.scopeEstimationModel || 'heuristic',
      ...config
    };
  }

  /**
   * Suggest tracks based on project context
   * @param {Object} context - Project context (product.md, tech-stack.md, etc.)
   * @returns {Array} Suggested tracks
   */
  suggestTracksFromContext(context) {
    const suggestions = [];

    // Analyze product goals for feature gaps
    if (context.product?.goals) {
      const goalSuggestions = this.analyzeGoalsForTracks(context.product.goals, context.existingTracks);
      suggestions.push(...goalSuggestions);
    }

    // Analyze tech stack for setup/improvement tracks
    if (context.techStack) {
      const techSuggestions = this.analyzeTechStackForTracks(context.techStack, context.existingTracks);
      suggestions.push(...techSuggestions);
    }

    // Analyze guidelines for compliance tracks
    if (context.guidelines) {
      const complianceSuggestions = this.analyzeGuidelinesForTracks(context.guidelines, context.existingTracks);
      suggestions.push(...complianceSuggestions);
    }

    // Analyze workflow for process improvements
    if (context.workflow) {
      const workflowSuggestions = this.analyzeWorkflowForTracks(context.workflow, context.existingTracks);
      suggestions.push(...workflowSuggestions);
    }

    return this.prioritizeSuggestions(suggestions);
  }

  /**
   * Detect similar or duplicate tracks
   * @param {Object} newTrack - Proposed new track
   * @param {Array} existingTracks - Existing tracks
   * @returns {Object} Similarity analysis
   */
  detectSimilarTracks(newTrack, existingTracks) {
    const similarities = [];

    for (const existing of existingTracks) {
      const similarity = this.calculateSimilarity(newTrack, existing);

      if (similarity.score >= this.config.similarityThreshold) {
        similarities.push({
          trackId: existing.id,
          trackTitle: existing.title,
          similarityScore: similarity.score,
          matchingAspects: similarity.aspects,
          recommendation: this.getSimilarityRecommendation(similarity.score)
        });
      }
    }

    const hasDuplicate = similarities.some(s => s.similarityScore >= 0.9);
    const hasRelated = similarities.length > 0;

    return {
      hasDuplicate,
      hasRelated,
      duplicateWarning: hasDuplicate
        ? `This track appears to duplicate "${similarities[0].trackTitle}"`
        : null,
      relatedTracks: similarities,
      suggestions: hasDuplicate
        ? ['Consider updating existing track instead', 'Merge with existing track', 'Create as sub-task']
        : hasRelated
          ? ['Link to related tracks', 'Review scope overlap']
          : []
    };
  }

  /**
   * Estimate track scope from description
   * @param {string} description - Track description
   * @param {Object} context - Project context
   * @returns {Object} Scope estimation
   */
  estimateScope(description, context = {}) {
    const analysis = this.analyzeDescription(description);
    const complexity = this.estimateComplexity(analysis, context);
    const taskEstimate = this.estimateTaskCount(analysis, complexity);
    const phaseEstimate = this.estimatePhaseCount(taskEstimate);

    return {
      complexity,
      estimatedTasks: taskEstimate,
      estimatedPhases: phaseEstimate,
      confidence: this.calculateConfidence(analysis),
      breakdown: {
        coreImplementation: Math.ceil(taskEstimate * 0.5),
        testing: Math.ceil(taskEstimate * 0.25),
        integration: Math.ceil(taskEstimate * 0.15),
        documentation: Math.ceil(taskEstimate * 0.1)
      },
      suggestedAgents: this.suggestAgentsFromDescription(description, context),
      riskIndicators: this.identifyRiskIndicators(analysis),
      notes: this.generateScopeNotes(analysis, complexity)
    };
  }

  /**
   * Auto-classify track type from description
   * @param {string} description - Track description
   * @returns {Object} Classification result
   */
  classifyTrackType(description) {
    const lower = description.toLowerCase();

    // Feature indicators
    const featureIndicators = ['add', 'create', 'implement', 'build', 'new', 'enable', 'support'];
    const featureScore = featureIndicators.filter(i => lower.includes(i)).length;

    // Bug indicators
    const bugIndicators = ['fix', 'bug', 'error', 'issue', 'broken', 'crash', 'fail', 'wrong'];
    const bugScore = bugIndicators.filter(i => lower.includes(i)).length;

    // Refactor indicators
    const refactorIndicators = ['refactor', 'improve', 'optimize', 'clean', 'restructure', 'migrate'];
    const refactorScore = refactorIndicators.filter(i => lower.includes(i)).length;

    // Chore indicators
    const choreIndicators = ['update', 'upgrade', 'bump', 'maintain', 'dependency', 'config'];
    const choreScore = choreIndicators.filter(i => lower.includes(i)).length;

    const scores = {
      feature: featureScore,
      bug: bugScore,
      refactor: refactorScore,
      chore: choreScore
    };

    const maxScore = Math.max(...Object.values(scores));
    const type = Object.keys(scores).find(k => scores[k] === maxScore) || 'feature';

    return {
      type,
      confidence: maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.5,
      scores,
      reasoning: this.generateClassificationReasoning(type, scores)
    };
  }

  /**
   * Suggest priority based on track analysis
   * @param {Object} track - Track data
   * @param {Object} context - Project context
   * @returns {Object} Priority suggestion
   */
  suggestPriority(track, context = {}) {
    let priorityScore = 50; // Default medium

    // Type-based adjustments
    if (track.type === 'bug') {
      priorityScore += 20; // Bugs are generally higher priority
    }

    // Security-related boost
    if (this.isSecurityRelated(track)) {
      priorityScore += 30;
    }

    // Goal alignment boost
    if (context.product?.goals) {
      const goalAlignment = this.calculateGoalAlignment(track, context.product.goals);
      priorityScore += goalAlignment * 20;
    }

    // Dependency consideration
    if (track.blockedBy?.length > 0) {
      priorityScore -= 10; // Blocked tracks lower priority
    }

    // Blocker consideration
    if (track.blocking?.length > 0) {
      priorityScore += 15; // Blocking tracks higher priority
    }

    const priority = priorityScore >= 80 ? 'critical'
      : priorityScore >= 60 ? 'high'
        : priorityScore >= 40 ? 'medium'
          : 'low';

    return {
      priority,
      score: Math.min(100, Math.max(0, priorityScore)),
      factors: this.explainPriorityFactors(track, context, priorityScore)
    };
  }

  // Analysis methods
  analyzeGoalsForTracks(goals, existingTracks) {
    const suggestions = [];

    for (const goal of goals) {
      // Check if goal has related tracks
      const hasTrack = existingTracks.some(t =>
        this.calculateTextSimilarity(t.title, goal) > 0.5 ||
        this.calculateTextSimilarity(t.spec?.overview || '', goal) > 0.5
      );

      if (!hasTrack) {
        suggestions.push({
          type: 'feature',
          title: `Implement: ${goal}`,
          description: `Track to achieve product goal: "${goal}"`,
          source: 'product_goals',
          priority: 'high',
          confidence: 0.7
        });
      }
    }

    return suggestions;
  }

  analyzeTechStackForTracks(techStack, existingTracks) {
    const suggestions = [];

    // Suggest setup tracks for new technologies
    if (techStack.technologies) {
      for (const tech of techStack.technologies) {
        if (tech.status === 'planned' || tech.status === 'evaluating') {
          suggestions.push({
            type: 'chore',
            title: `Setup ${tech.name}`,
            description: `Configure and integrate ${tech.name} into the project`,
            source: 'tech_stack',
            priority: 'medium',
            confidence: 0.8
          });
        }
      }
    }

    return suggestions;
  }

  analyzeGuidelinesForTracks(guidelines, existingTracks) {
    const suggestions = [];

    // Check for compliance gaps
    if (guidelines.security) {
      suggestions.push({
        type: 'chore',
        title: 'Security Compliance Audit',
        description: 'Review codebase against security guidelines',
        source: 'guidelines',
        priority: 'high',
        confidence: 0.6
      });
    }

    return suggestions;
  }

  analyzeWorkflowForTracks(workflow, existingTracks) {
    const suggestions = [];

    if (workflow.type === 'tdd' && !existingTracks.some(t => t.title.includes('test'))) {
      suggestions.push({
        type: 'chore',
        title: 'Establish Testing Foundation',
        description: 'Set up testing infrastructure to support TDD workflow',
        source: 'workflow',
        priority: 'high',
        confidence: 0.8
      });
    }

    return suggestions;
  }

  // Similarity calculation
  calculateSimilarity(track1, track2) {
    const aspects = [];
    let totalScore = 0;

    // Title similarity
    const titleSim = this.calculateTextSimilarity(track1.title, track2.title);
    if (titleSim > 0.5) {
      aspects.push({ aspect: 'title', score: titleSim });
      totalScore += titleSim * 0.3;
    }

    // Description/overview similarity
    const descSim = this.calculateTextSimilarity(
      track1.description || track1.spec?.overview || '',
      track2.description || track2.spec?.overview || ''
    );
    if (descSim > 0.5) {
      aspects.push({ aspect: 'description', score: descSim });
      totalScore += descSim * 0.3;
    }

    // Type match
    if (track1.type === track2.type) {
      aspects.push({ aspect: 'type', score: 1 });
      totalScore += 0.2;
    }

    // Affected areas overlap
    const areasOverlap = this.calculateArrayOverlap(
      track1.affectedAreas || [],
      track2.affectedAreas || []
    );
    if (areasOverlap > 0) {
      aspects.push({ aspect: 'affected_areas', score: areasOverlap });
      totalScore += areasOverlap * 0.2;
    }

    return {
      score: totalScore,
      aspects
    };
  }

  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;

    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = [...words1].filter(w => words2.has(w));
    const union = new Set([...words1, ...words2]);

    return intersection.length / union.size;
  }

  calculateArrayOverlap(arr1, arr2) {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1.map(a => typeof a === 'string' ? a : a.path));
    const set2 = new Set(arr2.map(a => typeof a === 'string' ? a : a.path));

    const intersection = [...set1].filter(x => set2.has(x));
    return intersection.length / Math.min(set1.size, set2.size);
  }

  getSimilarityRecommendation(score) {
    if (score >= 0.9) return 'duplicate';
    if (score >= 0.8) return 'likely_duplicate';
    if (score >= 0.7) return 'related';
    return 'possibly_related';
  }

  // Scope estimation helpers
  analyzeDescription(description) {
    const words = description.split(/\s+/);
    const sentences = description.split(/[.!?]+/).filter(s => s.trim());

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      hasMultipleComponents: description.includes(' and ') || description.includes(', '),
      mentionsApi: /api|endpoint|route/i.test(description),
      mentionsDatabase: /database|db|schema|model|migration/i.test(description),
      mentionsUi: /ui|component|page|view|frontend/i.test(description),
      mentionsAuth: /auth|login|permission|role/i.test(description),
      mentionsTesting: /test|spec|coverage/i.test(description),
      mentionsIntegration: /integrate|integration|connect|sync/i.test(description)
    };
  }

  estimateComplexity(analysis, context) {
    let score = 0;

    if (analysis.hasMultipleComponents) score += 2;
    if (analysis.mentionsApi) score += 1;
    if (analysis.mentionsDatabase) score += 2;
    if (analysis.mentionsUi) score += 1;
    if (analysis.mentionsAuth) score += 2;
    if (analysis.mentionsIntegration) score += 2;
    if (analysis.wordCount > 50) score += 1;

    if (score <= 2) return 'simple';
    if (score <= 4) return 'moderate';
    if (score <= 6) return 'complex';
    return 'very_complex';
  }

  estimateTaskCount(analysis, complexity) {
    const baseCount = { simple: 3, moderate: 6, complex: 10, very_complex: 15 }[complexity];

    let modifier = 0;
    if (analysis.mentionsDatabase) modifier += 2;
    if (analysis.mentionsAuth) modifier += 2;
    if (analysis.mentionsTesting) modifier += 2;

    return baseCount + modifier;
  }

  estimatePhaseCount(taskCount) {
    if (taskCount <= 4) return 1;
    if (taskCount <= 8) return 2;
    if (taskCount <= 12) return 3;
    return 4;
  }

  calculateConfidence(analysis) {
    // More detail = higher confidence
    const detailScore = analysis.wordCount / 100;
    return Math.min(0.9, 0.5 + detailScore);
  }

  suggestAgentsFromDescription(description, context) {
    const agents = [];
    const lower = description.toLowerCase();

    if (/api|endpoint|backend|server/i.test(lower)) {
      agents.push('backend-developer', 'api-designer');
    }
    if (/frontend|ui|component|react|vue/i.test(lower)) {
      agents.push('frontend-developer');
    }
    if (/database|sql|schema|model/i.test(lower)) {
      agents.push('sql-pro');
    }
    if (/security|auth|permission/i.test(lower)) {
      agents.push('security-auditor');
    }
    if (/test|quality|coverage/i.test(lower)) {
      agents.push('qa-expert');
    }
    if (/devops|deploy|ci|cd/i.test(lower)) {
      agents.push('devops-engineer');
    }

    return agents.length > 0 ? agents : ['fullstack-developer'];
  }

  identifyRiskIndicators(analysis) {
    const risks = [];

    if (analysis.mentionsAuth) {
      risks.push({ indicator: 'security', level: 'high', note: 'Involves authentication/authorization' });
    }
    if (analysis.mentionsDatabase) {
      risks.push({ indicator: 'data', level: 'medium', note: 'Database changes required' });
    }
    if (analysis.hasMultipleComponents) {
      risks.push({ indicator: 'scope', level: 'medium', note: 'Multiple components affected' });
    }

    return risks;
  }

  generateScopeNotes(analysis, complexity) {
    const notes = [];

    if (complexity === 'very_complex') {
      notes.push('Consider breaking into multiple tracks');
    }
    if (analysis.mentionsIntegration) {
      notes.push('Integration testing will be critical');
    }
    if (!analysis.mentionsTesting) {
      notes.push('Testing requirements should be defined');
    }

    return notes;
  }

  generateClassificationReasoning(type, scores) {
    const highest = Object.entries(scores)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (highest.length === 0) {
      return 'Default classification as feature (no strong indicators)';
    }

    return `Classified as ${type} based on keywords (${highest.map(([t, s]) => `${t}: ${s}`).join(', ')})`;
  }

  isSecurityRelated(track) {
    const securityKeywords = ['auth', 'security', 'permission', 'encrypt', 'password', 'token', 'session'];
    const text = `${track.title} ${track.description || ''} ${track.spec?.overview || ''}`.toLowerCase();
    return securityKeywords.some(kw => text.includes(kw));
  }

  calculateGoalAlignment(track, goals) {
    let maxAlignment = 0;
    const trackText = `${track.title} ${track.description || ''}`.toLowerCase();

    for (const goal of goals) {
      const alignment = this.calculateTextSimilarity(trackText, goal.toLowerCase());
      maxAlignment = Math.max(maxAlignment, alignment);
    }

    return maxAlignment;
  }

  explainPriorityFactors(track, context, score) {
    const factors = [];

    if (track.type === 'bug') factors.push('Bug fix (+20)');
    if (this.isSecurityRelated(track)) factors.push('Security-related (+30)');
    if (track.blockedBy?.length > 0) factors.push('Has blockers (-10)');
    if (track.blocking?.length > 0) factors.push('Blocking other tracks (+15)');

    return factors;
  }

  prioritizeSuggestions(suggestions) {
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }
}

module.exports = TrackSuggestions;
