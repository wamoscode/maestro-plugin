/**
 * Learning Journal Skill
 *
 * Real-time capture of decisions, research, and discoveries during
 * CDD workflow execution. Maintains a session-based journal that
 * can be exported to the knowledge base for persistence.
 *
 * Entry Types:
 * - decision: Choices made during implementation
 * - research: Findings from investigation/exploration
 * - discovery: Patterns, insights, or unexpected learnings
 * - blocker: Issues encountered and their resolutions
 * - note: General observations
 */

const crypto = require('crypto');

class LearningJournal {
  constructor(config = {}) {
    this.config = {
      maxEntries: config.maxEntries || 1000,
      autoSummarize: config.autoSummarize !== false,
      summarizeThreshold: config.summarizeThreshold || 20,
      ...config
    };

    this.sessionId = null;
    this.branch = null;
    this.entries = [];
    this.summary = null;
    this.startedAt = null;
    this.phaseEntries = new Map(); // phase -> entries
    this.trackEntries = new Map(); // trackId -> entries
  }

  /**
   * Start a new journal session
   * @param {string} sessionId - Session identifier
   * @param {string} branch - Git branch name
   * @returns {Object} Session initialization result
   */
  startSession(sessionId, branch) {
    this.sessionId = sessionId;
    this.branch = branch;
    this.entries = [];
    this.summary = null;
    this.startedAt = new Date().toISOString();
    this.phaseEntries = new Map();
    this.trackEntries = new Map();

    return {
      success: true,
      sessionId: this.sessionId,
      branch: this.branch,
      startedAt: this.startedAt,
      message: `Journal session started: ${sessionId}`
    };
  }

