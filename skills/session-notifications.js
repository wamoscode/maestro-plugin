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
const fs = require('fs');
const { execSync } = require('child_process');

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
   * @returns {Object} Notification creation result
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
    const pendingDir = this.getPaths().pending;
    const filePath = path.join(pendingDir, filename);

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

    try {
      // Ensure notifications directory exists
      if (!fs.existsSync(pendingDir)) {
        fs.mkdirSync(pendingDir, { recursive: true });
      }

      // Write notification file
      fs.writeFileSync(filePath, JSON.stringify(notification, null, 2), 'utf8');

      // Trigger OS notification if enabled and high priority
      if (this.config.enableOSNotifications && priority === 'high') {
        this.sendOSNotification(title, message);
      }

      return {
        created: true,
        notificationId: notificationId,
        filePath: filePath,
        notification: notification,
        message: `Notification created for branch '${branch}'`
      };
    } catch (error) {
      return {
        created: false,
        error: error.message,
        message: `Failed to create notification: ${error.message}`
      };
    }
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
   * @returns {Object} OS notification result
   */
  sendOSNotification(title, message) {
    const platform = os.platform();

    // Escape special characters for shell
    const safeTitle = title.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const safeMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");

    const commands = {
      darwin: `osascript -e 'display notification "${safeMessage}" with title "Maestro CDD" subtitle "${safeTitle}"'`,
      linux: `notify-send "Maestro CDD: ${safeTitle}" "${safeMessage}" -u normal`,
      win32: `powershell -Command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${safeMessage}', 'Maestro CDD: ${safeTitle}')}"`
    };

    const command = commands[platform];

    if (!command) {
      return {
        sent: false,
        platform: platform,
        message: 'OS notifications not supported on this platform'
      };
    }

    try {
      execSync(command, { encoding: 'utf8', stdio: 'ignore' });
      return {
        sent: true,
        platform: platform,
        message: 'OS notification sent'
      };
    } catch (error) {
      return {
        sent: false,
        platform: platform,
        error: error.message,
        message: `Failed to send OS notification: ${error.message}`
      };
    }
  }

  /**
   * Poll for pending notifications
   * @param {string} currentSessionId - Current session to exclude
   * @param {string} currentBranch - Current branch (optional, to show own branch notifications)
   * @returns {Object} Poll result
   */
  pollNotifications(currentSessionId, currentBranch = null) {
    const pendingDir = this.getPaths().pending;
    this.lastPollTime = new Date().toISOString();

    try {
      if (!fs.existsSync(pendingDir)) {
        return {
          notifications: [],
          count: 0,
          message: 'No notifications'
        };
      }

      // List notification files
      const files = fs.readdirSync(pendingDir)
        .filter(f => f.endsWith('.json'))
        .slice(0, this.config.maxPendingNotifications);

      const now = Date.now();
      const notifications = [];

      for (const file of files) {
        try {
          const filePath = path.join(pendingDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const notification = JSON.parse(content);

          // Filter: exclude own session and expired
          if (notification.sessionId === currentSessionId) {
            continue;
          }

          if (new Date(notification.expiresAt).getTime() < now) {
            continue;
          }

          notifications.push({
            ...notification,
            filePath: filePath
          });
        } catch (e) {
          // Skip invalid files
        }
      }

      // Sort by priority then timestamp
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      notifications.sort((a, b) => {
        const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        notifications: notifications,
        count: notifications.length,
        lastPoll: this.lastPollTime,
        message: notifications.length > 0
          ? `Found ${notifications.length} notification(s)`
          : 'No new notifications'
      };
    } catch (error) {
      return {
        notifications: [],
        count: 0,
        error: error.message,
        message: `Failed to poll notifications: ${error.message}`
      };
    }
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
   * @returns {Object} List result
   */
  listNotifications(options = {}) {
    const { includeExpired = false, includeRead = false, branch = null } = options;
    const pendingDir = this.getPaths().pending;

    try {
      if (!fs.existsSync(pendingDir)) {
        return {
          notifications: [],
          count: 0,
          message: 'No pending notifications'
        };
      }

      const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));
      const now = Date.now();
      const notifications = [];

      for (const file of files) {
        try {
          const filePath = path.join(pendingDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const notification = JSON.parse(content);

          // Apply filters
          if (!includeExpired && new Date(notification.expiresAt).getTime() < now) {
            continue;
          }

          if (!includeRead && notification.read) {
            continue;
          }

          if (branch && notification.branch !== branch) {
            continue;
          }

          notifications.push({
            ...notification,
            filePath: filePath,
            icon: this.getNotificationIcon(notification.type)
          });
        } catch (e) {
          // Skip invalid files
        }
      }

      return {
        notifications: notifications,
        count: notifications.length,
        filters: { includeExpired, includeRead, branch },
        message: notifications.length > 0
          ? `Found ${notifications.length} notification(s)`
          : 'No pending notifications'
      };
    } catch (error) {
      return {
        notifications: [],
        count: 0,
        error: error.message,
        message: `Failed to list notifications: ${error.message}`
      };
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification to mark
   * @param {string} readBySessionId - Session that read it
   * @returns {Object} Mark read result
   */
  markAsRead(notificationId, readBySessionId) {
    const pendingDir = this.getPaths().pending;

    try {
      if (!fs.existsSync(pendingDir)) {
        return {
          marked: false,
          message: `Notification ${notificationId} not found`
        };
      }

      // Find notification file by ID
      const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(pendingDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const notification = JSON.parse(content);

          if (notification.id === notificationId) {
            // Update read status
            notification.read = true;
            if (!notification.readBy) {
              notification.readBy = [];
            }
            if (!notification.readBy.includes(readBySessionId)) {
              notification.readBy.push(readBySessionId);
            }

            // Write updated notification
            fs.writeFileSync(filePath, JSON.stringify(notification, null, 2), 'utf8');

            return {
              marked: true,
              notificationId: notificationId,
              readBy: readBySessionId,
              message: `Notification ${notificationId} marked as read`
            };
          }
        } catch (e) {
          // Skip invalid files
        }
      }

      return {
        marked: false,
        notificationId: notificationId,
        message: `Notification ${notificationId} not found`
      };
    } catch (error) {
      return {
        marked: false,
        error: error.message,
        message: `Failed to mark notification as read: ${error.message}`
      };
    }
  }

  /**
   * Clear notifications
   * @param {Object} options - Clear options
   * @returns {Object} Clear result
   */
  clearNotifications(options = {}) {
    const { branch = null, sessionId = null, all = false, archive = true } = options;
    const paths = this.getPaths();
    let clearedCount = 0;

    try {
      if (!fs.existsSync(paths.pending)) {
        return {
          cleared: true,
          count: 0,
          archived: archive,
          message: 'No notifications to clear'
        };
      }

      // Ensure archive directory exists if archiving
      if (archive && !fs.existsSync(paths.archive)) {
        fs.mkdirSync(paths.archive, { recursive: true });
      }

      const files = fs.readdirSync(paths.pending).filter(f => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(paths.pending, file);

        try {
          // Check if file matches criteria
          let shouldClear = all;

          if (!all) {
            const content = fs.readFileSync(filePath, 'utf8');
            const notification = JSON.parse(content);

            if (branch && notification.branch === branch) {
              shouldClear = true;
            }
            if (sessionId && notification.sessionId === sessionId) {
              shouldClear = true;
            }
          }

          if (shouldClear) {
            if (archive) {
              // Move to archive
              const archivePath = path.join(paths.archive, file);
              fs.renameSync(filePath, archivePath);
            } else {
              // Delete file
              fs.unlinkSync(filePath);
            }
            clearedCount++;
          }
        } catch (e) {
          // Skip problem files
        }
      }

      return {
        cleared: true,
        count: clearedCount,
        archived: archive,
        message: `Cleared ${clearedCount} notification(s)`
      };
    } catch (error) {
      return {
        cleared: false,
        count: clearedCount,
        error: error.message,
        message: `Failed to clear notifications: ${error.message}`
      };
    }
  }

  /**
   * Cleanup expired notifications
   * @returns {Object} Cleanup result
   */
  cleanupExpired() {
    const paths = this.getPaths();
    const results = {
      total: 0,
      archived: 0,
      remaining: 0
    };

    try {
      if (!fs.existsSync(paths.pending)) {
        return {
          ...results,
          message: 'No notifications to cleanup'
        };
      }

      // Ensure archive directory exists
      if (!fs.existsSync(paths.archive)) {
        fs.mkdirSync(paths.archive, { recursive: true });
      }

      const files = fs.readdirSync(paths.pending).filter(f => f.endsWith('.json'));
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(paths.pending, file);
        results.total++;

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const notification = JSON.parse(content);

          if (new Date(notification.expiresAt).getTime() < now) {
            // Archive expired notification
            const archivePath = path.join(paths.archive, file);
            fs.renameSync(filePath, archivePath);
            results.archived++;
          } else {
            results.remaining++;
          }
        } catch (e) {
          // Invalid file, archive it anyway
          const archivePath = path.join(paths.archive, file);
          fs.renameSync(filePath, archivePath);
          results.archived++;
        }
      }

      return {
        ...results,
        message: `Cleanup completed: Checked ${results.total}, archived ${results.archived}, ${results.remaining} active`
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
   * @returns {Object} Poll start result
   */
  startPolling(sessionId, callback = null) {
    // Stop any existing timer
    this.stopPolling();

    // Start new poll timer
    this.pollTimer = setInterval(() => {
      const result = this.pollNotifications(sessionId);
      if (callback && result.notifications && result.notifications.length > 0) {
        callback(result.notifications);
      }
    }, this.config.pollInterval);

    return {
      started: true,
      sessionId: sessionId,
      interval: this.config.pollInterval,
      message: `Polling started (every ${this.config.pollInterval / 1000} seconds)`
    };
  }

  /**
   * Stop notification polling
   * @returns {Object} Poll stop result
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;

      return {
        stopped: true,
        message: 'Notification polling stopped'
      };
    }

    return {
      stopped: false,
      message: 'No polling timer was running'
    };
  }

  /**
   * Get notification configuration
   * @returns {Object} Config result
   */
  getConfig() {
    const configPath = this.getPaths().config;

    const defaultConfig = {
      enableOSNotifications: this.config.enableOSNotifications,
      pollInterval: this.config.pollInterval,
      defaultExpiry: this.config.defaultExpiry,
      soundEnabled: false,
      priorityFilter: ['high', 'normal', 'low']
    };

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const savedConfig = JSON.parse(content);
        return {
          config: { ...defaultConfig, ...savedConfig },
          configPath: configPath,
          message: 'Configuration loaded'
        };
      }

      return {
        config: defaultConfig,
        configPath: configPath,
        isDefault: true,
        message: 'Using default configuration'
      };
    } catch (error) {
      return {
        config: defaultConfig,
        configPath: configPath,
        error: error.message,
        message: `Using default configuration (error: ${error.message})`
      };
    }
  }

  /**
   * Update notification configuration
   * @param {Object} updates - Configuration updates
   * @returns {Object} Config update result
   */
  updateConfig(updates) {
    const configPath = this.getPaths().config;

    try {
      // Ensure notifications directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Read existing config or create default
      let existingConfig = {};
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(content);
      }

      // Merge updates
      const newConfig = { ...existingConfig, ...updates };

      // Write updated config
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');

      // Apply to current instance
      Object.assign(this.config, updates);

      return {
        updated: true,
        config: newConfig,
        configPath: configPath,
        message: 'Configuration updated'
      };
    } catch (error) {
      return {
        updated: false,
        error: error.message,
        message: `Failed to update configuration: ${error.message}`
      };
    }
  }
}

module.exports = SessionNotifications;
