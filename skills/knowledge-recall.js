/**
 * Knowledge Recall Skill
 *
 * Surfaces relevant past knowledge for task execution context.
 * Queries the knowledge store, scores relevance, and formats
 * knowledge for injection into agent context.
 *
 * Features:
 * - Task-based knowledge retrieval
 * - Domain-specific querying
 * - Relevance scoring algorithm
 * - Recommendation generation
 * - Context formatting for agents
 */

const KnowledgeStore = require('./knowledge-store');

class KnowledgeRecall {
  constructor(config = {}) {
    this.config = {
      maxRecall: config.maxRecall || 10,
      minRelevanceScore: config.minRelevanceScore || 0.3,
      recencyWeight: config.recencyWeight || 0.2,
      confidenceWeight: config.confidenceWeight || 0.3,
      domainWeight: config.domainWeight || 0.25,
      tagWeight: config.tagWeight || 0.15,
      outcomeWeight: config.outcomeWeight || 0.1,
      maestroDir: config.maestroDir || 'maestro',
      ...config
    };

    this.knowledgeStore = config.knowledgeStore || new KnowledgeStore({
      maestroDir: this.config.maestroDir
    });
  }

  /**
   * Recall relevant knowledge for a task
   * @param {Object} task - Task context
   * @param {Object} options - Recall options
   * @returns {Object} Recalled knowledge with recommendations
   */
  recallForTask(task, options = {}) {
    const context = this.extractTaskContext(task);
    const branch = options.branch || null;

    // Query knowledge store with multiple criteria
    const queries = this.buildTaskQueries(context);
    const allResults = [];

    for (const query of queries) {
      const result = this.knowledgeStore.query(query, branch);
      if (result.success && result.entries.length > 0) {
        allResults.push(...result.entries);
      }
    }

    // Also try global knowledge if branch-specific
    if (branch) {
      for (const query of queries) {
        const globalResult = this.knowledgeStore.query(query, null);
        if (globalResult.success && globalResult.entries.length > 0) {
          allResults.push(...globalResult.entries);
        }
      }
    }

    // Deduplicate by ID
    const uniqueResults = this.deduplicateById(allResults);

    // Score relevance for each result
    const scoredResults = uniqueResults.map(entry => ({
      ...entry,
      relevanceScore: this.scoreRelevance(entry, context)
    }));

    // Filter by minimum score and sort
    const relevantResults = scoredResults
      .filter(r => r.relevanceScore >= this.config.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.limit || this.config.maxRecall);

    // Load full entries if only index data
    const fullResults = relevantResults.map(entry => {
      if (!entry.content) {
        const full = this.knowledgeStore.get(entry.id, branch);
        return full ? { ...full, relevanceScore: entry.relevanceScore } : entry;
      }
      return entry;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(fullResults, context);

    return {
      success: true,
      task: {
        id: task.id,
        title: task.title || task.description
      },
      knowledge: fullResults,
      recommendations: recommendations,
      total: fullResults.length,
      context: context,
      message: `Recalled ${fullResults.length} relevant knowledge entries`
    };
  }

  /**
   * Recall knowledge by domain
   * @param {string} domain - Domain name
   * @param {Object} options - Recall options
   * @returns {Object} Domain-specific knowledge
   */
  recallForDomain(domain, options = {}) {
    const branch = options.branch || null;

    const result = this.knowledgeStore.query({
      domain: domain,
      minConfidence: options.minConfidence || 0.5,
      sortBy: 'metadata.updatedAt',
      sortOrder: 'desc',
      limit: options.limit || this.config.maxRecall,
      fullEntries: true
    }, branch);

    if (!result.success) {
      return {
        success: false,
        domain: domain,
        knowledge: [],
        error: result.error,
        message: result.message
      };
    }

    // Group by type
    const grouped = this.groupByType(result.entries);

    return {
      success: true,
      domain: domain,
      knowledge: result.entries,
      grouped: grouped,
      total: result.total,
      message: `Found ${result.total} entries for domain "${domain}"`
    };
  }

  /**
   * Recall knowledge by tags
   * @param {Array} tags - Tags to search
   * @param {Object} options - Recall options
   * @returns {Object} Tag-matched knowledge
   */
  recallByTags(tags, options = {}) {
    const branch = options.branch || null;

    const result = this.knowledgeStore.query({
      tags: tags,
      minConfidence: options.minConfidence || 0.5,
      sortBy: 'confidence',
      sortOrder: 'desc',
      limit: options.limit || this.config.maxRecall,
      fullEntries: true
    }, branch);

    return {
      success: result.success,
      tags: tags,
      knowledge: result.entries || [],
      total: result.total || 0,
      message: result.message
    };
  }

  /**
   * Recall similar decisions
   * @param {Object} decision - Decision context
   * @param {Object} options - Recall options
   * @returns {Object} Similar past decisions
   */
  recallSimilarDecisions(decision, options = {}) {
    const branch = options.branch || null;

    // Build search terms from decision context
    const searchTerms = [
      decision.title,
      decision.domain,
      ...(decision.tags || [])
    ].filter(Boolean);

    const results = [];

    // Search for each term
    for (const term of searchTerms) {
      const searchResult = this.knowledgeStore.search(term, {
        type: 'decision',
        limit: 5,
        fullEntries: true
      }, branch);

      if (searchResult.success) {
        results.push(...searchResult.entries);
      }
    }

    // Deduplicate and score
    const unique = this.deduplicateById(results);
    const scored = unique.map(entry => ({
      ...entry,
      similarity: this.calculateSimilarity(entry, decision)
    }));

    const sorted = scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 5);

    return {
      success: true,
      decision: decision.title,
      similar: sorted,
      total: sorted.length,
      message: `Found ${sorted.length} similar past decisions`
    };
  }

  /**
   * Extract task context for matching
   * @param {Object} task - Task data
   * @returns {Object} Extracted context
   */
  extractTaskContext(task) {
    return {
      id: task.id,
      title: task.title || task.description,
      domain: task.domain || this.inferDomain(task),
      tags: task.tags || this.extractTags(task),
      agentId: task.agentId,
      trackId: task.trackId,
      phase: task.phase,
      type: task.type,
      keywords: this.extractKeywords(task)
    };
  }

  /**
   * Infer domain from task content
   * @param {Object} task - Task data
   * @returns {string|null} Inferred domain
   */
  inferDomain(task) {
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();

    const domainPatterns = {
      frontend: /\b(react|vue|angular|css|html|component|ui|ux|button|form|modal)\b/,
      backend: /\b(api|endpoint|server|controller|route|middleware|auth)\b/,
      database: /\b(sql|query|table|migration|schema|index|database|postgres|mysql)\b/,
      security: /\b(auth|permission|token|jwt|csrf|xss|injection|encrypt|secure)\b/,
      testing: /\b(test|spec|jest|mocha|coverage|mock|fixture|assertion)\b/,
      devops: /\b(deploy|docker|kubernetes|ci|cd|pipeline|aws|azure|gcp)\b/,
      performance: /\b(optimize|cache|latency|throughput|memory|cpu|performance)\b/
    };

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      if (pattern.test(text)) {
        return domain;
      }
    }

    return null;
  }

