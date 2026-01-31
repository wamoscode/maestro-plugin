/**
 * Knowledge Store Unit Tests
 *
 * Comprehensive tests for the KnowledgeStore class including
 * CRUD operations, indexing, search, and outcome tracking.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir, createMockKnowledgeEntry } from '../setup.js';

// Import the module under test
const KnowledgeStore = require('../../skills/knowledge-store.js');

describe('KnowledgeStore', () => {
  let store;
  let tempDir;

  beforeEach(() => {
    // Create a fresh temp directory for each test
    tempDir = createTempDir();
    store = new KnowledgeStore({
      maestroDir: path.join(tempDir, 'maestro'),
      enableBranchKnowledge: true
    });
  });

  afterEach(() => {
    // Clean up temp directory
    cleanupTempDir(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultStore = new KnowledgeStore();
      expect(defaultStore.config.maestroDir).toBe('maestro');
      expect(defaultStore.config.knowledgeDir).toBe('knowledge');
      expect(defaultStore.config.indexFile).toBe('index.json');
      expect(defaultStore.config.maxSearchResults).toBe(50);
      expect(defaultStore.config.enableBranchKnowledge).toBe(true);
    });

    it('should accept custom config', () => {
      expect(store.config.maestroDir).toBe(path.join(tempDir, 'maestro'));
    });

    it('should start with null index', () => {
      expect(store.index).toBeNull();
      expect(store.indexLoaded).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs for decisions', () => {
      const id = store.generateId('decision');
      expect(id).toMatch(/^dec_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for patterns', () => {
      const id = store.generateId('pattern');
      expect(id).toMatch(/^pat_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for research', () => {
      const id = store.generateId('research');
      expect(id).toMatch(/^res_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for learnings', () => {
      const id = store.generateId('learning');
      expect(id).toMatch(/^lrn_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for blockers', () => {
      const id = store.generateId('blocker');
      expect(id).toMatch(/^blk_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for entities', () => {
      const id = store.generateId('entity');
      expect(id).toMatch(/^ent_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for todos', () => {
      const id = store.generateId('todo');
      expect(id).toMatch(/^todo_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate unique IDs for unknown types', () => {
      const id = store.generateId('unknown');
      expect(id).toMatch(/^know_[a-z0-9]+_[a-f0-9]+$/);
    });

    it('should generate different IDs each time', () => {
      const id1 = store.generateId('decision');
      const id2 = store.generateId('decision');
      expect(id1).not.toBe(id2);
    });
  });

  describe('sanitizeBranchName', () => {
    it('should replace forward slashes with double dashes', () => {
      expect(store.sanitizeBranchName('feature/my-feature')).toBe('feature--my-feature');
    });

    it('should replace special characters with underscores', () => {
      expect(store.sanitizeBranchName('feature@branch#1')).toBe('feature_branch_1');
    });

    it('should convert to lowercase', () => {
      expect(store.sanitizeBranchName('Feature/MyBranch')).toBe('feature--mybranch');
    });

    it('should handle complex branch names', () => {
      expect(store.sanitizeBranchName('feature/user@123/test#1'))
        .toBe('feature--user_123--test_1');
    });
  });

  describe('getKnowledgePath', () => {
    it('should return base path for global knowledge', () => {
      const basePath = store.getKnowledgePath();
      expect(basePath).toBe(path.join(tempDir, 'maestro', 'knowledge'));
    });

    it('should return branch-specific path when branch is provided', () => {
      const branchPath = store.getKnowledgePath('feature/test');
      expect(branchPath).toBe(
        path.join(tempDir, 'maestro', 'branches', 'feature--test', 'knowledge')
      );
    });

    it('should return base path when branch knowledge is disabled', () => {
      const storeNoBranch = new KnowledgeStore({
        maestroDir: path.join(tempDir, 'maestro'),
        enableBranchKnowledge: false
      });
      const branchPath = storeNoBranch.getKnowledgePath('feature/test');
      expect(branchPath).toBe(path.join(tempDir, 'maestro', 'knowledge'));
    });
  });

  describe('getTypePath', () => {
    it('should return correct path for decisions', () => {
      const typePath = store.getTypePath('decision');
      expect(typePath).toBe(path.join(tempDir, 'maestro', 'knowledge', 'decisions'));
    });

    it('should return correct path for patterns', () => {
      const typePath = store.getTypePath('pattern');
      expect(typePath).toBe(path.join(tempDir, 'maestro', 'knowledge', 'patterns'));
    });

    it('should return misc for unknown types', () => {
      const typePath = store.getTypePath('unknown');
      expect(typePath).toBe(path.join(tempDir, 'maestro', 'knowledge', 'misc'));
    });
  });

  describe('ensureDirectories', () => {
    it('should create all knowledge directories', () => {
      const result = store.ensureDirectories();
      expect(result.success).toBe(true);
      expect(result.directories).toContain('decisions');
      expect(result.directories).toContain('patterns');
      expect(result.directories).toContain('research');
      expect(result.directories).toContain('learnings');
      expect(result.directories).toContain('blockers');
      expect(result.directories).toContain('entities');
      expect(result.directories).toContain('todos');
    });

    it('should create directories that exist on filesystem', () => {
      store.ensureDirectories();
      const basePath = store.getKnowledgePath();
      expect(fs.existsSync(path.join(basePath, 'decisions'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'patterns'))).toBe(true);
    });

    it('should create branch-specific directories', () => {
      const result = store.ensureDirectories('feature/test');
      expect(result.success).toBe(true);
      expect(result.basePath).toContain('feature--test');
    });

    it('should be idempotent', () => {
      store.ensureDirectories();
      const result = store.ensureDirectories();
      expect(result.success).toBe(true);
    });
  });

  describe('save', () => {
    it('should save a knowledge entry', () => {
      const entry = createMockKnowledgeEntry();
      const result = store.save(entry);

      expect(result.success).toBe(true);
      expect(result.id).toMatch(/^dec_/);
      expect(result.type).toBe('decision');
    });

    it('should generate ID if not provided', () => {
      const entry = createMockKnowledgeEntry();
      const result = store.save(entry);
      expect(result.id).toBeDefined();
    });

    it('should preserve provided ID', () => {
      const entry = createMockKnowledgeEntry({ id: 'dec_custom_id123' });
      const result = store.save(entry);
      expect(result.id).toBe('dec_custom_id123');
    });

    it('should add metadata', () => {
      const entry = createMockKnowledgeEntry();
      const result = store.save(entry);
      expect(result.entry.metadata.createdAt).toBeDefined();
      expect(result.entry.metadata.updatedAt).toBeDefined();
      expect(result.entry.metadata.version).toBe(1);
    });

    it('should increment version on re-save', () => {
      const entry = createMockKnowledgeEntry();
      const result1 = store.save(entry);
      const savedEntry = store.get(result1.id);

      const result2 = store.save(savedEntry);
      expect(result2.entry.metadata.version).toBe(2);
    });

    it('should write file to correct location', () => {
      const entry = createMockKnowledgeEntry();
      const result = store.save(entry);

      const expectedPath = path.join(
        tempDir, 'maestro', 'knowledge', 'decisions', `${result.id}.json`
      );
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('should save to branch-specific location', () => {
      const entry = createMockKnowledgeEntry();
      const result = store.save(entry, 'feature/test');

      expect(result.filePath).toContain('feature--test');
      expect(fs.existsSync(result.filePath)).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve a saved entry', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      const retrieved = store.get(saveResult.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(saveResult.id);
      expect(retrieved.title).toBe(entry.title);
    });

    it('should return null for non-existent entry', () => {
      const result = store.get('dec_nonexistent_123');
      expect(result).toBeNull();
    });

    it('should fall back to global knowledge if not in branch', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry); // Save to global

      const retrieved = store.get(saveResult.id, 'feature/test');
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(saveResult.id);
    });

    it('should get branch-specific entry first', () => {
      const globalEntry = createMockKnowledgeEntry({ title: 'Global' });
      const branchEntry = createMockKnowledgeEntry({ title: 'Branch' });

      store.save(globalEntry);
      const branchResult = store.save(branchEntry, 'feature/test');

      const retrieved = store.get(branchResult.id, 'feature/test');
      expect(retrieved.title).toBe('Branch');
    });
  });

  describe('update', () => {
    it('should update an existing entry', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      const updateResult = store.update(saveResult.id, { title: 'Updated Title' });
      expect(updateResult.success).toBe(true);

      const retrieved = store.get(saveResult.id);
      expect(retrieved.title).toBe('Updated Title');
    });

    it('should preserve original fields', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      store.update(saveResult.id, { title: 'Updated Title' });

      const retrieved = store.get(saveResult.id);
      expect(retrieved.domain).toBe(entry.domain);
      expect(retrieved.content.summary).toBe(entry.content.summary);
    });

    it('should preserve createdAt on update', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);
      const originalCreatedAt = saveResult.entry.metadata.createdAt;

      // Small delay to ensure different timestamp
      store.update(saveResult.id, { title: 'Updated' });

      const retrieved = store.get(saveResult.id);
      expect(retrieved.metadata.createdAt).toBe(originalCreatedAt);
    });

    it('should return error for non-existent entry', () => {
      const result = store.update('dec_nonexistent_123', { title: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('not_found');
    });

    it('should increment version on update', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);
      const v1 = saveResult.entry.metadata.version;

      store.update(saveResult.id, { title: 'V2' });
      const retrieved = store.get(saveResult.id);

      // Update increments version (save called internally also increments)
      expect(retrieved.metadata.version).toBeGreaterThan(v1);
    });
  });

  describe('delete', () => {
    it('should delete an existing entry', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      const deleteResult = store.delete(saveResult.id);
      expect(deleteResult.success).toBe(true);

      const retrieved = store.get(saveResult.id);
      expect(retrieved).toBeNull();
    });

    it('should return error for non-existent entry', () => {
      const result = store.delete('dec_nonexistent_123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('not_found');
    });

    it('should remove file from filesystem', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      store.delete(saveResult.id);

      expect(fs.existsSync(saveResult.filePath)).toBe(false);
    });

    it('should update index after delete', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      store.delete(saveResult.id);

      const index = store.loadIndex();
      expect(index.entries[saveResult.id]).toBeUndefined();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add some test entries
      store.save(createMockKnowledgeEntry({
        type: 'decision',
        title: 'Decision 1',
        domain: 'frontend',
        tags: ['react', 'ui'],
        confidence: 0.9
      }));
      store.save(createMockKnowledgeEntry({
        type: 'decision',
        title: 'Decision 2',
        domain: 'backend',
        tags: ['api', 'node'],
        confidence: 0.7
      }));
      store.save(createMockKnowledgeEntry({
        type: 'pattern',
        title: 'Pattern 1',
        domain: 'frontend',
        tags: ['react', 'hooks'],
        confidence: 0.8
      }));
    });

    it('should return all entries when no criteria', () => {
      const result = store.query({});
      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
    });

    it('should filter by type', () => {
      const result = store.query({ type: 'decision' });
      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.entries.every(e => e.type === 'decision')).toBe(true);
    });

    it('should filter by multiple types', () => {
      const result = store.query({ type: ['decision', 'pattern'] });
      expect(result.total).toBe(3);
    });

    it('should filter by domain', () => {
      const result = store.query({ domain: 'frontend' });
      expect(result.total).toBe(2);
    });

    it('should filter by tags', () => {
      const result = store.query({ tags: ['react'] });
      expect(result.total).toBe(2);
    });

    it('should filter by minimum confidence', () => {
      const result = store.query({ minConfidence: 0.8 });
      expect(result.total).toBe(2);
    });

    it('should respect limit', () => {
      const result = store.query({ limit: 2 });
      expect(result.entries.length).toBe(2);
    });

    it('should respect offset', () => {
      const result = store.query({ offset: 1, limit: 2 });
      expect(result.entries.length).toBe(2);
    });

    it('should sort by specified field', () => {
      const result = store.query({ sortBy: 'confidence', sortOrder: 'desc' });
      expect(result.entries[0].confidence).toBe(0.9);
    });

    it('should load full entries when requested', () => {
      const result = store.query({ type: 'decision', fullEntries: true });
      expect(result.entries[0].content).toBeDefined();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      store.save(createMockKnowledgeEntry({
        title: 'React Component Architecture',
        domain: 'frontend',
        tags: ['react', 'components']
      }));
      store.save(createMockKnowledgeEntry({
        title: 'API Design Patterns',
        domain: 'backend',
        tags: ['api', 'rest']
      }));
      store.save(createMockKnowledgeEntry({
        title: 'Node.js Performance',
        domain: 'backend',
        tags: ['node', 'performance']
      }));
    });

    it('should find entries by title', () => {
      const result = store.search('React');
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.entries[0].title).toContain('React');
    });

    it('should find entries by tag', () => {
      const result = store.search('api');
      expect(result.total).toBe(1);
    });

    it('should find entries by domain', () => {
      const result = store.search('backend');
      expect(result.total).toBe(2);
    });

    it('should be case insensitive', () => {
      const result = store.search('REACT');
      expect(result.total).toBe(1);
    });

    it('should return empty for no matches', () => {
      const result = store.search('nonexistent');
      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
    });

    it('should filter by type', () => {
      const result = store.search('backend', { type: 'decision' });
      expect(result.entries.every(e => e.type === 'decision')).toBe(true);
    });

    it('should include search score', () => {
      const result = store.search('React');
      expect(result.entries[0].searchScore).toBeGreaterThan(0);
    });
  });

  describe('recordOutcome', () => {
    it('should record a successful outcome', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      const outcome = {
        success: true,
        impact: 'positive',
        notes: 'Worked well'
      };
      const result = store.recordOutcome(saveResult.id, outcome);
      expect(result.success).toBe(true);

      const retrieved = store.get(saveResult.id);
      expect(retrieved.feedback.outcomes.length).toBe(1);
      expect(retrieved.feedback.successCount).toBe(1);
      expect(retrieved.feedback.usageCount).toBe(1);
    });

    it('should record a failed outcome', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      store.recordOutcome(saveResult.id, { success: false, impact: 'negative' });

      const retrieved = store.get(saveResult.id);
      expect(retrieved.feedback.failureCount).toBe(1);
    });

    it('should calculate success rate', () => {
      const entry = createMockKnowledgeEntry();
      const saveResult = store.save(entry);

      store.recordOutcome(saveResult.id, { success: true });
      store.recordOutcome(saveResult.id, { success: true });
      store.recordOutcome(saveResult.id, { success: false });

      const retrieved = store.get(saveResult.id);
      expect(retrieved.feedback.successRate).toBeCloseTo(0.667, 2);
    });

    it('should adjust confidence after enough outcomes', () => {
      const entry = createMockKnowledgeEntry({ confidence: 0.5 });
      const saveResult = store.save(entry);

      store.recordOutcome(saveResult.id, { success: true });
      store.recordOutcome(saveResult.id, { success: true });
      store.recordOutcome(saveResult.id, { success: true });

      const retrieved = store.get(saveResult.id);
      expect(retrieved.confidence).toBeGreaterThan(0.5);
    });

    it('should return error for non-existent entry', () => {
      const result = store.recordOutcome('dec_nonexistent_123', { success: true });
      expect(result.success).toBe(false);
      expect(result.error).toBe('not_found');
    });
  });

  describe('buildIndex', () => {
    it('should build index from existing entries', () => {
      store.save(createMockKnowledgeEntry({ type: 'decision' }));
      store.save(createMockKnowledgeEntry({ type: 'pattern' }));

      // Force rebuild
      store.indexLoaded = false;
      store.index = null;

      const result = store.buildIndex();
      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(2);
    });

    it('should track stats by type', () => {
      store.save(createMockKnowledgeEntry({ type: 'decision' }));
      store.save(createMockKnowledgeEntry({ type: 'decision' }));
      store.save(createMockKnowledgeEntry({ type: 'pattern' }));

      store.indexLoaded = false;
      const result = store.buildIndex();

      expect(result.stats.byType.decisions).toBe(2);
      expect(result.stats.byType.patterns).toBe(1);
    });

    it('should write index file', () => {
      store.save(createMockKnowledgeEntry());
      store.buildIndex();

      const indexPath = store.getIndexPath();
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });

  describe('bulkSave', () => {
    it('should save multiple entries', () => {
      const entries = [
        createMockKnowledgeEntry({ title: 'Entry 1' }),
        createMockKnowledgeEntry({ title: 'Entry 2' }),
        createMockKnowledgeEntry({ title: 'Entry 3' })
      ];

      const result = store.bulkSave(entries);
      expect(result.success).toBe(true);
      expect(result.saved).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should report partial failures', () => {
      const entries = [
        createMockKnowledgeEntry({ title: 'Valid Entry' }),
        { invalid: true } // Invalid entry
      ];

      // The second entry should still save (just with defaults)
      const result = store.bulkSave(entries);
      expect(result.total).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      store.save(createMockKnowledgeEntry({ type: 'decision', domain: 'frontend' }));
      store.save(createMockKnowledgeEntry({ type: 'pattern', domain: 'backend' }));

      // Force index rebuild to get accurate stats
      store.buildIndex();
      const stats = store.getStats();

      expect(stats.total).toBe(2);
      // Stats use directory names (plural)
      expect(stats.byType.decisions).toBe(1);
      expect(stats.byType.patterns).toBe(1);
      expect(stats.byDomain.frontend).toBe(1);
      expect(stats.byDomain.backend).toBe(1);
    });
  });

  describe('exportAll and importAll', () => {
    it('should export all entries', () => {
      store.save(createMockKnowledgeEntry({ title: 'Entry 1' }));
      store.save(createMockKnowledgeEntry({ title: 'Entry 2' }));

      const exported = store.exportAll();
      expect(exported.success).toBe(true);
      expect(exported.total).toBe(2);
      expect(exported.entries.length).toBe(2);
    });

    it('should import exported entries', () => {
      // Export from first store
      store.save(createMockKnowledgeEntry({ title: 'Entry 1' }));
      const exported = store.exportAll();

      // Import to new store
      const newTempDir = createTempDir();
      const newStore = new KnowledgeStore({
        maestroDir: path.join(newTempDir, 'maestro')
      });

      const result = newStore.importAll(exported);
      expect(result.success).toBe(true);
      expect(result.saved).toBe(1);

      cleanupTempDir(newTempDir);
    });

    it('should reject invalid import data', () => {
      const result = store.importAll({ invalid: true });
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_data');
    });
  });

  describe('getTypeFromId', () => {
    it('should extract type from decision ID', () => {
      expect(store.getTypeFromId('dec_abc123_xyz')).toBe('decision');
    });

    it('should extract type from pattern ID', () => {
      expect(store.getTypeFromId('pat_abc123_xyz')).toBe('pattern');
    });

    it('should extract type from research ID', () => {
      expect(store.getTypeFromId('res_abc123_xyz')).toBe('research');
    });

    it('should extract type from learning ID', () => {
      expect(store.getTypeFromId('lrn_abc123_xyz')).toBe('learning');
    });

    it('should extract type from blocker ID', () => {
      expect(store.getTypeFromId('blk_abc123_xyz')).toBe('blocker');
    });

    it('should extract type from entity ID', () => {
      expect(store.getTypeFromId('ent_abc123_xyz')).toBe('entity');
    });

    it('should extract type from todo ID', () => {
      expect(store.getTypeFromId('todo_abc123_xyz')).toBe('todo');
    });

    it('should return misc for unknown prefix', () => {
      expect(store.getTypeFromId('xyz_abc123_xyz')).toBe('misc');
    });
  });

  describe('getNestedValue', () => {
    it('should get top-level value', () => {
      const obj = { foo: 'bar' };
      expect(store.getNestedValue(obj, 'foo')).toBe('bar');
    });

    it('should get nested value', () => {
      const obj = { foo: { bar: { baz: 'value' } } };
      expect(store.getNestedValue(obj, 'foo.bar.baz')).toBe('value');
    });

    it('should return undefined for missing path', () => {
      const obj = { foo: 'bar' };
      expect(store.getNestedValue(obj, 'missing.path')).toBeUndefined();
    });
  });
});
