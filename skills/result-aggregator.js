/**
 * Result Aggregator Skill
 *
 * Aggregates and synthesizes results from multiple sub-agents
 * into coherent, unified deliverables.
 */

class ResultAggregator {
  constructor(config = {}) {
    this.config = {
      mergeStrategy: config.mergeStrategy || 'smart',
      conflictResolution: config.conflictResolution || 'latest',
      includeSummary: config.includeSummary !== false,
      maxResultSize: config.maxResultSize || 100000,
      ...config
    };
  }

  /**
   * Main aggregation entry point
   * @param {Array} results - Array of agent results
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregated result
   */
  aggregate(results, options = {}) {
    if (!results || results.length === 0) {
      return {
        success: false,
        error: 'No results to aggregate'
      };
    }

    // Filter valid results
    const validResults = results.filter(r => r && !r.error);
    const failedResults = results.filter(r => r && r.error);

    if (validResults.length === 0) {
      return {
        success: false,
        error: 'All agent executions failed',
        failures: failedResults
      };
    }

    // Categorize results by type
    const categorized = this.categorizeResults(validResults);

    // Merge results based on category
    const merged = this.mergeResults(categorized, options);

    // Detect and resolve conflicts
    const conflicts = this.detectConflicts(categorized);
    const resolved = conflicts.length > 0 ? this.resolveConflicts(conflicts, categorized) : {};

    // Generate summary
    const summary = this.config.includeSummary ? this.generateSummary(validResults, merged) : null;

    // Format final output
    const output = this.formatOutput(merged, resolved, summary, options);

    return {
      success: true,
      aggregated: output,
      metadata: {
        totalResults: results.length,
        successfulResults: validResults.length,
        failedResults: failedResults.length,
        conflictsResolved: conflicts.length,
        categories: Object.keys(categorized)
      },
      failures: failedResults.length > 0 ? failedResults : undefined
    };
  }

  /**
   * Categorize results by their type/content
   */
  categorizeResults(results) {
    const categories = {
      code: [],
      documentation: [],
      analysis: [],
      recommendations: [],
      artifacts: [],
      other: []
    };

    for (const result of results) {
      const content = this.extractContent(result);
      const category = this.detectCategory(content);
      categories[category].push({
        agent: result.agent,
        content,
        raw: result
      });
    }

    // Remove empty categories
    for (const key of Object.keys(categories)) {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    }

    return categories;
  }

  /**
   * Extract meaningful content from result
   */
  extractContent(result) {
    if (typeof result === 'string') {
      return { text: result };
    }

    if (result.result) {
      return this.extractContent(result.result);
    }

    return {
      text: result.raw || result.summary || '',
      codeBlocks: result.codeChanges || [],
      files: result.artifacts || [],
      recommendations: result.recommendations || []
    };
  }

  /**
   * Detect the category of content
   */
  detectCategory(content) {
    const text = (content.text || '').toLowerCase();

    // Code category
    if (content.codeBlocks && content.codeBlocks.length > 0) {
      return 'code';
    }
    if (text.includes('```') || text.includes('function') || text.includes('class ')) {
      return 'code';
    }

    // Documentation category
    if (text.includes('# ') || text.includes('documentation') || text.includes('readme')) {
      return 'documentation';
    }

    // Analysis category
    if (text.includes('analysis') || text.includes('found') || text.includes('detected') || text.includes('identified')) {
      return 'analysis';
    }

    // Recommendations category
    if (text.includes('recommend') || text.includes('suggest') || text.includes('consider')) {
      return 'recommendations';
    }

    // Artifacts category
    if (content.files && content.files.length > 0) {
      return 'artifacts';
    }

    return 'other';
  }

  /**
   * Merge results by category
   */
  mergeResults(categorized, options) {
    const merged = {};

    for (const [category, results] of Object.entries(categorized)) {
      switch (this.config.mergeStrategy) {
        case 'smart':
          merged[category] = this.smartMerge(category, results);
          break;
        case 'concatenate':
          merged[category] = this.concatenateMerge(results);
          break;
        case 'latest':
          merged[category] = results[results.length - 1];
          break;
        default:
          merged[category] = this.smartMerge(category, results);
      }
    }

    return merged;
  }

  /**
   * Smart merge based on category type
   */
  smartMerge(category, results) {
    switch (category) {
      case 'code':
        return this.mergeCode(results);
      case 'documentation':
        return this.mergeDocumentation(results);
      case 'analysis':
        return this.mergeAnalysis(results);
      case 'recommendations':
        return this.mergeRecommendations(results);
      case 'artifacts':
        return this.mergeArtifacts(results);
      default:
        return this.concatenateMerge(results);
    }
  }

