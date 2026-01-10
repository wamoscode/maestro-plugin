/**
 * Linear Platform Adapter
 *
 * Integrates CDD with Linear for issue tracking.
 * Linear has an excellent GraphQL API ideal for developers.
 */

const { BaseAdapter } = require('./base-adapter');

class LinearAdapter extends BaseAdapter {
  constructor() {
    super('linear');
    this.baseUrl = 'https://api.linear.app/graphql';
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.apiKey) {
        throw new Error('Linear API key is required');
      }
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.graphql(`query { viewer { id name } }`);
    } catch (error) {
      throw new Error(`Linear authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.graphql(`query { viewer { id name } }`);
      return !!result.viewer;
    } catch (error) {
      console.error('Linear connection test failed:', error.message);
      return false;
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': this.config.apiKey
    };
  }

  async graphql(query, variables = {}) {
    const response = await this.request('POST', this.baseUrl, { query, variables });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data;
  }

  async createTrack(track, mapping) {
    const teamId = mapping.teamId || this.config.teamId;
    if (!teamId) {
      throw new Error('Linear team ID is required');
    }

    const issueData = this.mapTrackToLinear(track, mapping);

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
          }
        }
      }
    `;

    const result = await this.graphql(mutation, {
      input: {
        teamId,
        ...issueData
      }
    });

    return result.issueCreate.issue.id;
  }

  async updateTrack(externalId, track, mapping) {
    const issueData = this.mapTrackToLinear(track, mapping);

    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    await this.graphql(mutation, {
      id: externalId,
      input: issueData
    });
  }

  async deleteTrack(externalId) {
    const mutation = `
      mutation DeleteIssue($id: String!) {
        issueDelete(id: $id) {
          success
        }
      }
    `;

    await this.graphql(mutation, { id: externalId });
  }

  async createTask(parentId, task, mapping) {
    // Create as sub-issue
    const issueData = this.mapTaskToLinear(task, mapping);

    const mutation = `
      mutation CreateSubIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
          }
        }
      }
    `;

    const result = await this.graphql(mutation, {
      input: {
        teamId: mapping.teamId || this.config.teamId,
        parentId,
        ...issueData
      }
    });

    return result.issueCreate.issue.id;
  }

  async updateTask(externalId, task, mapping) {
    const issueData = this.mapTaskToLinear(task, mapping);

    const mutation = `
      mutation UpdateSubIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    await this.graphql(mutation, {
      id: externalId,
      input: issueData
    });
  }

  async listItems(mapping) {
    const teamId = mapping.teamId || this.config.teamId;

    const query = `
      query GetIssues($teamId: String!) {
        team(id: $teamId) {
          issues(first: 100) {
            nodes {
              id
              identifier
              title
              description
              state { name }
              priority
              labels { nodes { name } }
              createdAt
              updatedAt
              url
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { teamId });
    return result.team.issues.nodes.map(issue => this.mapLinearToExternal(issue));
  }

  async getItem(externalId) {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          state { name }
          priority
          labels { nodes { name } }
          createdAt
          updatedAt
          url
          children {
            nodes {
              id
              identifier
              title
              state { name }
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { id: externalId });
    return this.mapLinearToExternal(result.issue);
  }

  mapTrackToLinear(track, mapping) {
    const priorityMapping = mapping.priorityMapping || {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };

    const data = {
      title: track.title,
      description: this.formatDescription(track),
      priority: priorityMapping[track.priority] || 3
    };

    // Map status to state
    if (mapping.stateMapping && mapping.stateMapping[track.status]) {
      data.stateId = mapping.stateMapping[track.status];
    }

    // Add labels
    if (mapping.labelMapping) {
      const labelIds = [];

      if (mapping.labelMapping.types?.[track.type]) {
        labelIds.push(mapping.labelMapping.types[track.type]);
      }

      if (mapping.labelMapping.cdd) {
        labelIds.push(mapping.labelMapping.cdd);
      }

      if (labelIds.length > 0) {
        data.labelIds = labelIds;
      }
    }

    // Add project if configured
    if (mapping.projectId) {
      data.projectId = mapping.projectId;
    }

    // Add cycle (sprint) if configured
    if (mapping.cycleId) {
      data.cycleId = mapping.cycleId;
    }

    return data;
  }

  mapTaskToLinear(task, mapping) {
    return {
      title: `${task.id}: ${task.title}`,
      priority: 4 // Low priority for subtasks
    };
  }

  mapLinearToExternal(linearIssue) {
    return {
      id: linearIssue.id,
      identifier: linearIssue.identifier,
      name: linearIssue.title,
      description: linearIssue.description,
      status: linearIssue.state?.name,
      priority: linearIssue.priority,
      tags: linearIssue.labels?.nodes?.map(l => l.name) || [],
      created_at: linearIssue.createdAt,
      updated_at: linearIssue.updatedAt,
      url: linearIssue.url,
      children: linearIssue.children?.nodes || []
    };
  }

  /**
   * Get available teams
   */
  async getTeams() {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;

    const result = await this.graphql(query);
    return result.teams.nodes;
  }

  /**
   * Get workflow states for a team
   */
  async getStates(teamId) {
    const query = `
      query GetStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { teamId });
    return result.team.states.nodes;
  }

  /**
   * Get labels for a team
   */
  async getLabels(teamId) {
    const query = `
      query GetLabels($teamId: String!) {
        team(id: $teamId) {
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { teamId });
    return result.team.labels.nodes;
  }

  /**
   * Get projects for a team
   */
  async getProjects(teamId) {
    const query = `
      query GetProjects($teamId: String!) {
        team(id: $teamId) {
          projects {
            nodes {
              id
              name
              state
            }
          }
        }
      }
    `;

    const result = await this.graphql(query, { teamId });
    return result.team.projects.nodes;
  }
}

module.exports = LinearAdapter;
