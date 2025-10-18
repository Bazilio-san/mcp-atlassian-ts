/**
 * JIRA Tools Manager - Modular Architecture
 * Manages all JIRA MCP tools using modular approach
 */

import { createAuthenticationManager, createAuthenticationManagerFromHeaders } from '../../core/auth.js';
import { getCache } from '../../core/cache.js';
import { createLogger } from '../../core/utils/logger.js';
import { ToolExecutionError } from '../../core/errors.js';

import type { JCConfig, ToolWithHandler } from '../../types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './shared/tool-context.js';

// Import tool modules - Core tools
import { jira_get_issue } from './tools/core/jira_get_issue.js';
import { jira_search_issues } from './tools/core/jira_search_issues.js';
import { createJiraCreateIssueTool } from './tools/core/jira_create_issue.js';
import { jira_update_issue } from './tools/core/jira_update_issue.js';
import { jira_delete_issue } from './tools/core/jira_delete_issue.js';
import { jira_batch_create_issues } from './tools/core/jira_batch_create_issues.js';
import { jira_link_to_epic } from './tools/core/jira_link_to_epic.js';
import { jira_find_epic } from './tools/core/jira_find_epic.js';

// Import comment and transition tools
import { jira_add_comment } from './tools/comments/jira_add_comment.js';
import { jira_get_comments } from './tools/comments/jira_get_comments.js';
import { jira_delete_comment } from './tools/comments/jira_delete_comment.js';
import { jira_update_comment } from './tools/comments/jira_update_comment.js';
import { jira_get_transitions } from './tools/core/jira_get_transitions.js';
import { jira_transition_issue } from './tools/core/jira_transition_issue.js';

// Import project tools
import { jira_get_projects } from './tools/projects/jira_get_projects.js';
import { jira_get_project } from './tools/projects/jira_get_project.js';
import { jira_get_project_versions } from './tools/projects/jira_get_project_versions.js';
import { jira_create_project_version } from './tools/projects/jira_create_project_version.js';
import { jira_delete_version } from './tools/projects/jira_delete_version.js';
import { jira_batch_create_versions } from './tools/projects/jira_batch_create_versions.js';
import { jira_find_project } from './tools/projects/jira_find_project.js';
import { jira_force_update_projects_index } from './tools/projects/jira_force_update_projects_index.js';
import { jira_get_epics_for_project } from './tools/projects/jira_get_epics_for_project.js';

// Import user tools
import { jira_get_user_profile } from './tools/metadata/jira_get_user_profile.js';

// Import link tools
import { jira_get_link_types } from './tools/links/jira_get_link_types.js';
import { jira_create_issue_link } from './tools/links/jira_create_issue_link.js';
import { jira_create_remote_issue_link } from './tools/links/jira_create_remote_issue_link.js';
import { jira_remove_issue_link } from './tools/links/jira_remove_issue_link.js';

// Import worklog tools
import { jira_get_worklog } from './tools/worklog/jira_get_worklog.js';
import { jira_add_worklog } from './tools/worklog/jira_add_worklog.js';

// Import attachment tools
import { jira_download_attachments } from './tools/attachments/jira_download_attachments.js';

// Import agile tools
import { jira_get_agile_boards } from './tools/agile/jira_get_agile_boards.js';
import { jira_get_board_issues } from './tools/agile/jira_get_board_issues.js';
import { jira_get_sprints_from_board } from './tools/agile/jira_get_sprints_from_board.js';
import { jira_get_sprint_issues } from './tools/agile/jira_get_sprint_issues.js';
import { jira_create_sprint } from './tools/agile/jira_create_sprint.js';
import { jira_update_sprint } from './tools/agile/jira_update_sprint.js';

// Import metadata tools
import { jira_search_fields } from './tools/metadata/jira_search_fields.js';
import { jira_get_priorities } from './tools/metadata/jira_get_priorities.js';

// Import bulk operation tools
import { jira_batch_get_changelogs } from './tools/bulk/jira_batch_get_changelogs.js';

// Import projects cache initialization
import { initializeProjectsCache } from './tools/projects/search-project/projects-cache.js';

/**
 * Modular JIRA Tools Manager
 */
export class JiraToolsManager {
  private context: ToolContext;
  private tools: Map<string, ToolWithHandler>;
  private toolsArray: Tool[];
  private logger = createLogger('jira-tools');

  constructor (config: JCConfig) {
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

    // Create tool context
    this.context = {
      httpClient,
      cache,
      config,
      logger: this.logger,
      normalizeToArray: this.normalizeToArray.bind(this),
      formatDescription: this.formatDescription.bind(this),
      expandStringOrArray: this.expandStringOrArray.bind(this),
    };

    // Initialize tools storage
    this.tools = new Map();
    this.toolsArray = [];
  }

  /**
   * Initialize JIRA tools manager (for compatibility)
   */
  async initialize (): Promise<void> {
    this.context.logger.info('JIRA tools manager initializing...');

    // Initialize projects cache with HTTP client
    initializeProjectsCache(this.context);
    this.context.logger.info('Projects cache initialized');

    this.context.logger.info('JIRA tools manager initialized');

    // Build tools list
    await this.buildToolsList(this.context.config.epicLinkFieldId);
  }

