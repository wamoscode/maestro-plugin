/**
 * Asana Platform Adapter
 *
 * Integrates CDD with Asana for project management.
 */

const { BaseAdapter } = require('./base-adapter');

class AsanaAdapter extends BaseAdapter {
  constructor() {
    super('asana');
    this.baseUrl = 'https://app.asana.com/api/1.0';
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.accessToken) {
        throw new Error('Asana access token is required');
      }
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/users/me`);
    } catch (error) {
      throw new Error(`Asana authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('GET', `${this.baseUrl}/users/me`);
      return !!result.data;
    } catch (error) {
      console.error('Asana connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`
    };
  }

  async createTrack(track, mapping) {
    const projectId = mapping.projectId || this.config.projectId;
    if (!projectId) {
      throw new Error('Asana project ID is required');
    }

    const taskData = this.mapTrackToAsana(track, mapping);
    taskData.projects = [projectId];

    const result = await this.request('POST', `${this.baseUrl}/tasks`, { data: taskData });
    return result.data.gid;
  }

  async updateTrack(externalId, track, mapping) {
    const taskData = this.mapTrackToAsana(track, mapping);
    await this.request('PUT', `${this.baseUrl}/tasks/${externalId}`, { data: taskData });
  }

  async deleteTrack(externalId) {
    await this.request('DELETE', `${this.baseUrl}/tasks/${externalId}`);
  }

  async createTask(parentId, task, mapping) {
    const taskData = this.mapTaskToAsana(task, mapping);
    taskData.parent = parentId;

    const result = await this.request('POST', `${this.baseUrl}/tasks`, { data: taskData });
    return result.data.gid;
  }

  async updateTask(externalId, task, mapping) {
    const taskData = this.mapTaskToAsana(task, mapping);
    await this.request('PUT', `${this.baseUrl}/tasks/${externalId}`, { data: taskData });
  }

  async listItems(mapping) {
    const projectId = mapping.projectId || this.config.projectId;

    const result = await this.request(
      'GET',
      `${this.baseUrl}/projects/${projectId}/tasks?opt_fields=name,notes,completed,due_on,tags,created_at,modified_at,permalink_url,custom_fields`
    );

    return result.data.map(task => this.mapAsanaToExternal(task));
  }

  async getItem(externalId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/tasks/${externalId}?opt_fields=name,notes,completed,due_on,tags,created_at,modified_at,permalink_url,subtasks,custom_fields`
    );
    return this.mapAsanaToExternal(result.data);
  }

  mapTrackToAsana(track, mapping) {
    const data = {
      name: track.title,
      notes: this.formatDescription(track),
      completed: track.status === 'completed'
    };

    // Add to section based on status
    if (mapping.sectionMapping && mapping.sectionMapping[track.status]) {
      data.memberships = [{
        project: mapping.projectId || this.config.projectId,
        section: mapping.sectionMapping[track.status]
      }];
    }

    // Add tags
    if (mapping.tagMapping) {
      const tagIds = [];

      if (mapping.tagMapping.types?.[track.type]) {
        tagIds.push(mapping.tagMapping.types[track.type]);
      }

      if (mapping.tagMapping.priorities?.[track.priority]) {
        tagIds.push(mapping.tagMapping.priorities[track.priority]);
      }

      if (mapping.tagMapping.cdd) {
        tagIds.push(mapping.tagMapping.cdd);
      }

      if (tagIds.length > 0) {
        data.tags = tagIds;
      }
    }

    // Add custom fields if configured
    if (mapping.customFields) {
      data.custom_fields = {};

      if (mapping.customFields.trackId) {
        data.custom_fields[mapping.customFields.trackId] = track.id;
      }

      if (mapping.customFields.trackType) {
        data.custom_fields[mapping.customFields.trackType] = track.type;
      }

      if (mapping.customFields.progress && track.tasks?.total) {
        const progress = Math.round((track.tasks.completed / track.tasks.total) * 100);
        data.custom_fields[mapping.customFields.progress] = progress;
      }
    }

    return data;
  }

  mapTaskToAsana(task, mapping) {
    return {
      name: `${task.id}: ${task.title}`,
      completed: task.status === 'completed'
    };
  }

  mapAsanaToExternal(asanaTask) {
    return {
      id: asanaTask.gid,
      name: asanaTask.name,
      description: asanaTask.notes,
      status: asanaTask.completed ? 'completed' : 'pending',
      tags: asanaTask.tags?.map(t => t.name) || [],
      created_at: asanaTask.created_at,
      updated_at: asanaTask.modified_at,
      url: asanaTask.permalink_url,
      subtasks: asanaTask.subtasks?.map(s => ({
        id: s.gid,
        name: s.name
      })) || []
    };
  }

  /**
   * Get workspaces
   */
  async getWorkspaces() {
    const result = await this.request('GET', `${this.baseUrl}/workspaces`);
    return result.data;
  }

  /**
   * Get projects in a workspace
   */
  async getProjects(workspaceId) {
    const result = await this.request('GET', `${this.baseUrl}/workspaces/${workspaceId}/projects`);
    return result.data;
  }

  /**
   * Get sections in a project
   */
  async getSections(projectId) {
    const result = await this.request('GET', `${this.baseUrl}/projects/${projectId}/sections`);
    return result.data;
  }

  /**
   * Get tags in a workspace
   */
  async getTags(workspaceId) {
    const result = await this.request('GET', `${this.baseUrl}/workspaces/${workspaceId}/tags`);
    return result.data;
  }

  /**
   * Get custom fields for a project
   */
  async getCustomFields(projectId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/projects/${projectId}?opt_fields=custom_field_settings.custom_field`
    );
    return result.data.custom_field_settings?.map(s => s.custom_field) || [];
  }
}

module.exports = AsanaAdapter;
