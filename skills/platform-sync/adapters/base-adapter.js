/**
 * Base Platform Adapter
 *
 * Abstract base class for platform-specific adapters.
 * Provides common interface and utility methods.
 */

class BaseAdapter {
  constructor(platform) {
    this.platform = platform;
    this.config = null;
    this.initialized = false;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Initialize the adapter with configuration
   * @param {Object} config - Platform configuration
   */
  async initialize(config) {
    this.config = config;
    this.validateConfig();
    await this.authenticate();
    this.initialized = true;
  }

  /**
   * Validate configuration
   * Must be implemented by subclasses
   */
  validateConfig() {
    throw new Error('validateConfig must be implemented by subclass');
  }

  /**
   * Authenticate with the platform
   * Must be implemented by subclasses
   */
  async authenticate() {
    throw new Error('authenticate must be implemented by subclass');
  }

  /**
   * Test connection to the platform
   * @returns {boolean} Connection status
   */
  async testConnection() {
    throw new Error('testConnection must be implemented by subclass');
  }

  /**
   * Create a track/item in the external platform
   * @param {Object} track - CDD track data
   * @param {Object} mapping - Field mapping configuration
   * @returns {string} External item ID
   */
  async createTrack(track, mapping) {
    throw new Error('createTrack must be implemented by subclass');
  }

  /**
   * Update a track/item in the external platform
   * @param {string} externalId - External item ID
   * @param {Object} track - CDD track data
   * @param {Object} mapping - Field mapping configuration
   */
  async updateTrack(externalId, track, mapping) {
    throw new Error('updateTrack must be implemented by subclass');
  }

  /**
   * Delete a track/item from the external platform
   * @param {string} externalId - External item ID
   */
  async deleteTrack(externalId) {
    throw new Error('deleteTrack must be implemented by subclass');
  }

  /**
   * Create a task/subtask in the external platform
   * @param {string} parentId - Parent item ID
   * @param {Object} task - CDD task data
   * @param {Object} mapping - Field mapping configuration
   * @returns {string} External task ID
   */
  async createTask(parentId, task, mapping) {
    throw new Error('createTask must be implemented by subclass');
  }

  /**
   * Update a task/subtask in the external platform
   * @param {string} externalId - External task ID
   * @param {Object} task - CDD task data
   * @param {Object} mapping - Field mapping configuration
   */
  async updateTask(externalId, task, mapping) {
    throw new Error('updateTask must be implemented by subclass');
  }

  /**
   * List items from the external platform
   * @param {Object} mapping - Configuration including workspace/project IDs
   * @returns {Array} External items
   */
  async listItems(mapping) {
    throw new Error('listItems must be implemented by subclass');
  }

  /**
   * Get a single item from the external platform
   * @param {string} externalId - External item ID
   * @returns {Object} External item data
   */
  async getItem(externalId) {
    throw new Error('getItem must be implemented by subclass');
  }

  /**
   * Map CDD track to external format
   * @param {Object} track - CDD track data
   * @param {Object} mapping - Field mapping configuration
   * @returns {Object} External format data
   */
  mapTrackToExternal(track, mapping) {
    const external = {
      name: track.title,
      description: this.formatDescription(track),
      status: this.mapStatus(track.status, mapping.statusMapping),
      priority: this.mapPriority(track.priority, mapping.priorityMapping),
      tags: this.buildTags(track),
      metadata: {
        cdd_track_id: track.id,
        cdd_type: track.type,
        cdd_synced_at: new Date().toISOString()
      }
    };

    return external;
  }

  /**
   * Map external item to CDD format
   * @param {Object} external - External item data
   * @param {Object} mapping - Field mapping configuration
   * @returns {Object} CDD format data
   */
  mapExternalToTrack(external, mapping) {
    const reverseStatusMap = this.reverseMap(mapping.statusMapping);
    const reversePriorityMap = this.reverseMap(mapping.priorityMapping);

    return {
      title: external.name || external.title,
      description: external.description,
      status: reverseStatusMap[external.status] || 'pending',
      priority: reversePriorityMap[external.priority] || 'medium',
      externalId: external.id,
      externalUpdated: external.updated_at || external.updatedAt
    };
  }

  /**
   * Map CDD task to external format
   * @param {Object} task - CDD task data
   * @param {Object} mapping - Field mapping configuration
   * @returns {Object} External format data
   */
  mapTaskToExternal(task, mapping) {
    return {
      name: `${task.id}: ${task.title}`,
      status: this.mapStatus(task.status, mapping.statusMapping),
      tags: [`cdd:task:${task.id}`]
    };
  }

  /**
   * Format track description for external platform
   * @param {Object} track - CDD track data
   * @returns {string} Formatted description
   */
  formatDescription(track) {
    let description = '';

    if (track.spec) {
      // Extract overview from spec
      const overviewMatch = track.spec.match(/## Overview\n\n([\s\S]*?)(?=\n##|$)/);
      if (overviewMatch) {
        description = overviewMatch[1].trim();
      }
    }

    // Add CDD metadata footer
    description += `\n\n---\n_Synced from CDD Track: ${track.id}_`;

    return description;
  }

  /**
   * Map CDD status to external status
   * @param {string} status - CDD status
   * @param {Object} statusMapping - Status mapping
   * @returns {string} External status
   */
  mapStatus(status, statusMapping = {}) {
    return statusMapping[status] || status;
  }

  /**
   * Map CDD priority to external priority
   * @param {string} priority - CDD priority
   * @param {Object} priorityMapping - Priority mapping
   * @returns {*} External priority
   */
  mapPriority(priority, priorityMapping = {}) {
    return priorityMapping[priority] || priority;
  }

  /**
   * Build tags array for external platform
   * @param {Object} track - CDD track data
   * @returns {Array} Tags
   */
  buildTags(track) {
    const tags = [
      `cdd:${track.id}`,
      `type:${track.type}`
    ];

    if (track.tags) {
      tags.push(...track.tags);
    }

    if (track.agents?.primary) {
      track.agents.primary.forEach(agent => {
        tags.push(`agent:${agent}`);
      });
    }

    return tags;
  }

  /**
   * Reverse a mapping object
   * @param {Object} mapping - Original mapping
   * @returns {Object} Reversed mapping
   */
  reverseMap(mapping = {}) {
    const reversed = {};
    for (const [key, value] of Object.entries(mapping)) {
      reversed[value] = key;
    }
    return reversed;
  }

  /**
   * Make an HTTP request with rate limiting
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request body
   * @param {Object} headers - Request headers
   * @returns {Object} Response data
   */
  async request(method, url, data = null, headers = {}) {
    await this.rateLimiter.wait();

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      this.rateLimiter.setDelay(parseInt(retryAfter) * 1000);
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Get authentication headers
   * Must be implemented by subclasses
   * @returns {Object} Auth headers
   */
  getAuthHeaders() {
    throw new Error('getAuthHeaders must be implemented by subclass');
  }
}

/**
 * Simple rate limiter
 */
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.minDelay = 1000 / requestsPerSecond;
    this.lastRequest = 0;
    this.customDelay = 0;
  }

  async wait() {
    const now = Date.now();
    const delay = Math.max(this.minDelay, this.customDelay);
    const timeSinceLast = now - this.lastRequest;

    if (timeSinceLast < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLast));
    }

    this.lastRequest = Date.now();
    this.customDelay = 0;
  }

  setDelay(ms) {
    this.customDelay = ms;
  }
}

module.exports = { BaseAdapter, RateLimiter };