  /**
   * Merge code results
   */
  mergeCode(results) {
    const codeBlocks = [];
    const fileChanges = new Map();

    for (const result of results) {
      // Collect code blocks
      if (result.content.codeBlocks) {
        codeBlocks.push(...result.content.codeBlocks);
      }

      // Extract code blocks from text
      const text = result.content.text || '';
      const blockRegex = /```(\w*)\n([\s\S]*?)```/g;
      let match;

      while ((match = blockRegex.exec(text)) !== null) {
        codeBlocks.push({
          language: match[1] || 'unknown',
          code: match[2].trim(),
          agent: result.agent
        });
      }

      // Track file changes
      if (result.content.files) {
        for (const file of result.content.files) {
          const key = file.path || file;
          if (!fileChanges.has(key)) {
            fileChanges.set(key, []);
          }
          fileChanges.set(key, result.agent);
        }
      }
    }

    return {
      codeBlocks,
      files: Array.from(fileChanges.entries()).map(([path, agent]) => ({ path, agent })),
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Merge documentation results
   */
  mergeDocumentation(results) {
    const sections = [];

    for (const result of results) {
      const text = result.content.text || '';

      // Split by headers
      const parts = text.split(/^(#+\s.+)$/m);

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('#')) {
          sections.push({
            header: part,
            content: parts[i + 1]?.trim() || '',
            agent: result.agent
          });
        }
      }
    }

    // Deduplicate sections by header
    const unique = new Map();
    for (const section of sections) {
      const key = section.header.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, section);
      }
    }

    return {
      sections: Array.from(unique.values()),
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Merge analysis results
   */
  mergeAnalysis(results) {
    const findings = [];

    for (const result of results) {
      findings.push({
        agent: result.agent,
        content: result.content.text || '',
        timestamp: result.raw?.endTime || Date.now()
      });
    }

    return {
      findings,
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Merge recommendations
   */
  mergeRecommendations(results) {
    const recommendations = new Map();

    for (const result of results) {
      const recs = result.content.recommendations || [];
      for (const rec of recs) {
        const key = typeof rec === 'string' ? rec : rec.message || rec.text;
        if (key && !recommendations.has(key.toLowerCase())) {
          recommendations.set(key.toLowerCase(), {
            recommendation: key,
            agent: result.agent
          });
        }
      }
    }

    return {
      recommendations: Array.from(recommendations.values()),
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Merge artifacts
   */
  mergeArtifacts(results) {
    const artifacts = new Map();

    for (const result of results) {
      const files = result.content.files || [];
      for (const file of files) {
        const path = file.path || file;
        if (!artifacts.has(path)) {
          artifacts.set(path, {
            path,
            agent: result.agent,
            type: file.type || 'file'
          });
        }
      }
    }

    return {
      artifacts: Array.from(artifacts.values()),
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Simple concatenation merge
   */
  concatenateMerge(results) {
    return {
      combined: results.map(r => ({
        agent: r.agent,
        content: r.content
      })),
      agents: results.map(r => r.agent)
    };
  }

  /**
   * Detect conflicts between results
   */
  detectConflicts(categorized) {
    const conflicts = [];

    // Check code conflicts (same file modified by multiple agents)
    if (categorized.code) {
      const fileAgents = new Map();

      for (const result of categorized.code) {
        const files = result.content.files || [];
        for (const file of files) {
          const path = file.path || file;
          if (!fileAgents.has(path)) {
            fileAgents.set(path, []);
          }
          fileAgents.get(path).push(result.agent);
        }
      }

      for (const [path, agents] of fileAgents) {
        if (agents.length > 1) {
          conflicts.push({
            type: 'file_conflict',
            path,
            agents,
            message: `Multiple agents modified ${path}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve detected conflicts
   */
  resolveConflicts(conflicts, categorized) {
    const resolutions = {};

    for (const conflict of conflicts) {
      switch (this.config.conflictResolution) {
        case 'latest':
          resolutions[conflict.path] = {
            resolved: 'Using latest agent\'s version',
            agent: conflict.agents[conflict.agents.length - 1]
          };
          break;
        case 'merge':
          resolutions[conflict.path] = {
            resolved: 'Attempted merge',
            agents: conflict.agents
          };
          break;
        case 'manual':
          resolutions[conflict.path] = {
            resolved: 'Requires manual resolution',
            agents: conflict.agents
          };
          break;
        default:
          resolutions[conflict.path] = {
            resolved: 'Using first agent\'s version',
            agent: conflict.agents[0]
          };
      }
    }

    return resolutions;
  }

  /**
   * Generate summary of aggregated results
   */
  generateSummary(results, merged) {
    const agents = [...new Set(results.map(r => r.agent))];
    const categories = Object.keys(merged);

    const summary = {
      overview: `Aggregated results from ${agents.length} agent(s): ${agents.join(', ')}`,
      categories: categories.map(cat => ({
        category: cat,
        items: merged[cat].codeBlocks?.length ||
               merged[cat].sections?.length ||
               merged[cat].findings?.length ||
               merged[cat].recommendations?.length ||
               merged[cat].artifacts?.length ||
               1
      })),
      totalItems: categories.reduce((sum, cat) => {
        const m = merged[cat];
        return sum + (m.codeBlocks?.length || m.sections?.length || m.findings?.length || m.recommendations?.length || m.artifacts?.length || 1);
      }, 0)
    };

    return summary;
  }

  /**
   * Format final output
   */
  formatOutput(merged, resolved, summary, options) {
    const output = {
      summary,
      results: merged,
      conflicts: Object.keys(resolved).length > 0 ? resolved : undefined
    };

    // Truncate if too large
    const outputString = JSON.stringify(output);
    if (outputString.length > this.config.maxResultSize) {
      output.truncated = true;
      output.warning = 'Results were truncated due to size limits';
    }

    return output;
  }
}

module.exports = ResultAggregator;
