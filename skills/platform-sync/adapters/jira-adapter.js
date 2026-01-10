/**
 * Jira Platform Adapter
 *
 * Integrates CDD with Jira for enterprise issue tracking.
 * Supports both Jira Cloud and Jira Server/Data Center.
 */

const { BaseAdapter } = require('./base-adapter');

class JiraAdapter extends BaseAdapter {
  constructor() {
    super('jira');
    this.baseUrl = null;
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.host) {
        throw new Error('Jira host URL is required');
      }
      if (!this.config.email || !this.config.apiToken) {
        throw new Error('Jira email and API token are required');
      }
    }

    this.baseUrl = this.config.host.replace(/\/$/, '') + '/rest/api/3';
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/myself`);
    } catch (error) {
      throw new Error(`Jira authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('GET', `${this.baseUrl}/myself`);
      return !!result.accountId;
    } catch (error) {
      console.error('Jira connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`
    };
  }

  async createTrack(track, mapping) {
    const projectKey = mapping.projectKey || this.config.projectKey;
    if (!projectKey) {
      throw new Error('Jira project key is required');
    }

    const issueData = this.mapTrackToJira(track, mapping, projectKey);
    const result = await this.request('POST', `${this.baseUrl}/issue`, issueData);

    return result.id;
  }

  async updateTrack(externalId, track, mapping) {
    const issueData = this.mapTrackToJira(track, mapping);
    // Remove fields that can't be updated directly
    delete issueData.fields.project;
    delete issueData.fields.issuetype;

    await this.request('PUT', `${this.baseUrl}/issue/${externalId}`, issueData);

    // Handle status transition separately
    if (mapping.statusMapping && track.status) {
      await this.transitionIssue(externalId, track.status, mapping);
    }
  }

  async deleteTrack(externalId) {
    await this.request('DELETE', `${this.baseUrl}/issue/${externalId}`);
  }

  async createTask(parentId, task, mapping) {
    const projectKey = mapping.projectKey || this.config.projectKey;

    const issueData = this.mapTaskToJira(task, mapping, projectKey, parentId);
    const result = await this.request('POST', `${this.baseUrl}/issue`, issueData);

    return result.id;
  }

  async updateTask(externalId, task, mapping) {
    const issueData = {
      fields: {
        summary: `${task.id}: ${task.title}`
      }
    };

    await this.request('PUT', `${this.baseUrl}/issue/${externalId}`, issueData);

    // Handle status transition
    if (task.status === 'completed') {
      await this.transitionIssue(externalId, 'completed', mapping);
    }
  }

  async listItems(mapping) {
    const projectKey = mapping.projectKey || this.config.projectKey;

    // Use JQL to find issues
    const jql = encodeURIComponent(`project = ${projectKey} AND labels = "cdd" ORDER BY created DESC`);
    const result = await this.request(
      'GET',
      `${this.baseUrl}/search?jql=${jql}&fields=summary,description,status,priority,labels,created,updated,subtasks`
    );

    return result.issues.map(issue => this.mapJiraToExternal(issue));
  }

  async getItem(externalId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/issue/${externalId}?fields=summary,description,status,priority,labels,created,updated,subtasks`
    );
    return this.mapJiraToExternal(result);
  }

  async transitionIssue(issueId, targetStatus, mapping) {
    // Get available transitions
    const transitions = await this.request('GET', `${this.baseUrl}/issue/${issueId}/transitions`);

    const targetTransition = transitions.transitions.find(t => {
      const mappedStatus = mapping.statusMapping?.[targetStatus];
      return t.name.toLowerCase() === mappedStatus?.toLowerCase() ||
        t.to.name.toLowerCase() === mappedStatus?.toLowerCase();
    });

    if (targetTransition) {
      await this.request('POST', `${this.baseUrl}/issue/${issueId}/transitions`, {
        transition: { id: targetTransition.id }
      });
    }
  }

  mapTrackToJira(track, mapping, projectKey = null) {
    const issueTypeMapping = mapping.issueTypeMapping || {
      'feature': 'Story',
      'bug': 'Bug',
      'chore': 'Task',
      'refactor': 'Task'
    };

    const priorityMapping = mapping.priorityMapping || {
      'critical': 'Highest',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };

    const fields = {
      summary: track.title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: this.formatDescriptionPlain(track)
              }
            ]
          }
        ]
      },
      labels: this.buildTags(track)
    };

    if (projectKey) {
      fields.project = { key: projectKey };
      fields.issuetype = { name: issueTypeMapping[track.type] || 'Story' };
    }

    if (priorityMapping[track.priority]) {
      fields.priority = { name: priorityMapping[track.priority] };
    }

    // Add custom fields if configured
    if (mapping.customFields) {
      if (mapping.customFields.trackId) {
        fields[mapping.customFields.trackId] = track.id;
      }
      if (mapping.customFields.phase && track.phases) {
        fields[mapping.customFields.phase] = `${track.phases.current}/${track.phases.total}`;
      }
    }

    // Add epic link if configured
    if (mapping.epicLinkField && track.hierarchy?.epicId) {
      fields[mapping.epicLinkField] = track.hierarchy.epicId;
    }

    // Add sprint if configured
    if (mapping.sprintField && mapping.currentSprint) {
      fields[mapping.sprintField] = mapping.currentSprint;
    }

    return { fields };
  }

  mapTaskToJira(task, mapping, projectKey, parentId) {
    return {
      fields: {
        project: { key: projectKey },
        parent: { id: parentId },
        issuetype: { name: 'Sub-task' },
        summary: `${task.id}: ${task.title}`
      }
    };
  }

  mapJiraToExternal(jiraIssue) {
    return {
      id: jiraIssue.id,
      key: jiraIssue.key,
      name: jiraIssue.fields.summary,
      description: this.extractDescription(jiraIssue.fields.description),
      status: jiraIssue.fields.status?.name,
      priority: jiraIssue.fields.priority?.name,
      tags: jiraIssue.fields.labels || [],
      created_at: jiraIssue.fields.created,
      updated_at: jiraIssue.fields.updated,
      url: `${this.config.host}/browse/${jiraIssue.key}`,
      subtasks: jiraIssue.fields.subtasks?.map(s => ({
        id: s.id,
        key: s.key,
        name: s.fields.summary
      })) || []
    };
  }

  formatDescriptionPlain(track) {
    let description = '';

    if (track.spec) {
      const overviewMatch = track.spec.match(/## Overview\n\n([\s\S]*?)(?=\n##|$)/);
      if (overviewMatch) {
        description = overviewMatch[1].trim();
      }
    }

    description += `\n\n---\nCDD Track: ${track.id}\nType: ${track.type}`;

    return description;
  }

  extractDescription(adf) {
    if (!adf || !adf.content) return '';

    return adf.content
      .map(node => {
        if (node.type === 'paragraph' && node.content) {
          return node.content.map(c => c.text || '').join('');
        }
        return '';
      })
      .join('\n');
  }

  /**
   * Get projects
   */
  async getProjects() {
    const result = await this.request('GET', `${this.baseUrl}/project`);
    return result;
  }

  /**
   * Get issue types for a project
   */
  async getIssueTypes(projectKey) {
    const result = await this.request('GET', `${this.baseUrl}/project/${projectKey}`);
    return result.issueTypes;
  }

  /**
   * Get statuses for a project
   */
  async getStatuses(projectKey) {
    const result = await this.request('GET', `${this.baseUrl}/project/${projectKey}/statuses`);
    return result;
  }

  /**
   * Get custom fields
   */
  async getCustomFields() {
    const result = await this.request('GET', `${this.baseUrl}/field`);
    return result.filter(f => f.custom);
  }

  /**
   * Get sprints for a board
   */
  async getSprints(boardId) {
    const agileUrl = this.config.host.replace(/\/$/, '') + '/rest/agile/1.0';
    const result = await this.request('GET', `${agileUrl}/board/${boardId}/sprint`);
    return result.values;
  }
}

module.exports = JiraAdapter;
