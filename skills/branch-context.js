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
   * @param {string} sanitized - Sanitized branch name
   * @returns {string} Original branch name (approximation)
   */
  unsanitizeBranchName(sanitized) {
    return sanitized.replace(/--/g, '/');
  }

  /**
   * Detect context structure (legacy vs branch-aware)
   * @returns {Object} Detection action
   */
  detectContextStructure() {
    const paths = this.getPaths();

    return {
      action: 'detect_context_structure',
      checks: [
        {
          name: 'gitignore_aware_marker',
          path: paths.gitignoreAware,
          type: 'file',
          indicates: 'branch-aware'
        },
        {
          name: 'branches_directory',
          path: paths.branches,
          type: 'directory',
          indicates: 'branch-aware'
        },
        {
          name: 'shared_directory',
          path: paths.shared.root,
          type: 'directory',
          indicates: 'branch-aware'
        },
        {
          name: 'legacy_product',
          path: paths.legacy.product,
          type: 'file',
          indicates: 'legacy'
        },
        {
          name: 'legacy_tracks',
          path: paths.legacy.tracks,
          type: 'directory',
          indicates: 'legacy'
        }
      ],
      interpretation: {
        'branch-aware': 'maestro/ is gitignored and uses branch-specific context',
        'legacy': 'maestro/ uses legacy flat structure',
        'hybrid': 'maestro/ has both structures (needs migration)',
        'none': 'No maestro/ context found'
      }
    };
  }

  /**
   * Get current git branch
   * @returns {Object} Git branch detection action
   */
  getCurrentBranch() {
    return {
      action: 'get_current_branch',
      steps: [
        {
          step: 1,
          description: 'Get current branch name',
          command: 'git branch --show-current',
          fallback: 'git rev-parse --abbrev-ref HEAD'
        },
        {
          step: 2,
          description: 'Handle detached HEAD',
          condition: 'output is empty or HEAD',
          fallback_command: 'git rev-parse --short HEAD',
          prefix: 'detached-'
        }
      ],
      output: {
        branch: '{{branch_name}}',
        isDetached: '{{is_detached}}',
        commit: '{{short_commit}}'
      }
    };
  }

  /**
   * Load context for a branch
   * @param {string} branch - Branch name
   * @returns {Object} Context load action
   */
  loadBranchContext(branch) {
    const paths = this.getPaths(branch);

    return {
      action: 'load_branch_context',
      branch: branch,
      steps: [
        {
          step: 1,
          description: 'Detect context structure',
          action: this.detectContextStructure()
        },
        {
          step: 2,
          description: 'Load shared context (read-only)',
          files: [
            { path: paths.shared.product, key: 'product', optional: true },
            { path: paths.shared.techStack, key: 'techStack', optional: true },
            { path: paths.shared.workflow, key: 'workflow', optional: true },
            { path: paths.shared.guidelines, key: 'guidelines', optional: true },
            { path: paths.shared.styleguide, key: 'styleguide', optional: true },
            { path: paths.shared.workspace, key: 'workspace', optional: true, parse: 'json' }
          ],
          fallback_to_legacy: true
        },
        {
          step: 3,
          description: 'Load branch-specific context',
          files: [
            { path: paths.branch.context, key: 'branchContext', optional: true, parse: 'json' },
            { path: paths.branch.tracksIndex, key: 'tracksIndex', optional: true }
          ]
        },
        {
          step: 4,
          description: 'List branch tracks',
          command: `ls -1 "${paths.branch.tracks}" 2>/dev/null || echo ""`
        },
        {
          step: 5,
          description: 'Load active track metadata if exists',
          condition: 'branchContext.activeTrack exists',
          file: '{{paths.branch.tracks}}/{{activeTrack}}/metadata.json',
          parse: 'json'
        }
      ],
      output: {
        shared: '{{shared_context}}',
        branch: '{{branch_context}}',
        tracks: '{{track_list}}',
        activeTrack: '{{active_track_metadata}}'
      }
    };
  }

  /**
   * Save branch context
   * @param {string} branch - Branch name
   * @param {Object} context - Context data to save
   * @returns {Object} Context save action
   */
  saveBranchContext(branch, context) {
    const paths = this.getPaths(branch);

    return {
      action: 'save_branch_context',
      branch: branch,
      context: context,
      steps: [
        {
          step: 1,
          description: 'Ensure branch directory exists',
          command: `mkdir -p "${paths.branch.root}" "${paths.branch.tracks}"`
        },
        {
          step: 2,
          description: 'Update last accessed timestamp',
          transform: {
            ...context,
            lastAccessed: new Date().toISOString()
          }
        },
        {
          step: 3,
          description: 'Write branch context file',
          command: `echo '${JSON.stringify(context, null, 2)}' > "${paths.branch.context}"`
        }
      ]
    };
  }

  /**
   * Initialize branch context
   * @param {string} branch - Branch name
   * @returns {Object} Context initialization action
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

    return {
      action: 'initialize_branch_context',
      branch: branch,
      paths: paths.branch,
      initialContext: initialContext,
      steps: [
        {
          step: 1,
          description: 'Create branch directory structure',
          commands: [
            `mkdir -p "${paths.branch.root}"`,
            `mkdir -p "${paths.branch.tracks}"`
          ]
        },
        {
          step: 2,
          description: 'Check if context already exists',
          command: `test -f "${paths.branch.context}" && echo "exists" || echo "new"`
        },
        {
          step: 3,
          description: 'Create initial context if new',
          condition: 'result === "new"',
          command: `echo '${JSON.stringify(initialContext, null, 2)}' > "${paths.branch.context}"`
        },
        {
          step: 4,
          description: 'Create empty tracks index if needed',
          condition: 'tracks.md does not exist',
          content: this.getTracksIndexTemplate(branch),
          file: paths.branch.tracksIndex
        }
      ]
    };
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
   * @returns {Object} Migration action
   */
  migrateTobranchAware(targetBranch) {
    const paths = this.getPaths(targetBranch);

    return {
      action: 'migrate_to_branch_aware',
      targetBranch: targetBranch,
      steps: [
        {
          step: 1,
          description: 'Create shared directory',
          command: `mkdir -p "${paths.shared.root}"`
        },
        {
          step: 2,
          description: 'Move shared files to shared directory',
          commands: this.sharedFiles.map(file => {
            const legacyPath = path.join(this.config.maestroDir, file);
            const sharedPath = path.join(paths.shared.root, file);
            return `test -f "${legacyPath}" && cp "${legacyPath}" "${sharedPath}" || true`;
          })
        },
        {
          step: 3,
          description: 'Create branch directory structure',
          command: `mkdir -p "${paths.branch.root}" "${paths.branch.tracks}"`
        },
        {
          step: 4,
          description: 'Copy tracks to branch (if legacy tracks exist)',
          command: `test -d "${paths.legacy.tracks}" && cp -r "${paths.legacy.tracks}/"* "${paths.branch.tracks}/" 2>/dev/null || true`
        },
        {
          step: 5,
          description: 'Copy tracks index to branch',
          command: `test -f "${paths.legacy.tracksIndex}" && cp "${paths.legacy.tracksIndex}" "${paths.branch.tracksIndex}" || true`
        },
        {
          step: 6,
          description: 'Initialize branch context',
          action: this.initializeBranchContext(targetBranch)
        },
        {
          step: 7,
          description: 'Create gitignore-aware marker',
          content: JSON.stringify({
            version: '1.0.0',
            migratedAt: new Date().toISOString(),
            migratedFrom: 'legacy',
            initialBranch: targetBranch,
            sharedFiles: this.sharedFiles
          }, null, 2),
          file: paths.gitignoreAware
        },
        {
          step: 8,
          description: 'Create session directories',
          commands: [
            `mkdir -p "${paths.sessions}"`,
            `mkdir -p "${paths.notifications}/pending"`,
            `mkdir -p "${paths.notifications}/archive"`
          ]
        }
      ],
      output_template: `
Migration to Branch-Aware Structure Complete

Shared Context:
  Location: ${paths.shared.root}
  Files: ${this.sharedFiles.join(', ')}

Branch Context:
  Branch: ${targetBranch}
  Location: ${paths.branch.root}
  Tracks: Copied from legacy structure

Session Support:
  Registry: ${paths.registry}
  Notifications: ${paths.notifications}

Note: Legacy files are preserved. After verification, you can remove:
  - ${paths.legacy.product}
  - ${paths.legacy.techStack}
  - ${paths.legacy.workflow}
  - ${paths.legacy.tracks}/ (directory)
`
    };
  }

  /**
   * Query context from another branch (read-only)
   * @param {string} targetBranch - Branch to query
   * @param {string} query - What to retrieve
   * @returns {Object} Cross-branch query action
   */
  queryBranchContext(targetBranch, query) {
    const paths = this.getPaths(targetBranch);

    const queryTypes = {
      tracks: {
        file: paths.branch.tracksIndex,
        description: 'Get track list from branch'
      },
      activeTrack: {
        file: paths.branch.context,
        parse: 'json',
        extract: 'activeTrack',
        description: 'Get active track ID'
      },
      context: {
        file: paths.branch.context,
        parse: 'json',
        description: 'Get full branch context'
      },
      trackMetadata: {
        pattern: `${paths.branch.tracks}/*/metadata.json`,
        parse: 'json',
        description: 'Get all track metadata'
      }
    };

    const queryConfig = queryTypes[query] || queryTypes.context;

    return {
      action: 'query_branch_context',
      targetBranch: targetBranch,
      query: query,
      config: queryConfig,
      note: 'Cross-branch queries are read-only'
    };
  }

  /**
   * List all branches with context
   * @returns {Object} Branch list action
   */
  listBranchesWithContext() {
    const paths = this.getPaths();

    return {
      action: 'list_branches_with_context',
      steps: [
        {
          step: 1,
          description: 'Find all branch context directories',
          command: `find "${paths.branches}" -maxdepth 1 -type d -not -name "branches" 2>/dev/null`
        },
        {
          step: 2,
          description: 'Get current git branch',
          command: 'git branch --show-current'
        },
        {
          step: 3,
          description: 'For each branch directory',
          for_each: 'branch_dir',
          gather: [
            { from: 'context.json', field: 'lastAccessed' },
            { from: 'context.json', field: 'activeTrack' },
            { from: 'active-session.lock', exists: true, field: 'hasLock' },
            { from: 'tracks', count_items: true, field: 'trackCount' }
          ]
        }
      ],
      output_template: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BRANCHES WITH CDD CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Branch              │ Tracks │ Active Track │ Session │ Last Used    │
│─────────────────────│────────│──────────────│─────────│──────────────│
{{#each branches}}
│ {{name}} {{#if current}}*{{/if}} │ {{trackCount}} │ {{activeTrack}} │ {{sessionStatus}} │ {{lastAccessed}} │
{{/each}}

* = current branch
{{#if hasLocked}}
Sessions are active on: {{lockedBranches}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    };
  }

  /**
   * Get shared context (read-only for all branches)
   * @returns {Object} Shared context load action
   */
  loadSharedContext() {
    const paths = this.getPaths();

    return {
      action: 'load_shared_context',
      steps: [
        {
          step: 1,
          description: 'Check for shared directory',
          command: `test -d "${paths.shared.root}" && echo "branch-aware" || echo "legacy"`
        },
        {
          step: 2,
          description: 'Load from shared or legacy location',
          branch_aware: {
            files: [
              { path: paths.shared.product, key: 'product' },
              { path: paths.shared.techStack, key: 'techStack' },
              { path: paths.shared.workflow, key: 'workflow' },
              { path: paths.shared.guidelines, key: 'guidelines' },
              { path: paths.shared.styleguide, key: 'styleguide' }
            ]
          },
          legacy: {
            files: [
              { path: paths.legacy.product, key: 'product' },
              { path: paths.legacy.techStack, key: 'techStack' },
              { path: paths.legacy.workflow, key: 'workflow' },
              { path: path.join(this.config.maestroDir, 'product-guidelines.md'), key: 'guidelines' },
              { path: path.join(this.config.maestroDir, 'code-styleguide.md'), key: 'styleguide' }
            ]
          }
        }
      ],
      note: 'Shared context is read-only from branch context'
    };
  }

  /**
   * Update shared context (must be done explicitly)
   * @param {string} file - File to update
   * @param {string} content - New content
   * @returns {Object} Shared context update action
   */
  updateSharedContext(file, content) {
    const paths = this.getPaths();
    const sharedPath = path.join(paths.shared.root, file);
    const legacyPath = path.join(this.config.maestroDir, file);

    if (!this.sharedFiles.includes(file)) {
      return {
        action: 'error',
        message: `'${file}' is not a shared context file. Shared files: ${this.sharedFiles.join(', ')}`
      };
    }

    return {
      action: 'update_shared_context',
      file: file,
      steps: [
        {
          step: 1,
          description: 'Detect structure',
          command: `test -d "${paths.shared.root}" && echo "branch-aware" || echo "legacy"`
        },
        {
          step: 2,
          description: 'Write to appropriate location',
          branch_aware_path: sharedPath,
          legacy_path: legacyPath,
          content: content
        },
        {
          step: 3,
          description: 'Update timestamp in gitignore-aware marker',
          condition: 'is branch-aware',
          jq_command: `.lastSharedUpdate = "${new Date().toISOString()}" | .lastSharedFile = "${file}"`
        }
      ],
      warning: 'Shared context changes affect all branches'
    };
  }

  /**
   * Copy track between branches
   * @param {string} trackId - Track to copy
   * @param {string} sourceBranch - Source branch
   * @param {string} targetBranch - Target branch
   * @returns {Object} Track copy action
   */
  copyTrackBetweenBranches(trackId, sourceBranch, targetBranch) {
    const sourcePaths = this.getPaths(sourceBranch);
    const targetPaths = this.getPaths(targetBranch);
    const sourceTrack = path.join(sourcePaths.branch.tracks, trackId);
    const targetTrack = path.join(targetPaths.branch.tracks, trackId);

    return {
      action: 'copy_track_between_branches',
      trackId: trackId,
      source: sourceBranch,
      target: targetBranch,
      steps: [
        {
          step: 1,
          description: 'Verify source track exists',
          command: `test -d "${sourceTrack}" || (echo "Track not found" && exit 1)`
        },
        {
          step: 2,
          description: 'Check target does not exist',
          command: `test ! -d "${targetTrack}" || (echo "Track already exists in target" && exit 1)`
        },
        {
          step: 3,
          description: 'Create target branch context if needed',
          action: this.initializeBranchContext(targetBranch)
        },
        {
          step: 4,
          description: 'Copy track directory',
          command: `cp -r "${sourceTrack}" "${targetTrack}"`
        },
        {
          step: 5,
          description: 'Update track metadata with new branch',
          jq_command: `.branch = "${targetBranch}" | .copiedFrom = { branch: "${sourceBranch}", at: "${new Date().toISOString()}" }`,
          file: `${targetTrack}/metadata.json`
        }
      ]
    };
  }

  /**
   * Delete branch context
   * @param {string} branch - Branch to delete context for
   * @param {boolean} confirm - Require confirmation
   * @returns {Object} Delete action
   */
  deleteBranchContext(branch, confirm = true) {
    const paths = this.getPaths(branch);

    return {
      action: 'delete_branch_context',
      branch: branch,
      path: paths.branch.root,
      requireConfirmation: confirm,
      steps: [
        {
          step: 1,
          description: 'Check for active session',
          command: `test -f "${paths.branch.lock}" && echo "has_session" || echo "no_session"`
        },
        {
          step: 2,
          description: 'Require confirmation if has session',
          condition: 'has_session',
          prompt: `Branch '${branch}' has an active session. Force delete?`
        },
        {
          step: 3,
          description: 'Remove branch context directory',
          command: `rm -rf "${paths.branch.root}"`
        },
        {
          step: 4,
          description: 'Update registry to remove branch sessions',
          action: 'remove_branch_from_registry'
        }
      ],
      output_template: `
Branch context deleted: ${branch}
Path removed: ${paths.branch.root}
`
    };
  }
}

module.exports = BranchContextManager;
