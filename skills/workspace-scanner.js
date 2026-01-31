/**
 * Workspace Scanner Skill
 *
 * Detects multi-repository workspaces, submodules, and repository structure.
 * Used by the hydration system to understand the workspace layout before
 * extracting knowledge from git history.
 *
 * Capabilities:
 * - Detect workspace type (single repo, multi-repo, worktree)
 * - Discover git submodules and their status
 * - Scan for multiple repositories in a directory
 * - Calculate commit counts and date ranges per repository
 * - Detect remote configurations for GitHub integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorkspaceScanner {
  constructor(config = {}) {
    this.config = {
      rootPath: config.rootPath || process.cwd(),
      maxDepth: config.maxDepth || 3,
      ignorePatterns: config.ignorePatterns || ['node_modules', '.git', 'vendor', 'dist', 'build'],
      ...config
    };
  }

  /**
   * Scan the workspace and return complete workspace information
   * @returns {Object} Workspace analysis result
   */
  scan() {
    const result = {
      workspaceType: 'unknown',
      rootPath: this.config.rootPath,
      isWorktree: false,
      mainRepoPath: null,
      repositories: [],
      submodules: [],
      totalCommits: 0,
      dateRange: { earliest: null, latest: null },
      githubRemotes: [],
      scanTime: new Date().toISOString()
    };

    try {
      // Check if we're in a git repository
      const isGitRepo = this.isGitRepository(this.config.rootPath);

      if (!isGitRepo) {
        // Scan for multiple repositories
        result.workspaceType = 'multi-repo';
        result.repositories = this.scanForRepositories(this.config.rootPath, 0);
      } else {
        // Check if it's a worktree
        result.isWorktree = this.isWorktree(this.config.rootPath);

        if (result.isWorktree) {
          result.workspaceType = 'worktree';
          result.mainRepoPath = this.getMainRepoPath(this.config.rootPath);
        } else {
          result.workspaceType = 'single-repo';
        }

        // Add main repository
        const mainRepo = this.analyzeRepository(this.config.rootPath);
        result.repositories.push(mainRepo);

        // Scan for submodules
        result.submodules = this.getSubmodules(this.config.rootPath);

        // Analyze each submodule
        for (const submodule of result.submodules) {
          const submodulePath = path.join(this.config.rootPath, submodule.path);
          if (this.isGitRepository(submodulePath)) {
            const submoduleRepo = this.analyzeRepository(submodulePath);
            submoduleRepo.type = 'submodule';
            submoduleRepo.submoduleInfo = submodule;
            result.repositories.push(submoduleRepo);
          }
        }

        // If there are submodules, upgrade to multi-repo type
        if (result.submodules.length > 0) {
          result.workspaceType = 'multi-repo';
        }
      }

      // Calculate totals
      result.totalCommits = result.repositories.reduce((sum, repo) => sum + (repo.commitCount || 0), 0);
      result.dateRange = this.calculateDateRange(result.repositories);
      result.githubRemotes = this.collectGitHubRemotes(result.repositories);

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Check if a path is a git repository
   * @param {string} dirPath - Directory path
   * @returns {boolean}
   */
  isGitRepository(dirPath) {
    const gitPath = path.join(dirPath, '.git');
    return fs.existsSync(gitPath);
  }

  /**
   * Check if current repo is a worktree
   * @param {string} dirPath - Directory path
   * @returns {boolean}
   */
  isWorktree(dirPath) {
    const gitPath = path.join(dirPath, '.git');
    if (!fs.existsSync(gitPath)) return false;

    const stat = fs.statSync(gitPath);
    // If .git is a file (not directory), it's a worktree or submodule
    if (stat.isFile()) {
      const content = fs.readFileSync(gitPath, 'utf8').trim();
      return content.startsWith('gitdir:');
    }
    return false;
  }

  /**
   * Get main repository path from a worktree
   * @param {string} dirPath - Worktree directory path
   * @returns {string|null}
   */
  getMainRepoPath(dirPath) {
    try {
      const result = execSync('git rev-parse --git-common-dir', {
        cwd: dirPath,
        encoding: 'utf8'
      }).trim();

      // Convert relative path to absolute
      if (!path.isAbsolute(result)) {
        return path.resolve(dirPath, result, '..');
      }
      return path.dirname(result);
    } catch {
      return null;
    }
  }

  /**
   * Scan a directory for git repositories
   * @param {string} dirPath - Directory to scan
   * @param {number} depth - Current depth
   * @returns {Array} Array of repository info objects
   */
  scanForRepositories(dirPath, depth) {
    const repositories = [];

    if (depth > this.config.maxDepth) return repositories;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (this.config.ignorePatterns.includes(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (this.isGitRepository(fullPath)) {
          const repoInfo = this.analyzeRepository(fullPath);
          repositories.push(repoInfo);
        } else {
          // Recursively search
          const nested = this.scanForRepositories(fullPath, depth + 1);
          repositories.push(...nested);
        }
      }
    } catch (error) {
      // Directory not readable
    }

    return repositories;
  }

  /**
   * Get submodules from a repository
   * @param {string} repoPath - Repository path
   * @returns {Array} Array of submodule info
   */
  getSubmodules(repoPath) {
    const submodules = [];
    const gitmodulesPath = path.join(repoPath, '.gitmodules');

    if (!fs.existsSync(gitmodulesPath)) {
      return submodules;
    }

    try {
      const content = fs.readFileSync(gitmodulesPath, 'utf8');
      const regex = /\[submodule "([^"]+)"\]\s+path\s*=\s*([^\n]+)\s+url\s*=\s*([^\n]+)/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        submodules.push({
          name: match[1].trim(),
          path: match[2].trim(),
          url: match[3].trim()
        });
      }

      // Also try git submodule status
      try {
        const status = execSync('git submodule status', {
          cwd: repoPath,
          encoding: 'utf8'
        });

        const lines = status.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const commitHash = parts[0].replace(/^[+-U]/, '');
            const subPath = parts[1];

            // Find matching submodule and add commit hash
            const submodule = submodules.find(s => s.path === subPath);
            if (submodule) {
              submodule.commitHash = commitHash;
              submodule.initialized = !parts[0].startsWith('-');
            }
          }
        }
      } catch {
        // Submodule status failed
      }
    } catch (error) {
      // .gitmodules parse failed
    }

    return submodules;
  }

  /**
   * Analyze a single repository
   * @param {string} repoPath - Repository path
   * @returns {Object} Repository analysis
   */
  analyzeRepository(repoPath) {
    const repo = {
      path: repoPath,
      name: path.basename(repoPath),
      type: 'main',
      branch: null,
      commitCount: 0,
      dateRange: { earliest: null, latest: null },
      remotes: [],
      isGitHubRepo: false,
      githubInfo: null
    };

    try {
      // Get current branch
      try {
        repo.branch = execSync('git branch --show-current', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();
      } catch {
        // Might be in detached HEAD
        repo.branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();
      }

      // Get commit count
      try {
        const count = execSync('git rev-list --count HEAD', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();
        repo.commitCount = parseInt(count, 10) || 0;
      } catch {
        repo.commitCount = 0;
      }

      // Get date range
      try {
        const earliest = execSync('git log --reverse --format=%aI | head -n 1', {
          cwd: repoPath,
          encoding: 'utf8',
          shell: true
        }).trim();

        const latest = execSync('git log -1 --format=%aI', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim();

        repo.dateRange = {
          earliest: earliest || null,
          latest: latest || null
        };
      } catch {
        // Date range extraction failed
      }

      // Get remotes
      try {
        const remotes = execSync('git remote -v', {
          cwd: repoPath,
          encoding: 'utf8'
        });

        const lines = remotes.split('\n').filter(l => l.includes('(fetch)'));
        repo.remotes = lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            name: parts[0],
            url: parts[1]
          };
        });

        // Check for GitHub
        for (const remote of repo.remotes) {
          const githubInfo = this.parseGitHubUrl(remote.url);
          if (githubInfo) {
            repo.isGitHubRepo = true;
            repo.githubInfo = githubInfo;
            break;
          }
        }
      } catch {
        // Remote extraction failed
      }

    } catch (error) {
      repo.error = error.message;
    }

    return repo;
  }

  /**
   * Parse a GitHub URL to extract owner and repo
   * @param {string} url - Git remote URL
   * @returns {Object|null} GitHub info or null
   */
  parseGitHubUrl(url) {
    // HTTPS format: https://github.com/owner/repo.git
    // SSH format: git@github.com:owner/repo.git

    const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2].replace(/\.git$/, ''),
        url: `https://github.com/${httpsMatch[1]}/${httpsMatch[2].replace(/\.git$/, '')}`
      };
    }

    const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.]+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2].replace(/\.git$/, ''),
        url: `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/, '')}`
      };
    }

    return null;
  }

  /**
   * Calculate combined date range from multiple repositories
   * @param {Array} repositories - Array of repository info
   * @returns {Object} Combined date range
   */
  calculateDateRange(repositories) {
    let earliest = null;
    let latest = null;

    for (const repo of repositories) {
      if (repo.dateRange?.earliest) {
        if (!earliest || new Date(repo.dateRange.earliest) < new Date(earliest)) {
          earliest = repo.dateRange.earliest;
        }
      }
      if (repo.dateRange?.latest) {
        if (!latest || new Date(repo.dateRange.latest) > new Date(latest)) {
          latest = repo.dateRange.latest;
        }
      }
    }

    return { earliest, latest };
  }

  /**
   * Collect all GitHub remotes from repositories
   * @param {Array} repositories - Array of repository info
   * @returns {Array} Array of GitHub info objects
   */
  collectGitHubRemotes(repositories) {
    const githubRemotes = [];

    for (const repo of repositories) {
      if (repo.isGitHubRepo && repo.githubInfo) {
        githubRemotes.push({
          ...repo.githubInfo,
          repoPath: repo.path,
          repoName: repo.name
        });
      }
    }

    return githubRemotes;
  }

  /**
   * Get a formatted summary of the workspace for display
   * @returns {Object} Formatted workspace summary
   */
  getSummary() {
    const scan = this.scan();

    const summary = {
      type: scan.workspaceType,
      typeLabel: this.getWorkspaceTypeLabel(scan.workspaceType),
      repositoryCount: scan.repositories.length,
      totalCommits: scan.totalCommits,
      dateRangeFormatted: this.formatDateRange(scan.dateRange),
      hasGitHubIntegration: scan.githubRemotes.length > 0,
      githubRepoCount: scan.githubRemotes.length,
      submoduleCount: scan.submodules.length,
      repositories: scan.repositories.map(repo => ({
        name: repo.name,
        type: repo.type,
        branch: repo.branch,
        commits: repo.commitCount,
        dateRange: this.formatDateRange(repo.dateRange),
        isGitHub: repo.isGitHubRepo,
        github: repo.githubInfo
      })),
      isWorktree: scan.isWorktree,
      mainRepoPath: scan.mainRepoPath
    };

    return summary;
  }

  /**
   * Get human-readable workspace type label
   * @param {string} type - Workspace type
   * @returns {string}
   */
  getWorkspaceTypeLabel(type) {
    const labels = {
      'single-repo': 'Single Repository',
      'multi-repo': 'Multi-Repository Workspace',
      'worktree': 'Git Worktree',
      'unknown': 'Unknown Workspace Type'
    };
    return labels[type] || type;
  }

  /**
   * Format a date range for display
   * @param {Object} range - Date range object
   * @returns {string}
   */
  formatDateRange(range) {
    if (!range?.earliest && !range?.latest) {
      return 'Unknown';
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return 'Unknown';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    return `${formatDate(range.earliest)} to ${formatDate(range.latest)}`;
  }

  /**
   * Estimate hydration time based on commit counts
   * @param {Object} options - Hydration options
   * @returns {Object} Time estimate
   */
  estimateHydrationTime(options = {}) {
    const scan = this.scan();

    let commitsToProcess = scan.totalCommits;

    // Apply filters
    if (options.maxCommits && options.maxCommits < commitsToProcess) {
      commitsToProcess = options.maxCommits;
    }

    if (options.since) {
      // Estimate reduction based on date (rough heuristic)
      const sinceDate = new Date(options.since);
      const totalRange = new Date(scan.dateRange.latest) - new Date(scan.dateRange.earliest);
      const filterRange = new Date(scan.dateRange.latest) - sinceDate;
      const ratio = Math.max(0, Math.min(1, filterRange / totalRange));
      commitsToProcess = Math.round(commitsToProcess * ratio);
    }

    // Estimation: ~50 commits per second for git-only, ~10 per second with GitHub
    const commitsPerSecond = options.includeGitHub ? 10 : 50;
    const seconds = Math.ceil(commitsToProcess / commitsPerSecond);

    return {
      commitsToProcess,
      estimatedSeconds: seconds,
      estimatedFormatted: this.formatDuration(seconds),
      includesGitHub: options.includeGitHub || false
    };
  }

  /**
   * Format seconds as a human-readable duration
   * @param {number} seconds - Duration in seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `~${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `~${minutes} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `~${hours}h ${minutes}min`;
    }
  }
}

module.exports = WorkspaceScanner;
