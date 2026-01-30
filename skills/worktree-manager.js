/**
 * Worktree Manager Skill
 *
 * Manages Git worktrees for true branch isolation in CDD workflows.
 * Each worktree provides a completely independent working directory
 * with its own branch checkout, enabling parallel development without
 * interference between terminal sessions.
 *
 * Key Benefits:
 * - True physical isolation between branches
 * - Each worktree has its own maestro/ directory
 * - No lock files needed - natural isolation
 * - Multiple terminals can work simultaneously on different branches
 *
 * Worktree Structure:
 * project/                     # Main worktree (usually main/master)
 * ../project-feature-auth/     # Worktree for feature/auth branch
 * ../project-bugfix-login/     # Worktree for bugfix/login branch
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class WorktreeManager {
  constructor(config = {}) {
    this.config = {
      worktreePrefix: config.worktreePrefix || null, // Auto-detect from repo name
      worktreeLocation: config.worktreeLocation || '..', // Parent directory
      maestroDir: config.maestroDir || 'maestro',
      autoInitMaestro: config.autoInitMaestro !== false,
      ...config
    };

    // Cache repo info
    this._repoRoot = null;
    this._repoName = null;
  }

  /**
   * Get the repository root directory
   * @returns {string} Absolute path to repo root
   */
  getRepoRoot() {
    if (this._repoRoot) return this._repoRoot;

    try {
      this._repoRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8'
      }).trim();
      return this._repoRoot;
    } catch (error) {
      throw new Error('Not in a git repository');
    }
  }

  /**
   * Get the repository name
   * @returns {string} Repository name
   */
  getRepoName() {
    if (this._repoName) return this._repoName;

    const repoRoot = this.getRepoRoot();
    this._repoName = path.basename(repoRoot);
    return this._repoName;
  }

  /**
   * Check if current directory is a worktree (vs main repo)
   * @returns {Object} Worktree detection result
   */
  detectWorktree() {
    try {
      const repoRoot = this.getRepoRoot();
      const gitPath = path.join(repoRoot, '.git');

      // In a worktree, .git is a file pointing to the main repo
      // In the main repo, .git is a directory
      const gitStat = fs.statSync(gitPath);
      const isWorktree = gitStat.isFile();

      let mainWorktreePath = null;
      let linkedWorktrees = [];

      if (isWorktree) {
        // Read .git file to find main repo
        const gitContent = fs.readFileSync(gitPath, 'utf8').trim();
        const match = gitContent.match(/gitdir: (.+)/);
        if (match) {
          // Parse the path to find main repo
          const gitDir = match[1];
          // Format: /path/to/main/.git/worktrees/worktree-name
          const worktreesMatch = gitDir.match(/(.+)\/\.git\/worktrees\/.+/);
          if (worktreesMatch) {
            mainWorktreePath = worktreesMatch[1];
          }
        }
      }

      // Get list of all worktrees
      const worktreeList = this.listWorktrees();
      if (worktreeList.success) {
        linkedWorktrees = worktreeList.worktrees;
      }

      const currentBranch = execSync('git branch --show-current', {
        encoding: 'utf8'
      }).trim();

      return {
        isWorktree: isWorktree,
        isMainRepo: !isWorktree,
        currentPath: repoRoot,
        currentBranch: currentBranch,
        mainWorktreePath: mainWorktreePath,
        linkedWorktrees: linkedWorktrees.filter(w => w.path !== repoRoot),
        repoName: this.getRepoName(),
        message: isWorktree
          ? `This is a worktree linked to ${mainWorktreePath}`
          : 'This is the main repository'
      };
    } catch (error) {
      return {
        isWorktree: false,
        isMainRepo: false,
        error: error.message,
        message: `Detection failed: ${error.message}`
      };
    }
  }

  /**
   * List all worktrees for this repository
   * @returns {Object} Worktree list result
   */
  listWorktrees() {
    try {
      const output = execSync('git worktree list --porcelain', {
        encoding: 'utf8'
      });

      const worktrees = [];
      let current = {};

      for (const line of output.split('\n')) {
        if (line.startsWith('worktree ')) {
          if (current.path) worktrees.push(current);
          current = { path: line.substring(9) };
        } else if (line.startsWith('HEAD ')) {
          current.head = line.substring(5);
        } else if (line.startsWith('branch ')) {
          current.branch = line.substring(7).replace('refs/heads/', '');
        } else if (line === 'bare') {
          current.isBare = true;
        } else if (line === 'detached') {
          current.isDetached = true;
        }
      }
      if (current.path) worktrees.push(current);

      // Enrich with additional info
      const enriched = worktrees.map(wt => ({
        ...wt,
        name: path.basename(wt.path),
        hasMaestro: fs.existsSync(path.join(wt.path, this.config.maestroDir)),
        isMain: !wt.path.includes(this.getRepoName() + '-')
      }));

      return {
        success: true,
        worktrees: enriched,
        count: enriched.length,
        mainWorktree: enriched.find(w => w.isMain) || enriched[0],
        linkedWorktrees: enriched.filter(w => !w.isMain),
        message: `Found ${enriched.length} worktree(s)`
      };
    } catch (error) {
      return {
        success: false,
        worktrees: [],
        count: 0,
        error: error.message,
        message: `Failed to list worktrees: ${error.message}`
      };
    }
  }

  /**
   * Generate worktree path for a branch
   * @param {string} branch - Branch name
   * @returns {string} Worktree path
   */
  getWorktreePath(branch) {
    const repoName = this.getRepoName();
    const sanitizedBranch = this.sanitizeBranchName(branch);
    const worktreeName = `${repoName}-${sanitizedBranch}`;

    const repoRoot = this.getRepoRoot();
    const parentDir = path.dirname(repoRoot);

    return path.join(parentDir, worktreeName);
  }

  /**
   * Sanitize branch name for directory name
   * @param {string} branch - Branch name
   * @returns {string} Sanitized name
   */
  sanitizeBranchName(branch) {
    return branch
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
  }

  /**
   * Create a new worktree for a branch
   * @param {string} branch - Branch name
   * @param {Object} options - Creation options
   * @returns {Object} Creation result
   */
  createWorktree(branch, options = {}) {
    const {
      createBranch = false, // Create new branch if doesn't exist
      baseBranch = 'main',  // Base for new branch
      force = false,
      initMaestro = this.config.autoInitMaestro
    } = options;

    try {
      const worktreePath = this.getWorktreePath(branch);

      // Check if worktree already exists
      if (fs.existsSync(worktreePath)) {
        if (!force) {
          return {
            created: false,
            error: 'exists',
            path: worktreePath,
            message: `Worktree already exists at ${worktreePath}. Use force=true to recreate.`
          };
        }
        // Remove existing worktree
        this.removeWorktree(branch, { force: true });
      }

      // Check if branch exists
      let branchExists = false;
      try {
        execSync(`git rev-parse --verify ${branch}`, { encoding: 'utf8' });
        branchExists = true;
      } catch (e) {
        branchExists = false;
      }

      // Build git worktree add command
      let command;
      if (!branchExists && createBranch) {
        // Create new branch based on baseBranch
        command = `git worktree add -b "${branch}" "${worktreePath}" "${baseBranch}"`;
      } else if (branchExists) {
        // Use existing branch
        command = `git worktree add "${worktreePath}" "${branch}"`;
      } else {
        return {
          created: false,
          error: 'branch_not_found',
          branch: branch,
          message: `Branch '${branch}' does not exist. Use createBranch=true to create it.`
        };
      }

      // Execute worktree creation
      execSync(command, { encoding: 'utf8' });

      // Initialize maestro in worktree if requested
      let maestroInit = null;
      if (initMaestro) {
        maestroInit = this.initializeMaestroInWorktree(worktreePath, branch);
      }

      return {
        created: true,
        path: worktreePath,
        branch: branch,
        branchCreated: !branchExists && createBranch,
        baseBranch: !branchExists ? baseBranch : null,
        maestroInitialized: maestroInit?.success || false,
        command: command,
        instructions: this.getWorktreeInstructions(worktreePath, branch),
        message: `Worktree created at ${worktreePath}`
      };
    } catch (error) {
      return {
        created: false,
        error: error.message,
        branch: branch,
        message: `Failed to create worktree: ${error.message}`
      };
    }
  }

  /**
   * Initialize maestro directory in a worktree
   * @param {string} worktreePath - Path to worktree
   * @param {string} branch - Branch name
   * @returns {Object} Initialization result
   */
  initializeMaestroInWorktree(worktreePath, branch) {
    const maestroPath = path.join(worktreePath, this.config.maestroDir);

    try {
      // Create maestro directory structure
      const dirs = [
        maestroPath,
        path.join(maestroPath, 'tracks'),
        path.join(maestroPath, 'knowledge'),
        path.join(maestroPath, 'sessions')
      ];

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Create context file
      const contextPath = path.join(maestroPath, 'context.json');
      const context = {
        branch: branch,
        worktree: true,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        activeTrack: null,
        tracks: [],
        settings: {
          autoNotify: true
        }
      };

      fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf8');

      // Create tracks index
      const tracksIndexPath = path.join(maestroPath, 'tracks.md');
      const tracksIndex = `# Track Index - ${branch}

## Active Tracks

| ID | Type | Title | Status | Progress |
|----|------|-------|--------|----------|

## Completed Tracks

| ID | Type | Title | Completed |
|----|------|-------|-----------|

---
*Branch: ${branch}*
*Worktree: ${worktreePath}*
*Created: ${new Date().toISOString()}*
`;

      fs.writeFileSync(tracksIndexPath, tracksIndex, 'utf8');

      // Try to copy shared context from main repo if exists
      this.copySharedContext(worktreePath);

      return {
        success: true,
        path: maestroPath,
        message: `Maestro initialized in worktree`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to initialize maestro: ${error.message}`
      };
    }
  }

  /**
   * Copy shared context files from main repo to worktree
   * @param {string} worktreePath - Path to worktree
   */
  copySharedContext(worktreePath) {
    try {
      const mainRepoRoot = this.getRepoRoot();
      const detection = this.detectWorktree();

      // If we're in a worktree, get main repo path
      const sourcePath = detection.isWorktree
        ? detection.mainWorktreePath
        : mainRepoRoot;

      const sharedFiles = [
        'product.md',
        'tech-stack.md',
        'workflow.md',
        'product-guidelines.md',
        'code-styleguide.md'
      ];

      const sourceMaestro = path.join(sourcePath, this.config.maestroDir);
      const targetMaestro = path.join(worktreePath, this.config.maestroDir);

      // Check for shared/ directory first, then root
      const sharedDir = path.join(sourceMaestro, 'shared');
      const useSharedDir = fs.existsSync(sharedDir);

      for (const file of sharedFiles) {
        const sourceFile = useSharedDir
          ? path.join(sharedDir, file)
          : path.join(sourceMaestro, file);

        const targetFile = path.join(targetMaestro, file);

        if (fs.existsSync(sourceFile) && !fs.existsSync(targetFile)) {
          fs.copyFileSync(sourceFile, targetFile);
        }
      }
    } catch (error) {
      // Non-critical - shared context copy is optional
      console.warn(`[Worktree] Could not copy shared context: ${error.message}`);
    }
  }

  /**
   * Remove a worktree
   * @param {string} branch - Branch name
   * @param {Object} options - Removal options
   * @returns {Object} Removal result
   */
  removeWorktree(branch, options = {}) {
    const { force = false, deleteBranch = false } = options;

    try {
      const worktreePath = this.getWorktreePath(branch);

      // Check if worktree exists
      if (!fs.existsSync(worktreePath)) {
        return {
          removed: true,
          message: `Worktree for branch '${branch}' does not exist`
        };
      }

      // Check for uncommitted changes unless forcing
      if (!force) {
        try {
          const status = execSync(`git -C "${worktreePath}" status --porcelain`, {
            encoding: 'utf8'
          }).trim();

          if (status) {
            return {
              removed: false,
              error: 'uncommitted_changes',
              path: worktreePath,
              changes: status.split('\n').length,
              message: `Worktree has uncommitted changes. Use force=true to remove anyway.`
            };
          }
        } catch (e) {
          // Can't check status, proceed with caution
        }
      }

      // Remove worktree
      const forceFlag = force ? '--force' : '';
      execSync(`git worktree remove ${forceFlag} "${worktreePath}"`, {
        encoding: 'utf8'
      });

      // Optionally delete the branch
      let branchDeleted = false;
      if (deleteBranch) {
        try {
          execSync(`git branch -D "${branch}"`, { encoding: 'utf8' });
          branchDeleted = true;
        } catch (e) {
          // Branch deletion failed - might be current branch in main repo
        }
      }

      return {
        removed: true,
        path: worktreePath,
        branch: branch,
        branchDeleted: branchDeleted,
        message: `Worktree removed: ${worktreePath}`
      };
    } catch (error) {
      return {
        removed: false,
        error: error.message,
        branch: branch,
        message: `Failed to remove worktree: ${error.message}`
      };
    }
  }

  /**
   * Switch to a worktree (provides navigation instructions)
   * @param {string} branch - Branch name
   * @returns {Object} Switch instructions
   */
  switchToWorktree(branch) {
    const worktreePath = this.getWorktreePath(branch);

    // Check if worktree exists
    if (!fs.existsSync(worktreePath)) {
      return {
        success: false,
        exists: false,
        branch: branch,
        suggestion: `Worktree does not exist. Create it with: /maestro:worktree create ${branch}`,
        message: `No worktree found for branch '${branch}'`
      };
    }

    return {
      success: true,
      exists: true,
      path: worktreePath,
      branch: branch,
      instructions: this.getWorktreeInstructions(worktreePath, branch),
      command: `cd "${worktreePath}"`,
      message: `Worktree exists at ${worktreePath}`
    };
  }

  /**
   * Get instructions for using a worktree
   * @param {string} worktreePath - Path to worktree
   * @param {string} branch - Branch name
   * @returns {Object} Instructions
   */
  getWorktreeInstructions(worktreePath, branch) {
    const relativePath = path.relative(process.cwd(), worktreePath);

    return {
      terminal: [
        `# Open a NEW terminal and navigate to the worktree:`,
        `cd "${worktreePath}"`,
        ``,
        `# Or from your current location:`,
        `cd "${relativePath}"`,
        ``,
        `# Then activate CDD mode:`,
        `/maestro:cdd`
      ].join('\n'),
      vscode: [
        `# Open worktree in VS Code:`,
        `code "${worktreePath}"`,
        ``,
        `# Or add as workspace folder:`,
        `code --add "${worktreePath}"`
      ].join('\n'),
      summary: `Navigate to ${relativePath} in a new terminal for isolated work on '${branch}'`
    };
  }

  /**
   * Prune stale worktrees (those whose working directories no longer exist)
   * @returns {Object} Prune result
   */
  pruneWorktrees() {
    try {
      execSync('git worktree prune', { encoding: 'utf8' });

      const afterList = this.listWorktrees();

      return {
        pruned: true,
        remaining: afterList.count,
        message: `Stale worktrees pruned. ${afterList.count} worktree(s) remaining.`
      };
    } catch (error) {
      return {
        pruned: false,
        error: error.message,
        message: `Failed to prune worktrees: ${error.message}`
      };
    }
  }

  /**
   * Get worktree status for a branch
   * @param {string} branch - Branch name
   * @returns {Object} Worktree status
   */
  getWorktreeStatus(branch) {
    const worktreePath = this.getWorktreePath(branch);

    if (!fs.existsSync(worktreePath)) {
      return {
        exists: false,
        branch: branch,
        expectedPath: worktreePath,
        message: `No worktree for branch '${branch}'`
      };
    }

    try {
      // Get git status
      const status = execSync(`git -C "${worktreePath}" status --porcelain`, {
        encoding: 'utf8'
      }).trim();

      const changes = status ? status.split('\n').length : 0;

      // Get current branch in worktree
      const currentBranch = execSync(`git -C "${worktreePath}" branch --show-current`, {
        encoding: 'utf8'
      }).trim();

      // Check maestro status
      const maestroPath = path.join(worktreePath, this.config.maestroDir);
      const hasMaestro = fs.existsSync(maestroPath);

      let activeTrack = null;
      if (hasMaestro) {
        const contextPath = path.join(maestroPath, 'context.json');
        if (fs.existsSync(contextPath)) {
          try {
            const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
            activeTrack = context.activeTrack;
          } catch (e) {
            // Invalid context
          }
        }
      }

      // Get last commit
      const lastCommit = execSync(`git -C "${worktreePath}" log -1 --oneline`, {
        encoding: 'utf8'
      }).trim();

      return {
        exists: true,
        path: worktreePath,
        branch: branch,
        currentBranch: currentBranch,
        uncommittedChanges: changes,
        hasMaestro: hasMaestro,
        activeTrack: activeTrack,
        lastCommit: lastCommit,
        clean: changes === 0,
        message: `Worktree status for '${branch}'`
      };
    } catch (error) {
      return {
        exists: true,
        path: worktreePath,
        branch: branch,
        error: error.message,
        message: `Failed to get status: ${error.message}`
      };
    }
  }

  /**
   * Get a summary of all worktrees with their status
   * @returns {Object} Summary result
   */
  getSummary() {
    const list = this.listWorktrees();
    if (!list.success) {
      return list;
    }

    const detection = this.detectWorktree();
    const currentPath = detection.currentPath;

    const enrichedWorktrees = list.worktrees.map(wt => {
      const status = this.getWorktreeStatus(wt.branch || 'unknown');
      return {
        ...wt,
        ...status,
        isCurrent: wt.path === currentPath
      };
    });

    return {
      success: true,
      current: {
        path: currentPath,
        branch: detection.currentBranch,
        isWorktree: detection.isWorktree,
        isMainRepo: detection.isMainRepo
      },
      worktrees: enrichedWorktrees,
      count: enrichedWorktrees.length,
      mainWorktree: enrichedWorktrees.find(w => w.isMain),
      linkedWorktrees: enrichedWorktrees.filter(w => !w.isMain),
      message: `${enrichedWorktrees.length} worktree(s), currently in ${detection.isWorktree ? 'worktree' : 'main repo'}`
    };
  }
}

module.exports = WorktreeManager;
