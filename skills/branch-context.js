/**
 * Branch Context Manager Skill
 *
 * Manages branch-specific CDD context with proper isolation
 * between branches while maintaining shared context access.
 *
 * Key Features:
 * - Branch-specific context read/write
 * - Context migration from legacy structure
 * - Always detect current branch before loading
 * - Cross-branch context queries
 * - Shared vs branch-specific file separation
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class BranchContextManager {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      ...config
    };

    // Files that are shared across all branches (read-only for branches)
    this.sharedFiles = [
      'product.md',
      'tech-stack.md',
      'workflow.md',
      'product-guidelines.md',
      'code-styleguide.md',
      'workspace.json'
    ];

    // Files that are branch-specific
    this.branchSpecificFiles = [
      'context.json',
      'tracks/',
      'active-session.lock'
    ];
  }

  /**
   * Get paths for context management
   * @param {string} branch - Branch name (optional, for branch-specific paths)
   * @returns {Object} Path configuration
   */
  getPaths(branch = null) {
    const basePath = this.config.maestroDir;

    const paths = {
      // Shared paths (same across all branches)
      shared: {
        root: path.join(basePath, 'shared'),
        product: path.join(basePath, 'shared', 'product.md'),
        techStack: path.join(basePath, 'shared', 'tech-stack.md'),
        workflow: path.join(basePath, 'shared', 'workflow.md'),
        guidelines: path.join(basePath, 'shared', 'product-guidelines.md'),
        styleguide: path.join(basePath, 'shared', 'code-styleguide.md'),
        workspace: path.join(basePath, 'workspace.json')
      },
      // Legacy paths (for migration detection)
      legacy: {
        product: path.join(basePath, 'product.md'),
        techStack: path.join(basePath, 'tech-stack.md'),
        workflow: path.join(basePath, 'workflow.md'),
        tracks: path.join(basePath, 'tracks'),
        tracksIndex: path.join(basePath, 'tracks.md')
      },
      // Session/branch management
      sessions: path.join(basePath, 'sessions'),
      registry: path.join(basePath, 'sessions', 'registry.json'),
      notifications: path.join(basePath, 'notifications'),
      branches: path.join(basePath, 'branches'),
      // Migration marker
      gitignoreAware: path.join(basePath, '.gitignore-aware')
    };

    // Add branch-specific paths if branch is provided
    if (branch) {
      const sanitizedBranch = this.sanitizeBranchName(branch);
      const branchPath = path.join(basePath, 'branches', sanitizedBranch);

      paths.branch = {
        root: branchPath,
        context: path.join(branchPath, 'context.json'),
        tracks: path.join(branchPath, 'tracks'),
        tracksIndex: path.join(branchPath, 'tracks.md'),
        lock: path.join(branchPath, 'active-session.lock')
      };
    }

    return paths;
  }

  /**
   * Sanitize branch name for use in file paths
   * @param {string} branch - Raw branch name
   * @returns {string} Sanitized branch name
   */
  sanitizeBranchName(branch) {
    return branch
      .replace(/\//g, '--')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
  }

  /**
   * Unsanitize branch name back to original format
   * Note: This is an approximation since some characters are lost in sanitization
   * @param {string} sanitized - Sanitized branch name
   * @returns {string} Original branch name (approximation)
   */
  unsanitizeBranchName(sanitized) {
    return sanitized
      .replace(/--/g, '/')
      .replace(/_/g, '-'); // Best effort to restore dashes that may have been underscores
  }

  /**
   * Detect context structure (legacy vs branch-aware)
   * @returns {Object} Detection result
   */
  detectContextStructure() {
    const paths = this.getPaths();

    const checks = {
      gitignoreAwareMarker: fs.existsSync(paths.gitignoreAware),
      branchesDirectory: fs.existsSync(paths.branches),
      sharedDirectory: fs.existsSync(paths.shared.root),
      legacyProduct: fs.existsSync(paths.legacy.product),
      legacyTracks: fs.existsSync(paths.legacy.tracks)
    };

    let structure = 'none';
    if (checks.gitignoreAwareMarker || checks.branchesDirectory || checks.sharedDirectory) {
      if (checks.legacyProduct || checks.legacyTracks) {
        structure = 'hybrid';
      } else {
        structure = 'branch-aware';
      }
    } else if (checks.legacyProduct || checks.legacyTracks) {
      structure = 'legacy';
    }

    const interpretations = {
      'branch-aware': 'maestro/ is gitignored and uses branch-specific context',
      'legacy': 'maestro/ uses legacy flat structure',
      'hybrid': 'maestro/ has both structures (needs migration)',
      'none': 'No maestro/ context found'
    };

    return {
      structure: structure,
      checks: checks,
      interpretation: interpretations[structure],
      message: interpretations[structure]
    };
  }

  /**
   * Get current git branch
   * @returns {Object} Git branch detection result
   */
  getCurrentBranch() {
    try {
      let branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      let isDetached = false;
      let commit = null;

      if (!branch || branch === 'HEAD') {
        // Try fallback for detached HEAD
        branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

        if (branch === 'HEAD') {
          // Truly detached, get short commit hash
          commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
          branch = `detached-${commit}`;
          isDetached = true;
        }
      }

      return {
        branch: branch,
        isDetached: isDetached,
        commit: commit,
        message: isDetached ? `Detached HEAD at ${commit}` : `Current branch: ${branch}`
      };
    } catch (error) {
      return {
        branch: 'unknown',
        isDetached: false,
        commit: null,
        error: error.message,
        message: `Failed to get current branch: ${error.message}`
      };
    }
  }

  /**
   * Load context for a branch
   * @param {string} branch - Branch name
   * @returns {Object} Context load result
   */
  loadBranchContext(branch) {
    const paths = this.getPaths(branch);
    const result = {
      branch: branch,
      shared: {},
      branchContext: null,
      tracks: [],
      activeTrack: null
    };

    try {
      // Step 1: Detect context structure
      const structure = this.detectContextStructure();

      // Step 2: Load shared context (with fallback to legacy)
      const sharedFiles = [
        { key: 'product', path: paths.shared.product, legacy: paths.legacy.product },
        { key: 'techStack', path: paths.shared.techStack, legacy: paths.legacy.techStack },
        { key: 'workflow', path: paths.shared.workflow, legacy: paths.legacy.workflow },
        { key: 'guidelines', path: paths.shared.guidelines, legacy: path.join(this.config.maestroDir, 'product-guidelines.md') },
        { key: 'styleguide', path: paths.shared.styleguide, legacy: path.join(this.config.maestroDir, 'code-styleguide.md') }
      ];

      for (const file of sharedFiles) {
        const filePath = fs.existsSync(file.path) ? file.path : file.legacy;
        if (fs.existsSync(filePath)) {
          result.shared[file.key] = fs.readFileSync(filePath, 'utf8');
        }
      }

      // Load workspace JSON
      if (fs.existsSync(paths.shared.workspace)) {
        try {
          result.shared.workspace = JSON.parse(fs.readFileSync(paths.shared.workspace, 'utf8'));
        } catch (e) {
          // Invalid JSON
        }
      }

      // Step 3: Load branch-specific context
      if (paths.branch && fs.existsSync(paths.branch.context)) {
        try {
          result.branchContext = JSON.parse(fs.readFileSync(paths.branch.context, 'utf8'));
        } catch (e) {
          // Invalid JSON
        }
      }

      if (paths.branch && fs.existsSync(paths.branch.tracksIndex)) {
        result.tracksIndex = fs.readFileSync(paths.branch.tracksIndex, 'utf8');
      }

      // Step 4: List branch tracks
      if (paths.branch && fs.existsSync(paths.branch.tracks)) {
        result.tracks = fs.readdirSync(paths.branch.tracks, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
      }

      // Step 5: Load active track metadata
      if (result.branchContext?.activeTrack && paths.branch) {
        const trackMetadataPath = path.join(paths.branch.tracks, result.branchContext.activeTrack, 'metadata.json');
        if (fs.existsSync(trackMetadataPath)) {
          try {
            result.activeTrack = JSON.parse(fs.readFileSync(trackMetadataPath, 'utf8'));
          } catch (e) {
            // Invalid JSON
          }
        }
      }

      return {
        loaded: true,
        structure: structure.structure,
        ...result,
        message: `Context loaded for branch '${branch}'`
      };
    } catch (error) {
      return {
        loaded: false,
        ...result,
        error: error.message,
        message: `Failed to load context: ${error.message}`
      };
    }
  }

  /**
   * Save branch context
   * @param {string} branch - Branch name
   * @param {Object} context - Context data to save
   * @returns {Object} Context save result
   */
  saveBranchContext(branch, context) {
    const paths = this.getPaths(branch);

    try {
      // Ensure branch directory exists
      if (!fs.existsSync(paths.branch.root)) {
        fs.mkdirSync(paths.branch.root, { recursive: true });
      }
      if (!fs.existsSync(paths.branch.tracks)) {
        fs.mkdirSync(paths.branch.tracks, { recursive: true });
      }

      // Update last accessed timestamp
      const updatedContext = {
        ...context,
        lastAccessed: new Date().toISOString()
      };

      // Write branch context file
      fs.writeFileSync(paths.branch.context, JSON.stringify(updatedContext, null, 2), 'utf8');

      return {
        saved: true,
        branch: branch,
        contextPath: paths.branch.context,
        message: `Context saved for branch '${branch}'`
      };
    } catch (error) {
      return {
        saved: false,
        branch: branch,
        error: error.message,
        message: `Failed to save context: ${error.message}`
      };
    }
  }

  /**
   * Initialize branch context
   * @param {string} branch - Branch name
   * @returns {Object} Context initialization result
   */
  initializeBranchContext(branch) {
    const paths = this.getPaths(branch);
    const sanitized = this.sanitizeBranchName(branch);

    const initialContext = {
      branch: branch,
      sanitizedName: sanitized,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      activeTrack: null,
      tracks: [],
      sessionHistory: [],
      settings: {
        autoNotify: true,
        notifyOnInput: true,
        notifyOnError: true
      }
    };

    try {
      // Step 1: Create branch directory structure
      if (!fs.existsSync(paths.branch.root)) {
        fs.mkdirSync(paths.branch.root, { recursive: true });
      }
      if (!fs.existsSync(paths.branch.tracks)) {
        fs.mkdirSync(paths.branch.tracks, { recursive: true });
      }

      // Step 2 & 3: Create initial context if it doesn't exist
      const contextExists = fs.existsSync(paths.branch.context);
      if (!contextExists) {
        fs.writeFileSync(paths.branch.context, JSON.stringify(initialContext, null, 2), 'utf8');
      }

      // Step 4: Create empty tracks index if needed
      if (!fs.existsSync(paths.branch.tracksIndex)) {
        fs.writeFileSync(paths.branch.tracksIndex, this.getTracksIndexTemplate(branch), 'utf8');
      }

      return {
        initialized: true,
        branch: branch,
        paths: paths.branch,
        isNew: !contextExists,
        message: contextExists
          ? `Branch context already exists for '${branch}'`
          : `Branch context initialized for '${branch}'`
      };
    } catch (error) {
      return {
        initialized: false,
        branch: branch,
        error: error.message,
        message: `Failed to initialize context: ${error.message}`
      };
    }
  }

  /**
   * Get tracks index template
   * @param {string} branch - Branch name
   * @returns {string} Tracks index markdown template
   */
  getTracksIndexTemplate(branch) {
    return `# Track Index - Branch: ${branch}

## Active Tracks

| ID | Type | Title | Status | Progress |
|----|------|-------|--------|----------|
<!-- Tracks will be listed here -->

## Completed Tracks

| ID | Type | Title | Completed |
|----|------|-------|-----------|
<!-- Completed tracks will be moved here -->

---

*Last updated: ${new Date().toISOString()}*
*Branch: ${branch}*
`;
  }

  /**
   * Migrate legacy context to branch-aware structure
   * @param {string} targetBranch - Branch to migrate to
   * @returns {Object} Migration result
   */
  migrateTobranchAware(targetBranch) {
    const paths = this.getPaths(targetBranch);
    let copiedSharedFiles = [];
    let copiedTracks = 0;

    try {
      // Step 1: Create shared directory
      if (!fs.existsSync(paths.shared.root)) {
        fs.mkdirSync(paths.shared.root, { recursive: true });
      }

      // Step 2: Copy shared files to shared directory
      for (const file of this.sharedFiles) {
        const legacyPath = path.join(this.config.maestroDir, file);
        const sharedPath = path.join(paths.shared.root, file);

        if (fs.existsSync(legacyPath) && !fs.existsSync(sharedPath)) {
          fs.copyFileSync(legacyPath, sharedPath);
          copiedSharedFiles.push(file);
        }
      }

      // Step 3: Create branch directory structure
      if (!fs.existsSync(paths.branch.root)) {
        fs.mkdirSync(paths.branch.root, { recursive: true });
      }
      if (!fs.existsSync(paths.branch.tracks)) {
        fs.mkdirSync(paths.branch.tracks, { recursive: true });
      }

      // Step 4: Copy tracks to branch (if legacy tracks exist)
      if (fs.existsSync(paths.legacy.tracks)) {
        const tracks = fs.readdirSync(paths.legacy.tracks, { withFileTypes: true })
          .filter(d => d.isDirectory());

        for (const track of tracks) {
          const srcPath = path.join(paths.legacy.tracks, track.name);
          const destPath = path.join(paths.branch.tracks, track.name);

          if (!fs.existsSync(destPath)) {
            this.copyDirRecursive(srcPath, destPath);
            copiedTracks++;
          }
        }
      }

      // Step 5: Copy tracks index to branch
      if (fs.existsSync(paths.legacy.tracksIndex) && !fs.existsSync(paths.branch.tracksIndex)) {
        fs.copyFileSync(paths.legacy.tracksIndex, paths.branch.tracksIndex);
      }

      // Step 6: Initialize branch context
      this.initializeBranchContext(targetBranch);

      // Step 7: Create gitignore-aware marker
      const markerContent = {
        version: '1.0.0',
        migratedAt: new Date().toISOString(),
        migratedFrom: 'legacy',
        initialBranch: targetBranch,
        sharedFiles: this.sharedFiles,
        copiedSharedFiles: copiedSharedFiles,
        copiedTracks: copiedTracks
      };
      fs.writeFileSync(paths.gitignoreAware, JSON.stringify(markerContent, null, 2), 'utf8');

      // Step 8: Create session directories
      if (!fs.existsSync(paths.sessions)) {
        fs.mkdirSync(paths.sessions, { recursive: true });
      }
      if (!fs.existsSync(path.join(paths.notifications, 'pending'))) {
        fs.mkdirSync(path.join(paths.notifications, 'pending'), { recursive: true });
      }
      if (!fs.existsSync(path.join(paths.notifications, 'archive'))) {
        fs.mkdirSync(path.join(paths.notifications, 'archive'), { recursive: true });
      }

      return {
        migrated: true,
        targetBranch: targetBranch,
        copiedSharedFiles: copiedSharedFiles,
        copiedTracks: copiedTracks,
        paths: {
          shared: paths.shared.root,
          branch: paths.branch.root,
          sessions: paths.sessions,
          notifications: paths.notifications
        },
        message: `Migration completed: ${copiedSharedFiles.length} shared files, ${copiedTracks} tracks copied`
      };
    } catch (error) {
      return {
        migrated: false,
        targetBranch: targetBranch,
        error: error.message,
        message: `Migration failed: ${error.message}`
      };
    }
  }

  /**
   * Recursively copy a directory
   * @param {string} src - Source path
   * @param {string} dest - Destination path
   */
  copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Query context from another branch (read-only)
   * @param {string} targetBranch - Branch to query
   * @param {string} query - What to retrieve
   * @returns {Object} Cross-branch query result
   */
  queryBranchContext(targetBranch, query) {
    const paths = this.getPaths(targetBranch);

    try {
      switch (query) {
        case 'tracks':
          if (fs.existsSync(paths.branch.tracksIndex)) {
            return {
              query: 'tracks',
              branch: targetBranch,
              data: fs.readFileSync(paths.branch.tracksIndex, 'utf8'),
              message: `Tracks index from branch '${targetBranch}'`
            };
          }
          return {
            query: 'tracks',
            branch: targetBranch,
            data: null,
            message: 'No tracks index found'
          };

        case 'activeTrack':
          if (fs.existsSync(paths.branch.context)) {
            const context = JSON.parse(fs.readFileSync(paths.branch.context, 'utf8'));
            return {
              query: 'activeTrack',
              branch: targetBranch,
              data: context.activeTrack,
              message: context.activeTrack
                ? `Active track: ${context.activeTrack}`
                : 'No active track'
            };
          }
          return {
            query: 'activeTrack',
            branch: targetBranch,
            data: null,
            message: 'No context file found'
          };

        case 'trackMetadata':
          if (fs.existsSync(paths.branch.tracks)) {
            const trackDirs = fs.readdirSync(paths.branch.tracks, { withFileTypes: true })
              .filter(d => d.isDirectory());

            const metadata = {};
            for (const track of trackDirs) {
              const metaPath = path.join(paths.branch.tracks, track.name, 'metadata.json');
              if (fs.existsSync(metaPath)) {
                try {
                  metadata[track.name] = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                } catch (e) {
                  // Skip invalid files
                }
              }
            }

            return {
              query: 'trackMetadata',
              branch: targetBranch,
              data: metadata,
              count: Object.keys(metadata).length,
              message: `Found ${Object.keys(metadata).length} track(s)`
            };
          }
          return {
            query: 'trackMetadata',
            branch: targetBranch,
            data: {},
            count: 0,
            message: 'No tracks directory found'
          };

        case 'context':
        default:
          if (fs.existsSync(paths.branch.context)) {
            const context = JSON.parse(fs.readFileSync(paths.branch.context, 'utf8'));
            return {
              query: 'context',
              branch: targetBranch,
              data: context,
              message: `Context from branch '${targetBranch}'`
            };
          }
          return {
            query: 'context',
            branch: targetBranch,
            data: null,
            message: 'No context file found'
          };
      }
    } catch (error) {
      return {
        query: query,
        branch: targetBranch,
        data: null,
        error: error.message,
        message: `Query failed: ${error.message}`
      };
    }
  }

  /**
   * List all branches with context
   * @returns {Object} Branch list result
   */
  listBranchesWithContext() {
    const paths = this.getPaths();
    const currentBranchResult = this.getCurrentBranch();
    const currentBranch = currentBranchResult.branch;

    try {
      if (!fs.existsSync(paths.branches)) {
        return {
          branches: [],
          currentBranch: currentBranch,
          count: 0,
          message: 'No branches with CDD context found'
        };
      }

      const branchDirs = fs.readdirSync(paths.branches, { withFileTypes: true })
        .filter(d => d.isDirectory());

      const branches = branchDirs.map(branchDir => {
        const branchPath = path.join(paths.branches, branchDir.name);
        const contextPath = path.join(branchPath, 'context.json');
        const tracksPath = path.join(branchPath, 'tracks');
        const lockPath = path.join(branchPath, 'active-session.lock');

        let context = null;
        let trackCount = 0;
        let hasLock = false;

        if (fs.existsSync(contextPath)) {
          try {
            context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
          } catch (e) {
            // Invalid JSON
          }
        }

        if (fs.existsSync(tracksPath)) {
          try {
            trackCount = fs.readdirSync(tracksPath, { withFileTypes: true })
              .filter(d => d.isDirectory()).length;
          } catch (e) {
            // Can't read
          }
        }

        hasLock = fs.existsSync(lockPath);

        const originalName = this.unsanitizeBranchName(branchDir.name);
        const isCurrent = originalName === currentBranch ||
                          branchDir.name === this.sanitizeBranchName(currentBranch);

        return {
          name: originalName,
          sanitizedName: branchDir.name,
          isCurrent: isCurrent,
          trackCount: trackCount,
          activeTrack: context?.activeTrack || null,
          hasSession: hasLock,
          lastAccessed: context?.lastAccessed || null
        };
      });

      const lockedBranches = branches.filter(b => b.hasSession).map(b => b.name);

      return {
        branches: branches,
        currentBranch: currentBranch,
        count: branches.length,
        lockedBranches: lockedBranches,
        message: `Found ${branches.length} branch(es) with CDD context`
      };
    } catch (error) {
      return {
        branches: [],
        currentBranch: currentBranch,
        count: 0,
        error: error.message,
        message: `Failed to list branches: ${error.message}`
      };
    }
  }

  /**
   * Get shared context (read-only for all branches)
   * @returns {Object} Shared context load result
   */
  loadSharedContext() {
    const paths = this.getPaths();
    const isBranchAware = fs.existsSync(paths.shared.root);
    const shared = {};

    const files = [
      { key: 'product', shared: paths.shared.product, legacy: paths.legacy.product },
      { key: 'techStack', shared: paths.shared.techStack, legacy: paths.legacy.techStack },
      { key: 'workflow', shared: paths.shared.workflow, legacy: paths.legacy.workflow },
      { key: 'guidelines', shared: paths.shared.guidelines, legacy: path.join(this.config.maestroDir, 'product-guidelines.md') },
      { key: 'styleguide', shared: paths.shared.styleguide, legacy: path.join(this.config.maestroDir, 'code-styleguide.md') }
    ];

    try {
      for (const file of files) {
        const filePath = isBranchAware ? file.shared : file.legacy;
        if (fs.existsSync(filePath)) {
          shared[file.key] = fs.readFileSync(filePath, 'utf8');
        }
      }

      return {
        loaded: true,
        isBranchAware: isBranchAware,
        shared: shared,
        loadedFiles: Object.keys(shared),
        message: `Loaded ${Object.keys(shared).length} shared context file(s)`
      };
    } catch (error) {
      return {
        loaded: false,
        isBranchAware: isBranchAware,
        shared: shared,
        error: error.message,
        message: `Failed to load shared context: ${error.message}`
      };
    }
  }

  /**
   * Update shared context (must be done explicitly)
   * @param {string} file - File to update
   * @param {string} content - New content
   * @returns {Object} Shared context update result
   */
  updateSharedContext(file, content) {
    const paths = this.getPaths();
    const sharedPath = path.join(paths.shared.root, file);
    const legacyPath = path.join(this.config.maestroDir, file);

    if (!this.sharedFiles.includes(file)) {
      return {
        updated: false,
        error: 'invalid_file',
        message: `'${file}' is not a shared context file. Shared files: ${this.sharedFiles.join(', ')}`
      };
    }

    try {
      const isBranchAware = fs.existsSync(paths.shared.root);
      const targetPath = isBranchAware ? sharedPath : legacyPath;

      // Ensure directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Write content
      fs.writeFileSync(targetPath, content, 'utf8');

      // Update timestamp in gitignore-aware marker if branch-aware
      if (isBranchAware && fs.existsSync(paths.gitignoreAware)) {
        try {
          const marker = JSON.parse(fs.readFileSync(paths.gitignoreAware, 'utf8'));
          marker.lastSharedUpdate = new Date().toISOString();
          marker.lastSharedFile = file;
          fs.writeFileSync(paths.gitignoreAware, JSON.stringify(marker, null, 2), 'utf8');
        } catch (e) {
          // Can't update marker, not critical
        }
      }

      return {
        updated: true,
        file: file,
        path: targetPath,
        isBranchAware: isBranchAware,
        warning: 'Shared context changes affect all branches',
        message: `Updated shared file '${file}'`
      };
    } catch (error) {
      return {
        updated: false,
        file: file,
        error: error.message,
        message: `Failed to update shared context: ${error.message}`
      };
    }
  }

  /**
   * Copy track between branches
   * @param {string} trackId - Track to copy
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @returns {Object} Track copy result
   */
  copyTrackBetweenBranches(trackId, sourceBranch, targetBranch) {
    const sourcePaths = this.getPaths(sourceBranch);
    const targetPaths = this.getPaths(targetBranch);
    const sourceTrack = path.join(sourcePaths.branch.tracks, trackId);
    const targetTrack = path.join(targetPaths.branch.tracks, trackId);

    try {
      // Step 1: Verify source track exists
      if (!fs.existsSync(sourceTrack)) {
        return {
          copied: false,
          error: 'source_not_found',
          message: `Track '${trackId}' not found in branch '${sourceBranch}'`
        };
      }

      // Step 2: Check target does not exist
      if (fs.existsSync(targetTrack)) {
        return {
          copied: false,
          error: 'target_exists',
          message: `Track '${trackId}' already exists in branch '${targetBranch}'`
        };
      }

      // Step 3: Create target branch context if needed
      this.initializeBranchContext(targetBranch);

      // Step 4: Copy track directory
      this.copyDirRecursive(sourceTrack, targetTrack);

      // Step 5: Update track metadata with new branch
      const metadataPath = path.join(targetTrack, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          metadata.branch = targetBranch;
          metadata.copiedFrom = {
            branch: sourceBranch,
            at: new Date().toISOString()
          };
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        } catch (e) {
          // Can't update metadata, not critical
        }
      }

      return {
        copied: true,
        trackId: trackId,
        sourceBranch: sourceBranch,
        targetBranch: targetBranch,
        sourcePath: sourceTrack,
        targetPath: targetTrack,
        message: `Track '${trackId}' copied from '${sourceBranch}' to '${targetBranch}'`
      };
    } catch (error) {
      return {
        copied: false,
        trackId: trackId,
        error: error.message,
        message: `Failed to copy track: ${error.message}`
      };
    }
  }

  /**
   * Delete branch context
   * @param {string} branch - Branch to delete context for
   * @param {boolean} force - Force delete even if session is active
   * @returns {Object} Delete result
   */
  deleteBranchContext(branch, force = false) {
    const paths = this.getPaths(branch);

    try {
      // Step 1: Check for active session
      const hasSession = fs.existsSync(paths.branch.lock);

      if (hasSession && !force) {
        return {
          deleted: false,
          error: 'has_session',
          hasSession: true,
          message: `Branch '${branch}' has an active session. Use force=true to override.`
        };
      }

      // Step 2: Check if branch context exists
      if (!fs.existsSync(paths.branch.root)) {
        return {
          deleted: true,
          message: `No context exists for branch '${branch}'`
        };
      }

      // Step 3: Remove branch context directory
      this.removeDirRecursive(paths.branch.root);

      return {
        deleted: true,
        branch: branch,
        path: paths.branch.root,
        hadSession: hasSession,
        message: `Branch context deleted: ${branch}`
      };
    } catch (error) {
      return {
        deleted: false,
        branch: branch,
        error: error.message,
        message: `Failed to delete branch context: ${error.message}`
      };
    }
  }

  /**
   * Recursively remove a directory
   * @param {string} dirPath - Directory path to remove
   */
  removeDirRecursive(dirPath) {
    if (fs.existsSync(dirPath)) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          this.removeDirRecursive(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
      }

      fs.rmdirSync(dirPath);
    }
  }
}

module.exports = BranchContextManager;
