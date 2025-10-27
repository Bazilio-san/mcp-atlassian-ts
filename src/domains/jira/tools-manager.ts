/**
 * JIRA Tools Manager - Modular Architecture
 * Manages all JIRA MCP tools using modular approach
 */

import { createAuthenticationManager, createAuthenticationManagerFromHeaders } from '../../core/auth.js';
import { getCache } from '../../core/cache.js';
import { createLogger } from '../../core/utils/logger.js';
import { ToolExecutionError } from '../../core/errors.js';

import { IADFDocument, JCConfig, ToolWithHandler } from '../../types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../types/tool-context';

// Import tool modules - Core tools
import { jira_get_issue } from './tools/core/jira_get_issue.js';
import { jira_search_issues } from './tools/core/jira_search_issues.js';
import { createJiraCreateIssueTool } from './tools/core/jira_create_issue.js';
import { createJiraUpdateIssueTool } from './tools/core/jira_update_issue.js';
import { jira_delete_issue } from './tools/core/jira_delete_issue.js';
import { jira_batch_create_issues } from './tools/core/jira_batch_create_issues.js';
import { jira_link_to_epic } from './tools/core/jira_link_to_epic.js';
import { jira_get_epics_for_project } from './tools/core/jira_get_epics_for_project.js';

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
import { jira_project_finder } from './tools/projects/jira_project_finder.js';

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
import { jira_get_attachments_info } from './tools/attachments/jira_get_attachments_info.js';

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
// @ts-ignore
import { md2Adf } from './shared/utils.js';
import { getPriorityNamesArray } from './shared/priority-service.js';
import chalk from 'chalk';

/**
 * Modular JIRA Tools Manager
 */
export class JiraToolsManager {
  private context: ToolContext;
  private tools: Map<string, ToolWithHandler>;
  private toolsArray: Tool[];
  private logger = createLogger('jira-tools', chalk.bgBlueBright);

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
      mdToADF: (md: string): string | IADFDocument => {
        return config.apiVersion === 2 ? md : md2Adf(md);
      },
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

    this.context.logger.info('Projects cache initialized');

    this.context.logger.info('JIRA tools manager initialized');

    // Build tools list
    await this.buildToolsList();
  }

  /**
   * Build the tools list
   * Made public to allow dynamic regeneration on each request
   * @param customHeaders - Optional custom HTTP headers for authentication
   */
  public async buildToolsList (customHeaders?: Record<string, string>): Promise<void> {
    const fieldIdEpicLink: string = this.context.config.fieldId!.epicLink;
    // Clear existing tools
    this.tools.clear();
    this.toolsArray = [];

    // Determine which HTTP client to use based on custom headers
    let httpClientToUse = this.context.httpClient;

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
      if (Object.keys(jiraHeaders).length > 0) {
        // Use header-based authentication
        const authManager = createAuthenticationManagerFromHeaders(jiraHeaders, this.context.config.url);
        httpClientToUse = authManager.getHttpClient();
        this.logger.debug(`Building tools list with header-based authentication: headers: ${Object.keys(jiraHeaders)}`);
      } else {
        // Use system authentication with additional headers
        const authManager = createAuthenticationManager(this.context.config.auth, this.context.config.url);
        httpClientToUse = authManager.getHttpClient();

        // Add custom headers via interceptor
        httpClientToUse.interceptors.request.use(
          config => {
            if (config.headers) {
              Object.assign(config.headers, customHeaders);
            }
            return config;
          },
          error => Promise.reject(error),
        );
        this.logger.debug('Building tools list with system authentication and additional headers');
      }
    }

    const priorityNamesArray = await getPriorityNamesArray(httpClientToUse, this.context.config);

    const jira_create_issue = await createJiraCreateIssueTool(priorityNamesArray);
    const jira_update_issue = await createJiraUpdateIssueTool(fieldIdEpicLink, priorityNamesArray);

    // Register all tools with their handlers
    const toolInstances = [
      // Core tools
      jira_get_issue,
      jira_search_issues,
      jira_create_issue, // Create fresh instance with current priorities
      jira_update_issue, // Create fresh instance with current priorities and epic link
      jira_delete_issue,
      jira_batch_create_issues,
      jira_link_to_epic,
      jira_get_epics_for_project,

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
      jira_project_finder,

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
      jira_get_attachments_info,

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
        this.logger.debug(`Using header-based authentication for JIRA: headers: ${Object.keys(jiraHeaders)}`);
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
      const toolLogger = this.logger.child({ component: toolName });

      // Create context with custom HTTP client
      contextToUse = {
        ...this.context,
        logger: toolLogger,
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
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-myself-get
      const response = await this.context.httpClient.get(`${this.context.config.restPath}/myself`);
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
}
