/**
 * JIRA Tools Manager - Modular Architecture
 * Manages all JIRA MCP tools using modular approach
 */

import { createAuthenticationManager } from '../../core/auth/index.js';
import { getCache } from '../../core/cache/index.js';
import { createLogger } from '../../core/utils/logger.js';
import { ToolExecutionError } from '../../core/errors/index.js';

import type { JCConfig } from '../../types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './shared/tool-context.js';

// Import tool modules - Core tools
import { getIssueTool, getIssueHandler } from './tools/core/get-issue.js';
import { searchIssuesTool, searchIssuesHandler } from './tools/core/search-issues.js';
import { createIssueTool, createIssueHandler } from './tools/core/create-issue.js';
import { updateIssueTool, updateIssueHandler } from './tools/core/update-issue.js';
import { deleteIssueTool, deleteIssueHandler } from './tools/core/delete-issue.js';
import { batchCreateIssuesTool, batchCreateIssuesHandler } from './tools/core/batch-create-issues.js';

// Import comment and transition tools
import { addCommentTool, addCommentHandler } from './tools/comments/add-comment.js';
import { getTransitionsTool, getTransitionsHandler } from './tools/comments/get-transitions.js';
import { transitionIssueTool, transitionIssueHandler } from './tools/comments/transition-issue.js';

// Import project tools
import { getProjectsTool, getProjectsHandler } from './tools/projects/get-projects.js';
import { getProjectVersionsTool, getProjectVersionsHandler } from './tools/projects/get-project-versions.js';
import { createVersionTool, createVersionHandler } from './tools/projects/create-version.js';
import { batchCreateVersionsTool, batchCreateVersionsHandler } from './tools/projects/batch-create-versions.js';

// Import user tools
import { getUserProfileTool, getUserProfileHandler } from './tools/users/get-user-profile.js';

// Import link tools
import { getLinkTypesTool, getLinkTypesHandler } from './tools/links/get-link-types.js';
import { createIssueLinkTool, createIssueLinkHandler } from './tools/links/create-issue-link.js';
import { createRemoteIssueLinkTool, createRemoteIssueLinkHandler } from './tools/links/create-remote-issue-link.js';
import { removeIssueLinkTool, removeIssueLinkHandler } from './tools/links/remove-issue-link.js';
import { linkToEpicTool, linkToEpicHandler } from './tools/links/link-to-epic.js';

// Import worklog tools
import { getWorklogTool, getWorklogHandler } from './tools/worklog/get-worklog.js';
import { addWorklogTool, addWorklogHandler } from './tools/worklog/add-worklog.js';

// Import attachment tools
import { downloadAttachmentsTool, downloadAttachmentsHandler } from './tools/attachments/download-attachments.js';

// Import agile tools
import { getAgileBoardsTool, getAgileBoardsHandler } from './tools/agile/get-agile-boards.js';
import { getBoardIssuesTool, getBoardIssuesHandler } from './tools/agile/get-board-issues.js';
import { getSprintsFromBoardTool, getSprintsFromBoardHandler } from './tools/agile/get-sprints-from-board.js';
import { getSprintIssuesTool, getSprintIssuesHandler } from './tools/agile/get-sprint-issues.js';
import { createSprintTool, createSprintHandler } from './tools/agile/create-sprint.js';
import { updateSprintTool, updateSprintHandler } from './tools/agile/update-sprint.js';

// Import metadata tools
import { searchFieldsTool, searchFieldsHandler } from './tools/metadata/search-fields.js';

// Import bulk operation tools
import { batchGetChangelogsTool, batchGetChangelogsHandler } from './tools/bulk/batch-get-changelogs.js';

/**
 * Modular JIRA Tools Manager
 */
export class JiraToolsManager {
  private context: ToolContext;
  private toolHandlers: Map<string, (args: any, context: ToolContext) => Promise<any>>;
  private tools: Tool[];

