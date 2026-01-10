/**
 * Todoist Platform Adapter
 *
 * Integrates CDD with Todoist for personal task management.
 * Simpler structure - good for individual developers.
 */

const { BaseAdapter } = require('./base-adapter');

class TodoistAdapter extends BaseAdapter {
  constructor() {
    super('todoist');
    this.baseUrl = 'https://api.todoist.com/rest/v2';
    this.syncUrl = 'https://api.todoist.com/sync/v9';
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.apiToken) {
        throw new Error('Todoist API token is required');
      }
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/projects`);
    } catch (error) {
      throw new Error(`Todoist authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('GET', `${this.baseUrl}/projects`);
      return Array.isArray(result);
    } catch (error) {
      console.error('Todoist connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiToken}`
    };
  }

  async createTrack(track, mapping) {
    const projectId = mapping.projectId || this.config.projectId;

    const taskData = this.mapTrackToTodoist(track, mapping);
    if (projectId) {
      taskData.project_id = projectId;
    }

    const result = await this.request('POST', `${this.baseUrl}/tasks`, taskData);
    return result.id;
  }

  async updateTrack(externalId, track, mapping) {
    const taskData = this.mapTrackToTodoist(track, mapping);
    await this.request('POST', `${this.baseUrl}/tasks/${externalId}`, taskData);

    // Handle completion
    if (track.status === 'completed') {
      await this.request('POST', `${this.baseUrl}/tasks/${externalId}/close`);
    } else {
      await this.request('POST', `${this.baseUrl}/tasks/${externalId}/reopen`);
    }
  }

  async deleteTrack(externalId) {
    await this.request('DELETE', `${this.baseUrl}/tasks/${externalId}`);
  }

  async createTask(parentId, task, mapping) {
    const taskData = this.mapTaskToTodoist(task, mapping);
    taskData.parent_id = parentId;

    const result = await this.request('POST', `${this.baseUrl}/tasks`, taskData);
    return result.id;
  }

  async updateTask(externalId, task, mapping) {
    const taskData = this.mapTaskToTodoist(task, mapping);
    await this.request('POST', `${this.baseUrl}/tasks/${externalId}`, taskData);

    if (task.status === 'completed') {
      await this.request('POST', `${this.baseUrl}/tasks/${externalId}/close`);
    } else {
      await this.request('POST', `${this.baseUrl}/tasks/${externalId}/reopen`);
    }
  }

  async listItems(mapping) {
    const projectId = mapping.projectId || this.config.projectId;

    let url = `${this.baseUrl}/tasks`;
    if (projectId) {
      url += `?project_id=${projectId}`;
    }

    const result = await this.request('GET', url);
    return result.map(task => this.mapTodoistToExternal(task));
  }

  async getItem(externalId) {
    const result = await this.request('GET', `${this.baseUrl}/tasks/${externalId}`);
    return this.mapTodoistToExternal(result);
  }

  mapTrackToTodoist(track, mapping) {
    const priorityMapping = mapping.priorityMapping || {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    const data = {
      content: track.title,
      description: this.formatDescriptionShort(track),
      priority: priorityMapping[track.priority] || 2,
      labels: this.buildLabels(track, mapping)
    };

    // Add section if status mapping exists
    if (mapping.sectionMapping && mapping.sectionMapping[track.status]) {
      data.section_id = mapping.sectionMapping[track.status];
    }

    return data;
  }

  mapTaskToTodoist(task, mapping) {
    return {
      content: `${task.id}: ${task.title}`,
      labels: ['cdd-task']
    };
  }

  mapTodoistToExternal(todoistTask) {
    return {
      id: todoistTask.id,
      name: todoistTask.content,
      description: todoistTask.description,
      status: todoistTask.is_completed ? 'completed' : 'pending',
      priority: todoistTask.priority,
      tags: todoistTask.labels || [],
      created_at: todoistTask.created_at,
      url: todoistTask.url
    };
  }

  formatDescriptionShort(track) {
    let description = '';

    if (track.spec) {
      const overviewMatch = track.spec.match(/## Overview\n\n([\s\S]*?)(?=\n##|$)/);
      if (overviewMatch) {
        description = overviewMatch[1].trim().substring(0, 500);
      }
    }

    return `CDD: ${track.id} | Type: ${track.type}\n\n${description}`;
  }

  buildLabels(track, mapping) {
    const labels = ['cdd', `cdd-${track.id}`];

    if (mapping.labelMapping?.types?.[track.type]) {
      labels.push(mapping.labelMapping.types[track.type]);
    } else {
      labels.push(`type-${track.type}`);
    }

    if (track.status === 'stashed') {
      labels.push('stashed');
    }

    if (track.status === 'blocked') {
      labels.push('blocked');
    }

    return labels;
  }

  /**
   * Get all projects
   */
  async getProjects() {
    return this.request('GET', `${this.baseUrl}/projects`);
  }

  /**
   * Get sections in a project
   */
  async getSections(projectId) {
    return this.request('GET', `${this.baseUrl}/sections?project_id=${projectId}`);
  }

  /**
   * Get all labels
   */
  async getLabels() {
    return this.request('GET', `${this.baseUrl}/labels`);
  }

  /**
   * Create a label
   */
  async createLabel(name, color = null) {
    const data = { name };
    if (color) data.color = color;
    return this.request('POST', `${this.baseUrl}/labels`, data);
  }

  /**
   * Create a project
   */
  async createProject(name, parentId = null) {
    const data = { name };
    if (parentId) data.parent_id = parentId;
    return this.request('POST', `${this.baseUrl}/projects`, data);
  }
}

module.exports = TodoistAdapter;