  /**
   * Extract tags from task content
   * @param {Object} task - Task data
   * @returns {Array} Extracted tags
   */
  extractTags(task) {
    const text = `${task.title || ''} ${task.description || ''}`;
    const tags = [];

    // Extract technology mentions
    const techPatterns = /\b(react|vue|angular|node|python|java|typescript|graphql|rest|postgres|mongodb|redis)\b/gi;
    const techMatches = text.match(techPatterns) || [];
    tags.push(...techMatches.map(t => t.toLowerCase()));

    // Extract action types
    const actionPatterns = /\b(create|update|delete|fix|add|remove|implement|refactor|optimize)\b/gi;
    const actionMatches = text.match(actionPatterns) || [];
    tags.push(...actionMatches.map(a => a.toLowerCase()));

    return [...new Set(tags)];
  }

  /**
   * Extract keywords from task content
   * @param {Object} task - Task data
   * @returns {Array} Keywords
   */
  extractKeywords(task) {
    const text = `${task.title || ''} ${task.description || ''}`;

    // Remove common words and extract significant terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return [...new Set(words)];
  }

  /**
   * Build queries for task context
   * @param {Object} context - Task context
   * @returns {Array} Query objects
   */
  buildTaskQueries(context) {
    const queries = [];

    // Query by domain
    if (context.domain) {
      queries.push({
        domain: context.domain,
        sortBy: 'confidence',
        sortOrder: 'desc',
        limit: 20
      });
    }

    // Query by tags
    if (context.tags && context.tags.length > 0) {
      queries.push({
        tags: context.tags,
        sortBy: 'metadata.updatedAt',
        sortOrder: 'desc',
        limit: 20
      });
    }

    // Query by track
    if (context.trackId) {
      queries.push({
        trackId: context.trackId,
        sortBy: 'metadata.createdAt',
        sortOrder: 'desc',
        limit: 10
      });
    }

    // Query for decisions (always useful)
    queries.push({
      type: 'decision',
      minConfidence: 0.6,
      sortBy: 'confidence',
      sortOrder: 'desc',
      limit: 10
    });

    // Query for patterns
    queries.push({
      type: 'pattern',
      minConfidence: 0.7,
      sortBy: 'metadata.usageCount',
      sortOrder: 'desc',
      limit: 10
    });

    return queries;
  }

