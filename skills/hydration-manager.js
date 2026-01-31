/**
 * Hydration Manager Skill
 *
 * Orchestrates the knowledge hydration process from git history.
 * Manages hydration state, coordinates between components, and
 * provides progress tracking for the hydration workflow.
 *
 * Features:
 * - Full and incremental hydration modes
 * - Multi-repository support
 * - Batch processing with progress callbacks
 * - State persistence for resume capability
 * - Deduplication across extraction runs
 */

const fs = require('fs');
const path = require('path');
const WorkspaceScanner = require('./workspace-scanner');
const GitHistoryParser = require('./git-history-parser');
const KnowledgeExtractor = require('./knowledge-extractor');
const KnowledgeStore = require('./knowledge-store');

class HydrationManager {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      hydrationDir: config.hydrationDir || 'hydration',
      batchSize: config.batchSize || 100,
      enableGitHub: config.enableGitHub !== false,
      ...config
    };

    // Initialize components
    this.workspaceScanner = new WorkspaceScanner({
      rootPath: config.rootPath || process.cwd()
    });

    this.knowledgeStore = new KnowledgeStore({
      maestroDir: this.config.maestroDir
    });

    this.state = null;
    this.isRunning = false;
    this.abortRequested = false;
  }

  /**
   * Get the hydration state file path
   * @returns {string}
   */
  getStatePath() {
    return path.join(this.config.maestroDir, this.config.hydrationDir, 'state.json');
  }

  /**
   * Load or initialize hydration state
   * @returns {Object} Current state
   */
  loadState() {
    const statePath = this.getStatePath();

    try {
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, 'utf8');
        this.state = JSON.parse(content);
        return this.state;
      }
    } catch (error) {
      // State file corrupted, create new
    }

    // Initialize new state
    this.state = {
      version: '1.0.0',
      workspaceType: null,
      lastHydrationStarted: null,
      lastHydrationCompleted: null,
      repositories: {},
      totalCommitsProcessed: 0,
      entriesCreated: {
        decisions: 0,
        patterns: 0,
        entities: 0,
        learnings: 0,
        tracks: 0
      },
      crossRepoKnowledge: {
        patterns: 0,
        sharedDecisions: 0
      }
    };

    return this.state;
  }

  /**
   * Save hydration state
   */
  saveState() {
    const statePath = this.getStatePath();
    const stateDir = path.dirname(statePath);

    try {
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save hydration state:', error.message);
    }
  }

  /**
   * Get current hydration status
   * @returns {Object} Status summary
   */
  getStatus() {
    this.loadState();

    const workspace = this.workspaceScanner.getSummary();

    return {
      hasBeenHydrated: !!this.state.lastHydrationCompleted,
      isRunning: this.isRunning,
      lastHydration: this.state.lastHydrationCompleted,
      workspace: {
        type: workspace.type,
        repositoryCount: workspace.repositoryCount,
        totalCommits: workspace.totalCommits
      },
      processed: {
        commits: this.state.totalCommitsProcessed,
        entriesCreated: this.state.entriesCreated
      },
      repositories: Object.entries(this.state.repositories || {}).map(([name, repo]) => ({
        name,
        lastCommit: repo.lastHydratedCommit,
        commitsProcessed: repo.commitsProcessed
      })),
      canIncremental: this.state.totalCommitsProcessed > 0
    };
  }

  /**
   * Preview hydration without executing
   * @param {Object} options - Hydration options
   * @returns {Object} Preview result
   */
  async preview(options = {}) {
    const workspace = this.workspaceScanner.scan();
    this.loadState();

    // Determine repositories to process
    const repos = this.selectRepositories(workspace, options);

    // Calculate commits to process
    let totalCommits = 0;
    const repoDetails = [];

    for (const repo of repos) {
      const parser = new GitHistoryParser({ repoPath: repo.path });
      const parseOptions = this.buildParseOptions(options, repo);

      // Get commit count without full parsing
      const countResult = await parser.parseCommits({
        ...parseOptions,
        includeStats: false
      });

      totalCommits += countResult.totalParsed;

      repoDetails.push({
        name: repo.name,
        path: repo.path,
        commitCount: countResult.totalParsed,
        isIncremental: !!parseOptions.since
      });
    }

    // Estimate entries to be created
    const estimatedEntries = this.estimateEntries(totalCommits);

    return {
      mode: options.mode || 'full',
      repositories: repoDetails,
      totalCommits,
      estimatedEntries,
      estimatedTime: this.workspaceScanner.estimateHydrationTime({
        ...options,
        maxCommits: totalCommits
      }),
      options: {
        since: options.since || null,
        until: options.until || null,
        branches: options.branches || ['HEAD'],
        includeGitHub: options.includeGitHub && this.config.enableGitHub,
        skipMergeCommits: options.skipMergeCommits || false
      }
    };
  }

  /**
   * Estimate number of entries from commit count
   * @param {number} commitCount - Number of commits
   * @returns {Object} Estimated entries
   */
  estimateEntries(commitCount) {
    // Rough estimates based on typical commit patterns
    return {
      decisions: Math.round(commitCount * 0.05), // ~5% of commits have decisions
      patterns: Math.round(commitCount * 0.02), // ~2% form patterns
      entities: Math.round(commitCount * 0.08), // ~8% introduce entities
      learnings: Math.round(commitCount * 0.15), // ~15% are fixes/learnings
      total: Math.round(commitCount * 0.30)
    };
  }

  /**
   * Run hydration process
   * @param {Object} options - Hydration options
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Hydration result
   */
  async hydrate(options = {}, onProgress = null) {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Hydration already in progress'
      };
    }

    this.isRunning = true;
    this.abortRequested = false;
    this.loadState();

    const result = {
      success: false,
      mode: options.mode || 'full',
      startTime: new Date().toISOString(),
      endTime: null,
      repositories: [],
      totalCommits: 0,
      entriesCreated: {
        decisions: 0,
        patterns: 0,
        entities: 0,
        learnings: 0,
        tracks: 0
      },
      errors: []
    };

    try {
      const workspace = this.workspaceScanner.scan();
      this.state.workspaceType = workspace.workspaceType;
      this.state.lastHydrationStarted = result.startTime;

      // Determine repositories to process
      const repos = this.selectRepositories(workspace, options);

      // Report initial progress
      if (onProgress) {
        onProgress({
          phase: 'init',
          message: 'Initializing hydration',
          workspace: workspace.workspaceType,
          repositoryCount: repos.length
        });
      }

      // Process each repository
      for (let repoIndex = 0; repoIndex < repos.length; repoIndex++) {
        if (this.abortRequested) {
          result.errors.push({ type: 'abort', message: 'Hydration aborted by user' });
          break;
        }

        const repo = repos[repoIndex];
        const repoResult = await this.hydrateRepository(repo, options, (progress) => {
          if (onProgress) {
            onProgress({
              phase: 'processing',
              repository: repo.name,
              repositoryIndex: repoIndex + 1,
              totalRepositories: repos.length,
              ...progress
            });
          }
        });

        result.repositories.push(repoResult);
        result.totalCommits += repoResult.commitsProcessed;

        // Aggregate entries
        for (const [type, count] of Object.entries(repoResult.entriesCreated)) {
          result.entriesCreated[type] = (result.entriesCreated[type] || 0) + count;
        }

        if (repoResult.errors?.length > 0) {
          result.errors.push(...repoResult.errors.map(e => ({
            repository: repo.name,
            ...e
          })));
        }
      }

      // Create tracks from merged branches if requested
      if (options.createTracks) {
        if (onProgress) {
          onProgress({
            phase: 'tracks',
            message: 'Creating retrospective tracks from branches'
          });
        }

        const tracksResult = await this.createTracksFromBranches(repos, options);
        result.entriesCreated.tracks = tracksResult.created;
      }

      // Update state
      this.state.lastHydrationCompleted = new Date().toISOString();
      this.state.totalCommitsProcessed += result.totalCommits;

      for (const [type, count] of Object.entries(result.entriesCreated)) {
        this.state.entriesCreated[type] = (this.state.entriesCreated[type] || 0) + count;
      }

      this.saveState();

      // Rebuild knowledge index
      this.knowledgeStore.buildIndex();

      result.success = true;
      result.endTime = new Date().toISOString();

      if (onProgress) {
        onProgress({
          phase: 'complete',
          message: 'Hydration complete',
          totalCommits: result.totalCommits,
          entriesCreated: result.entriesCreated
        });
      }

    } catch (error) {
      result.errors.push({
        type: 'fatal',
        message: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Hydrate a single repository
   * @param {Object} repo - Repository info
   * @param {Object} options - Hydration options
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Repository hydration result
   */
  async hydrateRepository(repo, options, onProgress) {
    const result = {
      name: repo.name,
      path: repo.path,
      commitsProcessed: 0,
      entriesCreated: {
        decisions: 0,
        patterns: 0,
        entities: 0,
        learnings: 0
      },
      errors: []
    };

    try {
      const parser = new GitHistoryParser({
        repoPath: repo.path,
        batchSize: this.config.batchSize,
        skipMergeCommits: options.skipMergeCommits
      });

      const extractor = new KnowledgeExtractor({
        minConfidence: options.minConfidence || 0.5,
        repositoryContext: {
          name: repo.name,
          branch: repo.branch,
          isGitHub: repo.isGitHubRepo,
          github: repo.githubInfo
        }
      });

      // Build parse options
      const parseOptions = this.buildParseOptions(options, repo);

      // Parse commits
      if (onProgress) {
        onProgress({
          step: 'parsing',
          message: `Parsing commits from ${repo.name}`
        });
      }

      const parseResult = await parser.parseCommits(parseOptions, (progress) => {
        if (onProgress) {
          onProgress({
            step: 'parsing',
            ...progress
          });
        }
      });

      if (parseResult.error) {
        result.errors.push({ type: 'parse', message: parseResult.error });
        return result;
      }

      result.commitsProcessed = parseResult.totalParsed;

      // Extract knowledge
      if (onProgress) {
        onProgress({
          step: 'extracting',
          message: `Extracting knowledge from ${parseResult.totalParsed} commits`
        });
      }

      const extractResult = extractor.extractFromCommits(parseResult.commits, options);

      // Save extracted knowledge
      if (onProgress) {
        onProgress({
          step: 'saving',
          message: 'Saving knowledge entries'
        });
      }

      // Save decisions
      for (const decision of extractResult.decisions) {
        const saveResult = this.knowledgeStore.save(decision);
        if (saveResult.success) {
          result.entriesCreated.decisions++;
        }
      }

      // Save patterns
      for (const pattern of extractResult.patterns) {
        const saveResult = this.knowledgeStore.save(pattern);
        if (saveResult.success) {
          result.entriesCreated.patterns++;
        }
      }

      // Save entities
      for (const entity of extractResult.entities) {
        const saveResult = this.knowledgeStore.save(entity);
        if (saveResult.success) {
          result.entriesCreated.entities++;
        }
      }

      // Save learnings
      for (const learning of extractResult.learnings) {
        const saveResult = this.knowledgeStore.save(learning);
        if (saveResult.success) {
          result.entriesCreated.learnings++;
        }
      }

      // Update repo state
      if (!this.state.repositories[repo.name]) {
        this.state.repositories[repo.name] = {
          path: repo.path,
          firstHydrated: new Date().toISOString()
        };
      }

      this.state.repositories[repo.name].lastHydratedCommit =
        parseResult.commits[0]?.hash || null;
      this.state.repositories[repo.name].lastHydratedDate = new Date().toISOString();
      this.state.repositories[repo.name].commitsProcessed =
        (this.state.repositories[repo.name].commitsProcessed || 0) + result.commitsProcessed;

    } catch (error) {
      result.errors.push({
        type: 'process',
        message: error.message
      });
    }

    return result;
  }

  /**
   * Select repositories to process based on options
   * @param {Object} workspace - Workspace scan result
   * @param {Object} options - Hydration options
   * @returns {Array} Repositories to process
   */
  selectRepositories(workspace, options) {
    let repos = workspace.repositories;

    // Filter by specific repos if requested
    if (options.repos && options.repos.length > 0) {
      repos = repos.filter(r =>
        options.repos.includes(r.name) || options.repos.includes(r.path)
      );
    }

    // Handle submodule options
    if (options.noSubmodules) {
      repos = repos.filter(r => r.type !== 'submodule');
    }

    if (options.submodulesOnly) {
      repos = repos.filter(r => r.type === 'submodule');
    }

    return repos;
  }

  /**
   * Build parse options for a repository
   * @param {Object} options - Global options
   * @param {Object} repo - Repository info
   * @returns {Object} Parse options
   */
  buildParseOptions(options, repo) {
    const parseOptions = {
      branches: options.branches || ['HEAD'],
      includeStats: true,
      maxCommits: options.maxCommits || null
    };

    // Handle incremental mode
    if (options.mode === 'incremental') {
      const repoState = this.state.repositories?.[repo.name];
      if (repoState?.lastHydratedCommit) {
        // Use commit-based incremental
        parseOptions.since = repoState.lastHydratedDate;
      }
    }

    // Handle date-based filtering
    if (options.since) {
      parseOptions.since = options.since;
    }

    if (options.until) {
      parseOptions.until = options.until;
    }

    return parseOptions;
  }

  /**
   * Create tracks from merged branches
   * @param {Array} repos - Repositories
   * @param {Object} options - Options
   * @returns {Object} Track creation result
   */
  async createTracksFromBranches(repos, options) {
    const result = { created: 0, errors: [] };
    const extractor = new KnowledgeExtractor();

    for (const repo of repos) {
      try {
        const parser = new GitHistoryParser({ repoPath: repo.path });
        const branches = parser.getMergedBranches({
          since: options.since,
          pattern: options.branchPattern || '^(feature|fix|refactor)/'
        });

        for (const branch of branches) {
          const branchCommits = parser.getBranchCommits(branch.branchName);
          const track = extractor.createTrackFromBranch({
            ...branch,
            commits: branchCommits.commits
          });

          // Save track metadata
          const trackDir = path.join(
            this.config.maestroDir,
            'tracks',
            track.id
          );

          if (!fs.existsSync(trackDir)) {
            fs.mkdirSync(trackDir, { recursive: true });
          }

          // Write metadata
          fs.writeFileSync(
            path.join(trackDir, 'metadata.json'),
            JSON.stringify({
              ...track,
              spec: undefined // Spec goes in separate file
            }, null, 2),
            'utf8'
          );

          // Write spec
          fs.writeFileSync(
            path.join(trackDir, 'spec.md'),
            track.spec,
            'utf8'
          );

          result.created++;
        }
      } catch (error) {
        result.errors.push({
          repository: repo.name,
          message: error.message
        });
      }
    }

    return result;
  }

  /**
   * Abort running hydration
   */
  abort() {
    if (this.isRunning) {
      this.abortRequested = true;
    }
  }

  /**
   * Reset hydration state (for re-running full hydration)
   */
  reset() {
    this.state = null;
    const statePath = this.getStatePath();

    try {
      if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
      }
    } catch (error) {
      console.error('Failed to reset hydration state:', error.message);
    }

    this.loadState();
  }

  /**
   * Get formatted status for display
   * @returns {string} Formatted status
   */
  getFormattedStatus() {
    const status = this.getStatus();
    const lines = [];

    lines.push('Hydration Status');
    lines.push('================');
    lines.push('');

    if (status.hasBeenHydrated) {
      lines.push(`Last hydration: ${status.lastHydration}`);
      lines.push(`Commits processed: ${status.processed.commits}`);
      lines.push('');
      lines.push('Entries created:');

      for (const [type, count] of Object.entries(status.processed.entriesCreated)) {
        if (count > 0) {
          lines.push(`  - ${type}: ${count}`);
        }
      }
    } else {
      lines.push('Repository has not been hydrated yet.');
      lines.push('');
      lines.push(`Workspace type: ${status.workspace.type}`);
      lines.push(`Repositories: ${status.workspace.repositoryCount}`);
      lines.push(`Total commits: ${status.workspace.totalCommits}`);
    }

    if (status.canIncremental) {
      lines.push('');
      lines.push('Incremental hydration available.');
    }

    return lines.join('\n');
  }
}

module.exports = HydrationManager;
