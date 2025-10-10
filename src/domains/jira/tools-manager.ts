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
// TODO: Import remaining core tools when migrated
// import { updateIssueTool, updateIssueHandler } from './tools/core/update-issue.js';
// import { deleteIssueTool, deleteIssueHandler } from './tools/core/delete-issue.js';
// import { batchCreateIssuesTool, batchCreateIssuesHandler } from './tools/core/batch-create-issues.js';

// TODO: Import all other tool groups when migrated

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
      // TODO: Add remaining handlers as they are migrated
    ]);

    // Register all tools
    this.tools = [
      // Core tools
      getIssueTool,
      searchIssuesTool,
      createIssueTool,
      // TODO: Add remaining tools as they are migrated
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