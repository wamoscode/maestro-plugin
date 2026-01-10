/**
 * Platform Adapters Index
 *
 * Exports all available platform adapters for CDD sync.
 */

const { BaseAdapter } = require('./base-adapter');
const ClickUpAdapter = require('./clickup-adapter');
const LinearAdapter = require('./linear-adapter');
const AsanaAdapter = require('./asana-adapter');
const JiraAdapter = require('./jira-adapter');
const TodoistAdapter = require('./todoist-adapter');
const YouTrackAdapter = require('./youtrack-adapter');

// Adapter registry
const adapters = {
  clickup: ClickUpAdapter,
  linear: LinearAdapter,
  asana: AsanaAdapter,
  jira: JiraAdapter,
  todoist: TodoistAdapter,
  youtrack: YouTrackAdapter
};

/**
 * Get adapter instance for a platform
 * @param {string} platform - Platform name
 * @returns {BaseAdapter} Adapter instance
 */
function getAdapter(platform) {
  const AdapterClass = adapters[platform.toLowerCase()];

  if (!AdapterClass) {
    throw new Error(`Unknown platform: ${platform}. Available: ${Object.keys(adapters).join(', ')}`);
  }

  return new AdapterClass();
}

/**
 * Get list of available platforms
 * @returns {string[]} Platform names
 */
function getAvailablePlatforms() {
  return Object.keys(adapters);
}

/**
 * Check if platform is supported
 * @param {string} platform - Platform name
 * @returns {boolean}
 */
function isPlatformSupported(platform) {
  return platform.toLowerCase() in adapters;
}

module.exports = {
  BaseAdapter,
  ClickUpAdapter,
  LinearAdapter,
  AsanaAdapter,
  JiraAdapter,
  TodoistAdapter,
  YouTrackAdapter,
  getAdapter,
  getAvailablePlatforms,
  isPlatformSupported,
  adapters
};
