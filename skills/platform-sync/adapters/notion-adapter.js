/**
 * Notion Platform Adapter
 *
 * Integrates CDD with Notion databases for project management.
 * Uses the Notion API to manage database items.
 *
 * Configuration:
 * - token: Notion integration token (or NOTION_TOKEN env var)
 * - databaseId: The database to sync with
 *
 * Mapping:
 * - Tracks → Database pages
 * - Tasks → Sub-pages or checklist items in page content
 * - Status → Select property
 * - Priority → Select property
 * - Tags → Multi-select property
 */

const { BaseAdapter } = require('./base-adapter');

class NotionAdapter extends BaseAdapter {
  constructor() {
    super('notion');
    this.baseUrl = 'https://api.notion.com/v1';
    this.notionVersion = '2022-06-28';
  }

  validateConfig() {
    if (!this.config.mcp) {
      if (!this.config.token) {
        this.config.token = process.env.NOTION_TOKEN;
        if (!this.config.token) {
          throw new Error('Notion token is required (set NOTION_TOKEN or config.token)');
        }
      }
    }

    if (!this.config.databaseId) {
      throw new Error('Notion database ID is required');
    }
  }

  async authenticate() {
    if (this.config.mcp) {
      return;
    }

    try {
      await this.request('GET', `${this.baseUrl}/users/me`);
    } catch (error) {
      throw new Error(`Notion authentication failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const result = await this.request('GET', `${this.baseUrl}/users/me`);
      const dbResult = await this.request(
        'GET',
        `${this.baseUrl}/databases/${this.config.databaseId}`
      );
      return {
        success: true,
        user: result.name || result.bot?.owner?.user?.name,
        database: dbResult.title?.[0]?.plain_text || 'Untitled'
      };
    } catch (error) {
      console.error('Notion connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.token}`,
      'Notion-Version': this.notionVersion
    };
  }

  /**
   * Create a page in the Notion database from a CDD track
   */
  async createTrack(track, mapping) {
    const pageData = this.mapTrackToNotion(track, mapping);

    const result = await this.request(
      'POST',
      `${this.baseUrl}/pages`,
      {
        parent: { database_id: this.config.databaseId },
        properties: pageData.properties,
        children: pageData.children
      }
    );

    return result.id;
  }

  /**
   * Update a page in Notion
   */
  async updateTrack(externalId, track, mapping) {
    const pageData = this.mapTrackToNotion(track, mapping);

    await this.request(
      'PATCH',
      `${this.baseUrl}/pages/${externalId}`,
      {
        properties: pageData.properties
      }
    );

    // Update content if needed
    if (pageData.children && pageData.children.length > 0) {
      // Archive existing blocks and add new ones
      await this.updatePageContent(externalId, pageData.children);
    }
  }

  /**
   * Archive a page in Notion (Notion doesn't delete, only archives)
   */
  async deleteTrack(externalId) {
    await this.request(
      'PATCH',
      `${this.baseUrl}/pages/${externalId}`,
      {
        archived: true
      }
    );
  }

  /**
   * Create a task as a sub-page or todo block
   */
  async createTask(parentId, task, mapping) {
    if (mapping.tasksAsSubpages) {
      return this.createTaskAsSubpage(parentId, task, mapping);
    } else {
      return this.addTaskToDoBlock(parentId, task);
    }
  }

  /**
   * Create task as a sub-page
   */
  async createTaskAsSubpage(parentId, task, mapping) {
    const result = await this.request(
      'POST',
      `${this.baseUrl}/pages`,
      {
        parent: { page_id: parentId },
        properties: {
          title: {
            title: [{ text: { content: `${task.id}: ${task.title}` } }]
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: task.description || '' } }]
            }
          }
        ]
      }
    );

    return result.id;
  }

  /**
   * Add task as a to_do block in the parent page
   */
  async addTaskToDoBlock(parentId, task) {
    const result = await this.request(
      'PATCH',
      `${this.baseUrl}/blocks/${parentId}/children`,
      {
        children: [
          {
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [{ text: { content: `${task.id}: ${task.title}` } }],
              checked: task.status === 'done'
            }
          }
        ]
      }
    );

    // Return the ID of the created block
    return result.results?.[0]?.id || `${parentId}:${task.id}`;
  }

  /**
   * Update a task
   */
  async updateTask(externalId, task, mapping) {
    if (externalId.includes(':')) {
      // It's a to_do block reference
      await this.updateToDoBlock(externalId, task);
    } else {
      // It's a sub-page
      await this.request(
        'PATCH',
        `${this.baseUrl}/pages/${externalId}`,
        {
          properties: {
            title: {
              title: [{ text: { content: `${task.id}: ${task.title}` } }]
            }
          },
          archived: task.status === 'cancelled'
        }
      );
    }
  }

  /**
   * Update a to_do block
   */
  async updateToDoBlock(blockId, task) {
    // For to_do blocks, we need to find and update them
    // This is a simplified implementation
    await this.request(
      'PATCH',
      `${this.baseUrl}/blocks/${blockId}`,
      {
        to_do: {
          checked: task.status === 'done'
        }
      }
    );
  }

  /**
   * List pages from the database
   */
  async listItems(mapping) {
    const filter = this.buildFilter(mapping);

    const result = await this.request(
      'POST',
      `${this.baseUrl}/databases/${this.config.databaseId}/query`,
      {
        filter: filter,
        sorts: [
          {
            timestamp: 'last_edited_time',
            direction: 'descending'
          }
        ],
        page_size: 100
      }
    );

    return result.results.map(page => this.mapNotionToExternal(page, mapping));
  }

  /**
   * Get a single page
   */
  async getItem(externalId) {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/pages/${externalId}`
    );

    return this.mapNotionToExternal(result, {});
  }

  /**
   * Map CDD track to Notion page format
   */
  mapTrackToNotion(track, mapping) {
    const properties = {
      // Title property (required)
      [mapping.titleProperty || 'Name']: {
        title: [{ text: { content: track.title } }]
      }
    };

    // Status property
    if (mapping.statusProperty) {
      const statusValue = mapping.statusMapping?.[track.status] || track.status;
      properties[mapping.statusProperty] = {
        select: { name: statusValue }
      };
    }

    // Priority property
    if (mapping.priorityProperty) {
      const priorityValue = mapping.priorityMapping?.[track.priority] || track.priority;
      properties[mapping.priorityProperty] = {
        select: { name: priorityValue }
      };
    }

    // Type property
    if (mapping.typeProperty && track.type) {
      properties[mapping.typeProperty] = {
        select: { name: track.type }
      };
    }

    // Tags property (multi-select)
    if (mapping.tagsProperty && track.tags?.length > 0) {
      properties[mapping.tagsProperty] = {
        multi_select: track.tags.map(tag => ({ name: tag }))
      };
    }

    // CDD Track ID property (for linking)
    if (mapping.trackIdProperty) {
      properties[mapping.trackIdProperty] = {
        rich_text: [{ text: { content: track.id } }]
      };
    }

    // Build page content
    const children = this.buildPageContent(track);

    return { properties, children };
  }

  /**
   * Build page content blocks from track
   */
  buildPageContent(track) {
    const blocks = [];

    // Add description/spec as content
    if (track.spec) {
      // Parse markdown-like spec into blocks
      const sections = this.parseSpecToBlocks(track.spec);
      blocks.push(...sections);
    } else if (track.description) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: track.description } }]
        }
      });
    }

    // Add CDD metadata callout
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '🎯' },
        rich_text: [
          { text: { content: `CDD Track: ${track.id}\n` } },
          { text: { content: `Type: ${track.type || 'feature'}\n` } },
          { text: { content: `Synced: ${new Date().toISOString()}` } }
        ]
      }
    });

    return blocks;
  }

  /**
   * Parse spec markdown into Notion blocks
   */
  parseSpecToBlocks(spec) {
    const blocks = [];
    const lines = spec.split('\n');
    let currentParagraph = [];

    for (const line of lines) {
      // Heading 1
      if (line.startsWith('# ')) {
        if (currentParagraph.length > 0) {
          blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
          currentParagraph = [];
        }
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: line.slice(2) } }]
          }
        });
      }
      // Heading 2
      else if (line.startsWith('## ')) {
        if (currentParagraph.length > 0) {
          blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
          currentParagraph = [];
        }
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ text: { content: line.slice(3) } }]
          }
        });
      }
      // Heading 3
      else if (line.startsWith('### ')) {
        if (currentParagraph.length > 0) {
          blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
          currentParagraph = [];
        }
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ text: { content: line.slice(4) } }]
          }
        });
      }
      // Bullet list
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (currentParagraph.length > 0) {
          blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
          currentParagraph = [];
        }
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: line.slice(2) } }]
          }
        });
      }
      // Code block
      else if (line.startsWith('```')) {
        // Simplified - just treat as paragraph
        currentParagraph.push(line);
      }
      // Regular text
      else if (line.trim()) {
        currentParagraph.push(line);
      }
      // Empty line - flush paragraph
      else if (currentParagraph.length > 0) {
        blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
        currentParagraph = [];
      }
    }

    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      blocks.push(this.createParagraphBlock(currentParagraph.join('\n')));
    }

    return blocks;
  }

  /**
   * Create a paragraph block
   */
  createParagraphBlock(text) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: text } }]
      }
    };
  }

  /**
   * Map Notion page to external format
   */
  mapNotionToExternal(page, mapping) {
    const properties = page.properties || {};

    // Extract title
    const titleProp = properties[mapping.titleProperty || 'Name'];
    const title = titleProp?.title?.[0]?.plain_text || 'Untitled';

    // Extract status
    const statusProp = properties[mapping.statusProperty];
    const status = statusProp?.select?.name || 'pending';

    // Extract priority
    const priorityProp = properties[mapping.priorityProperty];
    const priority = priorityProp?.select?.name || 'medium';

    // Extract tags
    const tagsProp = properties[mapping.tagsProperty];
    const tags = tagsProp?.multi_select?.map(t => t.name) || [];

    // Extract CDD track ID if present
    const trackIdProp = properties[mapping.trackIdProperty];
    const cddTrackId = trackIdProp?.rich_text?.[0]?.plain_text || null;

    return {
      id: page.id,
      name: title,
      status: this.reverseMapStatus(status, mapping),
      priority: this.reverseMapPriority(priority, mapping),
      tags: tags,
      cddTrackId: cddTrackId,
      created_at: page.created_time,
      updated_at: page.last_edited_time,
      url: page.url,
      archived: page.archived
    };
  }

  /**
   * Reverse map status from Notion to CDD
   */
  reverseMapStatus(notionStatus, mapping) {
    if (!mapping.statusMapping) return notionStatus;
    const reversed = this.reverseMap(mapping.statusMapping);
    return reversed[notionStatus] || notionStatus;
  }

  /**
   * Reverse map priority from Notion to CDD
   */
  reverseMapPriority(notionPriority, mapping) {
    if (!mapping.priorityMapping) return notionPriority;
    const reversed = this.reverseMap(mapping.priorityMapping);
    return reversed[notionPriority] || notionPriority;
  }

  /**
   * Build filter for database query
   */
  buildFilter(mapping) {
    const filters = [];

    // Filter by CDD items only if trackIdProperty is set
    if (mapping.trackIdProperty && mapping.cddOnly) {
      filters.push({
        property: mapping.trackIdProperty,
        rich_text: { is_not_empty: true }
      });
    }

    // Filter by status if specified
    if (mapping.status && mapping.statusProperty) {
      filters.push({
        property: mapping.statusProperty,
        select: { equals: mapping.status }
      });
    }

    // Exclude archived by default
    if (!mapping.includeArchived) {
      // Notion doesn't have a direct archived filter in database queries
      // Archived pages are excluded by default
    }

    if (filters.length === 0) {
      return undefined;
    }

    if (filters.length === 1) {
      return filters[0];
    }

    return { and: filters };
  }

  /**
   * Update page content (replace all blocks)
   */
  async updatePageContent(pageId, newBlocks) {
    // First, get existing blocks
    const existingBlocks = await this.request(
      'GET',
      `${this.baseUrl}/blocks/${pageId}/children`
    );

    // Delete existing blocks (archive them)
    for (const block of existingBlocks.results || []) {
      try {
        await this.request(
          'DELETE',
          `${this.baseUrl}/blocks/${block.id}`
        );
      } catch (e) {
        // Ignore errors when deleting blocks
      }
    }

    // Add new blocks
    if (newBlocks.length > 0) {
      await this.request(
        'PATCH',
        `${this.baseUrl}/blocks/${pageId}/children`,
        { children: newBlocks }
      );
    }
  }

  /**
   * Get database schema (properties)
   */
  async getDatabaseSchema() {
    const result = await this.request(
      'GET',
      `${this.baseUrl}/databases/${this.config.databaseId}`
    );

    const schema = {};
    for (const [name, prop] of Object.entries(result.properties || {})) {
      schema[name] = {
        type: prop.type,
        options: prop.select?.options || prop.multi_select?.options || null
      };
    }

    return {
      id: result.id,
      title: result.title?.[0]?.plain_text || 'Untitled',
      properties: schema
    };
  }

  /**
   * Search pages in the database
   */
  async searchPages(query) {
    const result = await this.request(
      'POST',
      `${this.baseUrl}/search`,
      {
        query: query,
        filter: {
          value: 'page',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      }
    );

    // Filter to only pages from our database
    const databasePages = result.results.filter(page =>
      page.parent?.database_id === this.config.databaseId
    );

    return databasePages.map(page => this.mapNotionToExternal(page, {}));
  }
}

module.exports = NotionAdapter;
