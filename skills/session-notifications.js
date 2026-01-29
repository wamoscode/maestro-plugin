/**
 * Session Notifications Skill
 *
 * Cross-session notification system for multi-branch parallel sessions.
 * Enables sessions to notify each other when user input is required,
 * errors occur, or important events happen.
 *
 * Key Features:
 * - Notification creation and storage
 * - File-based notification polling
 * - Optional OS notification integration (macOS/Linux)
 * - Notification expiry and cleanup
 * - Priority levels (high, normal, low)
 */

const crypto = require('crypto');
const path = require('path');
const os = require('os');

class SessionNotifications {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      pollInterval: config.pollInterval || 10000, // 10 seconds
      defaultExpiry: config.defaultExpiry || 3600000, // 1 hour
      enableOSNotifications: config.enableOSNotifications || false,
      maxPendingNotifications: config.maxPendingNotifications || 50,
      ...config
    };

    this.pollTimer = null;
    this.lastPollTime = null;
  }

  /**
   * Get notifications directory paths
   * @returns {Object} Directory paths
   */
  getPaths() {
    return {
      pending: path.join(this.config.maestroDir, 'notifications', 'pending'),
      archive: path.join(this.config.maestroDir, 'notifications', 'archive'),
      config: path.join(this.config.maestroDir, 'notifications', 'config.json')
    };
  }

  /**
   * Generate a unique notification ID
   * @returns {string} Notification identifier
   */
  generateNotificationId() {
    return `notif-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Get notification filename
   * @param {string} sessionId - Source session ID
   * @returns {string} Notification filename
   */
  getNotificationFilename(sessionId) {
    const timestamp = Date.now();
    const shortSession = sessionId.slice(-8);
    return `${timestamp}-${shortSession}.json`;
  }

  /**
   * Create a notification
   * @param {Object} options - Notification options
   * @returns {Object} Notification creation action
   */
  createNotification(options) {
    const {
      sessionId,
      branch,
      type = 'info',
      priority = 'normal',
      title,
      message,
      action = null,
      expiresIn = this.config.defaultExpiry
    } = options;

    const notificationId = this.generateNotificationId();
    const filename = this.getNotificationFilename(sessionId);
    const filePath = path.join(this.getPaths().pending, filename);

    const notification = {
      id: notificationId,
      sessionId: sessionId,
      branch: branch,
      type: type, // input_required, error, warning, info, progress
      priority: priority, // high, normal, low
      title: title,
      message: message,
      action: action, // { command: string, description: string }
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn).toISOString(),
      read: false,
      readBy: []
    };

    return {
      action: 'create_notification',
      notification: notification,
      filePath: filePath,
      steps: [
        {
          step: 1,
          description: 'Ensure notifications directory exists',
          command: `mkdir -p "${this.getPaths().pending}"`
        },
        {
          step: 2,
          description: 'Write notification file',
          command: `echo '${JSON.stringify(notification, null, 2)}' > "${filePath}"`
        },
        {
          step: 3,
          description: 'Trigger OS notification if enabled and high priority',
          condition: this.config.enableOSNotifications && priority === 'high',
          action: this.sendOSNotification(title, message)
        }
      ],
      success_response: {
        created: true,
        notificationId: notificationId,
        message: `Notification created for branch '${branch}'`
      }
    };
  }

  /**
   * Create common notification types
   */
  notificationTypes = {
    /**
     * Input required notification
     * @param {string} sessionId - Source session
     * @param {string} branch - Branch name
     * @param {string} trackId - Track requiring input
     * @param {string} reason - Why input is needed
     * @returns {Object} Notification action
     */
    inputRequired: (sessionId, branch, trackId, reason) => {
      return this.createNotification({
        sessionId,
        branch,
        type: 'input_required',
        priority: 'high',
        title: 'User Input Required',
        message: `Track ${trackId} needs approval: ${reason}`,
        action: {
          command: `/maestro:session switch ${branch}`,
          description: 'Switch to this session'
        }
      });
    },

    /**
     * Error notification
     * @param {string} sessionId - Source session
     * @param {string} branch - Branch name
     * @param {string} error - Error message
     * @returns {Object} Notification action
     */
    error: (sessionId, branch, error) => {
      return this.createNotification({
        sessionId,
        branch,
        type: 'error',
        priority: 'high',
        title: 'Session Error',
        message: error,
        action: {
          command: `/maestro:session info ${sessionId}`,
          description: 'View session details'
        }
      });
    },

    /**
     * Track completion notification
     * @param {string} sessionId - Source session
     * @param {string} branch - Branch name
     * @param {string} trackId - Completed track
     * @returns {Object} Notification action
     */
    trackCompleted: (sessionId, branch, trackId) => {
      return this.createNotification({
        sessionId,
        branch,
        type: 'info',
        priority: 'normal',
        title: 'Track Completed',
        message: `Track ${trackId} has been completed on branch '${branch}'`
      });
    },

    /**
     * Session started notification
     * @param {string} sessionId - Source session
     * @param {string} branch - Branch name
     * @returns {Object} Notification action
     */
    sessionStarted: (sessionId, branch) => {
      return this.createNotification({
        sessionId,
        branch,
        type: 'info',
        priority: 'low',
        title: 'New Session Started',
        message: `A new session started on branch '${branch}'`
      });
    },

    /**
     * Blocked notification
     * @param {string} sessionId - Source session
     * @param {string} branch - Branch name
     * @param {string} reason - Blocking reason
     * @returns {Object} Notification action
     */
    blocked: (sessionId, branch, reason) => {
      return this.createNotification({
        sessionId,
        branch,
        type: 'warning',
        priority: 'high',
        title: 'Session Blocked',
        message: reason,
        action: {
          command: `/maestro:session switch ${branch}`,
          description: 'Switch to resolve blocker'
        }
      });
    }
  };

  /**
   * Send OS notification (platform-specific)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {Object} OS notification action
   */
  sendOSNotification(title, message) {
    const platform = os.platform();

    const commands = {
      darwin: `osascript -e 'display notification "${message}" with title "Maestro CDD" subtitle "${title}"'`,
      linux: `notify-send "Maestro CDD: ${title}" "${message}" -u normal`,
      win32: `powershell -Command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', 'Maestro CDD: ${title}')}"`
    };

    return {
      action: 'send_os_notification',
      platform: platform,
      command: commands[platform] || null,
      fallback: platform === 'darwin' || platform === 'linux' ? null : 'echo "OS notifications not supported"'
    };
  }

  /**
   * Poll for pending notifications
   * @param {string} currentSessionId - Current session to exclude
   * @param {string} currentBranch - Current branch (optional, to show own branch notifications)
   * @returns {Object} Poll action
   */
  pollNotifications(currentSessionId, currentBranch = null) {
    const pendingDir = this.getPaths().pending;

    return {
      action: 'poll_notifications',
      pendingDir: pendingDir,
      currentSessionId: currentSessionId,
      currentBranch: currentBranch,
      steps: [
        {
          step: 1,
          description: 'List pending notification files',
          command: `ls -1 "${pendingDir}" 2>/dev/null | head -${this.config.maxPendingNotifications}`
        },
        {
          step: 2,
          description: 'Read each notification file',
          for_each: 'notification_file',
          parse: 'json'
        },
        {
          step: 3,
          description: 'Filter out own session notifications and expired ones',
          filter: [
            { field: 'sessionId', not_equals: currentSessionId },
            { field: 'expiresAt', greater_than: 'now' }
          ]
        },
        {
          step: 4,
          description: 'Sort by priority then timestamp',
          sort: [
            { field: 'priority', order: ['high', 'normal', 'low'] },
            { field: 'createdAt', order: 'desc' }
          ]
        }
      ],
      output_template: this.getNotificationBannerTemplate()
    };
  }

  /**
   * Get notification banner template
   * @returns {string} Banner template
   */
  getNotificationBannerTemplate() {
    return `
{{#if notifications.length}}
┌─────────────────────────────────────────────────────────────┐
{{#each notifications}}
{{#if (eq priority "high")}}
│ {{icon type}} Session on '{{branch}}' requires attention     │
│    "{{truncate message 50}}"                                 │
│    Run: {{action.command}}                                   │
{{else}}
│ {{icon type}} {{title}} on '{{branch}}'                      │
│    {{truncate message 50}}                                   │
{{/if}}
{{#unless @last}}
├─────────────────────────────────────────────────────────────┤
{{/unless}}
{{/each}}
└─────────────────────────────────────────────────────────────┘
{{/if}}
`;
  }

  /**
   * Get notification icon by type
   * @param {string} type - Notification type
   * @returns {string} Icon character
   */
  getNotificationIcon(type) {
    const icons = {
      input_required: '\u{1F514}', // Bell
      error: '\u{274C}',           // X
      warning: '\u{26A0}',         // Warning
      info: '\u{2139}',            // Info
      progress: '\u{23F3}'         // Hourglass
    };
    return icons[type] || '\u{1F4AC}'; // Speech bubble default
  }

  /**
   * List all pending notifications
   * @param {Object} options - List options
   * @returns {Object} List action
   */
  listNotifications(options = {}) {
    const { includeExpired = false, includeRead = false, branch = null } = options;
    const pendingDir = this.getPaths().pending;

    return {
      action: 'list_notifications',
      pendingDir: pendingDir,
      options: { includeExpired, includeRead, branch },
      steps: [
        {
          step: 1,
          description: 'Find all notification files',
          command: `find "${pendingDir}" -name "*.json" -type f 2>/dev/null`
        },
        {
          step: 2,
          description: 'Read and parse each file',
          for_each: 'file',
          parse: 'json'
        },
        {
          step: 3,
          description: 'Apply filters',
          filters: {
            expired: includeExpired ? null : { field: 'expiresAt', greater_than: 'now' },
            read: includeRead ? null : { field: 'read', equals: false },
            branch: branch ? { field: 'branch', equals: branch } : null
          }
        }
      ],
      output_template: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PENDING NOTIFICATIONS ({{count}})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{#each notifications}}
{{icon type}} [{{priority}}] {{title}}
   Branch: {{branch}}
   Message: {{message}}
   Created: {{createdAt}}
   Expires: {{expiresAt}}
   {{#if action}}
   Action: {{action.command}}
   {{/if}}
{{#unless @last}}
──────────────────────────────────────────────────────────────
{{/unless}}
{{/each}}

{{#unless notifications.length}}
No pending notifications.
{{/unless}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification to mark
   * @param {string} readBySessionId - Session that read it
   * @returns {Object} Mark read action
   */
  markAsRead(notificationId, readBySessionId) {
    const pendingDir = this.getPaths().pending;

    return {
      action: 'mark_notification_read',
      notificationId: notificationId,
      readBy: readBySessionId,
      steps: [
        {
          step: 1,
          description: 'Find notification file by ID',
          command: `grep -l '"id": "${notificationId}"' "${pendingDir}"/*.json 2>/dev/null | head -1`
        },
        {
          step: 2,
          description: 'Update read status',
          jq_command: `.read = true | .readBy += ["${readBySessionId}"]`
        },
        {
          step: 3,
          description: 'Write updated notification',
          action: 'update_file'
        }
      ]
    };
  }

  /**
   * Clear notifications
   * @param {Object} options - Clear options
   * @returns {Object} Clear action
   */
  clearNotifications(options = {}) {
    const { branch = null, sessionId = null, all = false, archive = true } = options;
    const paths = this.getPaths();

    return {
      action: 'clear_notifications',
      options: { branch, sessionId, all, archive },
      steps: [
        {
          step: 1,
          description: 'Find matching notification files',
          command: all
            ? `find "${paths.pending}" -name "*.json" -type f`
            : branch
              ? `grep -l '"branch": "${branch}"' "${paths.pending}"/*.json 2>/dev/null`
              : sessionId
                ? `find "${paths.pending}" -name "*-${sessionId.slice(-8)}.json"`
                : 'echo ""'
        },
        {
          step: 2,
          description: archive ? 'Move to archive' : 'Delete files',
          command_template: archive
            ? `mkdir -p "${paths.archive}" && mv "{{file}}" "${paths.archive}/"`
            : `rm -f "{{file}}"`
        }
      ],
      success_response: {
        cleared: true,
        count: '{{count}}',
        archived: archive
      }
    };
  }

  /**
   * Cleanup expired notifications
   * @returns {Object} Cleanup action
   */
  cleanupExpired() {
    const paths = this.getPaths();

    return {
      action: 'cleanup_expired_notifications',
      steps: [
        {
          step: 1,
          description: 'Find all notification files',
          command: `find "${paths.pending}" -name "*.json" -type f`
        },
        {
          step: 2,
          description: 'Check expiry for each',
          for_each: 'file',
          check: 'expiresAt < now'
        },
        {
          step: 3,
          description: 'Archive expired notifications',
          command_template: `mkdir -p "${paths.archive}" && mv "{{file}}" "${paths.archive}/"`
        }
      ],
      output_template: `
Cleanup completed:
- Checked: {{total}} notifications
- Archived: {{archived}} expired notifications
- Remaining: {{remaining}} active notifications
`
    };
  }

  /**
   * Send notification to specific branch
   * @param {string} targetBranch - Branch to notify
   * @param {string} fromSessionId - Source session
   * @param {string} message - Message to send
   * @returns {Object} Send notification action
   */
  sendToBranch(targetBranch, fromSessionId, message) {
    return this.createNotification({
      sessionId: fromSessionId,
      branch: targetBranch,
      type: 'info',
      priority: 'normal',
      title: 'Message from Another Session',
      message: message
    });
  }

  /**
   * Start notification polling
   * @param {string} sessionId - Current session ID
   * @param {Function} callback - Callback for new notifications
   * @returns {Object} Poll start action
   */
  startPolling(sessionId, callback) {
    return {
      action: 'start_polling',
      sessionId: sessionId,
      interval: this.config.pollInterval,
      description: `Poll for notifications every ${this.config.pollInterval / 1000} seconds`,
      onPoll: this.pollNotifications(sessionId)
    };
  }

  /**
   * Stop notification polling
   * @returns {Object} Poll stop action
   */
  stopPolling() {
    return {
      action: 'stop_polling',
      description: 'Stop notification polling'
    };
  }

  /**
   * Get notification configuration
   * @returns {Object} Config action
   */
  getConfig() {
    const configPath = this.getPaths().config;

    return {
      action: 'get_notification_config',
      configPath: configPath,
      defaultConfig: {
        enableOSNotifications: this.config.enableOSNotifications,
        pollInterval: this.config.pollInterval,
        defaultExpiry: this.config.defaultExpiry,
        soundEnabled: false,
        priorityFilter: ['high', 'normal', 'low']
      },
      command: `cat "${configPath}" 2>/dev/null || echo '{}'`
    };
  }

  /**
   * Update notification configuration
   * @param {Object} updates - Configuration updates
   * @returns {Object} Config update action
   */
  updateConfig(updates) {
    const configPath = this.getPaths().config;

    return {
      action: 'update_notification_config',
      configPath: configPath,
      updates: updates,
      steps: [
        {
          step: 1,
          description: 'Ensure notifications directory exists',
          command: `mkdir -p "$(dirname "${configPath}")"`
        },
        {
          step: 2,
          description: 'Read existing config or create default',
          command: `cat "${configPath}" 2>/dev/null || echo '{}'`
        },
        {
          step: 3,
          description: 'Merge updates',
          action: 'deep_merge'
        },
        {
          step: 4,
          description: 'Write updated config',
          command_template: `echo '{{config_json}}' > "${configPath}"`
        }
      ]
    };
  }
}

module.exports = SessionNotifications;
