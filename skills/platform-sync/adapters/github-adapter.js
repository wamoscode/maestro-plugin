/**
 * GitHub Issues Platform Adapter
 *
 * Integrates CDD with GitHub Issues for issue tracking.
 * Uses the GitHub REST API for issue management.
 *
 * Configuration:
 * - token: GitHub personal access token or GITHUB_TOKEN
 * - owner: Repository owner (user or organization)
 * - repo: Repository name
 *
 * Mapping:
 * - Tracks → Issues
 * - Tasks → Issue checklists or linked issues
 * - Status → Issue state (open/closed) + labels
 * - Priority → Labels (priority/critical, priority/high, etc.)
 */

const { BaseAdapter } = require('./base-adapter');

class GitHubAdapter extends BaseAdapter {
  constructor() {
    super('github');
    this.baseUrl = 'https://api.github.com';
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.token) {
        // Try environment variable
        this.config.token = process.env.GITHUB_TOKEN;
        if (!this.config.token) {
          throw new Error('GitHub token is required (set GITHUB_TOKEN or config.token)');
        }
      }
    }

    if (!this.config.owner) {
      throw new Error('GitHub repository owner is required');
    }

    if (!this.config.repo) {
      throw new Error('GitHub repository name is required');
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/user`);
    } catch (error) {
      throw new Error(`GitHub authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request(
        'GET',
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}`
      );
      return {
        success: !!result.id,
        user: result.owner?.login,
        repo: result.full_name
      };
    } catch (error) {
      console.error('GitHub connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  /**
   * Create a GitHub issue from a CDD track
   */
  async createTrack(track, mapping) {
    const issueData = this.mapTrackToGitHub(track, mapping);

    const result = await this.request(
      'POST',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues`,
      issueData
    );

    return result.number.toString();
  }

  /**
   * Update a GitHub issue
   */
  async updateTrack(externalId, track, mapping) {
    const issueData = this.mapTrackToGitHub(track, mapping);

    await this.request(
      'PATCH',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${externalId}`,
      issueData
    );
  }

  /**
   * Close a GitHub issue (GitHub doesn't truly delete issues)
   */
  async deleteTrack(externalId) {
    await this.request(
      'PATCH',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${externalId}`,
      {
        state: 'closed',
        state_reason: 'not_planned'
      }
    );
  }

  /**
   * Create a task as a checklist item in the parent issue
   * or as a linked sub-issue with reference
   */
  async createTask(parentId, task, mapping) {
    if (mapping.tasksAsChecklists !== false) {
      // Add task as checklist item to parent issue body
      return this.addTaskToChecklist(parentId, task);
    } else {
      // Create as separate issue with reference
      return this.createLinkedTask(parentId, task, mapping);
    }
  }

  /**
   * Add task as checklist item
   */
  async addTaskToChecklist(parentId, task) {
    const issue = await this.getItem(parentId);
    let body = issue.body || '';

    // Find or create tasks section
    const tasksHeader = '\n\n## Tasks\n';
    if (!body.includes('## Tasks')) {
      body += tasksHeader;
    }

    // Add checklist item
    const checklistItem = `- [ ] ${task.id}: ${task.title}\n`;
    const insertPos = body.indexOf('## Tasks') + tasksHeader.length;
    body = body.slice(0, insertPos) + checklistItem + body.slice(insertPos);

    await this.request(
      'PATCH',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${parentId}`,
      { body }
    );

    return `${parentId}:${task.id}`;
  }

  /**
   * Create task as linked issue
   */
  async createLinkedTask(parentId, task, mapping) {
    const issueData = {
      title: `[Task] ${task.id}: ${task.title}`,
      body: `Parent: #${parentId}\n\n${task.description || ''}`,
      labels: ['cdd-task', ...(mapping.taskLabels || [])]
    };

    const result = await this.request(
      'POST',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues`,
      issueData
    );

    // Add reference comment to parent
    await this.request(
      'POST',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${parentId}/comments`,
      { body: `Sub-task created: #${result.number}` }
    );

    return result.number.toString();
  }

  /**
   * Update a task
   */
  async updateTask(externalId, task, mapping) {
    if (externalId.includes(':')) {
      // Checklist task - update parent issue body
      const [parentId, taskId] = externalId.split(':');
      await this.updateChecklistTask(parentId, taskId, task);
    } else {
      // Linked issue task
      await this.request(
        'PATCH',
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${externalId}`,
        {
          title: `[Task] ${task.id}: ${task.title}`,
          state: task.status === 'done' ? 'closed' : 'open'
        }
      );
    }
  }

  /**
   * Update checklist task status
   */
  async updateChecklistTask(parentId, taskId, task) {
    const issue = await this.getItem(parentId);
    let body = issue.body || '';

    // Find and update the checklist item
    const checkboxPattern = new RegExp(
      `- \\[([ x])\\] ${taskId}:`,
      'i'
    );

    const newCheckbox = task.status === 'done' ? '- [x]' : '- [ ]';
    body = body.replace(checkboxPattern, `${newCheckbox} ${taskId}:`);

    await this.request(
      'PATCH',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${parentId}`,
      { body }
    );
  }

  /**
   * List issues from the repository
   */
  async listItems(mapping) {
    const params = new URLSearchParams({
      state: mapping.state || 'all',
      per_page: '100',
      sort: 'updated',
      direction: 'desc'
    });

    // Filter by labels if specified
    if (mapping.labels) {
      params.append('labels', mapping.labels.join(','));
    }

    // Filter by milestone if specified
    if (mapping.milestone) {
      params.append('milestone', mapping.milestone);
    }

    const result = await this.request(
      'GET',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues?${params}`
    );

    // Filter out pull requests (they appear in issues API)
    const issues = result.filter(item => !item.pull_request);

    return issues.map(issue => this.mapGitHubToExternal(issue));
  }

  /**
   * Get a single issue
   */
  async getItem(externalId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${externalId}`
    );

    return this.mapGitHubToExternal(result);
  }

  /**
   * Map CDD track to GitHub issue format
   */
  mapTrackToGitHub(track, mapping) {
    const labels = this.buildGitHubLabels(track, mapping);

    const data = {
      title: track.title,
      body: this.formatGitHubDescription(track),
      labels
    };

    // Map status to state
    if (track.status === 'done' || track.status === 'completed') {
      data.state = 'closed';
    } else {
      data.state = 'open';
    }

    // Add milestone if mapped
    if (mapping.milestoneMapping && mapping.milestoneMapping[track.type]) {
      data.milestone = mapping.milestoneMapping[track.type];
    }

    // Add assignees if specified
    if (track.assignees && track.assignees.length > 0) {
      data.assignees = track.assignees;
    }

    return data;
  }

  /**
   * Build GitHub labels from track
   */
  buildGitHubLabels(track, mapping) {
    const labels = [];

    // Add CDD label
    labels.push('cdd');

    // Add type label
    if (track.type) {
      labels.push(`type/${track.type}`);
    }

    // Add priority label
    if (track.priority) {
      const priorityLabel = mapping.priorityMapping?.[track.priority] ||
        `priority/${track.priority}`;
      labels.push(priorityLabel);
    }

    // Add status label (for more granular status than open/closed)
    if (track.status && track.status !== 'done' && track.status !== 'pending') {
      const statusLabel = mapping.statusMapping?.[track.status] ||
        `status/${track.status}`;
      labels.push(statusLabel);
    }

    // Add custom labels from track
    if (track.tags) {
      labels.push(...track.tags);
    }

    return labels;
  }

  /**
   * Format description for GitHub issue
   */
  formatGitHubDescription(track) {
    let body = '';

    // Add spec content if available
    if (track.spec) {
      body = track.spec;
    } else if (track.description) {
      body = track.description;
    }

    // Add CDD metadata section
    body += '\n\n---\n';
    body += '<details>\n<summary>CDD Metadata</summary>\n\n';
    body += `- **Track ID**: \`${track.id}\`\n`;
    body += `- **Type**: ${track.type || 'feature'}\n`;
    body += `- **Priority**: ${track.priority || 'medium'}\n`;
    body += `- **Status**: ${track.status || 'pending'}\n`;

    if (track.agents?.primary?.length > 0) {
      body += `- **Agents**: ${track.agents.primary.join(', ')}\n`;
    }

    body += `- **Synced**: ${new Date().toISOString()}\n`;
    body += '\n</details>';

    return body;
  }

  /**
   * Map GitHub issue to external format
   */
  mapGitHubToExternal(issue) {
    // Extract priority from labels
    const priorityLabel = issue.labels?.find(l =>
      l.name.startsWith('priority/')
    );
    const priority = priorityLabel
      ? priorityLabel.name.replace('priority/', '')
      : 'medium';

    // Extract status from labels or state
    let status = issue.state === 'closed' ? 'done' : 'pending';
    const statusLabel = issue.labels?.find(l =>
      l.name.startsWith('status/')
    );
    if (statusLabel) {
      status = statusLabel.name.replace('status/', '');
    }

    // Check if it's a CDD-synced issue
    const isCDD = issue.labels?.some(l => l.name === 'cdd');

    return {
      id: issue.number.toString(),
      name: issue.title,
      description: issue.body,
      status: status,
      priority: priority,
      state: issue.state,
      tags: issue.labels?.map(l => l.name) || [],
      assignees: issue.assignees?.map(a => a.login) || [],
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      url: issue.html_url,
      isCDD: isCDD,
      milestone: issue.milestone?.title || null
    };
  }

  /**
   * Get available milestones
   */
  async getMilestones() {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/milestones?state=open`
    );

    return result.map(m => ({
      id: m.number,
      title: m.title,
      description: m.description,
      dueDate: m.due_on
    }));
  }

  /**
   * Get available labels
   */
  async getLabels() {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/labels?per_page=100`
    );

    return result.map(l => ({
      name: l.name,
      color: l.color,
      description: l.description
    }));
  }

  /**
   * Create a label if it doesn't exist
   */
  async ensureLabel(name, color = 'ededed', description = '') {
    try {
      await this.request(
        'POST',
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/labels`,
        { name, color, description }
      );
    } catch (error) {
      // Label might already exist, ignore 422 errors
      if (!error.message.includes('422')) {
        throw error;
      }
    }
  }

  /**
   * Ensure all CDD labels exist
   */
  async ensureCDDLabels() {
    const cddLabels = [
      { name: 'cdd', color: '7057ff', description: 'Context-Driven Development track' },
      { name: 'type/feature', color: '0e8a16', description: 'Feature track' },
      { name: 'type/bugfix', color: 'd73a4a', description: 'Bug fix track' },
      { name: 'type/refactor', color: '1d76db', description: 'Refactoring track' },
      { name: 'type/enhancement', color: 'a2eeef', description: 'Enhancement track' },
      { name: 'priority/critical', color: 'b60205', description: 'Critical priority' },
      { name: 'priority/high', color: 'd93f0b', description: 'High priority' },
      { name: 'priority/medium', color: 'fbca04', description: 'Medium priority' },
      { name: 'priority/low', color: '0e8a16', description: 'Low priority' },
      { name: 'status/in-progress', color: '1d76db', description: 'In progress' },
      { name: 'status/blocked', color: 'd73a4a', description: 'Blocked' },
      { name: 'status/review', color: 'fbca04', description: 'In review' },
      { name: 'cdd-task', color: 'c5def5', description: 'CDD sub-task' }
    ];

    for (const label of cddLabels) {
      await this.ensureLabel(label.name, label.color, label.description);
    }
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueNumber, body) {
    await this.request(
      'POST',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}/comments`,
      { body }
    );
  }

  /**
   * Get issue comments
   */
  async getComments(issueNumber) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}/comments`
    );

    return result.map(c => ({
      id: c.id,
      body: c.body,
      user: c.user?.login,
      created_at: c.created_at,
      updated_at: c.updated_at
    }));
  }

  /**
   * Search issues
   */
  async searchIssues(query) {
    const searchQuery = `repo:${this.config.owner}/${this.config.repo} is:issue ${query}`;
    const result = await this.request(
      'GET',
      `${this.baseUrl}/search/issues?q=${encodeURIComponent(searchQuery)}`
    );

    return result.items.map(issue => this.mapGitHubToExternal(issue));
  }
}

module.exports = GitHubAdapter;
