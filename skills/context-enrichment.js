/**
 * Context Enrichment Skill
 *
 * Automatic context updates based on captured learnings.
 * Enriches task context with relevant knowledge before execution,
 * triggers on decisions and phase completions, and suggests
 * updates to context files.
 *
 * Features:
 * - Pre-execution context enrichment
 * - Decision-triggered enrichment
 * - Phase completion summaries
 * - Context file update suggestions
 * - Enrichment application
 */

const fs = require('fs');
const path = require('path');
const KnowledgeRecall = require('./knowledge-recall');

class ContextEnrichment {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      enableAutoEnrich: config.enableAutoEnrich !== false,
      enrichmentThreshold: config.enrichmentThreshold || 0.5,
      maxEnrichments: config.maxEnrichments || 5,
      suggestContextUpdates: config.suggestContextUpdates !== false,
      ...config
    };

    this.knowledgeRecall = config.knowledgeRecall || new KnowledgeRecall({
      maestroDir: this.config.maestroDir
    });

    this.pendingEnrichments = [];
    this.appliedEnrichments = [];
    this.enrichmentHistory = [];
  }

  /**
   * Enrich task context with relevant knowledge
   * @param {Object} task - Task to enrich
   * @param {Object} options - Enrichment options
   * @returns {Object} Enriched task context
   */
  enrichTaskContext(task, options = {}) {
    const branch = options.branch || null;
    const trackId = task.trackId || options.trackId;

    // Recall relevant knowledge
    const recallResult = this.knowledgeRecall.recallForTask(task, {
      branch: branch,
      limit: this.config.maxEnrichments
    });

    if (!recallResult.success || recallResult.knowledge.length === 0) {
      return {
        success: true,
        enriched: false,
        task: task,
        reason: 'No relevant knowledge found',
        message: 'Task context not enriched (no relevant knowledge)'
      };
    }

    // Build enrichment data
    const enrichment = {
      id: this.generateEnrichmentId(),
      timestamp: new Date().toISOString(),
      taskId: task.id,
      trackId: trackId,
      knowledge: recallResult.knowledge,
      recommendations: recallResult.recommendations,
      formattedContext: this.knowledgeRecall.formatForInjection(recallResult),
      relevanceScores: recallResult.knowledge.map(k => ({
        id: k.id,
        title: k.title,
        score: k.relevanceScore
      }))
    };

    // Record enrichment
    this.enrichmentHistory.push({
      id: enrichment.id,
      timestamp: enrichment.timestamp,
      taskId: task.id,
      knowledgeCount: enrichment.knowledge.length
    });

    // Create enriched task
    const enrichedTask = {
      ...task,
      enrichment: {
        id: enrichment.id,
        appliedAt: enrichment.timestamp,
        knowledgeIds: enrichment.knowledge.map(k => k.id),
        contextInjection: enrichment.formattedContext
      }
    };

    return {
      success: true,
      enriched: true,
      task: enrichedTask,
      enrichment: enrichment,
      knowledgeCount: enrichment.knowledge.length,
      message: `Task enriched with ${enrichment.knowledge.length} knowledge entries`
    };
  }

  /**
   * Handle decision capture event
   * @param {Object} decision - Captured decision
   * @param {Object} context - Current context
   * @returns {Object} Enrichment suggestions
   */
  onDecisionCapture(decision, context = {}) {
    const suggestions = [];

    // Check if decision suggests updates to existing patterns
    if (decision.type === 'decision' && decision.confidence >= 0.8) {
      // Suggest adding to decisions documentation
      suggestions.push({
        type: 'context_update',
        target: 'decisions',
        action: 'add',
        content: {
          title: decision.title,
          rationale: decision.content?.rationale || decision.summary,
          alternatives: decision.content?.alternatives || [],
          date: decision.timestamp
        },
        priority: 'high',
        reason: 'High-confidence decision should be documented'
      });
    }

    // Check if decision reveals a pattern
    if (this.detectPatternInDecision(decision)) {
      suggestions.push({
        type: 'context_update',
        target: 'patterns',
        action: 'add',
        content: {
          name: this.extractPatternName(decision),
          description: decision.summary,
          source: `Decision: ${decision.title}`
        },
        priority: 'medium',
        reason: 'Decision reveals a reusable pattern'
      });
    }

    // Check if decision affects tech stack
    if (this.affectsTechStack(decision)) {
      suggestions.push({
        type: 'context_update',
        target: 'tech-stack',
        action: 'update',
        content: {
          section: this.detectTechStackSection(decision),
          update: decision.summary
        },
        priority: 'medium',
        reason: 'Decision may affect tech stack documentation'
      });
    }

    // Add to pending enrichments
    if (suggestions.length > 0) {
      this.pendingEnrichments.push({
        id: this.generateEnrichmentId(),
        timestamp: new Date().toISOString(),
        source: 'decision',
        decisionId: decision.id,
        suggestions: suggestions
      });
    }

    return {
      success: true,
      decisionId: decision.id,
      suggestions: suggestions,
      hasSuggestions: suggestions.length > 0,
      message: suggestions.length > 0
        ? `Generated ${suggestions.length} context update suggestions`
        : 'No context updates suggested'
    };
  }

  /**
   * Handle phase completion event
   * @param {Object} phase - Completed phase
   * @param {Object} track - Track data
   * @param {Object} learnings - Phase learnings
   * @returns {Object} Phase completion enrichment
   */
  onPhaseCompletion(phase, track, learnings = {}) {
    const summary = {
      phaseNumber: phase.number || phase.id,
      phaseName: phase.name || phase.title,
      trackId: track.id,
      completedAt: new Date().toISOString(),
      decisions: learnings.decisions || [],
      discoveries: learnings.discoveries || [],
      blockers: learnings.blockers || [],
      patterns: learnings.patterns || []
    };

    // Generate phase summary
    const phaseSummary = this.generatePhaseSummary(summary);

    // Generate suggestions for context updates
    const suggestions = this.generatePhaseEnrichments(summary, track);

    // Add to pending enrichments
    if (suggestions.length > 0) {
      this.pendingEnrichments.push({
        id: this.generateEnrichmentId(),
        timestamp: summary.completedAt,
        source: 'phase_completion',
        phaseNumber: summary.phaseNumber,
        trackId: track.id,
        suggestions: suggestions
      });
    }

    return {
      success: true,
      phase: summary.phaseNumber,
      track: track.id,
      summary: phaseSummary,
      suggestions: suggestions,
      learningsCount: {
        decisions: summary.decisions.length,
        discoveries: summary.discoveries.length,
        blockers: summary.blockers.length,
        patterns: summary.patterns.length
      },
      message: `Phase ${summary.phaseNumber} completion processed`
    };
  }

  /**
   * Suggest context file updates based on learnings
   * @param {Object} learnings - Accumulated learnings
   * @param {Object} options - Suggestion options
   * @returns {Object} Update suggestions
   */
  suggestContextUpdates(learnings, options = {}) {
    const suggestions = [];
    const branch = options.branch || null;

    // Analyze decisions for pattern updates
    if (learnings.decisions && learnings.decisions.length > 0) {
      const significantDecisions = learnings.decisions.filter(d =>
        d.confidence >= 0.7 && d.importance !== 'low'
      );

      if (significantDecisions.length > 0) {
        suggestions.push({
          file: 'maestro/decisions/README.md',
          type: 'append',
          content: this.formatDecisionsForContext(significantDecisions),
          priority: 'high',
          reason: `${significantDecisions.length} significant decisions to document`
        });
      }
    }

    // Analyze discoveries for guideline updates
    if (learnings.discoveries && learnings.discoveries.length > 0) {
      const insights = learnings.discoveries.filter(d =>
        d.type === 'discovery' && d.confidence >= 0.6
      );

      if (insights.length > 0) {
        suggestions.push({
          file: 'maestro/product-guidelines.md',
          type: 'suggest',
          content: this.formatDiscoveriesForGuidelines(insights),
          priority: 'medium',
          reason: `${insights.length} insights may improve guidelines`
        });
      }
    }

    // Analyze blockers for prevention strategies
    if (learnings.blockers && learnings.blockers.length > 0) {
      const resolvedBlockers = learnings.blockers.filter(b =>
        b.details?.resolved && b.details?.preventionStrategy
      );

      if (resolvedBlockers.length > 0) {
        suggestions.push({
          file: 'maestro/troubleshooting.md',
          type: 'append',
          content: this.formatBlockersForTroubleshooting(resolvedBlockers),
          priority: 'medium',
          reason: `${resolvedBlockers.length} resolved blockers with prevention strategies`
        });
      }
    }

    // Analyze patterns for code style updates
    if (learnings.patterns && learnings.patterns.length > 0) {
      const codePatterns = learnings.patterns.filter(p =>
        p.category === 'implementation' && p.confidence >= 0.7
      );

      if (codePatterns.length > 0) {
        suggestions.push({
          file: 'maestro/code-styleguide.md',
          type: 'suggest',
          content: this.formatPatternsForStyleguide(codePatterns),
          priority: 'low',
          reason: `${codePatterns.length} patterns may enhance code style guide`
        });
      }
    }

    return {
      success: true,
      suggestions: suggestions,
      total: suggestions.length,
      byPriority: {
        high: suggestions.filter(s => s.priority === 'high').length,
        medium: suggestions.filter(s => s.priority === 'medium').length,
        low: suggestions.filter(s => s.priority === 'low').length
      },
      message: `Generated ${suggestions.length} context update suggestions`
    };
  }

  /**
   * Apply approved enrichments
   * @param {Array} enrichmentIds - IDs of enrichments to apply
   * @param {Object} options - Application options
   * @returns {Object} Application result
   */
  applyEnrichments(enrichmentIds, options = {}) {
    const results = {
      applied: [],
      failed: [],
      skipped: []
    };

    for (const id of enrichmentIds) {
      const enrichment = this.pendingEnrichments.find(e => e.id === id);

      if (!enrichment) {
        results.skipped.push({ id, reason: 'not_found' });
        continue;
      }

      try {
        for (const suggestion of enrichment.suggestions) {
          if (options.dryRun) {
            results.applied.push({
              enrichmentId: id,
              suggestion: suggestion,
              dryRun: true
            });
            continue;
          }

          const applyResult = this.applySuggestion(suggestion, options);

          if (applyResult.success) {
            results.applied.push({
              enrichmentId: id,
              suggestion: suggestion.type,
              target: suggestion.target || suggestion.file
            });
          } else {
            results.failed.push({
              enrichmentId: id,
              suggestion: suggestion.type,
              error: applyResult.error
            });
          }
        }

        // Remove from pending
        this.pendingEnrichments = this.pendingEnrichments.filter(e => e.id !== id);

        // Add to applied
        this.appliedEnrichments.push({
          ...enrichment,
          appliedAt: new Date().toISOString()
        });
      } catch (error) {
        results.failed.push({
          enrichmentId: id,
          error: error.message
        });
      }
    }

    return {
      success: results.failed.length === 0,
      results: results,
      message: `Applied ${results.applied.length} enrichments, ${results.failed.length} failed, ${results.skipped.length} skipped`
    };
  }

  /**
   * Apply a single suggestion
   * @param {Object} suggestion - Suggestion to apply
   * @param {Object} options - Application options
   * @returns {Object} Application result
   */
  applySuggestion(suggestion, options = {}) {
    try {
      if (suggestion.type === 'context_update') {
        // Context updates are typically suggestions, not auto-applied
        return {
          success: true,
          action: 'suggested',
          message: 'Context update suggested for manual review'
        };
      }

      if (suggestion.file) {
        const filePath = path.resolve(suggestion.file);

        if (suggestion.type === 'append') {
          let existingContent = '';
          if (fs.existsSync(filePath)) {
            existingContent = fs.readFileSync(filePath, 'utf8');
          }

          const newContent = existingContent + '\n\n' + suggestion.content;
          fs.writeFileSync(filePath, newContent, 'utf8');

          return {
            success: true,
            action: 'appended',
            file: suggestion.file
          };
        }

        if (suggestion.type === 'suggest') {
          // Don't modify file, just return the suggestion
          return {
            success: true,
            action: 'suggested',
            file: suggestion.file,
            content: suggestion.content
          };
        }
      }

      return {
        success: false,
        error: 'unknown_suggestion_type'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pending enrichments
   * @returns {Array} Pending enrichments
   */
  getPendingEnrichments() {
    return this.pendingEnrichments;
  }

  /**
   * Get applied enrichments
   * @returns {Array} Applied enrichments
   */
  getAppliedEnrichments() {
    return this.appliedEnrichments;
  }

  /**
   * Clear pending enrichments
   * @returns {Object} Clear result
   */
  clearPendingEnrichments() {
    const count = this.pendingEnrichments.length;
    this.pendingEnrichments = [];
    return {
      success: true,
      cleared: count,
      message: `Cleared ${count} pending enrichments`
    };
  }

  /**
   * Generate unique enrichment ID
   * @returns {string} Enrichment ID
   */
  generateEnrichmentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `enrich_${timestamp}_${random}`;
  }

  /**
   * Detect if decision reveals a pattern
   * @param {Object} decision - Decision to analyze
   * @returns {boolean} True if pattern detected
   */
  detectPatternInDecision(decision) {
    const patternIndicators = [
      'pattern', 'approach', 'convention', 'standard', 'practice',
      'always', 'never', 'prefer', 'avoid', 'use', 'structure'
    ];

    const text = `${decision.summary || ''} ${decision.content?.rationale || ''}`.toLowerCase();

    return patternIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Extract pattern name from decision
   * @param {Object} decision - Decision data
   * @returns {string} Pattern name
   */
  extractPatternName(decision) {
    // Simple extraction - could be made smarter
    const title = decision.title || decision.summary || '';
    return title.replace(/^(use|prefer|choose|select)\s+/i, '')
                .replace(/\s+(pattern|approach|convention)$/i, '')
                .trim();
  }

  /**
   * Check if decision affects tech stack
   * @param {Object} decision - Decision to check
   * @returns {boolean} True if affects tech stack
   */
  affectsTechStack(decision) {
    const techIndicators = [
      'library', 'framework', 'tool', 'package', 'dependency',
      'version', 'upgrade', 'migrate', 'replace', 'add', 'remove',
      'database', 'cache', 'api', 'service'
    ];

    const text = `${decision.summary || ''} ${decision.content?.rationale || ''}`.toLowerCase();

    return techIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Detect which tech stack section is affected
   * @param {Object} decision - Decision data
   * @returns {string} Section name
   */
  detectTechStackSection(decision) {
    const text = `${decision.summary || ''} ${decision.title || ''}`.toLowerCase();

    if (/front(end)?|react|vue|angular|css|ui/i.test(text)) return 'Frontend';
    if (/back(end)?|api|server|node|express|django/i.test(text)) return 'Backend';
    if (/database|sql|postgres|mongo|redis/i.test(text)) return 'Database';
    if (/test|jest|mocha|cypress/i.test(text)) return 'Testing';
    if (/deploy|ci|cd|docker|kubernetes/i.test(text)) return 'DevOps';

    return 'General';
  }

  /**
   * Generate phase summary
   * @param {Object} summary - Phase summary data
   * @returns {string} Formatted summary
   */
  generatePhaseSummary(summary) {
    const lines = [
      `## Phase ${summary.phaseNumber}: ${summary.phaseName}`,
      `Completed: ${summary.completedAt}`,
      '',
      `### Summary`,
      `- Decisions: ${summary.decisions.length}`,
      `- Discoveries: ${summary.discoveries.length}`,
      `- Blockers resolved: ${summary.blockers.filter(b => b.details?.resolved).length}`,
      `- Patterns identified: ${summary.patterns.length}`,
      ''
    ];

    if (summary.decisions.length > 0) {
      lines.push('### Key Decisions');
      for (const d of summary.decisions.slice(0, 3)) {
        lines.push(`- ${d.summary || d.title}`);
      }
      lines.push('');
    }

    if (summary.discoveries.length > 0) {
      lines.push('### Key Discoveries');
      for (const d of summary.discoveries.slice(0, 3)) {
        lines.push(`- ${d.summary || d.insight}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate enrichments from phase completion
   * @param {Object} summary - Phase summary
   * @param {Object} track - Track data
   * @returns {Array} Enrichment suggestions
   */
  generatePhaseEnrichments(summary, track) {
    const suggestions = [];

    // Suggest documenting significant decisions
    const significantDecisions = summary.decisions.filter(d =>
      d.confidence >= 0.7
    );

    if (significantDecisions.length > 0) {
      suggestions.push({
        type: 'knowledge_export',
        target: 'decisions',
        entries: significantDecisions,
        priority: 'high',
        reason: `${significantDecisions.length} decisions from phase ${summary.phaseNumber}`
      });
    }

    // Suggest patterns for library
    if (summary.patterns.length > 0) {
      suggestions.push({
        type: 'knowledge_export',
        target: 'patterns',
        entries: summary.patterns,
        priority: 'medium',
        reason: `${summary.patterns.length} patterns identified in phase ${summary.phaseNumber}`
      });
    }

    // Suggest blocker documentation
    const resolvedBlockers = summary.blockers.filter(b => b.details?.resolved);
    if (resolvedBlockers.length > 0) {
      suggestions.push({
        type: 'knowledge_export',
        target: 'blockers',
        entries: resolvedBlockers,
        priority: 'medium',
        reason: `${resolvedBlockers.length} blockers resolved with solutions`
      });
    }

    return suggestions;
  }

  /**
   * Format decisions for context file
   * @param {Array} decisions - Decisions to format
   * @returns {string} Formatted content
   */
  formatDecisionsForContext(decisions) {
    const lines = ['## Recent Decisions', ''];

    for (const d of decisions) {
      lines.push(`### ${d.title || d.summary}`);
      lines.push(`- Date: ${d.timestamp}`);
      lines.push(`- Confidence: ${Math.round((d.confidence || 0) * 100)}%`);
      if (d.content?.rationale) {
        lines.push(`- Rationale: ${d.content.rationale}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format discoveries for guidelines
   * @param {Array} discoveries - Discoveries to format
   * @returns {string} Formatted content
   */
  formatDiscoveriesForGuidelines(discoveries) {
    const lines = ['## Discovered Insights', ''];

    for (const d of discoveries) {
      lines.push(`- **${d.summary || d.insight}**`);
      if (d.details?.implications) {
        lines.push(`  - Implications: ${d.details.implications.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format blockers for troubleshooting
   * @param {Array} blockers - Blockers to format
   * @returns {string} Formatted content
   */
  formatBlockersForTroubleshooting(blockers) {
    const lines = ['## Known Issues and Solutions', ''];

    for (const b of blockers) {
      lines.push(`### ${b.title || b.summary}`);
      lines.push(`- Issue: ${b.details?.issue || b.summary}`);
      lines.push(`- Resolution: ${b.details?.resolution || 'Not documented'}`);
      if (b.details?.preventionStrategy) {
        lines.push(`- Prevention: ${b.details.preventionStrategy}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format patterns for styleguide
   * @param {Array} patterns - Patterns to format
   * @returns {string} Formatted content
   */
  formatPatternsForStyleguide(patterns) {
    const lines = ['## Discovered Patterns', ''];

    for (const p of patterns) {
      lines.push(`### ${p.name || p.title || 'Pattern'}`);
      lines.push(`- Description: ${p.description || p.summary}`);
      if (p.content?.solution) {
        lines.push(`- Usage: ${p.content.solution}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get enrichment statistics
   * @returns {Object} Enrichment stats
   */
  getStats() {
    return {
      pending: this.pendingEnrichments.length,
      applied: this.appliedEnrichments.length,
      history: this.enrichmentHistory.length,
      pendingBySource: this.groupBy(this.pendingEnrichments, 'source'),
      appliedBySource: this.groupBy(this.appliedEnrichments, 'source')
    };
  }

  /**
   * Group items by field
   * @param {Array} items - Items to group
   * @param {string} field - Field to group by
   * @returns {Object} Grouped counts
   */
  groupBy(items, field) {
    const groups = {};
    for (const item of items) {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }
}

module.exports = ContextEnrichment;
