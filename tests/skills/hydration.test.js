/**
 * Tests for the Hydration Feature
 *
 * Tests for:
 * - WorkspaceScanner
 * - GitHistoryParser
 * - KnowledgeExtractor
 * - HydrationManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Import modules
import WorkspaceScanner from '../../skills/workspace-scanner.js';
import GitHistoryParser from '../../skills/git-history-parser.js';
import KnowledgeExtractor from '../../skills/knowledge-extractor.js';
import HydrationManager from '../../skills/hydration-manager.js';

// Helper to create temp directory
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hydration-test-'));
}

// Helper to cleanup temp directory
function cleanupTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Helper to create a test git repo
function createTestGitRepo(dir) {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
  // Disable GPG signing for test commits
  execSync('git config commit.gpgsign false', { cwd: dir, stdio: 'pipe' });

  // Create initial commit
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test Repo');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });
}

// Helper to add commits to test repo
function addTestCommits(dir, commits) {
  for (const commit of commits) {
    const fileName = `file-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
    fs.writeFileSync(path.join(dir, fileName), commit.content || 'test content');
    execSync('git add .', { cwd: dir, stdio: 'pipe' });
    execSync(`git commit -m "${commit.message}"`, { cwd: dir, stdio: 'pipe' });
  }
}

// ==========================================
// WorkspaceScanner Tests
// ==========================================

describe('WorkspaceScanner', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const scanner = new WorkspaceScanner();
      expect(scanner.config.maxDepth).toBe(3);
      expect(scanner.config.ignorePatterns).toContain('node_modules');
    });

    it('should accept custom config', () => {
      const scanner = new WorkspaceScanner({
        rootPath: tempDir,
        maxDepth: 5
      });
      expect(scanner.config.rootPath).toBe(tempDir);
      expect(scanner.config.maxDepth).toBe(5);
    });
  });

  describe('isGitRepository', () => {
    it('should return false for non-git directory', () => {
      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      expect(scanner.isGitRepository(tempDir)).toBe(false);
    });

    it('should return true for git repository', () => {
      createTestGitRepo(tempDir);
      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      expect(scanner.isGitRepository(tempDir)).toBe(true);
    });
  });

  describe('scan', () => {
    it('should detect single repository', () => {
      createTestGitRepo(tempDir);
      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      const result = scanner.scan();

      expect(result.workspaceType).toBe('single-repo');
      expect(result.repositories.length).toBe(1);
      expect(result.repositories[0].name).toBe(path.basename(tempDir));
    });

    it('should count commits correctly', () => {
      createTestGitRepo(tempDir);
      addTestCommits(tempDir, [
        { message: 'feat: add feature 1' },
        { message: 'fix: fix bug 1' }
      ]);

      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      const result = scanner.scan();

      expect(result.repositories[0].commitCount).toBe(3); // Initial + 2 new
    });

    it('should detect date range', () => {
      createTestGitRepo(tempDir);
      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      const result = scanner.scan();

      expect(result.dateRange.earliest).toBeTruthy();
      expect(result.dateRange.latest).toBeTruthy();
    });
  });

  describe('getSummary', () => {
    it('should return formatted summary', () => {
      createTestGitRepo(tempDir);
      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      const summary = scanner.getSummary();

      expect(summary.type).toBe('single-repo');
      expect(summary.typeLabel).toBe('Single Repository');
      expect(summary.repositoryCount).toBe(1);
      expect(summary.totalCommits).toBeGreaterThan(0);
    });
  });

  describe('parseGitHubUrl', () => {
    it('should parse HTTPS GitHub URL', () => {
      const scanner = new WorkspaceScanner();
      const result = scanner.parseGitHubUrl('https://github.com/owner/repo.git');

      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse SSH GitHub URL', () => {
      const scanner = new WorkspaceScanner();
      const result = scanner.parseGitHubUrl('git@github.com:owner/repo.git');

      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should return null for non-GitHub URL', () => {
      const scanner = new WorkspaceScanner();
      const result = scanner.parseGitHubUrl('https://gitlab.com/owner/repo.git');

      expect(result).toBeNull();
    });
  });

  describe('estimateHydrationTime', () => {
    it('should estimate time based on commit count', () => {
      createTestGitRepo(tempDir);
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' },
        { message: 'feat: feature 2' }
      ]);

      const scanner = new WorkspaceScanner({ rootPath: tempDir });
      const estimate = scanner.estimateHydrationTime();

      expect(estimate.commitsToProcess).toBe(3);
      expect(estimate.estimatedSeconds).toBeGreaterThan(0);
      expect(estimate.estimatedFormatted).toContain('~');
    });
  });
});

// ==========================================
// GitHistoryParser Tests
// ==========================================

describe('GitHistoryParser', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    createTestGitRepo(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.config.batchSize).toBe(100);
      expect(parser.config.skipMergeCommits).toBe(false);
    });
  });

  describe('parseCommits', () => {
    it('should parse commits from repository', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: add new feature' },
        { message: 'fix: fix a bug' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = await parser.parseCommits();

      expect(result.commits.length).toBe(3);
      expect(result.totalParsed).toBe(3);
    });

    it('should parse conventional commit format', async () => {
      addTestCommits(tempDir, [
        { message: 'feat(auth): add login feature' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = await parser.parseCommits();

      const featCommit = result.commits.find(c => c.subject.includes('auth'));
      expect(featCommit.conventional.isConventional).toBe(true);
      expect(featCommit.conventional.type).toBe('feat');
      expect(featCommit.conventional.scope).toBe('auth');
    });

    it('should detect breaking changes', async () => {
      addTestCommits(tempDir, [
        { message: 'feat!: breaking change' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = await parser.parseCommits();

      const breakingCommit = result.commits.find(c => c.subject.includes('breaking'));
      expect(breakingCommit.isBreaking).toBe(true);
      expect(breakingCommit.conventional.breaking).toBe(true);
    });

    it('should respect maxCommits option', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' },
        { message: 'feat: feature 2' },
        { message: 'feat: feature 3' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = await parser.parseCommits({ maxCommits: 2 });

      expect(result.commits.length).toBe(2);
    });

    it('should call progress callback', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir, batchSize: 1 });
      const progressCalls = [];

      await parser.parseCommits({}, (progress) => {
        progressCalls.push(progress);
      });

      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('parseConventionalCommit', () => {
    it('should parse type and description', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.parseConventionalCommit('feat: add feature', '');

      expect(result.isConventional).toBe(true);
      expect(result.type).toBe('feat');
      expect(result.description).toBe('add feature');
    });

    it('should parse scope', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.parseConventionalCommit('fix(api): fix endpoint', '');

      expect(result.scope).toBe('api');
    });

    it('should detect breaking indicator', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.parseConventionalCommit('feat!: breaking', '');

      expect(result.breaking).toBe(true);
    });

    it('should detect BREAKING CHANGE in body', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.parseConventionalCommit('feat: change', 'BREAKING CHANGE: old API removed');

      expect(result.breaking).toBe(true);
    });

    it('should return non-conventional for invalid format', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.parseConventionalCommit('Add new feature', '');

      expect(result.isConventional).toBe(false);
    });
  });

  describe('detectDecisions', () => {
    it('should detect "chose X over Y" pattern', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.detectDecisions('We chose TypeScript over JavaScript');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect "switched to" pattern', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.detectDecisions('Switched to PostgreSQL');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect "replaced X with Y" pattern', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = parser.detectDecisions('Replaced Redux with Zustand');

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('inferEntityType', () => {
    it('should detect service from path', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.inferEntityType('services/auth.js')).toBe('service');
    });

    it('should detect component from path', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.inferEntityType('components/Button.tsx')).toBe('component');
    });

    it('should detect api from path', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.inferEntityType('api/users.ts')).toBe('api');
    });

    it('should detect hook from path', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.inferEntityType('hooks/useAuth.ts')).toBe('hook');
    });

    it('should return null for unknown path', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      expect(parser.inferEntityType('random/file.txt')).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return empty stats for empty array', () => {
      const parser = new GitHistoryParser({ repoPath: tempDir });
      const stats = parser.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.conventional).toBe(0);
    });

    it('should count conventional commits', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' },
        { message: 'fix: fix 1' },
        { message: 'Regular commit' }
      ]);

      const parser = new GitHistoryParser({ repoPath: tempDir });
      const result = await parser.parseCommits();
      const stats = parser.getStatistics(result.commits);

      expect(stats.conventional).toBe(2); // feat and fix
    });
  });
});

// ==========================================
// KnowledgeExtractor Tests
// ==========================================

describe('KnowledgeExtractor', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const extractor = new KnowledgeExtractor();
      expect(extractor.config.minConfidence).toBe(0.5);
      expect(extractor.config.enableDeduplication).toBe(true);
    });

    it('should accept custom config', () => {
      const extractor = new KnowledgeExtractor({
        minConfidence: 0.7,
        repositoryContext: { name: 'test-repo' }
      });
      expect(extractor.config.minConfidence).toBe(0.7);
      expect(extractor.config.repositoryContext.name).toBe('test-repo');
    });
  });

  describe('extractFromCommits', () => {
    it('should extract knowledge from commits', () => {
      const extractor = new KnowledgeExtractor();
      const commits = [
        {
          hash: 'abc123def456',
          shortHash: 'abc123d',
          subject: 'feat!: adopt TypeScript for type safety',
          body: 'Chose TypeScript over JavaScript',
          conventional: { isConventional: true, type: 'feat', breaking: true },
          isBreaking: true,
          decisions: [{ pattern: 'chose', match: 'Chose TypeScript' }],
          author: { name: 'Test', email: 'test@test.com' },
          date: new Date().toISOString(),
          filesChanged: ['src/services/auth.ts'],
          stats: { insertions: 100, deletions: 50, files: [] }
        }
      ];

      const result = extractor.extractFromCommits(commits);

      expect(result.decisions.length).toBeGreaterThan(0);
      expect(result.metadata.commitCount).toBe(1);
    });

    it('should extract entities from feat commits', () => {
      const extractor = new KnowledgeExtractor();
      const commits = [
        {
          hash: 'abc123def456',
          shortHash: 'abc123d',
          subject: 'feat: add user service',
          body: '',
          conventional: { isConventional: true, type: 'feat' },
          isBreaking: false,
          decisions: [],
          author: { name: 'Test', email: 'test@test.com' },
          date: new Date().toISOString(),
          filesChanged: ['services/user-service.ts'],
          stats: { insertions: 100, deletions: 0, files: [] }
        }
      ];

      const result = extractor.extractFromCommits(commits);

      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.entities[0].entityType).toBe('service');
    });

    it('should extract learnings from fix commits', () => {
      const extractor = new KnowledgeExtractor();
      const commits = [
        {
          hash: 'abc123def456',
          shortHash: 'abc123d',
          subject: 'fix: fix authentication bug',
          body: 'Bug: users could not login',
          conventional: { isConventional: true, type: 'fix' },
          isBreaking: false,
          decisions: [],
          author: { name: 'Test', email: 'test@test.com' },
          date: new Date().toISOString(),
          filesChanged: [],
          stats: { insertions: 10, deletions: 5, files: [] }
        }
      ];

      const result = extractor.extractFromCommits(commits);

      expect(result.learnings.length).toBeGreaterThan(0);
      expect(result.learnings[0].learningType).toBe('bug-fix');
    });

    it('should deduplicate entries', () => {
      const extractor = new KnowledgeExtractor();
      const commits = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          subject: 'feat!: adopt TypeScript',
          body: '',
          conventional: { isConventional: true, type: 'feat', breaking: true },
          isBreaking: true,
          decisions: [],
          author: { name: 'Test', email: 'test@test.com' },
          date: new Date().toISOString(),
          filesChanged: [],
          stats: {}
        },
        {
          hash: 'def456',
          shortHash: 'def456',
          subject: 'feat!: adopt TypeScript', // Duplicate
          body: '',
          conventional: { isConventional: true, type: 'feat', breaking: true },
          isBreaking: true,
          decisions: [],
          author: { name: 'Test', email: 'test@test.com' },
          date: new Date().toISOString(),
          filesChanged: [],
          stats: {}
        }
      ];

      const result = extractor.extractFromCommits(commits);

      // Should only have 1 decision due to deduplication
      expect(result.decisions.length).toBe(1);
    });
  });

  describe('extractPatterns', () => {
    it('should detect patterns from repeated commits', () => {
      const extractor = new KnowledgeExtractor();
      const commits = [
        { conventional: { isConventional: true, type: 'refactor', scope: 'auth' }, shortHash: 'a1' },
        { conventional: { isConventional: true, type: 'refactor', scope: 'auth' }, shortHash: 'a2' },
        { conventional: { isConventional: true, type: 'refactor', scope: 'auth' }, shortHash: 'a3' },
      ];

      const patterns = extractor.extractPatterns(commits);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].occurrences).toBe(3);
    });
  });

  describe('calculateConfidence', () => {
    it('should return higher confidence for breaking changes', () => {
      const extractor = new KnowledgeExtractor();

      const normalCommit = {
        conventional: { isConventional: true, type: 'feat' },
        isBreaking: false
      };

      const breakingCommit = {
        conventional: { isConventional: true, type: 'feat', breaking: true },
        isBreaking: true
      };

      const normalConf = extractor.calculateConfidence(normalCommit, 'decision');
      const breakingConf = extractor.calculateConfidence(breakingCommit, 'decision');

      expect(breakingConf).toBeGreaterThan(normalConf);
    });
  });

  describe('formatEntityName', () => {
    it('should convert camelCase to title case', () => {
      const extractor = new KnowledgeExtractor();
      expect(extractor.formatEntityName('userService')).toBe('User Service');
    });

    it('should convert kebab-case to title case', () => {
      const extractor = new KnowledgeExtractor();
      expect(extractor.formatEntityName('user-service')).toBe('User Service');
    });

    it('should convert snake_case to title case', () => {
      const extractor = new KnowledgeExtractor();
      expect(extractor.formatEntityName('user_service')).toBe('User Service');
    });
  });

  describe('createTrackFromBranch', () => {
    it('should create track from branch data', () => {
      const extractor = new KnowledgeExtractor();
      const branchData = {
        branchName: 'feature/user-auth',
        commits: [
          { hash: 'abc123', subject: 'feat: add login' },
          { hash: 'def456', subject: 'feat: add logout' }
        ]
      };

      const track = extractor.createTrackFromBranch(branchData);

      expect(track.id).toContain('HYDRATED');
      expect(track.type).toBe('feature');
      expect(track.status).toBe('completed');
      expect(track.metadata.commitCount).toBe(2);
    });

    it('should detect fix branch type', () => {
      const extractor = new KnowledgeExtractor();
      const branchData = {
        branchName: 'fix/login-bug',
        commits: [
          { hash: 'abc123', subject: 'fix: login bug', date: new Date().toISOString() }
        ]
      };

      const track = extractor.createTrackFromBranch(branchData);

      expect(track.type).toBe('bug');
    });
  });
});

// ==========================================
// HydrationManager Tests
// ==========================================

describe('HydrationManager', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    createTestGitRepo(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const manager = new HydrationManager({ rootPath: tempDir });
      expect(manager.config.maestroDir).toBe('maestro');
      expect(manager.config.batchSize).toBe(100);
    });

    it('should initialize component instances', () => {
      const manager = new HydrationManager({ rootPath: tempDir });
      expect(manager.workspaceScanner).toBeDefined();
      expect(manager.knowledgeStore).toBeDefined();
    });
  });

  describe('loadState', () => {
    it('should return empty state when no state file exists', () => {
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });
      const state = manager.loadState();

      expect(state.version).toBe('1.0.0');
      expect(state.totalCommitsProcessed).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return status summary', () => {
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });
      const status = manager.getStatus();

      expect(status.hasBeenHydrated).toBe(false);
      expect(status.isRunning).toBe(false);
      expect(status.workspace).toBeDefined();
      expect(status.canIncremental).toBe(false);
    });
  });

  describe('preview', () => {
    it('should preview hydration without executing', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' },
        { message: 'fix: fix 1' }
      ]);

      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });
      const preview = await manager.preview({ maxCommits: 10 });

      expect(preview.mode).toBe('full');
      expect(preview.totalCommits).toBeGreaterThan(0);
      expect(preview.estimatedEntries).toBeDefined();
      expect(preview.repositories.length).toBe(1);
    });
  });

  describe('hydrate', () => {
    it('should hydrate knowledge from git history', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: add authentication' },
        { message: 'fix: fix login bug' },
        { message: 'refactor(auth): improve security' }
      ]);

      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });

      const result = await manager.hydrate({ maxCommits: 10 });

      expect(result.success).toBe(true);
      expect(result.totalCommits).toBeGreaterThan(0);
      expect(result.repositories.length).toBe(1);
    });

    it('should track progress during hydration', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' }
      ]);

      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });

      const progressUpdates = [];
      await manager.hydrate({ maxCommits: 10 }, (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.phase === 'init')).toBe(true);
      expect(progressUpdates.some(p => p.phase === 'complete')).toBe(true);
    });

    it('should save state after hydration', async () => {
      addTestCommits(tempDir, [
        { message: 'feat: feature 1' }
      ]);

      const maestroDir = path.join(tempDir, 'maestro');
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir
      });

      await manager.hydrate({ maxCommits: 10 });

      const statePath = path.join(maestroDir, 'hydration', 'state.json');
      expect(fs.existsSync(statePath)).toBe(true);

      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(state.lastHydrationCompleted).toBeTruthy();
      expect(state.totalCommitsProcessed).toBeGreaterThan(0);
    });

    it('should prevent concurrent hydration', async () => {
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });

      // Simulate running state
      manager.isRunning = true;

      const result = await manager.hydrate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('already in progress');
    });
  });

  describe('estimateEntries', () => {
    it('should estimate entries from commit count', () => {
      const manager = new HydrationManager({ rootPath: tempDir });
      const estimate = manager.estimateEntries(100);

      expect(estimate.decisions).toBe(5); // 5%
      expect(estimate.patterns).toBe(2); // 2%
      expect(estimate.entities).toBe(8); // 8%
      expect(estimate.learnings).toBe(15); // 15%
      expect(estimate.total).toBe(30); // 30%
    });
  });

  describe('getFormattedStatus', () => {
    it('should return formatted status string', () => {
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir: path.join(tempDir, 'maestro')
      });
      const formatted = manager.getFormattedStatus();

      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('Hydration Status');
    });
  });

  describe('reset', () => {
    it('should reset hydration state', async () => {
      const maestroDir = path.join(tempDir, 'maestro');
      const manager = new HydrationManager({
        rootPath: tempDir,
        maestroDir
      });

      // First hydrate
      addTestCommits(tempDir, [{ message: 'feat: test' }]);
      await manager.hydrate({ maxCommits: 5 });

      // Then reset
      manager.reset();

      const status = manager.getStatus();
      expect(status.hasBeenHydrated).toBe(false);
      expect(status.processed.commits).toBe(0);
    });
  });
});
