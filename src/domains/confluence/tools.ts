/**
 * Confluence MCP tools implementation
 */

import { withErrorHandling, ToolExecutionError } from '../../core/errors';
import { createLogger } from '../../core/utils/logger.js';

import { ConfluenceClient } from './client.js';

import type { ConfluenceConfig } from '../../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const logger = createLogger('confluence-tools');

/**
 * Confluence tools manager
 */
export class ConfluenceToolsManager {
  private client: ConfluenceClient;
  private config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    this.config = config;
    this.client = new ConfluenceClient(config);
  }

  /**
   * Initialize the tools manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Confluence tools manager');
    // Any async initialization can go here
  }

  /**
   * Get all available Confluence tools
   */
  getAvailableTools(): Tool[] {
    return [
      // Content search and retrieval
      {
        name: 'confluence_search',
        description: 'Search Confluence content using CQL (Confluence Query Language)',
        inputSchema: {
          type: 'object',
          properties: {
            cql: {
              type: 'string',
              description: 'CQL query string (e.g., "space = SPACE AND title ~ \\"keyword\\"")',
            },
            start: {
              type: 'number',
              description: 'Starting index for results',
              default: 0,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 50,
            },
            excerpt: {
              type: 'string',
              enum: ['indexed', 'highlight', 'none'],
              description: 'Type of excerpt to include',
              default: 'highlight',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: [],
            },
          },
          required: ['cql'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_get_page',
        description: 'Get detailed information about a Confluence page by ID',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand (body.storage, version, space, etc.)',
              default: ['body.storage', 'version', 'space'],
            },
            version: {
              type: 'number',
              description: 'Specific version number to retrieve',
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_get_page_by_title',
        description: 'Get Confluence page(s) by space key and title',
        inputSchema: {
          type: 'object',
          properties: {
            spaceKey: {
              type: 'string',
              description: 'The space key (e.g., PROJ)',
            },
            title: {
              type: 'string',
              description: 'The page title',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['body.storage', 'version', 'space'],
            },
          },
          required: ['spaceKey', 'title'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_create_page',
        description: 'Create a new Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            spaceKey: {
              type: 'string',
              description: 'The space key where the page will be created',
            },
            title: {
              type: 'string',
              description: 'Page title',
            },
            body: {
              type: 'string',
              description: 'Page content in Confluence storage format or plain text',
            },
            parentId: {
              type: 'string',
              description: 'Parent page ID (optional)',
            },
            type: {
              type: 'string',
              enum: ['page', 'blogpost'],
              description: 'Content type',
              default: 'page',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Labels to add to the page',
              default: [],
            },
          },
          required: ['spaceKey', 'title', 'body'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_update_page',
        description: 'Update an existing Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to update',
            },
            title: {
              type: 'string',
              description: 'New page title',
            },
            body: {
              type: 'string',
              description: 'Updated page content',
            },
            versionComment: {
              type: 'string',
              description: 'Comment for this version update',
              default: 'Updated via MCP',
            },
            minorEdit: {
              type: 'boolean',
              description: 'Whether this is a minor edit',
              default: false,
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Labels to set on the page',
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_get_spaces',
        description: 'Get all Confluence spaces accessible to the user',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['global', 'personal'],
              description: 'Type of spaces to retrieve',
            },
            status: {
              type: 'string',
              enum: ['current', 'archived'],
              description: 'Status of spaces to retrieve',
              default: 'current',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: [],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_get_space',
        description: 'Get detailed information about a specific Confluence space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceKey: {
              type: 'string',
              description: 'The space key (e.g., PROJ)',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['description', 'homepage'],
            },
          },
          required: ['spaceKey'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_get_space_content',
        description: 'Get content (pages/blogposts) from a Confluence space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceKey: {
              type: 'string',
              description: 'The space key (e.g., PROJ)',
            },
            type: {
              type: 'string',
              enum: ['page', 'blogpost'],
              description: 'Type of content to retrieve',
              default: 'page',
            },
            status: {
              type: 'string',
              enum: ['current', 'trashed', 'draft'],
              description: 'Content status',
              default: 'current',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['version', 'space'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['spaceKey'],
          additionalProperties: false,
        },
      },
      {
        name: 'confluence_add_comment',
        description: 'Add a comment to a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to comment on',
            },
            body: {
              type: 'string',
              description: 'Comment text',
            },
            parentCommentId: {
              type: 'string',
              description: 'Parent comment ID for replies',
            },
          },
          required: ['pageId', 'body'],
          additionalProperties: false,
        },
      },

      // === User Management ===
      {
        name: 'confluence_search_user',
        description: 'Search for users in Confluence by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (name or email)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },

      // === Label Management ===
      {
        name: 'confluence_add_label',
        description: 'Add a label to a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to add label to',
            },
            label: {
              type: 'string',
              description: 'Label name to add',
            },
            prefix: {
              type: 'string',
              enum: ['global', 'my', 'team'],
              description: 'Label prefix type',
              default: 'global',
            },
          },
          required: ['pageId', 'label'],
          additionalProperties: false,
        },
      },

      {
        name: 'confluence_get_labels',
        description: 'Get all labels for a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to get labels for',
            },
            prefix: {
              type: 'string',
              description: 'Filter by label prefix',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },

      {
        name: 'confluence_get_pages_by_label',
        description: 'Find all pages with a specific label',
        inputSchema: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'Label name to search for',
            },
            spaceKey: {
              type: 'string',
              description: 'Filter by space key',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['version', 'space'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['label'],
          additionalProperties: false,
        },
      },

      // === Page Management Extended ===
      {
        name: 'confluence_get_page_children',
        description: 'Get child pages of a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'Parent page ID',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['version', 'space'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },

      {
        name: 'confluence_get_comments',
        description: 'Get comments for a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to get comments for',
            },
            location: {
              type: 'string',
              enum: ['inline', 'footer'],
              description: 'Comment location type',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['body.view', 'history.lastUpdated'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 50,
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },

      {
        name: 'confluence_delete_page',
        description: 'Delete a Confluence page (move to trash or permanent)',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to delete',
            },
            permanent: {
              type: 'boolean',
              description: 'Whether to delete permanently (true) or move to trash (false)',
              default: false,
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },

      // === History and Versions ===
      {
        name: 'confluence_get_page_history',
        description: 'Get version history of a Confluence page',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'string',
              description: 'The page ID to get history for',
            },
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: ['lastUpdated', 'previousVersion', 'contributors'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of versions to return',
              default: 25,
            },
          },
          required: ['pageId'],
          additionalProperties: false,
        },
      },
    ];
  }

  /**
   * Execute a Confluence tool
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Executing Confluence tool', { toolName });

      switch (toolName) {
        // Content operations
        case 'confluence_search':
          return this.searchContent(args);
        case 'confluence_get_page':
          return this.getPage(args);
        case 'confluence_get_page_by_title':
          return this.getPageByTitle(args);
        case 'confluence_create_page':
          return this.createPage(args);
        case 'confluence_update_page':
          return this.updatePage(args);
        case 'confluence_delete_page':
          return this.deletePage(args);

        // Space operations
        case 'confluence_get_spaces':
          return this.getSpaces(args);
        case 'confluence_get_space':
          return this.getSpace(args);
        case 'confluence_get_space_content':
          return this.getSpaceContent(args);

        // Comments
        case 'confluence_add_comment':
          return this.addComment(args);
        case 'confluence_get_comments':
          return this.getComments(args);

        // User management
        case 'confluence_search_user':
          return this.searchUsers(args);

        // Label management
        case 'confluence_add_label':
          return this.addLabel(args);
        case 'confluence_get_labels':
          return this.getLabels(args);
        case 'confluence_get_pages_by_label':
          return this.getPagesByLabel(args);

        // Page hierarchy
        case 'confluence_get_page_children':
          return this.getPageChildren(args);

        // History
        case 'confluence_get_page_history':
          return this.getPageHistory(args);

        default:
          throw new ToolExecutionError(toolName, `Unknown Confluence tool: ${toolName}`);
      }
    });
  }

  /**
   * Health check for Confluence connectivity
   */
  async healthCheck(): Promise<any> {
    return this.client.healthCheck();
  }

  // === Tool Implementations ===

  private async searchContent(args: any) {
    const { cql, start = 0, limit = 50, excerpt = 'highlight', expand = [] } = args;

    const searchResult = await this.client.searchContent({
      cql,
      start,
      limit,
      excerpt,
      expand,
    });

    if (searchResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No content found for CQL: ${cql}`,
          },
        ],
      };
    }

    const resultsList = searchResult.results
      .map(result => {
        const content = result.content;
        return (
          `• **${result.title}** (${content.type})\n` +
          `  Space: ${result.space?.name || 'Unknown'}\n` +
          `  URL: ${result.url}\n${result.excerpt ? `  Excerpt: ${result.excerpt}\n` : ''}`
        );
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Search Results**\n\n` +
            `**CQL:** ${cql}\n` +
            `**Found:** ${searchResult.totalSize} results (showing ${searchResult.results.length})\n\n` +
            `${resultsList}`,
        },
      ],
    };
  }

  private async getPage(args: any) {
    const { pageId, expand = ['body.storage', 'version', 'space'], version } = args;

    const page = await this.client.getContent(pageId, { expand, version });

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Page: ${page.title}**\n\n` +
            `**ID:** ${page.id}\n` +
            `**Space:** ${page.space.name} (${page.space.key})\n` +
            `**Type:** ${page.type}\n` +
            `**Status:** ${page.status}\n` +
            `**Version:** ${page.version.number} (${new Date(page.version.when).toLocaleString()})\n` +
            `**Created:** ${new Date(page.history.createdDate).toLocaleString()}\n` +
            `**Creator:** ${page.history.createdBy.displayName}\n${
              page.history.lastUpdated
                ? `**Last Updated:** ${new Date(page.history.lastUpdated.when).toLocaleString()} by ${page.history.lastUpdated.by.displayName}\n`
                : ''
            }${
              page.body?.storage
                ? `\n**Content:**\n${this.formatContent(page.body.storage.value)}\n`
                : ''
            }\n**Direct Link:** ${this.config.url}/wiki/spaces/${page.space.key}/pages/${page.id}`,
        },
      ],
    };
  }

  private async getPageByTitle(args: any) {
    const { spaceKey, title, expand = ['body.storage', 'version', 'space'] } = args;

    const pages = await this.client.getContentBySpaceAndTitle(spaceKey, title, { expand });

    if (pages.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No pages found with title "${title}" in space ${spaceKey}`,
          },
        ],
      };
    }

    // Return the first page (most common case)
    const page = pages[0]!; // Safe because we check pages.length === 0 above

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Page: ${page.title}**\n\n` +
            `**ID:** ${page.id}\n` +
            `**Space:** ${page.space.name} (${page.space.key})\n` +
            `**Type:** ${page.type}\n` +
            `**Version:** ${page.version.number}\n${
              pages.length > 1
                ? `**Note:** ${pages.length} pages found with this title, showing the first one.\n`
                : ''
            }${
              page.body?.storage
                ? `\n**Content:**\n${this.formatContent(page.body.storage.value)}\n`
                : ''
            }\n**Direct Link:** ${this.config.url}/wiki/spaces/${page.space.key}/pages/${page.id}`,
        },
      ],
    };
  }

  private async createPage(args: any) {
    const { spaceKey, title, body, parentId, type = 'page', labels = [] } = args;

    // Build the page input
    const pageInput: any = {
      type,
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: this.processBodyContent(body),
          representation: 'storage',
        },
      },
    };

    if (parentId) {
      pageInput.ancestors = [{ id: parentId }];
    }

    const createdPage = await this.client.createContent(pageInput);

    // Add labels if provided
    if (labels.length > 0) {
      for (const labelName of labels) {
        try {
          await this.client.addLabel(createdPage.id, { prefix: 'global', name: labelName });
        } catch (error) {
          logger.warn('Failed to add label', { pageId: createdPage.id, label: labelName, error });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Page Created Successfully**\n\n` +
            `**Title:** ${title}\n` +
            `**ID:** ${createdPage.id}\n` +
            `**Space:** ${spaceKey}\n` +
            `**Type:** ${type}\n${
              labels.length > 0 ? `**Labels:** ${labels.join(', ')}\n` : ''
            }\n**Direct Link:** ${this.config.url}/wiki/spaces/${spaceKey}/pages/${createdPage.id}`,
        },
      ],
    };
  }

  private async updatePage(args: any) {
    const {
      pageId,
      title,
      body,
      versionComment = 'Updated via MCP',
      minorEdit = false,
      labels,
    } = args;

    // Get current page to increment version
    const currentPage = await this.client.getContent(pageId, { expand: ['version', 'space'] });

    // Build the update input
    const updateInput: any = {
      version: {
        number: currentPage.version.number + 1,
        message: versionComment,
        minorEdit,
      },
      type: currentPage.type,
      title: title || currentPage.title,
    };

    if (body) {
      updateInput.body = {
        storage: {
          value: this.processBodyContent(body),
          representation: 'storage',
        },
      };
    }

    const updatedPage = await this.client.updateContent(pageId, updateInput);

    // Update labels if provided
    if (labels) {
      // Remove existing labels and add new ones
      // Note: This is a simplified approach; in production, you might want to be more selective
      for (const labelName of labels) {
        try {
          await this.client.addLabel(pageId, { prefix: 'global', name: labelName });
        } catch (error) {
          logger.warn('Failed to add label', { pageId, label: labelName, error });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Page Updated Successfully**\n\n` +
            `**Title:** ${updatedPage.title}\n` +
            `**ID:** ${pageId}\n` +
            `**Version:** ${updatedPage.version.number}\n` +
            `**Comment:** ${versionComment}\n` +
            `\n**Direct Link:** ${this.config.url}/wiki/spaces/${updatedPage.space.key}/pages/${pageId}`,
        },
      ],
    };
  }

  private async getSpaces(args: any) {
    const { type, status = 'current', expand = [], limit = 50 } = args;

    const spacesResult = await this.client.getSpaces({ type, status, expand, limit });

    if (spacesResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No Confluence spaces found`,
          },
        ],
      };
    }

    const spacesList = spacesResult.results
      .map(space => `• **${space.name}** (${space.key}) - ${space.type}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Confluence Spaces (${spacesResult.results.length} found)**\n\n${spacesList}`,
        },
      ],
    };
  }

  private async getSpace(args: any) {
    const { spaceKey, expand = ['description', 'homepage'] } = args;

    const space = await this.client.getSpace(spaceKey, { expand });

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Space: ${space.name}**\n\n` +
            `**Key:** ${space.key}\n` +
            `**Type:** ${space.type}\n` +
            `**Status:** ${space.status}\n${
              space.description
                ? `**Description:** ${this.formatContent(space.description.plain.value)}\n`
                : ''
            }${
              space.homepage ? `**Homepage:** ${space.homepage.title}\n` : ''
            }\n**Direct Link:** ${this.config.url}/wiki/spaces/${space.key}`,
        },
      ],
    };
  }

  private async getSpaceContent(args: any) {
    const {
      spaceKey,
      type = 'page',
      status = 'current',
      expand = ['version', 'space'],
      limit = 50,
    } = args;

    const contentResult = await this.client.getSpaceContent(spaceKey, {
      type,
      status,
      expand,
      limit,
    });

    if (contentResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No ${type} content found in space ${spaceKey}`,
          },
        ],
      };
    }

    const contentList = contentResult.results
      .map(
        content =>
          `• **${content.title}** (v${content.version.number}) - ${new Date(content.version.when).toLocaleDateString()}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**${type === 'page' ? 'Pages' : 'Blog Posts'} in Space ${spaceKey}**\n\n` +
            `**Found:** ${contentResult.size} items (showing ${contentResult.results.length})\n\n` +
            `${contentList}`,
        },
      ],
    };
  }

  private async addComment(args: any) {
    const { pageId, body, parentCommentId } = args;

    const commentInput: any = {
      type: 'comment',
      container: { id: pageId },
      body: {
        storage: {
          value: this.processBodyContent(body),
          representation: 'storage',
        },
      },
    };

    if (parentCommentId) {
      commentInput.ancestors = [{ id: parentCommentId }];
    }

    const comment = await this.client.addComment(commentInput);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Comment Added Successfully**\n\n` +
            `**Page ID:** ${pageId}\n` +
            `**Comment ID:** ${comment.id}\n` +
            `**Author:** ${comment.history.createdBy.displayName}\n` +
            `**Created:** ${new Date(comment.history.createdDate).toLocaleString()}\n` +
            `**Comment:** ${body}`,
        },
      ],
    };
  }

  // === Extended Tool Implementations ===

  private async searchUsers(args: any) {
    const { query, limit = 50 } = args;

    const users = await this.client.searchUsers(query, limit);

    if (users.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No users found matching "${query}"`,
          },
        ],
      };
    }

    const usersList = users
      .map(
        user =>
          `• **${user.displayName}** (${user.username})\n` +
          `  Email: ${user.email || 'Not available'}\n` +
          `  Active: ${user.active ? 'Yes' : 'No'}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Users matching "${query}"**\n\n` +
            `**Found:** ${users.length} users\n\n` +
            `${usersList}`,
        },
      ],
    };
  }

  private async addLabel(args: any) {
    const { pageId, label, prefix = 'global' } = args;

    await this.client.addLabel(pageId, { prefix, name: label });

    return {
      content: [
        {
          type: 'text',
          text:
            `**Label Added Successfully**\n\n` +
            `**Page ID:** ${pageId}\n` +
            `**Label:** ${label}\n` +
            `**Prefix:** ${prefix}\n` +
            `\n**Direct Link:** ${this.config.url}/wiki/spaces/${pageId}/pages`,
        },
      ],
    };
  }

  private async getLabels(args: any) {
    const { pageId, prefix, limit = 50 } = args;

    const labelsResult = await this.client.getLabels(pageId, { prefix, limit });

    if (labelsResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No labels found for page ${pageId}**`,
          },
        ],
      };
    }

    const labelsList = labelsResult.results
      .map((label: any) => `• **${label.name}** (${label.prefix})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Labels for Page ${pageId}**\n\n` +
            `**Total:** ${labelsResult.size} labels\n\n` +
            `${labelsList}`,
        },
      ],
    };
  }

  private async getPagesByLabel(args: any) {
    const { label, spaceKey, expand = ['version', 'space'], limit = 50 } = args;

    const pagesResult = await this.client.getPagesByLabel(label, { spaceKey, expand, limit });

    if (pagesResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No pages found with label "${label}"${spaceKey ? ` in space ${spaceKey}` : ''}**`,
          },
        ],
      };
    }

    const pagesList = pagesResult.results
      .map(
        (page: any) =>
          `• **${page.title}** (${page.space.name})\n` +
          `  Version: ${page.version.number} - ${new Date(page.version.when).toLocaleDateString()}\n` +
          `  URL: ${this.config.url}/wiki/spaces/${page.space.key}/pages/${page.id}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Pages with Label "${label}"**\n\n` +
            `**Found:** ${pagesResult.totalSize} pages (showing ${pagesResult.results.length})\n\n` +
            `${pagesList}`,
        },
      ],
    };
  }

  private async getPageChildren(args: any) {
    const { pageId, expand = ['version', 'space'], limit = 50 } = args;

    const childrenResult = await this.client.getPageChildren(pageId, { expand, limit });

    if (childrenResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No child pages found for page ${pageId}**`,
          },
        ],
      };
    }

    const childrenList = childrenResult.results
      .map(
        (child: any) =>
          `• **${child.title}**\n` +
          `  Version: ${child.version.number}\n` +
          `  URL: ${this.config.url}/wiki/spaces/${child.space.key}/pages/${child.id}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Child Pages of ${pageId}**\n\n` +
            `**Total:** ${childrenResult.size} pages\n\n` +
            `${childrenList}`,
        },
      ],
    };
  }

  private async getComments(args: any) {
    const { pageId, location, expand = ['body.view', 'history.lastUpdated'], limit = 50 } = args;

    const commentsResult = await this.client.getComments(pageId, { location, expand, limit });

    if (commentsResult.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No comments found for page ${pageId}**`,
          },
        ],
      };
    }

    const commentsList = commentsResult.results
      .map(
        (comment: any) =>
          `• **${comment.history.createdBy.displayName}** - ${new Date(comment.history.createdDate).toLocaleDateString()}\n` +
          `  ${this.formatContent(comment.body?.view?.value || comment.body?.storage?.value || 'No content')}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Comments for Page ${pageId}**\n\n` +
            `**Total:** ${commentsResult.size} comments\n\n` +
            `${commentsList}`,
        },
      ],
    };
  }

  private async deletePage(args: any) {
    const { pageId, permanent = false } = args;

    await this.client.deleteContent(pageId, permanent ? 'deleted' : 'trashed');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Confluence Page ${permanent ? 'Deleted' : 'Moved to Trash'} Successfully**\n\n` +
            `**Page ID:** ${pageId}\n` +
            `**Action:** ${permanent ? 'Permanent deletion' : 'Moved to trash'}`,
        },
      ],
    };
  }

  private async getPageHistory(args: any) {
    const {
      pageId,
      expand = ['lastUpdated', 'previousVersion', 'contributors'],
      limit = 25,
    } = args;

    const historyResult = await this.client.getContentHistory(pageId, { expand, limit });

    if (!historyResult.lastUpdated && !historyResult.previousVersion) {
      return {
        content: [
          {
            type: 'text',
            text: `**No version history available for page ${pageId}**`,
          },
        ],
      };
    }

    let historyText = `**Version History for Page ${pageId}**\n\n`;

    if (historyResult.lastUpdated) {
      const lastUpdate = historyResult.lastUpdated;
      historyText +=
        `**Last Updated:**\n` +
        `• **When:** ${new Date(lastUpdate.when).toLocaleString()}\n` +
        `• **By:** ${lastUpdate.by.displayName}\n` +
        `• **Message:** ${lastUpdate.message || 'No message'}\n\n`;
    }

    if (historyResult.previousVersion) {
      const prevVersion = historyResult.previousVersion;
      historyText +=
        `**Previous Version:**\n` +
        `• **Version:** ${prevVersion.number}\n` +
        `• **When:** ${new Date(prevVersion.when).toLocaleString()}\n` +
        `• **By:** ${prevVersion.by.displayName}\n\n`;
    }

    if (historyResult.contributors?.publishers) {
      const contributors = historyResult.contributors.publishers.users;
      if (contributors.length > 0) {
        historyText += `**Contributors:**\n`;
        contributors.forEach((user: any) => {
          historyText += `• ${user.displayName}\n`;
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: historyText,
        },
      ],
    };
  }

  // === Utility Methods ===

  private formatContent(content: string): string {
    // Basic formatting for storage format content
    if (!content) return '';

    // Remove common Confluence storage format tags for better readability
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace escaped ampersands
      .replace(/&lt;/g, '<') // Replace escaped less-than
      .replace(/&gt;/g, '>') // Replace escaped greater-than
      .trim();
  }

  private processBodyContent(body: string): string {
    // If the body already contains HTML/storage format, return as-is
    if (body.includes('<') && body.includes('>')) {
      return body;
    }

    // Convert plain text to basic storage format
    return `<p>${body.replace(/\n/g, '</p><p>')}</p>`;
  }
}
