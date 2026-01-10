/**
 * ClickUp Platform Adapter
 *
 * Integrates CDD with ClickUp for task management.
 * Supports both direct API and MCP-based connections.
 */

const { BaseAdapter } = require('./base-adapter');

class ClickUpAdapter extends BaseAdapter {
  constructor() {
    super('clickup');
    this.baseUrl = 'https://api.clickup.com/api/v2';
  }

  validateConfig() {
    if (!this.config.mcp) {
      // Direct API mode - require credentials
      if (!this.config.apiKey) {
        throw new Error('ClickUp API key is required');
      }
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      // MCP mode - authentication handled by MCP server
      return;
    }

    // Validate API key by fetching user info
    try {
      await this.request('GET', `${this.baseUrl}/user`);
    } catch (error) {
      throw new Error(`ClickUp authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const user = await this.request('GET', `${this.baseUrl}/user`);
      return !!user.user;
    } catch (error) {
      console.error('ClickUp connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': this.config.apiKey
    };
  }

  async createTrack(track, mapping) {
    const listId = mapping.defaultListId || this.config.defaultListId;
    if (!listId) {
      throw new Error('ClickUp list ID is required');
    }

    const taskData = this.mapTrackToClickUp(track, mapping);
    const result = await this.request('POST', `${this.baseUrl}/list/${listId}/task`, taskData);

    return result.id;
  }

  async updateTrack(externalId, track, mapping) {
    const taskData = this.mapTrackToClickUp(track, mapping);
    await this.request('PUT', `${this.baseUrl}/task/${externalId}`, taskData);
  }

  async deleteTrack(externalId) {
    await this.request('DELETE', `${this.baseUrl}/task/${externalId}`);
  }

  async createTask(parentId, task, mapping) {
    // Create as subtask or checklist item
    if (this.config.tasksAsSubtasks) {
      const taskData = this.mapTaskToClickUp(task, mapping);
      taskData.parent = parentId;
      const result = await this.request('POST', `${this.baseUrl}/list/${mapping.defaultListId}/task`, taskData);
      return result.id;
    } else {
      // Create as checklist item
      const checklistResult = await this.getOrCreateChecklist(parentId, 'CDD Tasks');
      const itemData = {
        name: `${task.id}: ${task.title}`,
        resolved: task.status === 'completed'
      };
      const result = await this.request(
        'POST',
        `${this.baseUrl}/checklist/${checklistResult.id}/checklist_item`,
        itemData
      );
      return result.checklist_item.id;
    }
  }

  async updateTask(externalId, task, mapping) {
    if (this.config.tasksAsSubtasks) {
      const taskData = this.mapTaskToClickUp(task, mapping);
      await this.request('PUT', `${this.baseUrl}/task/${externalId}`, taskData);
    } else {
      // Update checklist item
      const itemData = {
        name: `${task.id}: ${task.title}`,
        resolved: task.status === 'completed'
      };
      await this.request('PUT', `${this.baseUrl}/checklist_item/${externalId}`, itemData);
    }
  }

  async listItems(mapping) {
    const listId = mapping.defaultListId || this.config.defaultListId;
    const result = await this.request('GET', `${this.baseUrl}/list/${listId}/task?include_closed=true`);
    return result.tasks.map(task => this.mapClickUpToExternal(task));
  }

  async getItem(externalId) {
    const result = await this.request('GET', `${this.baseUrl}/task/${externalId}`);
    return this.mapClickUpToExternal(result);
  }

  async getOrCreateChecklist(taskId, name) {
    const task = await this.request('GET', `${this.baseUrl}/task/${taskId}`);

    // Find existing checklist
    const existing = task.checklists?.find(cl => cl.name === name);
    if (existing) {
      return existing;
    }

    // Create new checklist
    const result = await this.request('POST', `${this.baseUrl}/task/${taskId}/checklist`, { name });
    return result.checklist;
  }

  mapTrackToClickUp(track, mapping) {
    const statusMapping = mapping.statusMapping || {
      'pending': 'to do',
      'in_progress': 'in progress',
      'completed': 'complete',
      'stashed': 'on hold',
      'blocked': 'blocked'
    };

    const priorityMapping = mapping.priorityMapping || {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };

    const data = {
      name: track.title,
      description: this.formatDescription(track),
      status: statusMapping[track.status] || 'to do',
      priority: priorityMapping[track.priority] || 3,
      tags: this.buildTags(track)
    };

    // Add custom fields if configured
    if (mapping.customFields) {
      data.custom_fields = [];

      if (mapping.customFields.trackType) {
        data.custom_fields.push({
          id: mapping.customFields.trackType,
          value: track.type
        });
      }

      if (mapping.customFields.trackId) {
        data.custom_fields.push({
          id: mapping.customFields.trackId,
          value: track.id
        });
      }

      if (mapping.customFields.phase && track.phases?.current) {
        data.custom_fields.push({
          id: mapping.customFields.phase,
          value: `Phase ${track.phases.current}/${track.phases.total}`
        });
      }

      if (mapping.customFields.progress) {
        const progress = track.tasks?.total
          ? Math.round((track.tasks.completed / track.tasks.total) * 100)
          : 0;
        data.custom_fields.push({
          id: mapping.customFields.progress,
          value: progress
        });
      }
    }

    // Add due date if configured
    if (mapping.dueDateFromSpec && track.dueDate) {
      data.due_date = new Date(track.dueDate).getTime();
    }

    return data;
  }

  mapTaskToClickUp(task, mapping) {
    const statusMapping = mapping.statusMapping || {
      'pending': 'to do',
      'in_progress': 'in progress',
      'completed': 'complete'
    };

    return {
      name: `${task.id}: ${task.title}`,
      status: statusMapping[task.status] || 'to do',
      tags: [`cdd-task`, `task-${task.id}`]
    };
  }

  mapClickUpToExternal(clickupTask) {
    return {
      id: clickupTask.id,
      name: clickupTask.name,
      description: clickupTask.description,
      status: clickupTask.status?.status,
      priority: clickupTask.priority?.id,
      tags: clickupTask.tags?.map(t => t.name) || [],
      created_at: clickupTask.date_created,
      updated_at: clickupTask.date_updated,
      url: clickupTask.url
    };
  }

  /**
   * Get ClickUp workspaces (teams)
   */
  async getWorkspaces() {
    const result = await this.request('GET', `${this.baseUrl}/team`);
    return result.teams;
  }

  /**
   * Get spaces in a workspace
   */
  async getSpaces(workspaceId) {
    const result = await this.request('GET', `${this.baseUrl}/team/${workspaceId}/space`);
    return result.spaces;
  }

  /**
   * Get folders in a space
   */
  async getFolders(spaceId) {
    const result = await this.request('GET', `${this.baseUrl}/space/${spaceId}/folder`);
    return result.folders;
  }

  /**
   * Get lists in a folder or space
   */
  async getLists(folderId) {
    const result = await this.request('GET', `${this.baseUrl}/folder/${folderId}/list`);
    return result.lists;
  }
}

module.exports = ClickUpAdapter;