  /**
   * Score relevance of a knowledge entry to task context
   * @param {Object} entry - Knowledge entry
   * @param {Object} context - Task context
   * @returns {number} Relevance score (0-1)
   */
  scoreRelevance(entry, context) {
    let score = 0;
    let maxScore = 0;

    // Domain match
    if (context.domain) {
      maxScore += this.config.domainWeight;
      if (entry.domain === context.domain) {
        score += this.config.domainWeight;
      } else if (this.areDomainsRelated(entry.domain, context.domain)) {
        score += this.config.domainWeight * 0.5;
      }
    }

    // Tag overlap
    if (context.tags && context.tags.length > 0 && entry.tags && entry.tags.length > 0) {
      maxScore += this.config.tagWeight;
      const overlap = context.tags.filter(t => entry.tags.includes(t)).length;
      const tagScore = overlap / Math.max(context.tags.length, entry.tags.length);
      score += this.config.tagWeight * tagScore;
    }

    // Confidence
    if (entry.confidence !== undefined) {
      maxScore += this.config.confidenceWeight;
      score += this.config.confidenceWeight * entry.confidence;
    }

    // Recency (entries from last 30 days score higher)
    if (entry.metadata?.createdAt) {
      maxScore += this.config.recencyWeight;
      const age = Date.now() - new Date(entry.metadata.createdAt).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (age < thirtyDays) {
        score += this.config.recencyWeight * (1 - age / thirtyDays);
      }
    }

    // Outcome/success rate
    if (entry.feedback?.successRate !== undefined) {
      maxScore += this.config.outcomeWeight;
      score += this.config.outcomeWeight * entry.feedback.successRate;
    }

    // Keyword match
    if (context.keywords && context.keywords.length > 0 && entry.searchText) {
      const entryText = entry.searchText.toLowerCase();
      const matches = context.keywords.filter(k => entryText.includes(k)).length;
      if (matches > 0) {
        score += 0.1 * Math.min(matches / context.keywords.length, 1);
        maxScore += 0.1;
      }
    }

    // Normalize score
    return maxScore > 0 ? Math.round((score / maxScore) * 100) / 100 : 0;
  }

  /**
   * Check if two domains are related
   * @param {string} domain1 - First domain
   * @param {string} domain2 - Second domain
   * @returns {boolean} True if related
   */
  areDomainsRelated(domain1, domain2) {
    const relatedDomains = {
      frontend: ['ui', 'ux', 'components'],
      backend: ['api', 'server', 'microservices'],
      database: ['sql', 'data', 'storage'],
      security: ['auth', 'authentication', 'authorization'],
      testing: ['qa', 'quality'],
      devops: ['infrastructure', 'deployment', 'ci-cd'],
      performance: ['optimization', 'scaling']
    };

    if (!domain1 || !domain2) return false;

    // Check if one domain is related to the other
    const related1 = relatedDomains[domain1] || [];
    const related2 = relatedDomains[domain2] || [];

    return related1.includes(domain2) || related2.includes(domain1);
  }

