/**
 * Session Learning Controller Unit Tests
 *
 * Tests for the SessionLearningController class covering
 * session lifecycle, capture methods, and knowledge management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir } from '../setup.js';

// Import the module under test
const SessionLearningController = require('../../skills/session-learning-controller.js');

describe('SessionLearningController', () => {
  let controller;
  let tempDir;

  beforeEach(() => {
    // Create a fresh temp directory for each test
    tempDir = createTempDir();
    controller = new SessionLearningController({
      maestroDir: path.join(tempDir, 'maestro'),
      autoPersist: false, // Disable for testing
      enableEnrichment: true,
      enableRecall: true
    });
  });

  afterEach(() => {
    // Stop any timers and clean up
    if (controller.persistTimer) {
      controller.stopAutoPersist();
    }
    cleanupTempDir(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultController = new SessionLearningController();
      expect(defaultController.config.maestroDir).toBe('maestro');
      expect(defaultController.config.autoPersist).toBe(true);
      expect(defaultController.config.persistInterval).toBe(300000);
      expect(defaultController.config.minConfidenceForPersist).toBe(0.6);
    });

    it('should accept custom config', () => {
      expect(controller.config.autoPersist).toBe(false);
    });

    it('should initialize components', () => {
      expect(controller.knowledgeStore).toBeDefined();
      expect(controller.learningJournal).toBeDefined();
      expect(controller.knowledgeRecall).toBeDefined();
      expect(controller.contextEnrichment).toBeDefined();
    });

    it('should start uninitialized', () => {
      expect(controller.sessionId).toBeNull();
      expect(controller.branch).toBeNull();
      expect(controller.initialized).toBe(false);
    });
  });

  describe('initializeSession', () => {
    it('should initialize a session successfully', () => {
      const result = controller.initializeSession('main', 'test-session-123');

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session-123');
      expect(result.branch).toBe('main');
      expect(result.initialized).toBe(true);
    });

    it('should create knowledge directories', () => {
      controller.initializeSession('main', 'test-session');

      // With branch 'main', directories are created under branches/main/knowledge
      const branchPath = path.join(tempDir, 'maestro', 'branches', 'main', 'knowledge');
      expect(fs.existsSync(branchPath)).toBe(true);
      expect(fs.existsSync(path.join(branchPath, 'decisions'))).toBe(true);
    });

    it('should set controller state', () => {
      controller.initializeSession('feature/test', 'session-456');

      expect(controller.sessionId).toBe('session-456');
      expect(controller.branch).toBe('feature/test');
      expect(controller.initialized).toBe(true);
    });

    it('should accept track ID option', () => {
      controller.initializeSession('main', 'test', { trackId: 'track-123' });

      expect(controller.activeTrackId).toBe('track-123');
    });

    it('should return knowledge stats', () => {
      const result = controller.initializeSession('main', 'test');

      expect(result.knowledgeStats).toBeDefined();
      expect(result.knowledgeStats.total).toBeDefined();
    });
  });

  describe('captureDecision', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture a decision', () => {
      const result = controller.captureDecision({
        title: 'Use React for frontend',
        choice: 'React',
        rationale: 'Team familiarity and ecosystem'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('decision');
      expect(result.entryId).toBeDefined();
    });

    it('should increment decision counter', () => {
      controller.captureDecision({ title: 'Decision 1' });
      controller.captureDecision({ title: 'Decision 2' });

      expect(controller.sessionStats.decisionsCaptures).toBe(2);
    });

    it('should add session context', () => {
      controller.captureDecision({
        title: 'Test Decision',
        domain: 'testing'
      });

      const entries = controller.learningJournal.getEntriesByType('decision');
      expect(entries[0].sessionId).toBe('test-session');
    });

    it('should fail if not initialized', () => {
      const uninitController = new SessionLearningController({
        maestroDir: path.join(tempDir, 'maestro2')
      });

      const result = uninitController.captureDecision({ title: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('not_initialized');
    });
  });

  describe('captureResearch', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture research findings', () => {
      const result = controller.captureResearch({
        finding: 'Vitest is faster than Jest for this use case',
        context: 'Evaluating test frameworks',
        sources: ['https://vitest.dev']
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('research');
    });

    it('should increment research counter', () => {
      controller.captureResearch({ finding: 'Finding 1' });

      expect(controller.sessionStats.researchCaptured).toBe(1);
    });
  });

  describe('captureDiscovery', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture discoveries', () => {
      const result = controller.captureDiscovery({
        insight: 'The codebase follows a modular pattern',
        observation: 'Each feature is self-contained'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('discovery');
    });

    it('should increment discovery counter', () => {
      controller.captureDiscovery({ insight: 'Discovery 1' });

      expect(controller.sessionStats.discoveriesCaptured).toBe(1);
    });
  });

  describe('captureBlocker', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture blockers', () => {
      const result = controller.captureBlocker({
        issue: 'Database connection timeout',
        cause: 'Incorrect connection string',
        resolution: 'Fixed connection string in .env'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('blocker');
    });

    it('should track resolution status', () => {
      const result = controller.captureBlocker({
        issue: 'Test failure',
        resolved: true
      });

      expect(result.resolved).toBe(true);
    });
  });

  describe('captureEntity', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture entities', () => {
      const result = controller.captureEntity({
        name: 'UserService',
        entityType: 'service',
        description: 'Handles user authentication and management',
        location: 'src/services/UserService.js'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('entity');
      expect(result.entityType).toBe('service');
    });

    it('should save entity to knowledge store', () => {
      const result = controller.captureEntity({
        name: 'TestComponent',
        entityType: 'component'
      });

      // Entity is saved to the branch, so we need to pass the branch
      const retrieved = controller.knowledgeStore.get(result.entryId, controller.branch);
      expect(retrieved).not.toBeNull();
      expect(retrieved.type).toBe('entity');
    });
  });

  describe('captureTodo', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should capture todos', () => {
      const result = controller.captureTodo({
        title: 'Add unit tests for UserService',
        description: 'Cover all public methods',
        priority: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('todo');
      expect(result.priority).toBe('high');
    });

    it('should default to medium priority', () => {
      const result = controller.captureTodo({
        title: 'Test todo'
      });

      expect(result.priority).toBe('medium');
    });

    it('should save todo to knowledge store', () => {
      const result = controller.captureTodo({ title: 'Test' });

      // Todo is saved to the branch, so we need to pass the branch
      const retrieved = controller.knowledgeStore.get(result.entryId, controller.branch);
      expect(retrieved).not.toBeNull();
      expect(retrieved.type).toBe('todo');
    });
  });

  describe('updateTodo', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should update todo status', () => {
      const createResult = controller.captureTodo({ title: 'Test todo' });
      const updateResult = controller.updateTodo(createResult.entryId, 'in-progress');

      expect(updateResult.success).toBe(true);
      expect(updateResult.newStatus).toBe('in-progress');
    });

    it('should set completedAt when marking done', () => {
      const createResult = controller.captureTodo({ title: 'Test todo' });
      controller.updateTodo(createResult.entryId, 'done');

      const retrieved = controller.knowledgeStore.get(createResult.entryId, controller.branch);
      expect(retrieved).not.toBeNull();
      expect(retrieved.metadata.completedAt).toBeDefined();
    });
  });

  describe('getPendingTodos', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should return pending todos', () => {
      controller.captureTodo({ title: 'Todo 1', priority: 'high' });
      controller.captureTodo({ title: 'Todo 2', priority: 'low' });
      controller.captureTodo({ title: 'Todo 3', priority: 'medium' });

      const result = controller.getPendingTodos();

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
    });

    it('should sort by priority', () => {
      controller.captureTodo({ title: 'Low', priority: 'low' });
      controller.captureTodo({ title: 'High', priority: 'high' });
      controller.captureTodo({ title: 'Medium', priority: 'medium' });

      const result = controller.getPendingTodos();

      expect(result.todos[0].title).toBe('High');
    });

    it('should count by priority', () => {
      controller.captureTodo({ title: 'Todo 1', priority: 'high' });
      controller.captureTodo({ title: 'Todo 2', priority: 'high' });
      controller.captureTodo({ title: 'Todo 3', priority: 'low' });

      const result = controller.getPendingTodos();

      expect(result.byPriority.high).toBe(2);
      expect(result.byPriority.low).toBe(1);
    });
  });

  describe('getEntities', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should return entities grouped by type', () => {
      controller.captureEntity({ name: 'UserService', entityType: 'service' });
      controller.captureEntity({ name: 'Button', entityType: 'component' });
      controller.captureEntity({ name: 'AuthService', entityType: 'service' });

      const result = controller.getEntities();

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.byType.service.length).toBe(2);
      expect(result.byType.component.length).toBe(1);
    });
  });

  describe('setActiveTrack', () => {
    it('should set the active track', () => {
      controller.initializeSession('main', 'test-session');
      controller.setActiveTrack('track-123');

      expect(controller.activeTrackId).toBe('track-123');
    });

    it('should apply to subsequent captures', () => {
      controller.initializeSession('main', 'test-session');
      controller.setActiveTrack('track-456');
      controller.captureDecision({ title: 'Test' });

      const entries = controller.learningJournal.getEntriesByType('decision');
      expect(entries[0].trackId).toBe('track-456');
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', () => {
      controller.initializeSession('main', 'test-session');
      controller.captureDecision({ title: 'Decision 1' });
      controller.captureResearch({ finding: 'Finding 1' });

      const summary = controller.getSessionSummary();

      expect(summary.sessionId).toBe('test-session');
      expect(summary.branch).toBe('main');
      expect(summary.initialized).toBe(true);
      expect(summary.stats.decisionsCaptures).toBe(1);
      expect(summary.stats.researchCaptured).toBe(1);
    });
  });

  describe('searchKnowledge', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should search knowledge base', () => {
      // Save some knowledge first
      controller.knowledgeStore.save({
        type: 'decision',
        title: 'React Component Architecture',
        domain: 'frontend',
        tags: ['react']
      });

      const result = controller.searchKnowledge('React');

      expect(result.success).toBe(true);
    });
  });

  describe('queryKnowledge', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should query knowledge base', () => {
      // Save to the branch that the controller uses
      controller.knowledgeStore.save({
        type: 'decision',
        title: 'Test Decision',
        domain: 'testing'
      }, controller.branch);

      const result = controller.queryKnowledge({ type: 'decision' });

      expect(result.success).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe('getRecentEntries', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should return recent journal entries', () => {
      controller.captureDecision({ title: 'Decision 1' });
      controller.captureDecision({ title: 'Decision 2' });
      controller.captureDecision({ title: 'Decision 3' });

      const entries = controller.getRecentEntries(2);

      expect(entries.length).toBe(2);
    });
  });

  describe('finalizeSession', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should finalize session', () => {
      controller.captureDecision({
        title: 'Test Decision',
        confidence: 0.9
      });

      const result = controller.finalizeSession();

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session');
    });

    it('should mark session as uninitialized', () => {
      controller.finalizeSession();

      expect(controller.initialized).toBe(false);
    });

    it('should save session history', () => {
      controller.captureDecision({ title: 'Test' });
      controller.finalizeSession();

      const sessionsPath = path.join(tempDir, 'maestro', 'knowledge', 'sessions');
      const files = fs.readdirSync(sessionsPath);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should return journal summary', () => {
      controller.captureDecision({ title: 'Decision 1' });
      const result = controller.finalizeSession();

      expect(result.results.journalSummary).toBeDefined();
      expect(result.results.journalSummary.counts.decisions).toBe(1);
    });
  });

  describe('getDecisionsNeedingReview', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should find decisions past review date', () => {
      // Create a decision with past review date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      controller.knowledgeStore.save({
        type: 'decision',
        title: 'Old Decision',
        reviewDate: pastDate.toISOString().split('T')[0],
        status: 'active'
      }, controller.branch);

      const result = controller.getDecisionsNeedingReview();

      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
    });

    it('should exclude superseded decisions', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      controller.knowledgeStore.save({
        type: 'decision',
        title: 'Superseded Decision',
        reviewDate: pastDate.toISOString().split('T')[0],
        status: 'superseded'
      }, controller.branch);

      const result = controller.getDecisionsNeedingReview();

      expect(result.total).toBe(0);
    });
  });

  describe('setDecisionReviewDate', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should set review date on decision', () => {
      const saveResult = controller.knowledgeStore.save({
        type: 'decision',
        title: 'Test Decision'
      }, controller.branch);

      const result = controller.setDecisionReviewDate(
        saveResult.id,
        '2025-06-01',
        'Quarterly review'
      );

      expect(result.success).toBe(true);

      const retrieved = controller.knowledgeStore.get(saveResult.id, controller.branch);
      expect(retrieved.reviewDate).toBe('2025-06-01');
      expect(retrieved.reviewReason).toBe('Quarterly review');
    });
  });

  describe('supersedeDecision', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should supersede a decision', () => {
      const oldResult = controller.knowledgeStore.save({
        type: 'decision',
        title: 'Old Decision'
      }, controller.branch);

      const newResult = controller.knowledgeStore.save({
        type: 'decision',
        title: 'New Decision'
      }, controller.branch);

      const result = controller.supersedeDecision(oldResult.id, newResult.id);

      expect(result.success).toBe(true);

      const oldDecision = controller.knowledgeStore.get(oldResult.id, controller.branch);
      expect(oldDecision.status).toBe('superseded');
      expect(oldDecision.supersededBy).toBe(newResult.id);
    });

    it('should track supersedes on new decision', () => {
      const oldResult = controller.knowledgeStore.save({
        type: 'decision',
        title: 'Old Decision'
      }, controller.branch);

      const newResult = controller.knowledgeStore.save({
        type: 'decision',
        title: 'New Decision'
      }, controller.branch);

      controller.supersedeDecision(oldResult.id, newResult.id);

      const newDecision = controller.knowledgeStore.get(newResult.id, controller.branch);
      expect(newDecision.supersedes).toContain(oldResult.id);
    });
  });

  describe('getDecisionChain', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should get decision evolution chain', () => {
      const dec1 = controller.knowledgeStore.save({
        type: 'decision',
        title: 'V1 Decision'
      });

      const dec2 = controller.knowledgeStore.save({
        type: 'decision',
        title: 'V2 Decision'
      });

      controller.supersedeDecision(dec1.id, dec2.id);

      const chain = controller.getDecisionChain(dec2.id);

      expect(chain.success).toBe(true);
      expect(chain.chain.current.title).toBe('V2 Decision');
      expect(chain.chain.ancestors.length).toBe(1);
    });
  });

  describe('generateKnowledgeSummary', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should generate knowledge summary file', () => {
      controller.knowledgeStore.save({
        type: 'decision',
        title: 'Test Decision',
        domain: 'testing'
      });

      const result = controller.generateKnowledgeSummary();

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });
  });

  describe('auto-persist', () => {
    it('should start persist timer when enabled', () => {
      const autoPersistController = new SessionLearningController({
        maestroDir: path.join(tempDir, 'maestro'),
        autoPersist: true,
        persistInterval: 1000
      });

      autoPersistController.initializeSession('main', 'test');

      expect(autoPersistController.persistTimer).not.toBeNull();

      autoPersistController.stopAutoPersist();
    });

    it('should stop persist timer', () => {
      const autoPersistController = new SessionLearningController({
        maestroDir: path.join(tempDir, 'maestro'),
        autoPersist: true,
        persistInterval: 1000
      });

      autoPersistController.initializeSession('main', 'test');
      autoPersistController.stopAutoPersist();

      expect(autoPersistController.persistTimer).toBeNull();
    });
  });

  describe('persistJournalSnapshot', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should persist journal snapshot', () => {
      controller.captureDecision({ title: 'Test Decision' });

      const result = controller.persistJournalSnapshot();

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should include stats in snapshot', () => {
      controller.captureDecision({ title: 'Decision 1' });
      controller.captureResearch({ finding: 'Finding 1' });

      const result = controller.persistJournalSnapshot();
      const snapshot = JSON.parse(fs.readFileSync(result.path, 'utf8'));

      expect(snapshot.stats).toBeDefined();
      expect(snapshot.stats.decisionsCaptures).toBe(1);
      expect(snapshot.stats.researchCaptured).toBe(1);
    });
  });

  describe('exportSessionKnowledge', () => {
    beforeEach(() => {
      controller.initializeSession('main', 'test-session');
    });

    it('should export session knowledge', () => {
      controller.captureDecision({ title: 'Decision 1' });

      const exported = controller.exportSessionKnowledge();

      expect(exported.session.id).toBe('test-session');
      expect(exported.session.branch).toBe('main');
      expect(exported.journal).toBeDefined();
      expect(exported.stats).toBeDefined();
    });
  });
});
