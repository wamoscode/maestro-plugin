/**
 * Knowledge Store Skill
 *
 * File-based persistence layer for the context-aware learning system.
 * Handles storage, retrieval, querying, and indexing of knowledge entries
 * including decisions, patterns, research findings, and learnings.
 *
 * Directory Structure:
 * maestro/
 * ├── knowledge/                    # Knowledge persistence
 * │   ├── index.json               # Search index
 * │   ├── decisions/               # Decision entries
 * │   ├── patterns/                # Pattern entries
 * │   ├── research/                # Research entries
 * │   ├── learnings/               # Learning entries
 * │   └── sessions/                # Session journals
 * └── branches/{branch}/
 *     └── knowledge/               # Branch-specific knowledge
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class KnowledgeStore {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      knowledgeDir: config.knowledgeDir || 'knowledge',
      indexFile: config.indexFile || 'index.json',
      maxSearchResults: config.maxSearchResults || 50,
      enableBranchKnowledge: config.enableBranchKnowledge !== false,
      ...config
    };

    this.index = null;
    this.indexLoaded = false;
  }

  /**
   * Generate a unique knowledge entry ID
   * @param {string} type - Entry type (decision, pattern, research, learning)
   * @returns {string} Unique identifier
   */
  generateId(type) {
    const prefix = {
      decision: 'dec',
      pattern: 'pat',
      research: 'res',
      learning: 'lrn',
      blocker: 'blk'
    }[type] || 'know';

    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get the base knowledge directory path
   * @param {string} branch - Optional branch name for branch-specific knowledge
   * @returns {string} Path to knowledge directory
   */
  getKnowledgePath(branch = null) {
    if (branch && this.config.enableBranchKnowledge) {
      const sanitizedBranch = this.sanitizeBranchName(branch);
      return path.join(this.config.maestroDir, 'branches', sanitizedBranch, this.config.knowledgeDir);
    }
    return path.join(this.config.maestroDir, this.config.knowledgeDir);
  }

  /**
   * Get the path to a specific knowledge type directory
   * @param {string} type - Knowledge type
   * @param {string} branch - Optional branch name
   * @returns {string} Path to type directory
   */
  getTypePath(type, branch = null) {
    const typeDir = {
      decision: 'decisions',
      pattern: 'patterns',
      research: 'research',
      learning: 'learnings',
      blocker: 'blockers',
      session: 'sessions'
    }[type] || 'misc';

    return path.join(this.getKnowledgePath(branch), typeDir);
  }

  /**
   * Get the index file path
   * @param {string} branch - Optional branch name
   * @returns {string} Path to index file
   */
  getIndexPath(branch = null) {
    return path.join(this.getKnowledgePath(branch), this.config.indexFile);
  }

  /**
   * Sanitize branch name for file paths
   * @param {string} branch - Branch name
   * @returns {string} Sanitized name
   */
  sanitizeBranchName(branch) {
    return branch
      .replace(/\//g, '--')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
  }

  /**
   * Ensure all required directories exist
   * @param {string} branch - Optional branch name
   * @returns {Object} Directory creation result
   */
  ensureDirectories(branch = null) {
    const basePath = this.getKnowledgePath(branch);
    const types = ['decisions', 'patterns', 'research', 'learnings', 'blockers', 'sessions'];

    try {
      // Create base directory
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }

      // Create type directories
      for (const type of types) {
        const typePath = path.join(basePath, type);
        if (!fs.existsSync(typePath)) {
          fs.mkdirSync(typePath, { recursive: true });
        }
      }

      return {
        success: true,
        basePath: basePath,
        directories: types,
        message: `Knowledge directories created at ${basePath}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to create knowledge directories: ${error.message}`
      };
    }
  }

  /**
   * Save a knowledge entry
   * @param {Object} knowledge - Knowledge entry to save
   * @param {string} branch - Optional branch name
   * @returns {Object} Save result
   */
  save(knowledge, branch = null) {
    try {
      // Ensure directories exist
      this.ensureDirectories(branch);

      // Generate ID if not provided
      if (!knowledge.id) {
        knowledge.id = this.generateId(knowledge.type);
      }

      // Add metadata
      const entry = {
        ...knowledge,
        metadata: {
          ...knowledge.metadata,
          createdAt: knowledge.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: (knowledge.metadata?.version || 0) + 1
        }
      };

      // Get file path
      const typePath = this.getTypePath(entry.type, branch);
      const filePath = path.join(typePath, `${entry.id}.json`);

      // Write entry
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf8');

      // Update index
      this.updateIndex(entry, branch);

      return {
        success: true,
        id: entry.id,
        type: entry.type,
        filePath: filePath,
        entry: entry,
        message: `Knowledge entry saved: ${entry.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to save knowledge entry: ${error.message}`
      };
    }
  }

  /**
   * Get a knowledge entry by ID
   * @param {string} id - Entry ID
   * @param {string} branch - Optional branch name
   * @returns {Object|null} Knowledge entry or null
   */
  get(id, branch = null) {
    try {
      // Determine type from ID prefix
      const type = this.getTypeFromId(id);
      const typePath = this.getTypePath(type, branch);
      const filePath = path.join(typePath, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        // Try global knowledge if not found in branch
        if (branch) {
          return this.get(id, null);
        }
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update a knowledge entry
   * @param {string} id - Entry ID
   * @param {Object} updates - Fields to update
   * @param {string} branch - Optional branch name
   * @returns {Object} Update result
   */
  update(id, updates, branch = null) {
    try {
      const existing = this.get(id, branch);
      if (!existing) {
        return {
          success: false,
          error: 'not_found',
          message: `Knowledge entry not found: ${id}`
        };
      }

      // Merge updates
      const updated = {
        ...existing,
        ...updates,
        id: existing.id, // Preserve ID
        type: existing.type, // Preserve type
        metadata: {
          ...existing.metadata,
          ...updates.metadata,
          createdAt: existing.metadata.createdAt, // Preserve creation time
          updatedAt: new Date().toISOString(),
          version: (existing.metadata.version || 0) + 1
        }
      };

      // Save updated entry
      return this.save(updated, branch);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to update knowledge entry: ${error.message}`
      };
    }
  }

  /**
   * Delete a knowledge entry
   * @param {string} id - Entry ID
   * @param {string} branch - Optional branch name
   * @returns {Object} Delete result
   */
  delete(id, branch = null) {
    try {
      const type = this.getTypeFromId(id);
      const typePath = this.getTypePath(type, branch);
      const filePath = path.join(typePath, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'not_found',
          message: `Knowledge entry not found: ${id}`
        };
      }

      // Remove file
      fs.unlinkSync(filePath);

      // Update index
      this.removeFromIndex(id, branch);

      return {
        success: true,
        id: id,
        message: `Knowledge entry deleted: ${id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to delete knowledge entry: ${error.message}`
      };
    }
  }

  /**
   * Query knowledge entries by criteria
   * @param {Object} criteria - Query criteria
   * @param {string} branch - Optional branch name
   * @returns {Object} Query result with matching entries
   */
  query(criteria, branch = null) {
    try {
      const index = this.loadIndex(branch);
      let results = Object.values(index.entries || {});

      // Filter by type
      if (criteria.type) {
        const types = Array.isArray(criteria.type) ? criteria.type : [criteria.type];
        results = results.filter(entry => types.includes(entry.type));
      }

      // Filter by domain
      if (criteria.domain) {
        const domains = Array.isArray(criteria.domain) ? criteria.domain : [criteria.domain];
        results = results.filter(entry => domains.includes(entry.domain));
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        results = results.filter(entry =>
          entry.tags && criteria.tags.some(tag => entry.tags.includes(tag))
        );
      }

      // Filter by track
      if (criteria.trackId) {
        results = results.filter(entry =>
          entry.context?.trackId === criteria.trackId
        );
      }

      // Filter by date range
      if (criteria.since) {
        const sinceDate = new Date(criteria.since).getTime();
        results = results.filter(entry =>
          new Date(entry.metadata?.createdAt).getTime() >= sinceDate
        );
      }

      if (criteria.until) {
        const untilDate = new Date(criteria.until).getTime();
        results = results.filter(entry =>
          new Date(entry.metadata?.createdAt).getTime() <= untilDate
        );
      }

      // Filter by minimum confidence
      if (criteria.minConfidence !== undefined) {
        results = results.filter(entry =>
          (entry.confidence || 0) >= criteria.minConfidence
        );
      }

      // Sort by criteria
      if (criteria.sortBy) {
        const sortField = criteria.sortBy;
        const sortOrder = criteria.sortOrder === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          const aVal = this.getNestedValue(a, sortField);
          const bVal = this.getNestedValue(b, sortField);
          if (aVal < bVal) return -1 * sortOrder;
          if (aVal > bVal) return 1 * sortOrder;
          return 0;
        });
      } else {
        // Default sort by creation date descending
        results.sort((a, b) =>
          new Date(b.metadata?.createdAt) - new Date(a.metadata?.createdAt)
        );
      }

      // Apply limit
      const limit = criteria.limit || this.config.maxSearchResults;
      const offset = criteria.offset || 0;
      const total = results.length;
      results = results.slice(offset, offset + limit);

      // Load full entries if requested
      if (criteria.fullEntries) {
        results = results.map(entry => this.get(entry.id, branch)).filter(Boolean);
      }

      return {
        success: true,
        entries: results,
        total: total,
        limit: limit,
        offset: offset,
        criteria: criteria,
        message: `Found ${total} matching entries`
      };
    } catch (error) {
      return {
        success: false,
        entries: [],
        total: 0,
        error: error.message,
        message: `Query failed: ${error.message}`
      };
    }
  }

  /**
   * Full-text search across knowledge entries
   * @param {string} term - Search term
   * @param {Object} options - Search options
   * @param {string} branch - Optional branch name
   * @returns {Object} Search results
   */
  search(term, options = {}, branch = null) {
    try {
      const index = this.loadIndex(branch);
      const searchTerm = term.toLowerCase();
      const results = [];

      // Search through index entries
      for (const entry of Object.values(index.entries || {})) {
        let score = 0;

        // Search in title
        if (entry.title?.toLowerCase().includes(searchTerm)) {
          score += 10;
        }

        // Search in tags
        if (entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) {
          score += 5;
        }

        // Search in domain
        if (entry.domain?.toLowerCase().includes(searchTerm)) {
          score += 3;
        }

        // Search in searchText (pre-computed from content)
        if (entry.searchText?.toLowerCase().includes(searchTerm)) {
          score += 2;
        }

        if (score > 0) {
          results.push({
            ...entry,
            searchScore: score
          });
        }
      }

      // Sort by search score
      results.sort((a, b) => b.searchScore - a.searchScore);

      // Apply type filter if specified
      let filtered = results;
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type];
        filtered = filtered.filter(entry => types.includes(entry.type));
      }

      // Apply limit
      const limit = options.limit || this.config.maxSearchResults;
      const total = filtered.length;
      filtered = filtered.slice(0, limit);

      // Load full entries if requested
      if (options.fullEntries) {
        filtered = filtered.map(entry => {
          const full = this.get(entry.id, branch);
          return full ? { ...full, searchScore: entry.searchScore } : null;
        }).filter(Boolean);
      }

      return {
        success: true,
        entries: filtered,
        total: total,
        term: term,
        message: `Found ${total} entries matching "${term}"`
      };
    } catch (error) {
      return {
        success: false,
        entries: [],
        total: 0,
        error: error.message,
        message: `Search failed: ${error.message}`
      };
    }
  }

  /**
   * Record outcome for a knowledge entry (feedback loop)
   * @param {string} id - Entry ID
   * @param {Object} outcome - Outcome data
   * @param {string} branch - Optional branch name
   * @returns {Object} Update result
   */
  recordOutcome(id, outcome, branch = null) {
    try {
      const entry = this.get(id, branch);
      if (!entry) {
        return {
          success: false,
          error: 'not_found',
          message: `Knowledge entry not found: ${id}`
        };
      }

      // Initialize feedback if not exists
      if (!entry.feedback) {
        entry.feedback = {
          outcomes: [],
          usageCount: 0,
          successCount: 0,
          failureCount: 0
        };
      }

      // Add outcome
      const outcomeEntry = {
        timestamp: new Date().toISOString(),
        taskId: outcome.taskId || null,
        trackId: outcome.trackId || null,
        success: outcome.success,
        impact: outcome.impact || 'unknown', // positive, negative, neutral
        notes: outcome.notes || null
      };

      entry.feedback.outcomes.push(outcomeEntry);
      entry.feedback.usageCount++;

      if (outcome.success) {
        entry.feedback.successCount++;
      } else {
        entry.feedback.failureCount++;
      }

      // Calculate success rate
      entry.feedback.successRate =
        entry.feedback.usageCount > 0
          ? entry.feedback.successCount / entry.feedback.usageCount
          : null;

      // Update confidence based on feedback
      if (entry.feedback.usageCount >= 3) {
        // Adjust confidence based on success rate
        const baseConfidence = entry.confidence || 0.5;
        const feedbackInfluence = 0.3; // 30% influence from feedback
        entry.confidence = baseConfidence * (1 - feedbackInfluence) +
                          entry.feedback.successRate * feedbackInfluence;
      }

      // Save updated entry
      return this.save(entry, branch);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to record outcome: ${error.message}`
      };
    }
  }

  /**
   * Build or rebuild the search index
   * @param {string} branch - Optional branch name
   * @returns {Object} Build result
   */
  buildIndex(branch = null) {
    try {
      const basePath = this.getKnowledgePath(branch);
      const types = ['decisions', 'patterns', 'research', 'learnings', 'blockers'];
      const index = {
        version: '1.0.0',
        builtAt: new Date().toISOString(),
        branch: branch || 'global',
        entries: {},
        stats: {
          total: 0,
          byType: {},
          byDomain: {}
        }
      };

      // Process each type directory
      for (const type of types) {
        const typePath = path.join(basePath, type);
        index.stats.byType[type] = 0;

        if (!fs.existsSync(typePath)) {
          continue;
        }

        const files = fs.readdirSync(typePath)
          .filter(f => f.endsWith('.json'));

        for (const file of files) {
          try {
            const filePath = path.join(typePath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const entry = JSON.parse(content);

            // Create index entry (lightweight version)
            const indexEntry = {
              id: entry.id,
              type: entry.type,
              title: entry.title,
              domain: entry.domain,
              tags: entry.tags || [],
              confidence: entry.confidence,
              context: {
                trackId: entry.context?.trackId,
                taskId: entry.context?.taskId,
                branch: entry.context?.branch
              },
              metadata: {
                createdAt: entry.metadata?.createdAt,
                updatedAt: entry.metadata?.updatedAt
              },
              searchText: this.extractSearchText(entry)
            };

            index.entries[entry.id] = indexEntry;
            index.stats.total++;
            index.stats.byType[type]++;

            // Track by domain
            if (entry.domain) {
              index.stats.byDomain[entry.domain] =
                (index.stats.byDomain[entry.domain] || 0) + 1;
            }
          } catch (parseError) {
            // Skip invalid files
            continue;
          }
        }
      }

      // Write index file
      const indexPath = this.getIndexPath(branch);
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

      this.index = index;
      this.indexLoaded = true;

      return {
        success: true,
        indexPath: indexPath,
        stats: index.stats,
        message: `Index built with ${index.stats.total} entries`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to build index: ${error.message}`
      };
    }
  }

  /**
   * Load the index from file
   * @param {string} branch - Optional branch name
   * @returns {Object} Index data
   */
  loadIndex(branch = null) {
    if (this.indexLoaded && this.index && !branch) {
      return this.index;
    }

    const indexPath = this.getIndexPath(branch);

    try {
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        const index = JSON.parse(content);

        if (!branch) {
          this.index = index;
          this.indexLoaded = true;
        }

        return index;
      }
    } catch (error) {
      // Index file corrupted or missing
    }

    // Build index if not exists
    const buildResult = this.buildIndex(branch);
    if (buildResult.success) {
      return this.loadIndex(branch);
    }

    // Return empty index
    return {
      version: '1.0.0',
      entries: {},
      stats: { total: 0, byType: {}, byDomain: {} }
    };
  }

  /**
   * Update index with a new or modified entry
   * @param {Object} entry - Knowledge entry
   * @param {string} branch - Optional branch name
   */
  updateIndex(entry, branch = null) {
    const index = this.loadIndex(branch);

    // Create/update index entry
    index.entries[entry.id] = {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      domain: entry.domain,
      tags: entry.tags || [],
      confidence: entry.confidence,
      context: {
        trackId: entry.context?.trackId,
        taskId: entry.context?.taskId,
        branch: entry.context?.branch
      },
      metadata: {
        createdAt: entry.metadata?.createdAt,
        updatedAt: entry.metadata?.updatedAt
      },
      searchText: this.extractSearchText(entry)
    };

    // Update stats (simple increment, full rebuild for accuracy)
    index.stats.total = Object.keys(index.entries).length;
    index.builtAt = new Date().toISOString();

    // Write updated index
    const indexPath = this.getIndexPath(branch);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

    if (!branch) {
      this.index = index;
    }
  }

  /**
   * Remove an entry from the index
   * @param {string} id - Entry ID
   * @param {string} branch - Optional branch name
   */
  removeFromIndex(id, branch = null) {
    const index = this.loadIndex(branch);

    if (index.entries[id]) {
      delete index.entries[id];
      index.stats.total = Object.keys(index.entries).length;
      index.builtAt = new Date().toISOString();

      const indexPath = this.getIndexPath(branch);
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

      if (!branch) {
        this.index = index;
      }
    }
  }

  /**
   * Extract searchable text from an entry
   * @param {Object} entry - Knowledge entry
   * @returns {string} Searchable text
   */
  extractSearchText(entry) {
    const parts = [
      entry.title,
      entry.content?.summary,
      entry.content?.description,
      entry.content?.problem,
      entry.content?.solution,
      entry.content?.rationale
    ].filter(Boolean);

    return parts.join(' ').slice(0, 500); // Limit to 500 chars
  }

  /**
   * Get knowledge type from ID prefix
   * @param {string} id - Entry ID
   * @returns {string} Knowledge type
   */
  getTypeFromId(id) {
    const prefix = id.split('_')[0];
    return {
      dec: 'decision',
      pat: 'pattern',
      res: 'research',
      lrn: 'learning',
      blk: 'blocker'
    }[prefix] || 'misc';
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot-notation path
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Bulk save multiple knowledge entries
   * @param {Array} entries - Array of knowledge entries
   * @param {string} branch - Optional branch name
   * @returns {Object} Bulk save result
   */
  bulkSave(entries, branch = null) {
    const results = {
      success: true,
      total: entries.length,
      saved: 0,
      failed: 0,
      errors: []
    };

    for (const entry of entries) {
      const result = this.save(entry, branch);
      if (result.success) {
        results.saved++;
      } else {
        results.failed++;
        results.errors.push({
          entry: entry.id || 'new',
          error: result.error
        });
      }
    }

    results.success = results.failed === 0;
    results.message = `Saved ${results.saved}/${results.total} entries`;

    return results;
  }

  /**
   * Get statistics about the knowledge store
   * @param {string} branch - Optional branch name
   * @returns {Object} Store statistics
   */
  getStats(branch = null) {
    const index = this.loadIndex(branch);
    return {
      total: index.stats?.total || 0,
      byType: index.stats?.byType || {},
      byDomain: index.stats?.byDomain || {},
      lastUpdated: index.builtAt,
      branch: branch || 'global'
    };
  }

  /**
   * Export all knowledge to a single object (for backup/migration)
   * @param {string} branch - Optional branch name
   * @returns {Object} Export result
   */
  exportAll(branch = null) {
    try {
      const queryResult = this.query({ fullEntries: true, limit: 10000 }, branch);

      return {
        success: true,
        exportedAt: new Date().toISOString(),
        branch: branch || 'global',
        entries: queryResult.entries,
        total: queryResult.total,
        message: `Exported ${queryResult.total} entries`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Export failed: ${error.message}`
      };
    }
  }

  /**
   * Import knowledge from exported data
   * @param {Object} data - Exported knowledge data
   * @param {string} branch - Optional branch name
   * @returns {Object} Import result
   */
  importAll(data, branch = null) {
    if (!data.entries || !Array.isArray(data.entries)) {
      return {
        success: false,
        error: 'invalid_data',
        message: 'Invalid import data: entries array required'
      };
    }

    return this.bulkSave(data.entries, branch);
  }
}

module.exports = KnowledgeStore;
