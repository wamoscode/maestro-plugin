/**
 * Session Learning Controller
 *
 * Main orchestrator for the context-aware learning system.
 * Coordinates the learning lifecycle across journal, store,
 * recall, and enrichment components.
 *
 * Core Principle: Build knowledge if it doesn't exist,
 * use it, and improve it as work progresses.
 *
 * Architecture:
 * SessionLearningController (Orchestrator)
 *          │
 *     ┌────┴────┬────────────┬──────────────┐
 *     │         │            │              │
 * LearningJournal  ContextEnrichment  KnowledgeRecall  KnowledgeStore
 * (Real-time)      (Auto-update)      (Surface past)   (Persistence)
 */

const fs = require('fs');
const path = require('path');
const KnowledgeStore = require('./knowledge-store');
const LearningJournal = require('./learning-journal');
const KnowledgeRecall = require('./knowledge-recall');
const ContextEnrichment = require('./context-enrichment');

class SessionLearningController {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      autoPersist: config.autoPersist !== false,
      persistInterval: config.persistInterval || 300000, // 5 minutes
      enableEnrichment: config.enableEnrichment !== false,
      enableRecall: config.enableRecall !== false,
      minConfidenceForPersist: config.minConfidenceForPersist || 0.6,
      ...config
    };

    // Initialize components
    this.knowledgeStore = new KnowledgeStore({
      maestroDir: this.config.maestroDir
    });

    this.learningJournal = new LearningJournal({
      maxEntries: config.maxJournalEntries || 1000
    });

    this.knowledgeRecall = new KnowledgeRecall({
      maestroDir: this.config.maestroDir,
      knowledgeStore: this.knowledgeStore
    });

    this.contextEnrichment = new ContextEnrichment({
      maestroDir: this.config.maestroDir,
      knowledgeRecall: this.knowledgeRecall
    });

    // Session state
    this.sessionId = null;
    this.branch = null;
    this.activeTrackId = null;
    this.initialized = false;
    this.persistTimer = null;
    this.sessionStats = {
      decisionsCaptures: 0,
      researchCaptured: 0,
      discoveriesCaptured: 0,
      knowledgeRecalled: 0,
      enrichmentsApplied: 0
    };
  }

  /**
   * Initialize a learning session
   * @param {string} branch - Git branch name
   * @param {string} sessionId - Session identifier
   * @param {Object} options - Initialization options
   * @returns {Object} Initialization result
   */
  initializeSession(branch, sessionId, options = {}) {
    try {
      this.sessionId = sessionId;
      this.branch = branch;
      this.activeTrackId = options.trackId || null;

      // Ensure knowledge directories exist
      const dirResult = this.knowledgeStore.ensureDirectories(branch);
      if (!dirResult.success) {
        return {
          success: false,
          error: dirResult.error,
          message: `Failed to initialize knowledge directories: ${dirResult.message}`
        };
      }

      // Start learning journal
      this.learningJournal.startSession(sessionId, branch);

      // Build/load knowledge index
      const indexResult = this.knowledgeStore.buildIndex(branch);

      // Start auto-persist timer if enabled
      if (this.config.autoPersist) {
        this.startAutoPersist();
      }

      this.initialized = true;

      // Load session history if exists (imports high-confidence entries from past sessions)
      const historyResult = this.loadSessionHistory(branch, {
        importEntries: options.importHistory !== false,
        maxSessions: options.maxHistorySessions || 3
      });

      return {
        success: true,
        sessionId: this.sessionId,
        branch: this.branch,
        initialized: true,
        knowledgeStats: this.knowledgeStore.getStats(branch),
        historyLoaded: historyResult.loaded,
        historyDetails: {
          sessionsFound: historyResult.sessionsFound,
          entriesImported: historyResult.entriesImported,
          recentSessions: historyResult.recentSessions
        },
        message: `Learning session initialized for branch "${branch}"${historyResult.entriesImported > 0 ? ` (imported ${historyResult.entriesImported} entries from history)` : ''}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to initialize learning session: ${error.message}`
      };
    }
  }

  /**
   * Capture a decision
   * @param {Object} decision - Decision data
   * @returns {Object} Capture result
   */
  captureDecision(decision) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedDecision = {
      ...decision,
      trackId: decision.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Log to journal
    const journalResult = this.learningJournal.logDecision(enrichedDecision);

    // Trigger context enrichment
    if (this.config.enableEnrichment) {
      this.contextEnrichment.onDecisionCapture(journalResult.entry, {
        branch: this.branch,
        trackId: this.activeTrackId
      });
    }

    this.sessionStats.decisionsCaptures++;

    return {
      success: true,
      entryId: journalResult.entry.id,
      type: 'decision',
      hasSuggestions: this.contextEnrichment.getPendingEnrichments().length > 0,
      message: `Decision captured: ${decision.title || decision.summary}`
    };
  }

  /**
   * Capture research findings
   * @param {Object} research - Research data
   * @returns {Object} Capture result
   */
  captureResearch(research) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedResearch = {
      ...research,
      trackId: research.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Log to journal
    const journalResult = this.learningJournal.logResearch(enrichedResearch);

    this.sessionStats.researchCaptured++;

    return {
      success: true,
      entryId: journalResult.entry.id,
      type: 'research',
      message: `Research captured: ${research.finding || research.summary}`
    };
  }

  /**
   * Capture a discovery (pattern, insight)
   * @param {Object} discovery - Discovery data
   * @returns {Object} Capture result
   */
  captureDiscovery(discovery) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedDiscovery = {
      ...discovery,
      trackId: discovery.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Log to journal
    const journalResult = this.learningJournal.logDiscovery(enrichedDiscovery);

    this.sessionStats.discoveriesCaptured++;

    return {
      success: true,
      entryId: journalResult.entry.id,
      type: 'discovery',
      message: `Discovery captured: ${discovery.insight || discovery.summary}`
    };
  }

  /**
   * Capture a blocker and resolution
   * @param {Object} blocker - Blocker data
   * @returns {Object} Capture result
   */
  captureBlocker(blocker) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedBlocker = {
      ...blocker,
      trackId: blocker.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Log to journal
    const journalResult = this.learningJournal.logBlocker(enrichedBlocker);

    return {
      success: true,
      entryId: journalResult.entry.id,
      type: 'blocker',
      resolved: blocker.resolved || false,
      message: `Blocker captured: ${blocker.issue || blocker.summary}`
    };
  }

  /**
   * Capture an entity (component, service, module, etc.)
   * @param {Object} entity - Entity data
   * @returns {Object} Capture result
   */
  captureEntity(entity) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedEntity = {
      ...entity,
      trackId: entity.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Create entity entry
    const entry = {
      id: `ent_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'entity',
      timestamp: new Date().toISOString(),
      title: entity.name || entity.title,
      name: entity.name || entity.title,
      entityType: entity.entityType || 'component',
      content: {
        description: entity.description,
        location: entity.location,
        responsibilities: entity.responsibilities || [],
        dependencies: entity.dependencies || []
      },
      context: {
        trackId: enrichedEntity.trackId,
        sessionId: enrichedEntity.sessionId,
        branch: enrichedEntity.branch
      },
      domain: entity.domain,
      tags: entity.tags || [],
      relatedDecisions: entity.relatedDecisions || [],
      relatedPatterns: entity.relatedPatterns || [],
      confidence: entity.confidence || 0.8
    };

    // Save directly to knowledge store
    const saveResult = this.knowledgeStore.save(entry, this.branch);

    return {
      success: saveResult.success,
      entryId: entry.id,
      type: 'entity',
      entityType: entry.entityType,
      message: `Entity captured: ${entry.name} (${entry.entityType})`
    };
  }

  /**
   * Capture a TODO item
   * @param {Object} todo - TODO data
   * @returns {Object} Capture result
   */
  captureTodo(todo) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Add context
    const enrichedTodo = {
      ...todo,
      trackId: todo.trackId || this.activeTrackId,
      sessionId: this.sessionId,
      branch: this.branch
    };

    // Create TODO entry
    const entry = {
      id: `todo_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'todo',
      timestamp: new Date().toISOString(),
      title: todo.title,
      priority: todo.priority || 'medium',
      status: todo.status || 'pending',
      content: {
        description: todo.description,
        acceptanceCriteria: todo.acceptanceCriteria || [],
        notes: todo.notes
      },
      context: {
        trackId: enrichedTodo.trackId,
        sessionId: enrichedTodo.sessionId,
        branch: enrichedTodo.branch
      },
      dueDate: todo.dueDate,
      domain: todo.domain,
      tags: todo.tags || [],
      confidence: 1.0
    };

    // Save directly to knowledge store
    const saveResult = this.knowledgeStore.save(entry, this.branch);

    return {
      success: saveResult.success,
      entryId: entry.id,
      type: 'todo',
      priority: entry.priority,
      message: `TODO captured: ${entry.title} [${entry.priority}]`
    };
  }

  /**
   * Update a TODO status
   * @param {string} todoId - TODO entry ID
   * @param {string} newStatus - New status (pending, in-progress, done, wont-do)
   * @param {Object} updates - Additional updates
   * @returns {Object} Update result
   */
  updateTodo(todoId, newStatus, updates = {}) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    const timestamp = new Date().toISOString();

    const updateData = {
      status: newStatus,
      ...updates,
      metadata: {
        updatedAt: timestamp,
        completedAt: newStatus === 'done' ? timestamp : undefined
      }
    };

    const result = this.knowledgeStore.update(todoId, updateData, this.branch);

    return {
      success: result.success,
      todoId: todoId,
      newStatus: newStatus,
      message: result.success
        ? `TODO updated: ${todoId} → ${newStatus}`
        : `Failed to update TODO: ${result.error}`
    };
  }

  /**
   * Get pending TODOs
   * @param {Object} options - Query options
   * @returns {Object} Query result with pending TODOs
   */
  getPendingTodos(options = {}) {
    const result = this.knowledgeStore.query({
      type: 'todo',
      fullEntries: true,
      ...options
    }, this.branch);

    if (!result.success) {
      return result;
    }

    // Filter for pending/in-progress only
    const pending = (result.entries || []).filter(t =>
      t.status === 'pending' || t.status === 'in-progress'
    );

    // Sort by priority then date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    pending.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    return {
      success: true,
      todos: pending,
      total: pending.length,
      byPriority: {
        high: pending.filter(t => t.priority === 'high').length,
        medium: pending.filter(t => t.priority === 'medium').length,
        low: pending.filter(t => t.priority === 'low').length
      },
      message: `Found ${pending.length} pending TODOs`
    };
  }

  /**
   * Get tracked entities
   * @param {Object} options - Query options
   * @returns {Object} Query result with entities
   */
  getEntities(options = {}) {
    const result = this.knowledgeStore.query({
      type: 'entity',
      fullEntries: true,
      ...options
    }, this.branch);

    if (!result.success) {
      return result;
    }

    // Group by entity type
    const byType = {};
    for (const entity of result.entries || []) {
      const type = entity.entityType || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(entity);
    }

    return {
      success: true,
      entities: result.entries || [],
      total: result.total,
      byType: byType,
      message: `Found ${result.total} entities`
    };
  }

  /**
   * Get decisions that need review
   * @returns {Object} Decisions needing review
   */
  getDecisionsNeedingReview() {
    const result = this.knowledgeStore.query({
      type: 'decision',
      fullEntries: true
    }, this.branch);

    if (!result.success) {
      return {
        success: false,
        decisions: [],
        message: `Failed to query decisions: ${result.message}`
      };
    }

    const now = new Date();
    const needsReview = (result.entries || []).filter(d => {
      if (!d.reviewDate) return false;
      if (d.status === 'superseded' || d.status === 'deprecated') return false;
      return new Date(d.reviewDate) <= now;
    });

    // Sort by review date (oldest first)
    needsReview.sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate));

    return {
      success: true,
      decisions: needsReview,
      total: needsReview.length,
      overdue: needsReview.map(d => ({
        id: d.id,
        title: d.title,
        reviewDate: d.reviewDate,
        reviewReason: d.reviewReason,
        daysOverdue: Math.floor((now - new Date(d.reviewDate)) / (1000 * 60 * 60 * 24))
      })),
      message: `Found ${needsReview.length} decisions needing review`
    };
  }

  /**
   * Set a review date for a decision
   * @param {string} decisionId - Decision ID
   * @param {string} reviewDate - Review date (YYYY-MM-DD)
   * @param {string} reviewReason - Reason for the review
   * @returns {Object} Update result
   */
  setDecisionReviewDate(decisionId, reviewDate, reviewReason = null) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    const result = this.knowledgeStore.update(decisionId, {
      reviewDate: reviewDate,
      reviewReason: reviewReason,
      metadata: {
        updatedAt: new Date().toISOString()
      }
    }, this.branch);

    return {
      success: result.success,
      decisionId: decisionId,
      reviewDate: reviewDate,
      message: result.success
        ? `Review date set for ${decisionId}: ${reviewDate}`
        : `Failed to set review date: ${result.error}`
    };
  }

  /**
   * Mark a decision as superseded by a newer one
   * @param {string} oldDecisionId - Decision being superseded
   * @param {string} newDecisionId - Newer decision
   * @returns {Object} Update result
   */
  supersedeDecision(oldDecisionId, newDecisionId) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    const timestamp = new Date().toISOString();

    // Update the old decision
    const oldResult = this.knowledgeStore.update(oldDecisionId, {
      status: 'superseded',
      supersededBy: newDecisionId,
      metadata: {
        updatedAt: timestamp
      }
    }, this.branch);

    if (!oldResult.success) {
      return {
        success: false,
        error: oldResult.error,
        message: `Failed to supersede decision: ${oldResult.message}`
      };
    }

    // Update the new decision to track what it supersedes
    const newDecision = this.knowledgeStore.get(newDecisionId, this.branch);
    if (newDecision) {
      const supersedes = newDecision.supersedes || [];
      if (!supersedes.includes(oldDecisionId)) {
        supersedes.push(oldDecisionId);
        this.knowledgeStore.update(newDecisionId, {
          supersedes: supersedes
        }, this.branch);
      }
    }

    return {
      success: true,
      oldDecisionId: oldDecisionId,
      newDecisionId: newDecisionId,
      message: `Decision ${oldDecisionId} superseded by ${newDecisionId}`
    };
  }

  /**
   * Get the history/evolution chain of a decision
   * @param {string} decisionId - Decision ID
   * @returns {Object} Decision chain
   */
  getDecisionChain(decisionId) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        chain: { ancestors: [], current: null, successors: [] }
      };
    }

    const chain = {
      ancestors: [],
      current: null,
      successors: []
    };

    const current = this.knowledgeStore.get(decisionId, this.branch);
    if (!current) {
      return {
        success: false,
        error: 'not_found',
        chain: chain,
        message: `Decision not found: ${decisionId}`
      };
    }

    chain.current = {
      id: current.id,
      title: current.title,
      status: current.status,
      createdAt: current.metadata?.createdAt
    };

    // Get ancestors (decisions this one supersedes)
    const getAncestors = (ids) => {
      for (const id of ids || []) {
        const ancestor = this.knowledgeStore.get(id, this.branch);
        if (ancestor) {
          chain.ancestors.push({
            id: ancestor.id,
            title: ancestor.title,
            status: ancestor.status,
            createdAt: ancestor.metadata?.createdAt
          });
          getAncestors(ancestor.supersedes);
        }
      }
    };
    getAncestors(current.supersedes);

    // Get successors (decisions that supersede this one)
    const getSuccessors = (id) => {
      const decision = this.knowledgeStore.get(id, this.branch);
      if (decision && decision.supersededBy) {
        const successor = this.knowledgeStore.get(decision.supersededBy, this.branch);
        if (successor) {
          chain.successors.push({
            id: successor.id,
            title: successor.title,
            status: successor.status,
            createdAt: successor.metadata?.createdAt
          });
          getSuccessors(successor.id);
        }
      }
    };
    getSuccessors(decisionId);

    return {
      success: true,
      chain: chain,
      evolutionCount: chain.ancestors.length + chain.successors.length,
      message: `Decision has ${chain.ancestors.length} predecessors and ${chain.successors.length} successors`
    };
  }

  /**
   * Generate the knowledge summary file
   * @returns {Object} Generation result
   */
  generateKnowledgeSummary() {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    return this.knowledgeStore.generateSummary(this.branch);
  }

  /**
   * Get relevant knowledge for a task context
   * @param {Object} taskContext - Task context
   * @returns {Object} Relevant knowledge and recommendations
   */
  getRelevantKnowledge(taskContext) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        knowledge: [],
        recommendations: []
      };
    }

    if (!this.config.enableRecall) {
      return {
        success: true,
        knowledge: [],
        recommendations: [],
        message: 'Knowledge recall disabled'
      };
    }

    // Add session context
    const enrichedContext = {
      ...taskContext,
      trackId: taskContext.trackId || this.activeTrackId,
      branch: this.branch
    };

    // Recall from knowledge store
    const recallResult = this.knowledgeRecall.recallForTask(enrichedContext, {
      branch: this.branch
    });

    this.sessionStats.knowledgeRecalled += recallResult.knowledge?.length || 0;

    return recallResult;
  }

  /**
   * Enrich context for task execution
   * @param {Object} currentContext - Current task context
   * @returns {Object} Enriched context
   */
  enrichContext(currentContext) {
    if (!this.initialized || !this.config.enableEnrichment) {
      return {
        success: true,
        enriched: false,
        context: currentContext,
        message: 'Enrichment disabled or not initialized'
      };
    }

    // Add session context
    const enrichedTask = {
      ...currentContext,
      trackId: currentContext.trackId || this.activeTrackId,
      branch: this.branch
    };

    // Enrich via context enrichment engine
    const enrichmentResult = this.contextEnrichment.enrichTaskContext(enrichedTask, {
      branch: this.branch
    });

    if (enrichmentResult.enriched) {
      this.sessionStats.enrichmentsApplied++;
    }

    return enrichmentResult;
  }

  /**
   * Handle phase completion
   * @param {Object} phase - Completed phase
   * @param {Object} track - Track data
   * @returns {Object} Phase processing result
   */
  onPhaseCompletion(phase, track) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    // Get phase entries from journal
    const phaseEntries = this.learningJournal.getPhaseEntries(phase.number || phase.id);

    // Categorize learnings
    const learnings = {
      decisions: phaseEntries.filter(e => e.type === 'decision'),
      discoveries: phaseEntries.filter(e => e.type === 'discovery'),
      blockers: phaseEntries.filter(e => e.type === 'blocker'),
      patterns: phaseEntries.filter(e => e.type === 'discovery' && e.details?.pattern)
    };

    // Process via context enrichment
    const enrichmentResult = this.contextEnrichment.onPhaseCompletion(
      phase,
      track,
      learnings
    );

    // Get phase summary
    const phaseSummary = this.learningJournal.getPhaseSummary(phase.number || phase.id);

    return {
      success: true,
      phase: phase.number || phase.id,
      summary: phaseSummary,
      learnings: {
        decisions: learnings.decisions.length,
        discoveries: learnings.discoveries.length,
        blockers: learnings.blockers.length
      },
      enrichmentSuggestions: enrichmentResult.suggestions,
      message: `Phase ${phase.number || phase.id} learning processed`
    };
  }

  /**
   * Finalize session and persist all learnings
   * @param {Object} options - Finalization options
   * @returns {Object} Finalization result
   */
  finalizeSession(options = {}) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'Learning session not initialized'
      };
    }

    const results = {
      persisted: [],
      failed: [],
      stats: { ...this.sessionStats }
    };

    try {
      // Stop auto-persist
      this.stopAutoPersist();

      // Export journal to knowledge base
      const exportResult = this.learningJournal.exportToKnowledgeBase({
        minConfidence: this.config.minConfidenceForPersist,
        types: ['decision', 'discovery', 'blocker', 'research']
      });

      if (exportResult.entries.length > 0) {
        // Persist each entry
        const bulkResult = this.knowledgeStore.bulkSave(exportResult.entries, this.branch);
        results.persisted = bulkResult.saved;
        results.failed = bulkResult.failed;
      }

      // Save session history
      this.saveSessionHistory();

      // Get final statistics
      results.journalSummary = this.learningJournal.getSessionSummary();
      results.knowledgeStats = this.knowledgeStore.getStats(this.branch);
      results.enrichmentStats = this.contextEnrichment.getStats();

      // Apply pending enrichments if auto-apply enabled
      if (options.applyPendingEnrichments) {
        const pendingIds = this.contextEnrichment.getPendingEnrichments().map(e => e.id);
        const applyResult = this.contextEnrichment.applyEnrichments(pendingIds, {
          dryRun: options.dryRun
        });
        results.enrichmentsApplied = applyResult.results;
      }

      // Reset state
      this.initialized = false;

      return {
        success: true,
        sessionId: this.sessionId,
        branch: this.branch,
        results: results,
        message: `Session finalized: ${results.persisted} entries persisted`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: results,
        message: `Session finalization failed: ${error.message}`
      };
    }
  }

  /**
   * Set active track
   * @param {string} trackId - Track identifier
   */
  setActiveTrack(trackId) {
    this.activeTrackId = trackId;
  }

  /**
   * Get session summary
   * @returns {Object} Session summary
   */
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      branch: this.branch,
      activeTrackId: this.activeTrackId,
      initialized: this.initialized,
      stats: this.sessionStats,
      journalSummary: this.learningJournal.getSessionSummary(),
      pendingEnrichments: this.contextEnrichment.getPendingEnrichments().length,
      knowledgeStats: this.knowledgeStore.getStats(this.branch)
    };
  }

  /**
   * Get formatted knowledge for agent injection
   * @param {Object} taskContext - Task context
   * @returns {string} Formatted knowledge string
   */
  getKnowledgeInjection(taskContext) {
    const recallResult = this.getRelevantKnowledge(taskContext);

    if (!recallResult.success || recallResult.knowledge.length === 0) {
      return '';
    }

    return this.knowledgeRecall.formatForInjection(recallResult);
  }

  /**
   * Record outcome for used knowledge
   * @param {Array} knowledgeIds - IDs of knowledge used
   * @param {Object} outcome - Outcome data
   * @returns {Object} Recording result
   */
  recordKnowledgeOutcome(knowledgeIds, outcome) {
    const results = [];

    for (const id of knowledgeIds) {
      const result = this.knowledgeStore.recordOutcome(id, outcome, this.branch);
      results.push({
        id: id,
        success: result.success,
        error: result.error
      });
    }

    return {
      success: results.every(r => r.success),
      results: results,
      message: `Recorded outcome for ${results.filter(r => r.success).length} entries`
    };
  }

  /**
   * Start auto-persist timer
   */
  startAutoPersist() {
    this.stopAutoPersist();
    this.persistTimer = setInterval(() => {
      this.persistJournalSnapshot();
    }, this.config.persistInterval);
  }

  /**
   * Stop auto-persist timer
   */
  stopAutoPersist() {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  /**
   * Persist current journal snapshot
   * @returns {Object} Persist result
   */
  persistJournalSnapshot() {
    try {
      const sessionsPath = path.join(
        this.config.maestroDir,
        'knowledge',
        'sessions'
      );

      if (!fs.existsSync(sessionsPath)) {
        fs.mkdirSync(sessionsPath, { recursive: true });
      }

      const snapshotPath = path.join(sessionsPath, `${this.sessionId}.json`);
      const snapshot = {
        ...this.learningJournal.toJSON(),
        persistedAt: new Date().toISOString(),
        stats: this.sessionStats
      };

      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

      return {
        success: true,
        path: snapshotPath,
        entriesCount: snapshot.entries?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load session history
   * @param {string} branch - Branch name
   * @param {Object} options - Load options
   * @returns {Object} History load result
   */
  loadSessionHistory(branch, options = {}) {
    const result = {
      loaded: false,
      sessionsFound: 0,
      entriesImported: 0,
      recentSessions: []
    };

    try {
      const sessionsPath = path.join(
        this.config.maestroDir,
        'knowledge',
        'sessions'
      );

      if (!fs.existsSync(sessionsPath)) {
        return result;
      }

      // Find all sessions for this branch
      const files = fs.readdirSync(sessionsPath)
        .filter(f => f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(sessionsPath, f),
          mtime: fs.statSync(path.join(sessionsPath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      const branchSessions = [];
      const maxSessionsToImport = options.maxSessions || 5;
      const importEntries = options.importEntries !== false;

      for (const file of files) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const session = JSON.parse(content);

          if (session.branch === branch && session.sessionId !== this.sessionId) {
            branchSessions.push({
              file: file,
              session: session
            });
          }
        } catch (parseError) {
          continue;
        }
      }

      result.sessionsFound = branchSessions.length;

      if (branchSessions.length === 0) {
        return result;
      }

      // Record recent sessions for reference
      result.recentSessions = branchSessions.slice(0, 3).map(bs => ({
        sessionId: bs.session.sessionId,
        startedAt: bs.session.startedAt,
        entriesCount: bs.session.entries?.length || 0
      }));

      // Import entries from recent sessions if enabled
      if (importEntries) {
        const sessionsToImport = branchSessions.slice(0, maxSessionsToImport);

        for (const { session } of sessionsToImport) {
          if (session.entries && Array.isArray(session.entries)) {
            // Filter entries worth importing (high confidence, recent)
            const worthyEntries = session.entries.filter(entry => {
              // Only import high-confidence decisions and discoveries
              if (entry.type === 'decision' && entry.confidence >= 0.7) return true;
              if (entry.type === 'discovery' && entry.confidence >= 0.6) return true;
              if (entry.type === 'blocker' && entry.details?.resolved) return true;
              return false;
            });

            // Create a temporary journal to merge from
            const LearningJournal = require('./learning-journal');
            const tempJournal = new LearningJournal();
            tempJournal.entries = worthyEntries;

            // Merge into current journal
            const mergeResult = this.learningJournal.mergeFrom(tempJournal);
            if (mergeResult.success) {
              result.entriesImported += mergeResult.entriesAdded || 0;
            }
          }
        }
      }

      result.loaded = result.sessionsFound > 0;
      return result;

    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Save session history
   */
  saveSessionHistory() {
    this.persistJournalSnapshot();
  }

  /**
   * Search knowledge base
   * @param {string} term - Search term
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  searchKnowledge(term, options = {}) {
    return this.knowledgeStore.search(term, options, this.branch);
  }

  /**
   * Query knowledge base
   * @param {Object} criteria - Query criteria
   * @returns {Object} Query results
   */
  queryKnowledge(criteria) {
    return this.knowledgeStore.query(criteria, this.branch);
  }

  /**
   * Get recent journal entries
   * @param {number} count - Number of entries
   * @returns {Array} Recent entries
   */
  getRecentEntries(count = 10) {
    return this.learningJournal.getRecentEntries(count);
  }

  /**
   * Get pending enrichment suggestions
   * @returns {Array} Pending enrichments
   */
  getPendingEnrichments() {
    return this.contextEnrichment.getPendingEnrichments();
  }

  /**
   * Apply specific enrichments
   * @param {Array} enrichmentIds - IDs to apply
   * @param {Object} options - Application options
   * @returns {Object} Application result
   */
  applyEnrichments(enrichmentIds, options = {}) {
    return this.contextEnrichment.applyEnrichments(enrichmentIds, options);
  }

  /**
   * Generate context update suggestions
   * @returns {Object} Suggestions
   */
  suggestContextUpdates() {
    const journalSummary = this.learningJournal.getSessionSummary();

    // Collect all learnings
    const learnings = {
      decisions: this.learningJournal.getEntriesByType('decision'),
      discoveries: this.learningJournal.getEntriesByType('discovery'),
      blockers: this.learningJournal.getEntriesByType('blocker'),
      patterns: this.learningJournal.getEntriesByType('discovery')
        .filter(e => e.details?.pattern)
    };

    return this.contextEnrichment.suggestContextUpdates(learnings, {
      branch: this.branch
    });
  }

  /**
   * Export all session knowledge
   * @returns {Object} Export data
   */
  exportSessionKnowledge() {
    return {
      session: {
        id: this.sessionId,
        branch: this.branch,
        startedAt: this.learningJournal.startedAt,
        exportedAt: new Date().toISOString()
      },
      journal: this.learningJournal.toJSON(),
      stats: this.sessionStats,
      knowledgeStats: this.knowledgeStore.getStats(this.branch)
    };
  }
}

module.exports = SessionLearningController;