  /**
   * Build the tools list
   */
  private async buildToolsList (epicLinkFieldId?: string): Promise<void> {
    // Clear existing tools
    this.tools.clear();
    this.toolsArray = [];
    const jira_create_issue = await createJiraCreateIssueTool();
    // Register all tools with their handlers
    const toolInstances = [
      // Core tools
      jira_get_issue,
      jira_search_issues,
      jira_create_issue, // Create fresh instance with current priorities
      jira_update_issue(epicLinkFieldId), // Create jira_update_issue with dynamic epicLinkFieldId
      jira_delete_issue,
      jira_batch_create_issues,
      jira_link_to_epic,
      jira_find_epic,

      // Comment and transition tools
      jira_add_comment,
      jira_get_comments,
      jira_delete_comment,
      jira_update_comment,
      jira_get_transitions,
      jira_transition_issue,

      // Project tools
      jira_get_projects,
      jira_get_project,
      jira_get_project_versions,
      jira_create_project_version,
      jira_delete_version,
      jira_batch_create_versions,
      jira_find_project,
      jira_force_update_projects_index,
      jira_get_epics_for_project,

      // User tools
      jira_get_user_profile,

      // Link tools
      jira_get_link_types,
      jira_create_issue_link,
      jira_create_remote_issue_link,
      jira_remove_issue_link,

      // Worklog tools
      jira_get_worklog,
      jira_add_worklog,

      // Attachment tools
      jira_download_attachments,

      // Agile tools
      jira_get_agile_boards,
      jira_get_board_issues,
      jira_get_sprints_from_board,
      jira_get_sprint_issues,
      jira_create_sprint,
      jira_update_sprint,

      // Metadata tools
      jira_search_fields,
      jira_get_priorities,

      // Bulk operation tools
      jira_batch_get_changelogs,
    ];

    // Create maps for fast lookup
    for (const tool of toolInstances) {
      this.tools.set(tool.name, tool);
      // Create Tool without handler for the array
      const { handler: _foo, ...toolWithoutHandler } = tool;
      this.toolsArray.push(toolWithoutHandler as Tool);
    }
  }

  /**
   * Get all available JIRA tools
   */
  getAvailableTools (): Tool[] {
    return this.toolsArray;
  }

  /**
   * Execute a JIRA tool by name
   */
  async executeTool (
    toolName: string,
    args: Record<string, any>,
    customHeaders?: Record<string, string>,
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool || !tool.handler) {
      throw new ToolExecutionError(toolName, `Unknown JIRA tool: ${toolName}`);
    }

    // Apply custom headers if provided
    let contextToUse = this.context;
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      // Extract JIRA-specific headers from custom headers
      const jiraHeaders: Record<string, string> = {};
      Object.keys(customHeaders).forEach(key => {
        if (key.startsWith('x-jira-')) {
          const value = customHeaders[key];
          if (value) {
            jiraHeaders[key] = value;
          }
        }
      });

      // If we have JIRA-specific headers, create authentication manager from headers
      // Otherwise, use system auth with additional headers
      let customHttpClient;
      if (Object.keys(jiraHeaders).length > 0) {
        // Use header-based authentication
        const authManager = createAuthenticationManagerFromHeaders(jiraHeaders, this.context.config.url);
        customHttpClient = authManager.getHttpClient();
        this.logger.debug('Using header-based authentication for JIRA', { headers: Object.keys(jiraHeaders) });
      } else {
        // Use system authentication with additional headers
        const authManager = createAuthenticationManager(this.context.config.auth, this.context.config.url);
        customHttpClient = authManager.getHttpClient();

        // Add custom headers via interceptor
        customHttpClient.interceptors.request.use(
          config => {
            if (config.headers) {
              Object.assign(config.headers, customHeaders);
            }
            return config;
          },
          error => Promise.reject(error),
        );
        this.logger.debug('Using system authentication with additional headers for JIRA');
      }

      // Create context with custom HTTP client
      contextToUse = {
        ...this.context,
        httpClient: customHttpClient,
      };
    }

    // Execute the handler
    return tool.handler(args, contextToUse);
  }

  /**
   * Health check for JIRA connectivity
   */
  async healthCheck (): Promise<any> {
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
   * Normalize string or array parameter to array
   */
  private normalizeToArray (value: string | string[] | undefined): string[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return [value];
  }

  /**
   * Format description field
   */
  private formatDescription (description: any): string {
    if (!description) {
      return '';
    }
    if (typeof description === 'string') {
      return description;
    }

    // Handle JIRA's ADF (Atlassian Document Format)
    if (description && typeof description === 'object') {
      if (description.content) {
        // Simple extraction of text from ADF
        const extractText = (node: any): string => {
          if (node.type === 'text') {
            return node.text || '';
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('');
          }
          if (node.type === 'hardBreak') {
            return '\n';
          }
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
  private expandStringOrArray (value: string | string[] | undefined, separator: string = ','): string | undefined {
    if (!value) {
      return undefined;
    }
    const arr = this.normalizeToArray(value);
    return arr.length > 0 ? arr.join(separator) : undefined;
  }
}