  /**
   * Calculate similarity between two entries
   * @param {Object} entry1 - First entry
   * @param {Object} entry2 - Second entry/decision
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(entry1, entry2) {
    let score = 0;

    // Domain match
    if (entry1.domain === entry2.domain) {
      score += 0.3;
    }

    // Tag overlap
    const tags1 = entry1.tags || [];
    const tags2 = entry2.tags || [];
    if (tags1.length > 0 && tags2.length > 0) {
      const overlap = tags1.filter(t => tags2.includes(t)).length;
      score += 0.3 * (overlap / Math.max(tags1.length, tags2.length));
    }

    // Title similarity (simple word overlap)
    const words1 = (entry1.title || '').toLowerCase().split(/\s+/);
    const words2 = (entry2.title || '').toLowerCase().split(/\s+/);
    if (words1.length > 0 && words2.length > 0) {
      const wordOverlap = words1.filter(w => words2.includes(w)).length;
      score += 0.4 * (wordOverlap / Math.max(words1.length, words2.length));
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Generate recommendations based on recalled knowledge
   * @param {Array} knowledge - Recalled knowledge entries
   * @param {Object} context - Task context
   * @returns {Array} Recommendations
   */
  generateRecommendations(knowledge, context) {
    const recommendations = [];

    // Group by type for analysis
    const grouped = this.groupByType(knowledge);

    // Decision recommendations
    const decisions = grouped.decision || [];
    if (decisions.length > 0) {
      const highConfidenceDecisions = decisions.filter(d => d.confidence >= 0.8);
      if (highConfidenceDecisions.length > 0) {
        recommendations.push({
          type: 'decision',
          title: 'Review Related Decisions',
          description: `${highConfidenceDecisions.length} high-confidence decisions may apply`,
          entries: highConfidenceDecisions.slice(0, 3).map(d => ({
            id: d.id,
            title: d.title,
            confidence: d.confidence,
            relevance: d.relevanceScore
          })),
          priority: 'high'
        });
      }
    }

    // Pattern recommendations
    const patterns = grouped.pattern || [];
    if (patterns.length > 0) {
      recommendations.push({
        type: 'pattern',
        title: 'Applicable Patterns',
        description: `${patterns.length} patterns may be useful`,
        entries: patterns.slice(0, 3).map(p => ({
          id: p.id,
          title: p.title,
          usageCount: p.metadata?.usageCount || 0
        })),
        priority: 'medium'
      });
    }

    // Blocker warnings
    const blockers = grouped.blocker || [];
    if (blockers.length > 0) {
      const relevantBlockers = blockers.filter(b =>
        b.relevanceScore >= 0.5 && b.details?.resolved
      );
      if (relevantBlockers.length > 0) {
        recommendations.push({
          type: 'warning',
          title: 'Previous Blockers',
          description: `${relevantBlockers.length} resolved blockers in similar tasks`,
          entries: relevantBlockers.slice(0, 3).map(b => ({
            id: b.id,
            issue: b.title,
            resolution: b.details?.resolution
          })),
          priority: 'medium'
        });
      }
    }

    // Research findings
    const research = grouped.research || [];
    if (research.length > 0) {
      recommendations.push({
        type: 'research',
        title: 'Related Research',
        description: `${research.length} research findings may be relevant`,
        entries: research.slice(0, 2).map(r => ({
          id: r.id,
          finding: r.title
        })),
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Format knowledge for injection into agent context
   * @param {Object} recallResult - Result from recallForTask
   * @returns {string} Formatted context string
   */
  formatForInjection(recallResult) {
    if (!recallResult.success || recallResult.knowledge.length === 0) {
      return '';
    }

    const sections = [];

    sections.push('## Relevant Past Knowledge');
    sections.push('');

    // Group by type
    const grouped = this.groupByType(recallResult.knowledge);

    // Decisions section
    if (grouped.decision && grouped.decision.length > 0) {
      sections.push('### Decisions');
      for (const decision of grouped.decision.slice(0, 5)) {
        const confidence = Math.round((decision.confidence || 0) * 100);
        const relevance = Math.round((decision.relevanceScore || 0) * 100);
        sections.push(`- **${decision.title}** (confidence: ${confidence}%, relevance: ${relevance}%)`);
        if (decision.content?.rationale) {
          sections.push(`  - Rationale: ${decision.content.rationale}`);
        }
      }
      sections.push('');
    }

    // Patterns section
    if (grouped.pattern && grouped.pattern.length > 0) {
      sections.push('### Patterns');
      for (const pattern of grouped.pattern.slice(0, 3)) {
        sections.push(`- **${pattern.title}**`);
        if (pattern.content?.solution) {
          sections.push(`  - Solution: ${pattern.content.solution.slice(0, 200)}...`);
        }
      }
      sections.push('');
    }

    // Recommendations section
    if (recallResult.recommendations && recallResult.recommendations.length > 0) {
      sections.push('### Recommendations');
      for (const rec of recallResult.recommendations) {
        sections.push(`- **${rec.title}** (${rec.priority} priority)`);
        sections.push(`  - ${rec.description}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Group entries by type
   * @param {Array} entries - Knowledge entries
   * @returns {Object} Grouped entries
   */
  groupByType(entries) {
    const grouped = {};
    for (const entry of entries) {
      const type = entry.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entry);
    }
    return grouped;
  }

  /**
   * Deduplicate entries by ID
   * @param {Array} entries - Entries to deduplicate
   * @returns {Array} Unique entries
   */
  deduplicateById(entries) {
    const seen = new Set();
    return entries.filter(entry => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    });
  }

  /**
   * Get knowledge usage statistics
   * @param {string} branch - Optional branch name
   * @returns {Object} Usage statistics
   */
  getUsageStats(branch = null) {
    const stats = this.knowledgeStore.getStats(branch);

    return {
      ...stats,
      recallConfig: {
        maxRecall: this.config.maxRecall,
        minRelevanceScore: this.config.minRelevanceScore
      }
    };
  }
}

module.exports = KnowledgeRecall;
