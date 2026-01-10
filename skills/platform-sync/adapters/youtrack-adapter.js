/**
 * YouTrack Platform Adapter
 *
 * Integrates CDD with JetBrains YouTrack for issue tracking.
 * Great for teams using JetBrains IDEs.
 */

const { BaseAdapter } = require('./base-adapter');

class YouTrackAdapter extends BaseAdapter {
  constructor() {
    super('youtrack');
    this.baseUrl = null;
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.host) {
        throw new Error('YouTrack host URL is required');
      }
      if (!this.config.token) {
        throw new Error('YouTrack permanent token is required');
      }
    }

    this.baseUrl = this.config.host.replace(/\/$/, '') + '/api';
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/users/me?fields=id,login,name`);
    } catch (error) {
      throw new Error(`YouTrack authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('GET', `${this.baseUrl}/users/me?fields=id,login`);
      return !!result.id;
    } catch (error) {
      console.error('YouTrack connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/json'
    };
  }

  async createTrack(track, mapping) {
    const projectId = mapping.projectId || this.config.projectId;
    if (!projectId) {
      throw new Error('YouTrack project ID is required');
    }

    const issueData = this.mapTrackToYouTrack(track, mapping);

    const result = await this.request('POST', `${this.baseUrl}/issues?fields=id,idReadable`, {
      project: { id: projectId },
      ...issueData
    });

    return result.id;
  }

  async updateTrack(externalId, track, mapping) {
    const issueData = this.mapTrackToYouTrack(track, mapping);
    await this.request('POST', `${this.baseUrl}/issues/${externalId}?fields=id`, issueData);
  }

  async deleteTrack(externalId) {
    await this.request('DELETE', `${this.baseUrl}/issues/${externalId}`);
  }

  async createTask(parentId, task, mapping) {
    // YouTrack uses links for parent-child relationships
    const projectId = mapping.projectId || this.config.projectId;

    const issueData = this.mapTaskToYouTrack(task, mapping);
    const result = await this.request('POST', `${this.baseUrl}/issues?fields=id,idReadable`, {
      project: { id: projectId },
      ...issueData
    });

    // Create subtask link
    await this.request('POST', `${this.baseUrl}/issues/${parentId}/links`, {
      direction: 'OUTWARD',
      linkType: { name: 'Subtask' },
      issues: [{ id: result.id }]
    });

    return result.id;
  }

  async updateTask(externalId, task, mapping) {
    const issueData = this.mapTaskToYouTrack(task, mapping);
    await this.request('POST', `${this.baseUrl}/issues/${externalId}?fields=id`, issueData);
  }

  async listItems(mapping) {
    const projectId = mapping.projectId || this.config.projectId;

    const query = encodeURIComponent(`project: {${projectId}} tag: cdd`);
    const fields = 'id,idReadable,summary,description,created,updated,resolved,tags(name),customFields(name,value(name))';

    const result = await this.request('GET', `${this.baseUrl}/issues?query=${query}&fields=${fields}`);
    return result.map(issue => this.mapYouTrackToExternal(issue));
  }

  async getItem(externalId) {
    const fields = 'id,idReadable,summary,description,created,updated,resolved,tags(name),customFields(name,value(name)),links(direction,linkType(name),issues(id,idReadable,summary))';
    const result = await this.request('GET', `${this.baseUrl}/issues/${externalId}?fields=${fields}`);
    return this.mapYouTrackToExternal(result);
  }

  mapTrackToYouTrack(track, mapping) {
    const data = {
      summary: track.title,
      description: this.formatDescription(track),
      tags: [{ name: 'cdd' }, { name: `cdd-${track.id}` }, { name: track.type }]
    };

    // Map custom fields
    if (mapping.customFields) {
      data.customFields = [];

      if (mapping.customFields.priority) {
        const priorityMapping = mapping.priorityMapping || {
          'critical': 'Critical',
          'high': 'Major',
          'medium': 'Normal',
          'low': 'Minor'
        };

        data.customFields.push({
          name: mapping.customFields.priority,
          $type: 'SingleEnumIssueCustomField',
          value: { name: priorityMapping[track.priority] || 'Normal' }
        });
      }

      if (mapping.customFields.type) {
        const typeMapping = mapping.typeMapping || {
          'feature': 'Feature',
          'bug': 'Bug',
          'chore': 'Task',
          'refactor': 'Task'
        };

        data.customFields.push({
          name: mapping.customFields.type,
          $type: 'SingleEnumIssueCustomField',
          value: { name: typeMapping[track.type] || 'Task' }
        });
      }

      if (mapping.customFields.state && mapping.stateMapping) {
        data.customFields.push({
          name: mapping.customFields.state,
          $type: 'StateIssueCustomField',
          value: { name: mapping.stateMapping[track.status] || 'Open' }
        });
      }

      if (mapping.customFields.trackId) {
        data.customFields.push({
          name: mapping.customFields.trackId,
          $type: 'SimpleIssueCustomField',
          value: track.id
        });
      }
    }

    return data;
  }

  mapTaskToYouTrack(task, mapping) {
    return {
      summary: `${task.id}: ${task.title}`,
      tags: [{ name: 'cdd-task' }]
    };
  }

  mapYouTrackToExternal(youtrackIssue) {
    const customFields = {};
    for (const field of youtrackIssue.customFields || []) {
      customFields[field.name] = field.value?.name || field.value;
    }

    return {
      id: youtrackIssue.id,
      key: youtrackIssue.idReadable,
      name: youtrackIssue.summary,
      description: youtrackIssue.description,
      status: customFields.State || (youtrackIssue.resolved ? 'resolved' : 'open'),
      priority: customFields.Priority,
      tags: youtrackIssue.tags?.map(t => t.name) || [],
      created_at: youtrackIssue.created,
      updated_at: youtrackIssue.updated,
      url: `${this.config.host}/issue/${youtrackIssue.idReadable}`,
      customFields,
      subtasks: youtrackIssue.links?.filter(l =>
        l.linkType?.name === 'Subtask' && l.direction === 'OUTWARD'
      ).flatMap(l => l.issues?.map(i => ({
        id: i.id,
        key: i.idReadable,
        name: i.summary
      }))) || []
    };
  }

  /**
   * Get projects
   */
  async getProjects() {
    const result = await this.request('GET', `${this.baseUrl}/admin/projects?fields=id,name,shortName`);
    return result;
  }

  /**
   * Get custom fields for a project
   */
  async getCustomFields(projectId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/admin/projects/${projectId}/customFields?fields=field(id,name,fieldType(id))`
    );
    return result;
  }

  /**
   * Get tags
   */
  async getTags() {
    const result = await this.request('GET', `${this.baseUrl}/issueTags?fields=id,name`);
    return result;
  }

  /**
   * Create a tag
   */
  async createTag(name) {
    return this.request('POST', `${this.baseUrl}/issueTags?fields=id,name`, { name });
  }

  /**
   * Get saved searches (queries)
   */
  async getSavedSearches() {
    const result = await this.request('GET', `${this.baseUrl}/savedQueries?fields=id,name,query`);
    return result;
  }
}

module.exports = YouTrackAdapter;