  constructor(config: JCConfig) {
    // Validate configuration
    if (!config.url || config.url === '***') {
      throw new Error('JIRA URL is required but not configured');
    }
    if (!config.auth) {
      throw new Error('JIRA authentication is required but not configured');
    }

    // Create authentication manager and HTTP client
    const authManager = createAuthenticationManager(config.auth, config.url);
    const httpClient = authManager.getHttpClient();
    const cache = getCache();
    const logger = createLogger('jira-tools');

    // Create tool context
    this.context = {
      httpClient,
      cache,
      config,
      logger,
      invalidateIssueCache: this.invalidateIssueCache.bind(this),
      normalizeToArray: this.normalizeToArray.bind(this),
      formatDescription: this.formatDescription.bind(this),
      expandStringOrArray: this.expandStringOrArray.bind(this),
    };

    // Register all tool handlers
    this.toolHandlers = new Map([
      // Core tools
      ['jira_get_issue', getIssueHandler],
      ['jira_search_issues', searchIssuesHandler],
      ['jira_create_issue', createIssueHandler],
      ['jira_update_issue', updateIssueHandler],
      ['jira_delete_issue', deleteIssueHandler],
      ['jira_batch_create_issues', batchCreateIssuesHandler],

      // Comment and transition tools
      ['jira_add_comment', addCommentHandler],
      ['jira_get_transitions', getTransitionsHandler],
      ['jira_transition_issue', transitionIssueHandler],

      // Project tools
      ['jira_get_projects', getProjectsHandler],
      ['jira_get_project_versions', getProjectVersionsHandler],
      ['jira_create_version', createVersionHandler],
      ['jira_batch_create_versions', batchCreateVersionsHandler],

      // User tools
      ['jira_get_user_profile', getUserProfileHandler],

      // Link tools
      ['jira_get_link_types', getLinkTypesHandler],
      ['jira_create_issue_link', createIssueLinkHandler],
      ['jira_create_remote_issue_link', createRemoteIssueLinkHandler],
      ['jira_remove_issue_link', removeIssueLinkHandler],
      ['jira_link_to_epic', linkToEpicHandler],

      // Worklog tools
      ['jira_get_worklog', getWorklogHandler],
      ['jira_add_worklog', addWorklogHandler],

      // Attachment tools
      ['jira_download_attachments', downloadAttachmentsHandler],

      // Agile tools
      ['jira_get_agile_boards', getAgileBoardsHandler],
      ['jira_get_board_issues', getBoardIssuesHandler],
      ['jira_get_sprints_from_board', getSprintsFromBoardHandler],
      ['jira_get_sprint_issues', getSprintIssuesHandler],
      ['jira_create_sprint', createSprintHandler],
      ['jira_update_sprint', updateSprintHandler],

      // Metadata tools
      ['jira_search_fields', searchFieldsHandler],

      // Bulk operation tools
      ['jira_batch_get_changelogs', batchGetChangelogsHandler],
    ]);

    // Register all tools
    this.tools = [
      // Core tools
      getIssueTool,
      searchIssuesTool,
      createIssueTool,
      updateIssueTool,
      deleteIssueTool,
      batchCreateIssuesTool,

      // Comment and transition tools
      addCommentTool,
      getTransitionsTool,
      transitionIssueTool,

      // Project tools
      getProjectsTool,
      getProjectVersionsTool,
      createVersionTool,
      batchCreateVersionsTool,

      // User tools
      getUserProfileTool,

      // Link tools
      getLinkTypesTool,
      createIssueLinkTool,
      createRemoteIssueLinkTool,
      removeIssueLinkTool,
      linkToEpicTool,

      // Worklog tools
      getWorklogTool,
      addWorklogTool,

      // Attachment tools
      downloadAttachmentsTool,

      // Agile tools
      getAgileBoardsTool,
      getBoardIssuesTool,
      getSprintsFromBoardTool,
      getSprintIssuesTool,
      createSprintTool,
      updateSprintTool,

      // Metadata tools
      searchFieldsTool,

      // Bulk operation tools
      batchGetChangelogsTool,
    ];
  }

  /**
   * Get all available JIRA tools
   */
  getAvailableTools(): Tool[] {
    return this.tools;
  }

  /**
   * Execute a JIRA tool by name
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    customHeaders?: Record<string, string>
  ): Promise<any> {
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new ToolExecutionError(toolName, `Unknown JIRA tool: ${toolName}`);
    }

    // Apply custom headers if provided
    let contextToUse = this.context;
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      // Create a temporary HTTP client with additional headers
      const authManager = createAuthenticationManager(this.context.config.auth, this.context.config.url);
      const customHttpClient = authManager.getHttpClient();

      // Add custom headers via interceptor
      customHttpClient.interceptors.request.use(
        config => {
          if (config.headers) {
            Object.assign(config.headers, customHeaders);
          }
          return config;
        },
        error => Promise.reject(error)
      );

      // Create context with custom HTTP client
      contextToUse = {
        ...this.context,
        httpClient: customHttpClient,
      };
    }

    // Execute the handler
    return handler(args, contextToUse);
  }

  /**
   * Health check for JIRA connectivity
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await this.context.httpClient.get('/rest/api/2/myself');
      return {
        status: 'ok',
        user: {
          displayName: response.data.displayName,
          accountId: response.data.accountId,
          emailAddress: response.data.emailAddress,
          active: response.data.active,
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message || 'Failed to connect to JIRA',
      };
    }
  }

  // === Utility Methods (used by tool modules via context) ===

  /**
   * Invalidate cache entries related to an issue
   */
  private invalidateIssueCache(issueKey: string): void {
    const cache = this.context.cache;
    const keys = cache.keys();

    // Find and delete cache entries related to this issue or searches
    const relatedKeys = keys.filter(
      key =>
        key.includes(issueKey) ||
        key.includes('jira:search') ||
        key.includes('jira:projects') ||
        key.includes('jira:agile')
    );

    for (const key of relatedKeys) {
      cache.del(key);
    }

    this.context.logger.debug('Cache invalidated for issue', {
      issueKey,
      keysCleared: relatedKeys.length,
    });
  }

  /**
   * Normalize string or array parameter to array
   */
  private normalizeToArray(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  /**
   * Format description field
   */
  private formatDescription(description: any): string {
    if (!description) return '';
    if (typeof description === 'string') return description;

    // Handle JIRA's ADF (Atlassian Document Format)
    if (description && typeof description === 'object') {
      if (description.content) {
        // Simple extraction of text from ADF
        const extractText = (node: any): string => {
          if (node.type === 'text') return node.text || '';
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('');
          }
          if (node.type === 'hardBreak') return '\n';
          return '';
        };
        return extractText(description);
      }
      return JSON.stringify(description, null, 2);
    }

    return String(description);
  }

  /**
   * Expand string or array to comma-separated string
   */
  private expandStringOrArray(value: string | string[] | undefined, separator: string = ','): string | undefined {
    if (!value) return undefined;
    const arr = this.normalizeToArray(value);
    return arr.length > 0 ? arr.join(separator) : undefined;
  }
}