  /**
   * Generate a unique entry ID
   * @returns {string} Entry ID
   */
  generateEntryId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(3).toString('hex');
    return `entry_${timestamp}_${random}`;
  }

  /**
   * Add a generic journal entry
   * @param {Object} entry - Entry data
   * @returns {Object} Added entry with metadata
   */
  addEntry(entry) {
    if (this.entries.length >= this.config.maxEntries) {
      // Remove oldest entries to make room
      this.entries = this.entries.slice(-this.config.maxEntries + 1);
    }

    const journalEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type: entry.type || 'note',
      summary: entry.summary,
      details: entry.details || null,
      trackId: entry.trackId || null,
      taskId: entry.taskId || null,
      phase: entry.phase || null,
      agentId: entry.agentId || null,
      domain: entry.domain || null,
      tags: entry.tags || [],
      confidence: entry.confidence || 0.7,
      importance: entry.importance || 'normal', // low, normal, high, critical
      metadata: {
        source: entry.source || 'manual',
        autoExtracted: entry.autoExtracted || false,
        ...entry.metadata
      }
    };

    this.entries.push(journalEntry);

    // Index by phase
    if (journalEntry.phase) {
      if (!this.phaseEntries.has(journalEntry.phase)) {
        this.phaseEntries.set(journalEntry.phase, []);
      }
      this.phaseEntries.get(journalEntry.phase).push(journalEntry);
    }

    // Index by track
    if (journalEntry.trackId) {
      if (!this.trackEntries.has(journalEntry.trackId)) {
        this.trackEntries.set(journalEntry.trackId, []);
      }
      this.trackEntries.get(journalEntry.trackId).push(journalEntry);
    }

    // Auto-summarize if threshold reached
    if (this.config.autoSummarize &&
        this.entries.length % this.config.summarizeThreshold === 0) {
      this.updateSummary();
    }

    return {
      success: true,
      entry: journalEntry,
      totalEntries: this.entries.length,
      message: `Entry added: ${journalEntry.type}`
    };
  }

  /**
   * Log a decision entry
   * @param {Object} decision - Decision data
   * @returns {Object} Added decision entry
   */
  logDecision(decision) {
    return this.addEntry({
      type: 'decision',
      summary: decision.summary || decision.title,
      details: {
        title: decision.title,
        choice: decision.choice,
        rationale: decision.rationale,
        alternatives: decision.alternatives || [],
        consequences: decision.consequences || [],
        tradeoffs: decision.tradeoffs || null,
        reversible: decision.reversible !== false
      },
      trackId: decision.trackId,
      taskId: decision.taskId,
      phase: decision.phase,
      agentId: decision.agentId,
      domain: decision.domain,
      tags: ['decision', ...(decision.tags || [])],
      confidence: decision.confidence || 0.8,
      importance: decision.importance || 'normal',
      metadata: {
        source: decision.source || 'agent',
        autoExtracted: decision.autoExtracted || false
      }
    });
  }

  /**
   * Log a research finding
   * @param {Object} research - Research data
   * @returns {Object} Added research entry
   */
  logResearch(research) {
    return this.addEntry({
      type: 'research',
      summary: research.summary || research.finding,
      details: {
        finding: research.finding,
        context: research.context,
        sources: research.sources || [],
        evidence: research.evidence || null,
        applicability: research.applicability || null,
        limitations: research.limitations || [],
        followUp: research.followUp || []
      },
      trackId: research.trackId,
      taskId: research.taskId,
      phase: research.phase,
      agentId: research.agentId,
      domain: research.domain,
      tags: ['research', ...(research.tags || [])],
      confidence: research.confidence || 0.7,
      importance: research.importance || 'normal',
      metadata: {
        source: research.source || 'exploration',
        verified: research.verified || false
      }
    });
  }

  /**
   * Log a discovery (pattern, insight, or learning)
   * @param {Object} discovery - Discovery data
   * @returns {Object} Added discovery entry
   */
  logDiscovery(discovery) {
    return this.addEntry({
      type: 'discovery',
      summary: discovery.summary || discovery.insight,
      details: {
        insight: discovery.insight,
        pattern: discovery.pattern || null,
        observation: discovery.observation,
        implications: discovery.implications || [],
        examples: discovery.examples || [],
        applicableContexts: discovery.applicableContexts || [],
        suggestedAction: discovery.suggestedAction || null
      },
      trackId: discovery.trackId,
      taskId: discovery.taskId,
      phase: discovery.phase,
      agentId: discovery.agentId,
      domain: discovery.domain,
      tags: ['discovery', ...(discovery.tags || [])],
      confidence: discovery.confidence || 0.6,
      importance: discovery.importance || 'normal',
      metadata: {
        source: discovery.source || 'observation',
        patternType: discovery.patternType || null
      }
    });
  }

  /**
   * Log a blocker and its resolution
   * @param {Object} blocker - Blocker data
   * @returns {Object} Added blocker entry
   */
  logBlocker(blocker) {
    return this.addEntry({
      type: 'blocker',
      summary: blocker.summary || blocker.issue,
      details: {
        issue: blocker.issue,
        cause: blocker.cause || null,
        resolution: blocker.resolution || null,
        resolved: blocker.resolved || false,
        workaround: blocker.workaround || null,
        preventionStrategy: blocker.preventionStrategy || null,
        timeSpent: blocker.timeSpent || null,
        severity: blocker.severity || 'medium'
      },
      trackId: blocker.trackId,
      taskId: blocker.taskId,
      phase: blocker.phase,
      agentId: blocker.agentId,
      domain: blocker.domain,
      tags: ['blocker', ...(blocker.tags || [])],
      confidence: 0.9, // Blockers are usually certain
      importance: blocker.severity === 'high' ? 'high' : 'normal',
      metadata: {
        source: 'execution',
        resolvedAt: blocker.resolved ? new Date().toISOString() : null
      }
    });
  }

  /**
   * Get all entries for a specific phase
   * @param {number|string} phase - Phase identifier
   * @returns {Array} Phase entries
   */
  getPhaseEntries(phase) {
    return this.phaseEntries.get(phase) || [];
  }

  /**
   * Get all entries for a specific track
   * @param {string} trackId - Track identifier
   * @returns {Array} Track entries
   */
  getTrackEntries(trackId) {
    return this.trackEntries.get(trackId) || [];
  }

  /**
   * Get entries by type
   * @param {string} type - Entry type
   * @returns {Array} Matching entries
   */
  getEntriesByType(type) {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Get entries by domain
   * @param {string} domain - Domain name
   * @returns {Array} Matching entries
   */
  getEntriesByDomain(domain) {
    return this.entries.filter(e => e.domain === domain);
  }

  /**
   * Get high importance entries
   * @returns {Array} High importance entries
   */
  getHighImportanceEntries() {
    return this.entries.filter(e =>
      e.importance === 'high' || e.importance === 'critical'
    );
  }

  /**
   * Get session summary
   * @returns {Object} Session summary
   */
  getSessionSummary() {
    if (!this.summary || this.entries.length > this.summary.entryCount) {
      this.updateSummary();
    }
    return this.summary;
  }

  /**
   * Update the session summary
   */
  updateSummary() {
    const decisions = this.getEntriesByType('decision');
    const research = this.getEntriesByType('research');
    const discoveries = this.getEntriesByType('discovery');
    const blockers = this.getEntriesByType('blocker');
    const highImportance = this.getHighImportanceEntries();

    // Extract unique domains
    const domains = [...new Set(
      this.entries.map(e => e.domain).filter(Boolean)
    )];

    // Extract key learnings (high confidence discoveries)
    const keyLearnings = discoveries
      .filter(d => d.confidence >= 0.7)
      .map(d => d.summary)
      .slice(0, 5);

    // Extract resolved blockers
    const resolvedBlockers = blockers.filter(b => b.details?.resolved);

    // Calculate phase coverage
    const phaseCoverage = {};
    for (const [phase, entries] of this.phaseEntries) {
      phaseCoverage[phase] = entries.length;
    }

    this.summary = {
      sessionId: this.sessionId,
      branch: this.branch,
      startedAt: this.startedAt,
      updatedAt: new Date().toISOString(),
      entryCount: this.entries.length,
      counts: {
        decisions: decisions.length,
        research: research.length,
        discoveries: discoveries.length,
        blockers: blockers.length,
        highImportance: highImportance.length
      },
      domains: domains,
      phaseCoverage: phaseCoverage,
      keyLearnings: keyLearnings,
      blockersResolved: resolvedBlockers.length,
      blockersUnresolved: blockers.length - resolvedBlockers.length,
      averageConfidence: this.calculateAverageConfidence()
    };

    return this.summary;
  }

  /**
   * Calculate average confidence across entries
   * @returns {number} Average confidence
   */
  calculateAverageConfidence() {
    if (this.entries.length === 0) return 0;
    const total = this.entries.reduce((sum, e) => sum + (e.confidence || 0), 0);
    return Math.round((total / this.entries.length) * 100) / 100;
  }

  /**
   * Get phase summary
   * @param {number|string} phase - Phase identifier
   * @returns {Object} Phase summary
   */
  getPhaseSummary(phase) {
    const entries = this.getPhaseEntries(phase);
    const decisions = entries.filter(e => e.type === 'decision');
    const discoveries = entries.filter(e => e.type === 'discovery');
    const blockers = entries.filter(e => e.type === 'blocker');

    return {
      phase: phase,
      entryCount: entries.length,
      decisions: decisions.length,
      discoveries: discoveries.length,
      blockers: blockers.length,
      keyDecisions: decisions.slice(0, 3).map(d => d.summary),
      keyDiscoveries: discoveries.slice(0, 3).map(d => d.summary),
      unresolvedBlockers: blockers.filter(b => !b.details?.resolved).length
    };
  }

  /**
   * Export journal to knowledge base format
   * @param {Object} options - Export options
   * @returns {Object} Exportable knowledge entries
   */
  exportToKnowledgeBase(options = {}) {
    const minConfidence = options.minConfidence || 0.5;
    const exportTypes = options.types || ['decision', 'discovery', 'blocker'];

    const entries = this.entries
      .filter(e => exportTypes.includes(e.type))
      .filter(e => e.confidence >= minConfidence)
      .map(e => this.convertToKnowledgeEntry(e));

    return {
      success: true,
      sessionId: this.sessionId,
      branch: this.branch,
      exportedAt: new Date().toISOString(),
      entries: entries,
      total: entries.length,
      summary: this.getSessionSummary(),
      message: `Exported ${entries.length} entries for knowledge base`
    };
  }

  /**
   * Convert journal entry to knowledge entry format
   * @param {Object} entry - Journal entry
   * @returns {Object} Knowledge entry format
   */
  convertToKnowledgeEntry(entry) {
    return {
      type: entry.type,
      title: entry.summary,
      content: entry.details,
      domain: entry.domain,
      tags: entry.tags,
      confidence: entry.confidence,
      context: {
        trackId: entry.trackId,
        taskId: entry.taskId,
        phase: entry.phase,
        agentId: entry.agentId,
        branch: this.branch,
        sessionId: this.sessionId
      },
      metadata: {
        createdAt: entry.timestamp,
        source: 'learning-journal',
        journalEntryId: entry.id,
        importance: entry.importance,
        ...entry.metadata
      }
    };
  }

  /**
   * Merge entries from another journal
   * @param {LearningJournal} otherJournal - Journal to merge from
   * @returns {Object} Merge result
   */
  mergeFrom(otherJournal) {
    if (!otherJournal.entries) {
      return {
        success: false,
        error: 'invalid_journal',
        message: 'Invalid journal to merge from'
      };
    }

    const addedCount = 0;
    for (const entry of otherJournal.entries) {
      // Check for duplicate by ID
      if (!this.entries.find(e => e.id === entry.id)) {
        this.entries.push(entry);

        // Update indexes
        if (entry.phase) {
          if (!this.phaseEntries.has(entry.phase)) {
            this.phaseEntries.set(entry.phase, []);
          }
          this.phaseEntries.get(entry.phase).push(entry);
        }

        if (entry.trackId) {
          if (!this.trackEntries.has(entry.trackId)) {
            this.trackEntries.set(entry.trackId, []);
          }
          this.trackEntries.get(entry.trackId).push(entry);
        }
      }
    }

    this.updateSummary();

    return {
      success: true,
      entriesAdded: addedCount,
      totalEntries: this.entries.length,
      message: `Merged ${addedCount} entries`
    };
  }

  /**
   * Clear the journal
   * @returns {Object} Clear result
   */
  clear() {
    const count = this.entries.length;
    this.entries = [];
    this.summary = null;
    this.phaseEntries = new Map();
    this.trackEntries = new Map();

    return {
      success: true,
      entriesCleared: count,
      message: `Cleared ${count} entries`
    };
  }

  /**
   * Serialize journal to JSON
   * @returns {Object} Serialized journal
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      branch: this.branch,
      startedAt: this.startedAt,
      entries: this.entries,
      summary: this.getSessionSummary()
    };
  }

  /**
   * Load journal from serialized data
   * @param {Object} data - Serialized journal data
   * @returns {Object} Load result
   */
  fromJSON(data) {
    try {
      this.sessionId = data.sessionId;
      this.branch = data.branch;
      this.startedAt = data.startedAt;
      this.entries = data.entries || [];
      this.summary = data.summary || null;

      // Rebuild indexes
      this.phaseEntries = new Map();
      this.trackEntries = new Map();

      for (const entry of this.entries) {
        if (entry.phase) {
          if (!this.phaseEntries.has(entry.phase)) {
            this.phaseEntries.set(entry.phase, []);
          }
          this.phaseEntries.get(entry.phase).push(entry);
        }

        if (entry.trackId) {
          if (!this.trackEntries.has(entry.trackId)) {
            this.trackEntries.set(entry.trackId, []);
          }
          this.trackEntries.get(entry.trackId).push(entry);
        }
      }

      return {
        success: true,
        entriesLoaded: this.entries.length,
        message: `Loaded journal with ${this.entries.length} entries`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to load journal: ${error.message}`
      };
    }
  }

  /**
   * Get recent entries
   * @param {number} count - Number of entries
   * @returns {Array} Recent entries
   */
  getRecentEntries(count = 10) {
    return this.entries.slice(-count);
  }

  /**
   * Search entries by keyword
   * @param {string} keyword - Search keyword
   * @returns {Array} Matching entries
   */
  searchEntries(keyword) {
    const term = keyword.toLowerCase();
    return this.entries.filter(e =>
      e.summary?.toLowerCase().includes(term) ||
      e.tags?.some(t => t.toLowerCase().includes(term)) ||
      JSON.stringify(e.details).toLowerCase().includes(term)
    );
  }
}

module.exports = LearningJournal;
