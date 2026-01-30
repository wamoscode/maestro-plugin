/**
 * Branch Session Manager Skill
 *
 * Manages multi-branch parallel session support with proper isolation,
 * locking, and state management for CDD (Context-Driven Development).
 *
 * Key Features:
 * - Session ID generation and tracking
 * - Branch-specific lock file management
 * - Stale session detection and cleanup
 * - Git branch detection (gitignore-aware)
 * - Session registry management
 * - Heartbeat mechanism for active sessions
 */

const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class BranchSessionManager {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      staleLockThreshold: config.staleLockThreshold || 300000, // 5 minutes
      lockRetryAttempts: config.lockRetryAttempts || 3,
      lockRetryDelay: config.lockRetryDelay || 1000, // 1 second
      ...config
    };

    this.sessionId = null;
    this.currentBranch = null;
    this.heartbeatTimer = null;
    this.isGitignoreAware = false;
  }

  /**
   * Generate a unique session ID
   * @returns {string} UUID-based session identifier
   */
  generateSessionId() {
    const uuid = crypto.randomUUID();
    const timestamp = Date.now().toString(36);
    return `session-${timestamp}-${uuid.slice(0, 8)}`;
  }

  /**
   * Get the current git branch name
   * @returns {string} Current branch name
   */
  getCurrentBranch() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (branch) {
        return branch;
      }
      // Fallback for detached HEAD state
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      // If git commands fail, return a default
      return 'unknown';
    }
  }

  /**
   * Check if maestro/ directory is gitignored
   * @returns {boolean} True if gitignored
   */
  isGitignored() {
    try {
      execSync(`git check-ignore -q ${this.config.maestroDir}/`, { encoding: 'utf8' });
      this.isGitignoreAware = true;
      return true;
    } catch (error) {
      // Exit code 1 means not ignored
      this.isGitignoreAware = false;
      return false;
    }
  }

  /**
   * Get the path to branch-specific context directory
   * @param {string} branch - Branch name
   * @returns {string} Path to branch context
   */
  getBranchContextPath(branch) {
    const sanitizedBranch = this.sanitizeBranchName(branch);
    return path.join(this.config.maestroDir, 'branches', sanitizedBranch);
  }

  /**
   * Sanitize branch name for use in file paths
   * @param {string} branch - Raw branch name
   * @returns {string} Sanitized branch name
   */
  sanitizeBranchName(branch) {
    // Replace slashes with double dashes, remove special chars
    return branch
      .replace(/\//g, '--')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
  }

  /**
   * Get lock file path for a branch
   * @param {string} branch - Branch name
   * @returns {string} Path to lock file
   */
  getLockFilePath(branch) {
    return path.join(this.getBranchContextPath(branch), 'active-session.lock');
  }

  /**
   * Get session registry path
   * @returns {string} Path to session registry
   */
  getRegistryPath() {
    return path.join(this.config.maestroDir, 'sessions', 'registry.json');
  }

  /**
   * Create lock file content
   * @param {string} sessionId - Session identifier
   * @returns {Object} Lock file data
   */
  createLockData(sessionId) {
    return {
      sessionId: sessionId,
      pid: process.pid,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      user: os.userInfo().username,
      host: os.hostname(),
      terminal: process.env.TERM_PROGRAM || process.env.TERMINAL || 'unknown',
      cwd: process.cwd()
    };
  }

  /**
   * Attempt to acquire lock for a branch
   * @param {string} branch - Branch name
   * @returns {Object} Lock acquisition result
   */
  acquireLock(branch) {
    const lockPath = this.getLockFilePath(branch);
    const sessionId = this.generateSessionId();
    const lockData = this.createLockData(sessionId);

    try {
      // Step 1: Check if lock file exists
      if (fs.existsSync(lockPath)) {
        // Step 2: Read existing lock and check staleness
        const existingLockContent = fs.readFileSync(lockPath, 'utf8');
        const existingLock = JSON.parse(existingLockContent);
        const stalenessResult = this.checkLockStaleness(existingLock);

        if (!stalenessResult.isStale) {
          // Lock is active - block acquisition
          return {
            acquired: false,
            blockedBy: existingLock,
            message: `Branch '${branch}' is locked by another session`,
            warning: this.getLockedBranchWarning(existingLock, branch),
            options: [
              `Switch to a different branch: /maestro:branch switch <other-branch>`,
              `View session details: /maestro:session info ${existingLock.sessionId}`,
              `Release stale lock: /maestro:session release ${branch} --force`
            ]
          };
        }

        // Lock is stale - we can take over
        console.log(`Taking over stale lock: ${stalenessResult.message}`);
      }

      // Step 3: Create directory and write lock
      const lockDir = path.dirname(lockPath);
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }

      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');

      // Store session info
      this.sessionId = sessionId;
      this.currentBranch = branch;

      // Start heartbeat
      this.startHeartbeatTimer(branch, sessionId);

      return {
        acquired: true,
        sessionId: sessionId,
        branch: branch,
        lockPath: lockPath,
        message: `Session started on branch '${branch}'`
      };
    } catch (error) {
      return {
        acquired: false,
        error: error.message,
        message: `Failed to acquire lock for branch '${branch}': ${error.message}`
      };
    }
  }

  /**
   * Check if a lock is stale
   * @param {Object} lockData - Lock file data
   * @returns {Object} Staleness check result
   */
  checkLockStaleness(lockData) {
    const lastHeartbeat = new Date(lockData.lastHeartbeat).getTime();
    const now = Date.now();
    const age = now - lastHeartbeat;
    const isStale = age > this.config.staleLockThreshold;

    return {
      isStale: isStale,
      age: age,
      threshold: this.config.staleLockThreshold,
      lastHeartbeat: lockData.lastHeartbeat,
      message: isStale
        ? `Lock is stale (no heartbeat for ${Math.round(age / 60000)} minutes)`
        : `Lock is active (last heartbeat ${Math.round(age / 1000)} seconds ago)`
    };
  }

  /**
   * Update heartbeat for current session
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier
   * @returns {Object} Heartbeat update result
   */
  updateHeartbeat(branch, sessionId) {
    const lockPath = this.getLockFilePath(branch);

    try {
      if (!fs.existsSync(lockPath)) {
        return {
          updated: false,
          error: 'Lock file does not exist',
          message: `No active session lock for branch '${branch}'`
        };
      }

      const lockContent = fs.readFileSync(lockPath, 'utf8');
      const lockData = JSON.parse(lockContent);

      // Verify we own the lock
      if (lockData.sessionId !== sessionId) {
        return {
          updated: false,
          error: 'Session ID mismatch',
          message: 'Cannot update heartbeat: not the lock owner'
        };
      }

      // Update heartbeat timestamp
      lockData.lastHeartbeat = new Date().toISOString();
      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');

      return {
        updated: true,
        branch: branch,
        sessionId: sessionId,
        lastHeartbeat: lockData.lastHeartbeat,
        message: `Heartbeat updated for session ${sessionId}`
      };
    } catch (error) {
      return {
        updated: false,
        error: error.message,
        message: `Failed to update heartbeat: ${error.message}`
      };
    }
  }

  /**
   * Release lock for a branch
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier (optional, for validation)
   * @param {boolean} force - Force release even if not owner
   * @returns {Object} Lock release result
   */
  releaseLock(branch, sessionId = null, force = false) {
    const lockPath = this.getLockFilePath(branch);

    try {
      // Check if lock exists
      if (!fs.existsSync(lockPath)) {
        return {
          released: true,
          message: `No lock exists for branch '${branch}'`
        };
      }

      // Read and validate ownership unless forcing
      if (!force && sessionId) {
        const lockContent = fs.readFileSync(lockPath, 'utf8');
        const lockData = JSON.parse(lockContent);

        if (lockData.sessionId !== sessionId) {
          return {
            released: false,
            error: 'not_owner',
            currentOwner: lockData.sessionId,
            message: 'Cannot release lock: not the owner. Use --force to override.'
          };
        }
      }

      // Stop heartbeat timer if this is our session
      if (this.sessionId && (sessionId === this.sessionId || !sessionId)) {
        this.stopHeartbeatTimer();
      }

      // Remove the lock file
      fs.unlinkSync(lockPath);

      // Remove from registry
      const registryResult = this.removeFromRegistry(sessionId || this.sessionId);

      // Clear session state
      if (this.currentBranch === branch) {
        this.sessionId = null;
        this.currentBranch = null;
      }

      return {
        released: true,
        branch: branch,
        sessionId: sessionId,
        registryUpdated: registryResult.removed,
        message: `Lock released for branch '${branch}'`
      };
    } catch (error) {
      return {
        released: false,
        error: error.message,
        message: `Failed to release lock: ${error.message}`
      };
    }
  }

  /**
   * Initialize a new session
   * @param {string} branch - Branch name
   * @returns {Object} Session initialization result
   */
  initializeSession(branch) {
    const sessionId = this.generateSessionId();
    const branchContextPath = this.getBranchContextPath(branch);

    const paths = {
      branchContext: branchContextPath,
      tracks: path.join(branchContextPath, 'tracks'),
      context: path.join(branchContextPath, 'context.json'),
      lock: this.getLockFilePath(branch)
    };

    const directories = [
      branchContextPath,
      paths.tracks,
      path.join(this.config.maestroDir, 'sessions'),
      path.join(this.config.maestroDir, 'notifications', 'pending'),
      path.join(this.config.maestroDir, 'notifications', 'archive')
    ];

    const initialContext = {
      branch: branch,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      tracks: [],
      activeTrack: null,
      sessionHistory: []
    };

    const registryEntry = {
      sessionId: sessionId,
      branch: branch,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      activeTrack: null,
      status: 'active'
    };

    try {
      // Create all required directories
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      // Create initial context file if it doesn't exist
      if (!fs.existsSync(paths.context)) {
        fs.writeFileSync(paths.context, JSON.stringify(initialContext, null, 2), 'utf8');
      }

      // Update registry with new session
      this.updateRegistry(sessionId, registryEntry);

      return {
        initialized: true,
        sessionId: sessionId,
        branch: branch,
        paths: paths,
        message: `Session initialized for branch '${branch}'`
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message,
        message: `Failed to initialize session: ${error.message}`
      };
    }
  }

  /**
   * Get session registry data structure
   * @returns {Object} Empty registry template
   */
  getRegistryTemplate() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      sessions: {}
    };
  }

  /**
   * Update session registry
   * @param {string} sessionId - Session identifier
   * @param {Object} data - Session data to update
   * @returns {Object} Registry update result
   */
  updateRegistry(sessionId, data) {
    const registryPath = this.getRegistryPath();

    try {
      // Ensure sessions directory exists
      const registryDir = path.dirname(registryPath);
      if (!fs.existsSync(registryDir)) {
        fs.mkdirSync(registryDir, { recursive: true });
      }

      // Read existing registry or create new one
      let registry;
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf8');
        registry = JSON.parse(content);
      } else {
        registry = this.getRegistryTemplate();
      }

      // Update session entry
      registry.sessions[sessionId] = {
        ...registry.sessions[sessionId],
        ...data
      };
      registry.lastUpdated = new Date().toISOString();

      // Write updated registry
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

      return {
        updated: true,
        sessionId: sessionId,
        registryPath: registryPath,
        message: `Registry updated for session ${sessionId}`
      };
    } catch (error) {
      return {
        updated: false,
        error: error.message,
        message: `Failed to update registry: ${error.message}`
      };
    }
  }

  /**
   * Remove session from registry
   * @param {string} sessionId - Session identifier
   * @returns {Object} Registry removal result
   */
  removeFromRegistry(sessionId) {
    const registryPath = this.getRegistryPath();

    try {
      if (!fs.existsSync(registryPath)) {
        return {
          removed: true,
          message: 'Registry does not exist, nothing to remove'
        };
      }

      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);

      if (registry.sessions && registry.sessions[sessionId]) {
        delete registry.sessions[sessionId];
        registry.lastUpdated = new Date().toISOString();

        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

        return {
          removed: true,
          sessionId: sessionId,
          message: `Session ${sessionId} removed from registry`
        };
      }

      return {
        removed: true,
        message: `Session ${sessionId} was not in registry`
      };
    } catch (error) {
      return {
        removed: false,
        error: error.message,
        message: `Failed to remove from registry: ${error.message}`
      };
    }
  }

  /**
   * List all active sessions
   * @returns {Object} Session list result
   */
  listSessions() {
    const registryPath = this.getRegistryPath();

    try {
      if (!fs.existsSync(registryPath)) {
        return {
          sessions: [],
          count: 0,
          message: 'No active sessions'
        };
      }

      const content = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(content);

      const sessions = Object.entries(registry.sessions || {}).map(([id, data]) => ({
        sessionId: id,
        branch: data.branch,
        activeTrack: data.activeTrack || 'None',
        lastActivity: data.lastActivity,
        status: data.status,
        startedAt: data.startedAt
      }));

      return {
        sessions: sessions,
        count: sessions.length,
        lastUpdated: registry.lastUpdated,
        message: sessions.length > 0 ? `Found ${sessions.length} session(s)` : 'No active sessions'
      };
    } catch (error) {
      return {
        sessions: [],
        count: 0,
        error: error.message,
        message: `Failed to list sessions: ${error.message}`
      };
    }
  }

  /**
   * Cleanup stale sessions
   * @returns {Object} Cleanup result
   */
  cleanupStaleSessions() {
    const branchesDir = path.join(this.config.maestroDir, 'branches');
    const results = {
      total: 0,
      removed: 0,
      active: 0,
      details: []
    };

    try {
      if (!fs.existsSync(branchesDir)) {
        return {
          ...results,
          message: 'No branches directory found'
        };
      }

      // Find all branch directories
      const branches = fs.readdirSync(branchesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const branchDir of branches) {
        const lockPath = path.join(branchesDir, branchDir, 'active-session.lock');

        if (fs.existsSync(lockPath)) {
          results.total++;

          try {
            const lockContent = fs.readFileSync(lockPath, 'utf8');
            const lockData = JSON.parse(lockContent);
            const stalenessResult = this.checkLockStaleness(lockData);

            if (stalenessResult.isStale) {
              // Remove stale lock
              fs.unlinkSync(lockPath);

              // Remove from registry
              this.removeFromRegistry(lockData.sessionId);

              results.removed++;
              results.details.push({
                branch: branchDir,
                sessionId: lockData.sessionId,
                reason: stalenessResult.message,
                action: 'removed'
              });
            } else {
              results.active++;
              results.details.push({
                branch: branchDir,
                sessionId: lockData.sessionId,
                reason: stalenessResult.message,
                action: 'kept'
              });
            }
          } catch (parseError) {
            // Invalid lock file, remove it
            fs.unlinkSync(lockPath);
            results.removed++;
            results.details.push({
              branch: branchDir,
              reason: 'Invalid lock file',
              action: 'removed'
            });
          }
        }
      }

      return {
        ...results,
        message: `Cleanup completed: Checked ${results.total}, removed ${results.removed}, ${results.active} active`
      };
    } catch (error) {
      return {
        ...results,
        error: error.message,
        message: `Cleanup failed: ${error.message}`
      };
    }
  }

  /**
   * Get detailed session info
   * @param {string} sessionIdOrBranch - Session ID or branch name
   * @returns {Object} Session info result
   */
  getSessionInfo(sessionIdOrBranch) {
    try {
      const isSessionId = sessionIdOrBranch.startsWith('session-');
      let sessionInfo = null;

      if (isSessionId) {
        // Look up by session ID in registry
        const registryPath = this.getRegistryPath();
        if (fs.existsSync(registryPath)) {
          const content = fs.readFileSync(registryPath, 'utf8');
          const registry = JSON.parse(content);
          if (registry.sessions && registry.sessions[sessionIdOrBranch]) {
            sessionInfo = registry.sessions[sessionIdOrBranch];
            sessionInfo.sessionId = sessionIdOrBranch;

            // Try to get additional info from lock file
            const lockPath = this.getLockFilePath(sessionInfo.branch);
            if (fs.existsSync(lockPath)) {
              const lockContent = fs.readFileSync(lockPath, 'utf8');
              const lockData = JSON.parse(lockContent);
              sessionInfo = { ...sessionInfo, ...lockData };
            }
          }
        }
      } else {
        // Look up by branch name from lock file
        const lockPath = this.getLockFilePath(sessionIdOrBranch);
        if (fs.existsSync(lockPath)) {
          const lockContent = fs.readFileSync(lockPath, 'utf8');
          sessionInfo = JSON.parse(lockContent);
          sessionInfo.branch = sessionIdOrBranch;

          // Try to get additional info from registry
          const registryPath = this.getRegistryPath();
          if (fs.existsSync(registryPath)) {
            const content = fs.readFileSync(registryPath, 'utf8');
            const registry = JSON.parse(content);
            if (registry.sessions && registry.sessions[sessionInfo.sessionId]) {
              sessionInfo = { ...sessionInfo, ...registry.sessions[sessionInfo.sessionId] };
            }
          }
        }
      }

      if (!sessionInfo) {
        return {
          found: false,
          identifier: sessionIdOrBranch,
          message: `No session found for '${sessionIdOrBranch}'`
        };
      }

      return {
        found: true,
        sessionId: sessionInfo.sessionId,
        branch: sessionInfo.branch,
        status: sessionInfo.status || 'active',
        startedAt: sessionInfo.startedAt,
        lastActivity: sessionInfo.lastActivity || sessionInfo.lastHeartbeat,
        activeTrack: sessionInfo.activeTrack || null,
        user: sessionInfo.user,
        host: sessionInfo.host,
        terminal: sessionInfo.terminal,
        pid: sessionInfo.pid,
        cwd: sessionInfo.cwd,
        message: `Session info for '${sessionIdOrBranch}'`
      };
    } catch (error) {
      return {
        found: false,
        error: error.message,
        message: `Failed to get session info: ${error.message}`
      };
    }
  }

  /**
   * Check for branch context existence
   * @param {string} branch - Branch name
   * @returns {Object} Branch context check result
   */
  checkBranchContext(branch) {
    const branchPath = this.getBranchContextPath(branch);
    const contextPath = path.join(branchPath, 'context.json');
    const tracksPath = path.join(branchPath, 'tracks');
    const lockPath = this.getLockFilePath(branch);

    return {
      branch: branch,
      branchPath: branchPath,
      exists: fs.existsSync(branchPath),
      hasContext: fs.existsSync(contextPath),
      hasTracksDir: fs.existsSync(tracksPath),
      hasLock: fs.existsSync(lockPath),
      message: fs.existsSync(branchPath)
        ? `Branch context found for '${branch}'`
        : `No branch context for '${branch}'`
    };
  }

  /**
   * Get warning message for locked branch
   * @param {Object} lockData - Existing lock data
   * @param {string} branch - Branch name
   * @returns {string} Formatted warning message
   */
  getLockedBranchWarning(lockData, branch) {
    const age = Date.now() - new Date(lockData.startedAt).getTime();
    const ageMinutes = Math.round(age / 60000);
    const lastActivityAge = Date.now() - new Date(lockData.lastHeartbeat).getTime();
    const lastActivityMinutes = Math.round(lastActivityAge / 60000);

    return `
⚠️  Branch '${branch}' is locked by another session

   Session ID: ${lockData.sessionId}
   Started: ${ageMinutes} minutes ago
   Last Activity: ${lastActivityMinutes} minutes ago
   User: ${lockData.user}@${lockData.host}
   Terminal: ${lockData.terminal}

   Options:
   1. Use WORKTREE for true isolation (RECOMMENDED):
      /maestro:worktree create ${branch}
      This creates a separate directory for this branch.

   2. Switch to a different branch:
      /maestro:branch switch <other-branch>

   3. View session details:
      /maestro:session info ${lockData.sessionId}

   4. Release stale lock (use with caution):
      /maestro:session release ${branch} --force
`;
  }

  /**
   * Check if worktrees should be recommended for parallel work
   * @param {string} targetBranch - Branch user wants to work on
   * @returns {Object} Worktree recommendation
   */
  recommendWorktreeForParallelWork(targetBranch) {
    const sessions = this.listSessions();
    const currentBranch = this.getCurrentBranch();

    // Check if there are other active sessions
    const otherActiveSessions = sessions.sessions.filter(s =>
      s.status === 'active' && s.branch !== currentBranch
    );

    if (otherActiveSessions.length > 0) {
      return {
        recommend: true,
        reason: 'parallel_sessions_detected',
        message: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PARALLEL WORK DETECTED - WORKTREE RECOMMENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have ${otherActiveSessions.length} other active session(s).

Regular branch switching affects ALL terminals. For true isolation
where each terminal works on a different branch independently,
use Git worktrees:

  /maestro:worktree create ${targetBranch}

This creates a separate directory for '${targetBranch}', giving you
complete physical isolation from other branches.

Current active sessions:
${otherActiveSessions.map(s => `  - ${s.branch} (${s.sessionId})`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
        otherSessions: otherActiveSessions,
        suggestedCommand: `/maestro:worktree create ${targetBranch}`
      };
    }

    return {
      recommend: false,
      reason: 'no_parallel_sessions',
      message: 'No other active sessions detected.'
    };
  }

  /**
   * Check if current working directory is a worktree
   * @returns {Object} Worktree detection result
   */
  detectWorktree() {
    try {
      // Check if .git is a file (worktree) or directory (main repo)
      const gitPath = path.join(process.cwd(), '.git');

      if (!fs.existsSync(gitPath)) {
        return {
          isWorktree: false,
          isGitRepo: false,
          message: 'Not in a git repository'
        };
      }

      const gitStats = fs.statSync(gitPath);

      if (gitStats.isFile()) {
        // This is a worktree - .git is a file pointing to main repo
        const gitContent = fs.readFileSync(gitPath, 'utf8').trim();
        const match = gitContent.match(/^gitdir: (.+)$/);

        if (match) {
          const gitDir = match[1];
          // Extract main repo path from gitdir
          const mainRepoMatch = gitDir.match(/(.+)\/\.git\/worktrees\//);
          const mainRepoPath = mainRepoMatch ? mainRepoMatch[1] : null;

          return {
            isWorktree: true,
            isGitRepo: true,
            gitDir: gitDir,
            mainRepoPath: mainRepoPath,
            currentPath: process.cwd(),
            currentBranch: this.getCurrentBranch(),
            message: 'Currently in a git worktree'
          };
        }
      }

      // This is the main repository
      return {
        isWorktree: false,
        isGitRepo: true,
        currentPath: process.cwd(),
        currentBranch: this.getCurrentBranch(),
        message: 'Currently in main repository'
      };

    } catch (error) {
      return {
        isWorktree: false,
        isGitRepo: false,
        error: error.message,
        message: `Failed to detect worktree: ${error.message}`
      };
    }
  }

  /**
   * Get list of branches with CDD context
   * @returns {Object} Branch list result
   */
  listBranchesWithContext() {
    const branchesDir = path.join(this.config.maestroDir, 'branches');
    const currentBranch = this.getCurrentBranch();

    try {
      if (!fs.existsSync(branchesDir)) {
        return {
          branches: [],
          currentBranch: currentBranch,
          count: 0,
          message: 'No branches with CDD context found'
        };
      }

      const branchDirs = fs.readdirSync(branchesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const branches = branchDirs.map(sanitizedName => {
        const branchPath = path.join(branchesDir, sanitizedName);
        const contextPath = path.join(branchPath, 'context.json');
        const tracksPath = path.join(branchPath, 'tracks');
        const lockPath = path.join(branchPath, 'active-session.lock');

        let context = null;
        let trackCount = 0;
        let hasLock = false;
        let lockData = null;

        if (fs.existsSync(contextPath)) {
          try {
            context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
          } catch (e) {
            // Invalid context file
          }
        }

        if (fs.existsSync(tracksPath)) {
          try {
            trackCount = fs.readdirSync(tracksPath, { withFileTypes: true })
              .filter(d => d.isDirectory()).length;
          } catch (e) {
            // Can't read tracks
          }
        }

        if (fs.existsSync(lockPath)) {
          hasLock = true;
          try {
            lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          } catch (e) {
            // Invalid lock file
          }
        }

        const originalName = this.unsanitizeBranchName(sanitizedName);
        const isCurrent = originalName === currentBranch ||
                          sanitizedName === this.sanitizeBranchName(currentBranch);

        return {
          name: originalName,
          sanitizedName: sanitizedName,
          isCurrent: isCurrent,
          hasContext: !!context,
          hasLock: hasLock,
          activeTrack: context?.activeTrack || null,
          trackCount: trackCount,
          lastAccessed: context?.lastAccessed || null,
          sessionId: lockData?.sessionId || null
        };
      });

      return {
        branches: branches,
        currentBranch: currentBranch,
        count: branches.length,
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
   * Unsanitize branch name (reverse of sanitizeBranchName)
   * @param {string} sanitized - Sanitized branch name
   * @returns {string} Original branch name approximation
   */
  unsanitizeBranchName(sanitized) {
    return sanitized.replace(/--/g, '/');
  }

  /**
   * Migrate legacy context to branch-aware structure
   * @param {string} targetBranch - Branch to migrate context to
   * @returns {Object} Migration result
   */
  migrateLegacyContext(targetBranch) {
    const branchPath = this.getBranchContextPath(targetBranch);
    const legacyTracksPath = path.join(this.config.maestroDir, 'tracks');
    const branchTracksPath = path.join(branchPath, 'tracks');
    const markerPath = path.join(this.config.maestroDir, '.gitignore-aware');

    try {
      let tracksCount = 0;

      // Create branch context directory
      if (!fs.existsSync(branchPath)) {
        fs.mkdirSync(branchPath, { recursive: true });
      }

      if (!fs.existsSync(branchTracksPath)) {
        fs.mkdirSync(branchTracksPath, { recursive: true });
      }

      // Copy tracks if legacy exists and branch tracks don't
      if (fs.existsSync(legacyTracksPath)) {
        const legacyTracks = fs.readdirSync(legacyTracksPath, { withFileTypes: true })
          .filter(d => d.isDirectory());

        for (const track of legacyTracks) {
          const srcPath = path.join(legacyTracksPath, track.name);
          const destPath = path.join(branchTracksPath, track.name);

          if (!fs.existsSync(destPath)) {
            this.copyDirRecursive(srcPath, destPath);
            tracksCount++;
          }
        }
      }

      // Create migration marker
      const markerContent = {
        migratedAt: new Date().toISOString(),
        fromLegacy: true,
        initialBranch: targetBranch,
        tracksCount: tracksCount
      };
      fs.writeFileSync(markerPath, JSON.stringify(markerContent, null, 2), 'utf8');

      // Create session directories
      const sessionsPath = path.join(this.config.maestroDir, 'sessions');
      const notificationsPath = path.join(this.config.maestroDir, 'notifications');

      if (!fs.existsSync(sessionsPath)) {
        fs.mkdirSync(sessionsPath, { recursive: true });
      }
      if (!fs.existsSync(path.join(notificationsPath, 'pending'))) {
        fs.mkdirSync(path.join(notificationsPath, 'pending'), { recursive: true });
      }
      if (!fs.existsSync(path.join(notificationsPath, 'archive'))) {
        fs.mkdirSync(path.join(notificationsPath, 'archive'), { recursive: true });
      }

      return {
        migrated: true,
        targetBranch: targetBranch,
        branchPath: branchPath,
        tracksCount: tracksCount,
        message: `Migration completed: Created branch context at ${branchPath}, migrated ${tracksCount} tracks`
      };
    } catch (error) {
      return {
        migrated: false,
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
   * Start heartbeat timer for session
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier
   * @returns {Object} Heartbeat start result
   */
  startHeartbeat(branch, sessionId) {
    // Alias for startHeartbeatTimer
    return this.startHeartbeatTimer(branch, sessionId);
  }

  /**
   * Start the heartbeat timer
   * @param {string} branch - Branch name
   * @param {string} sessionId - Session identifier
   * @returns {Object} Heartbeat start result
   */
  startHeartbeatTimer(branch, sessionId) {
    // Stop any existing timer
    this.stopHeartbeatTimer();

    // Start new heartbeat timer
    this.heartbeatTimer = setInterval(() => {
      this.updateHeartbeat(branch, sessionId);
    }, this.config.heartbeatInterval);

    return {
      started: true,
      branch: branch,
      sessionId: sessionId,
      interval: this.config.heartbeatInterval,
      message: `Heartbeat started (every ${this.config.heartbeatInterval / 1000} seconds)`
    };
  }

  /**
   * Stop heartbeat timer
   * @returns {Object} Heartbeat stop result
   */
  stopHeartbeat() {
    return this.stopHeartbeatTimer();
  }

  /**
   * Stop the heartbeat timer
   * @returns {Object} Heartbeat stop result
   */
  stopHeartbeatTimer() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;

      return {
        stopped: true,
        message: 'Heartbeat timer stopped'
      };
    }

    return {
      stopped: false,
      message: 'No heartbeat timer was running'
    };
  }
}

module.exports = BranchSessionManager;
