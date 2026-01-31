/**
 * CDD Activator Skill
 *
 * Handles the programmatic activation of CDD mode, including:
 * - Session initialization
 * - Knowledge System initialization
 * - Context loading
 * - Knowledge statistics gathering
 *
 * This skill bridges the gap between the markdown-based CDD command
 * and the actual code that needs to run to activate the learning system.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import learning system components
let SessionLearningController;
let KnowledgeStore;
let BranchSessionManager;

try {
  SessionLearningController = require('./session-learning-controller');
} catch (e) {
  console.warn('[CDD Activator] SessionLearningController not available:', e.message);
}

try {
  KnowledgeStore = require('./knowledge-store');
} catch (e) {
  console.warn('[CDD Activator] KnowledgeStore not available:', e.message);
}

try {
  BranchSessionManager = require('./branch-session-manager');
} catch (e) {
  console.warn('[CDD Activator] BranchSessionManager not available:', e.message);
}

class CDDActivator {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      enableLearning: config.enableLearning !== false,
      ...config
    };

    // Initialize components
    this.learningController = null;
    this.knowledgeStore = null;
    this.sessionManager = null;
    this.sessionId = null;
    this.branch = null;
    this.initialized = false;

    // Initialize session manager
    if (BranchSessionManager) {
      this.sessionManager = new BranchSessionManager({
        maestroDir: this.config.maestroDir
      });
    }
  }

  /**
   * Get current git branch name
   * @returns {string} Branch name
   */
  getCurrentBranch() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (branch) return branch;
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'main';
    }
  }

  /**
   * Generate a session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Activate CDD mode with full Knowledge System initialization
   * @param {Object} options - Activation options
   * @returns {Object} Activation result with knowledge system status
   */
  activate(options = {}) {
    const branch = options.branch || this.getCurrentBranch();
    const sessionId = options.sessionId || this.generateSessionId();
    const trackId = options.trackId || null;

    this.branch = branch;
    this.sessionId = sessionId;

    const result = {
      success: false,
      sessionId: sessionId,
      branch: branch,
      knowledgeSystem: {
        initialized: false,
        status: 'not_initialized',
        store: null,
        recentDecisions: [],
        learning: {
          journalActive: false,
          enrichmentEnabled: false
        }
      },
      message: ''
    };

    try {
      // Step 1: Ensure knowledge directories exist
      const knowledgeDirResult = this.ensureKnowledgeDirectories(branch);
      if (!knowledgeDirResult.success) {
        result.message = `Failed to create knowledge directories: ${knowledgeDirResult.error}`;
        return result;
      }

      // Step 2: Initialize Knowledge Store
      if (KnowledgeStore) {
        this.knowledgeStore = new KnowledgeStore({
          maestroDir: this.config.maestroDir
        });

        // Build/load index
        const indexResult = this.knowledgeStore.buildIndex(branch);
        if (indexResult.success) {
          result.knowledgeSystem.store = this.getKnowledgeStats(branch);
        }
      }

      // Step 3: Initialize Learning Controller (Session + Journal)
      if (SessionLearningController && this.config.enableLearning) {
        this.learningController = new SessionLearningController({
          maestroDir: this.config.maestroDir,
          autoPersist: true,
          enableEnrichment: true,
          enableRecall: true
        });

        const initResult = this.learningController.initializeSession(branch, sessionId, {
          trackId: trackId
        });

        if (initResult.success) {
          result.knowledgeSystem.initialized = true;
          result.knowledgeSystem.status = 'initialized';
          result.knowledgeSystem.learning.journalActive = true;
          result.knowledgeSystem.learning.enrichmentEnabled = true;

          // Get recent decisions for display
          result.knowledgeSystem.recentDecisions = this.getRecentDecisions(branch);
        } else {
          result.knowledgeSystem.status = 'initialization_failed';
          result.knowledgeSystem.error = initResult.error;
        }
      } else {
        result.knowledgeSystem.status = 'learning_disabled';
        result.knowledgeSystem.learning.journalActive = false;
        result.knowledgeSystem.learning.enrichmentEnabled = false;
      }

      this.initialized = true;
      result.success = true;
      result.message = `CDD mode activated with Knowledge System for branch '${branch}'`;

      return result;

    } catch (error) {
      result.message = `CDD activation failed: ${error.message}`;
      result.error = error.message;
      return result;
    }
  }

  /**
   * Ensure knowledge directories exist
   * @param {string} branch - Branch name
   * @returns {Object} Directory creation result
   */
  ensureKnowledgeDirectories(branch) {
    const directories = [
      path.join(this.config.maestroDir, 'knowledge'),
      path.join(this.config.maestroDir, 'knowledge', 'decisions'),
      path.join(this.config.maestroDir, 'knowledge', 'patterns'),
      path.join(this.config.maestroDir, 'knowledge', 'research'),
      path.join(this.config.maestroDir, 'knowledge', 'sessions')
    ];

    try {
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      return {
        success: true,
        directories: directories,
        message: 'Knowledge directories ready'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to create directories: ${error.message}`
      };
    }
  }

  /**
   * Get knowledge store statistics
   * @param {string} branch - Branch name
   * @returns {Object} Knowledge statistics
   */
  getKnowledgeStats(branch) {
    if (!this.knowledgeStore) {
      return {
        total: 0,
        decisions: 0,
        patterns: 0,
        other: 0,
        empty: true
      };
    }

    try {
      const stats = this.knowledgeStore.getStats(branch);

      return {
        total: stats.total || 0,
        decisions: stats.byType?.decision || 0,
        patterns: stats.byType?.pattern || 0,
        other: (stats.total || 0) - ((stats.byType?.decision || 0) + (stats.byType?.pattern || 0)),
        empty: (stats.total || 0) === 0
      };
    } catch (error) {
      return {
        total: 0,
        decisions: 0,
        patterns: 0,
        other: 0,
        empty: true,
        error: error.message
      };
    }
  }

  /**
   * Get recent decisions for display
   * @param {string} branch - Branch name
   * @param {number} limit - Number of decisions to return
   * @returns {Array} Recent decisions
   */
  getRecentDecisions(branch, limit = 3) {
    if (!this.knowledgeStore) {
      return [];
    }

    try {
      const result = this.knowledgeStore.query({ type: 'decision' }, branch);

      if (!result.success || !result.entries) {
        return [];
      }

      // Sort by timestamp descending and take limit
      const decisions = result.entries
        .sort((a, b) => {
          const timeA = new Date(a.metadata?.createdAt || 0).getTime();
          const timeB = new Date(b.metadata?.createdAt || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, limit)
        .map(d => ({
          title: d.title || d.summary || 'Untitled decision',
          confidence: d.confidence || 0,
          createdAt: d.metadata?.createdAt || null
        }));

      return decisions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get the learning controller for external use
   * @returns {SessionLearningController|null}
   */
  getLearningController() {
    return this.learningController;
  }

  /**
   * Get formatted Knowledge System status for CDD display
   * @returns {string} Formatted status string
   */
  getFormattedKnowledgeStatus() {
    if (!this.initialized) {
      return this.formatKnowledgeBox({
        status: 'Not Initialized',
        store: { empty: true },
        recentDecisions: [],
        learning: { journalActive: false, enrichmentEnabled: false }
      });
    }

    const stats = this.getKnowledgeStats(this.branch);
    const recentDecisions = this.getRecentDecisions(this.branch);
    const isJournalActive = this.learningController?.initialized || false;

    return this.formatKnowledgeBox({
      status: 'Initialized',
      store: stats,
      recentDecisions: recentDecisions,
      learning: {
        journalActive: isJournalActive,
        enrichmentEnabled: isJournalActive
      }
    });
  }

  /**
   * Format the Knowledge System status box
   * @param {Object} data - Knowledge system data
   * @returns {string} Formatted box string
   */
  formatKnowledgeBox(data) {
    const lines = [];
    const width = 58;

    lines.push('┌' + '─'.repeat(width) + '┐');
    lines.push('│ ' + this.padEnd('🧠 KNOWLEDGE SYSTEM', width - 1) + '│');
    lines.push('├' + '─'.repeat(width) + '┤');

    // Status line
    const statusIcon = data.status === 'Initialized' ? '✓' : '✗';
    lines.push('│ ' + this.padEnd(`Status: ${data.status} ${statusIcon}`, width - 1) + '│');

    // Store line
    if (data.store.empty) {
      lines.push('│ ' + this.padEnd('Store: Empty (no knowledge captured yet)', width - 1) + '│');
    } else {
      const storeStr = `Store: ${data.store.total} entries (${data.store.decisions} decisions, ${data.store.patterns} patterns, ${data.store.other} other)`;
      lines.push('│ ' + this.padEnd(storeStr, width - 1) + '│');
    }

    // Recent decisions
    if (data.recentDecisions && data.recentDecisions.length > 0) {
      lines.push('│ ' + this.padEnd('Recent Decisions:', width - 1) + '│');
      for (const decision of data.recentDecisions.slice(0, 2)) {
        const title = decision.title.length > 45
          ? decision.title.substring(0, 42) + '...'
          : decision.title;
        lines.push('│ ' + this.padEnd(`  • ${title}`, width - 1) + '│');
      }
    }

    // Learning status
    const learningStatus = data.learning.journalActive
      ? 'Journal active, Enrichment enabled'
      : 'Journal inactive';
    lines.push('│ ' + this.padEnd(`Learning: ${learningStatus}`, width - 1) + '│');

    lines.push('└' + '─'.repeat(width) + '┘');

    return lines.join('\n');
  }

  /**
   * Pad string to specified length
   * @param {string} str - String to pad
   * @param {number} length - Target length
   * @returns {string} Padded string
   */
  padEnd(str, length) {
    if (str.length >= length) return str.substring(0, length);
    return str + ' '.repeat(length - str.length);
  }

  /**
   * Finalize the CDD session
   * @param {Object} options - Finalization options
   * @returns {Object} Finalization result
   */
  finalize(options = {}) {
    if (!this.initialized) {
      return {
        success: false,
        error: 'not_initialized',
        message: 'CDD session not initialized'
      };
    }

    const result = {
      success: false,
      sessionId: this.sessionId,
      branch: this.branch,
      knowledgePersisted: 0,
      message: ''
    };

    try {
      // Finalize learning controller (persists knowledge)
      if (this.learningController) {
        const finalizeResult = this.learningController.finalizeSession({
          applyPendingEnrichments: options.applyEnrichments !== false
        });

        if (finalizeResult.success) {
          result.knowledgePersisted = finalizeResult.results?.persisted?.length || 0;
        }
      }

      this.initialized = false;
      result.success = true;
      result.message = `CDD session finalized. ${result.knowledgePersisted} knowledge entries persisted.`;

      return result;

    } catch (error) {
      result.message = `Finalization failed: ${error.message}`;
      result.error = error.message;
      return result;
    }
  }

  /**
   * Check if CDD is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.initialized;
  }

  /**
   * Get current session info
   * @returns {Object} Session info
   */
  getSessionInfo() {
    return {
      active: this.initialized,
      sessionId: this.sessionId,
      branch: this.branch,
      learningEnabled: !!this.learningController,
      knowledgeStats: this.initialized ? this.getKnowledgeStats(this.branch) : null
    };
  }
}

module.exports = CDDActivator;
