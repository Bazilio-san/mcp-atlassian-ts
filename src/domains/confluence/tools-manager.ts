/**
 * Confluence Tools Manager - Modular Architecture
 * Manages all Confluence MCP tools using modular approach
 */

import { createAuthenticationManager, createAuthenticationManagerFromHeaders } from '../../core/auth.js';
import { getCache } from '../../core/cache.js';
import { createLogger } from '../../core/utils/logger.js';
import { ToolExecutionError, withErrorHandling } from '../../core/errors.js';

import type { JCConfig, ToolWithHandler } from '../../types/index.js';
import type { ConfluenceToolWithHandler } from '../../types/confluence.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConfluenceToolContext } from './shared/tool-context.js';

// Import all modular tools directly
import { confluence_search } from './tools/content/confluence_search.js';
import { confluence_get_page } from './tools/content/confluence_get_page.js';
import { confluence_get_page_by_title } from './tools/content/confluence_get_page_by_title.js';
import { confluence_create_page } from './tools/content/confluence_create_page.js';
import { confluence_update_page } from './tools/content/confluence_update_page.js';
import { confluence_delete_page } from './tools/content/confluence_delete_page.js';
import { confluence_get_spaces } from './tools/spaces/confluence_get_spaces.js';
import { confluence_get_space } from './tools/spaces/confluence_get_space.js';
import { confluence_get_space_content } from './tools/spaces/confluence_get_space_content.js';
import { confluence_add_comment } from './tools/comments/confluence_add_comment.js';
import { confluence_get_comments } from './tools/comments/confluence_get_comments.js';
import { confluence_add_label } from './tools/labels/confluence_add_label.js';
import { confluence_get_labels } from './tools/labels/confluence_get_labels.js';
import { confluence_get_pages_by_label } from './tools/labels/confluence_get_pages_by_label.js';
import { confluence_get_page_children } from './tools/hierarchy/confluence_get_page_children.js';
import { confluence_get_page_history } from './tools/history/confluence_get_page_history.js';
import { confluence_search_user } from './tools/users/confluence_search_user.js';

/**
 * Modular Confluence Tools Manager
 */
export class ConfluenceToolsManager {
  private context: ConfluenceToolContext;
  private tools: Map<string, ToolWithHandler | ConfluenceToolWithHandler>;
  private toolsArray: Tool[];
  private logger = createLogger('confluence-tools');

  constructor (config: JCConfig) {
    // Validate configuration
    if (!config.url || config.url === '***') {
      throw new Error('Confluence URL is required but not configured');
    }
    if (!config.auth) {
      throw new Error('Confluence authentication is required but not configured');
    }

    // Create authentication manager and HTTP client
    const authManager = createAuthenticationManager(config.auth, config.url);
    const httpClient = authManager.getHttpClient();
    const cache = getCache();
    const logger = createLogger('confluence-tools');

    // Create tool context
    this.context = {
      httpClient,
      cache: {
        getOrSet: <T> (key: string, fn: () => Promise<T>, ttl?: number) => cache.getOrSet(key, fn, ttl),
        del: (key: string) => cache.del(key),
        keys: () => cache.keys(),
      },
      config,
      logger,
      invalidatePageCache: this.invalidatePageCache.bind(this),
      customHeaders: undefined,
    };

    // Register all tools with their handlers
    const toolInstances: (ToolWithHandler | ConfluenceToolWithHandler)[] = [
      // Content tools
      confluence_search,
      confluence_get_page,
      confluence_get_page_by_title,
      confluence_create_page,
      confluence_update_page,
      confluence_delete_page,

      // Spaces tools
      confluence_get_spaces,
      confluence_get_space,
      confluence_get_space_content,

      // Comments tools
      confluence_add_comment,
      confluence_get_comments,

      // Labels tools
      confluence_add_label,
      confluence_get_labels,
      confluence_get_pages_by_label,

      // Hierarchy tools
      confluence_get_page_children,

      // History tools
      confluence_get_page_history,

      // Users tools
      confluence_search_user,
    ];

    // Create maps for fast lookup
    this.tools = new Map();
    this.toolsArray = [];

    for (const tool of toolInstances) {
      // ConfluenceToolWithHandler extends Tool (minus handler), ToolWithHandler extends Tool
      // Both have name and inputSchema at runtime
      const toolName = (tool as any).name as string;
      this.tools.set(toolName, tool);
      // Create Tool without handler for the array
      const { handler: _foo, ...toolWithoutHandler } = tool as any;
      this.toolsArray.push(toolWithoutHandler as Tool);
    }
  }

  /**
   * Initialize Confluence tools manager (for compatibility)
   */
  async initialize (): Promise<void> {
    this.context.logger.info('Confluence tools manager initialized');
    // Any async initialization can go here if needed
  }

  /**
   * Get all available Confluence tools
   */
  getAvailableTools (): Tool[] {
    return this.toolsArray;
  }

  /**
   * Execute a Confluence tool by name
   */
  async executeTool (
    toolName: string,
    args: Record<string, any>,
    customHeaders?: Record<string, string>,
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool || !('handler' in tool)) {
      throw new ToolExecutionError(toolName, `Unknown Confluence tool: ${toolName}`);
    }

    // Apply custom headers if provided
    let contextToUse = this.context;
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      // Extract Confluence-specific headers from custom headers
      const confluenceHeaders: Record<string, string> = {};
      Object.keys(customHeaders).forEach(key => {
        if (key.startsWith('x-confluence-')) {
          const value = customHeaders[key];
          if (value) {
            confluenceHeaders[key] = value;
          }
        }
      });

      // If we have Confluence-specific headers, create authentication manager from headers
      // Otherwise, use system auth with additional headers
      let customHttpClient;
      if (Object.keys(confluenceHeaders).length > 0) {
        // Use header-based authentication
        const authManager = createAuthenticationManagerFromHeaders(confluenceHeaders, this.context.config.url);
        customHttpClient = authManager.getHttpClient();
        this.logger.debug(`Using header-based authentication for Confluence: headers: ${Object.keys(confluenceHeaders).join(', ')}`);
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
        this.logger.debug('Using system authentication with additional headers for Confluence');
      }

      // Create context with custom HTTP client
      contextToUse = {
        ...this.context,
        httpClient: customHttpClient,
        customHeaders,
      };
    }

    // Execute the handler
    return tool.handler(args, contextToUse);
  }

  /**
   * Health check for Confluence connectivity
   */
  async healthCheck (): Promise<any> {
    return withErrorHandling(async () => {
      // Confluence doesn't have a direct /myself endpoint, so we'll use space list
      const response = await this.context.httpClient.get('/wiki/rest/api/space', {
        params: { limit: 1 },
      });

      return {
        status: 'ok',
        spacesAvailable: response.data.size,
      };
    });
  }

  // === Utility Methods (used by tool modules via context) ===

  /**
   * Invalidate cache entries for a specific page
   */
  private invalidatePageCache (pageId: string): void {
    const cache = this.context.cache;
    const keys = cache.keys();

    // Find and delete cache entries related to this page
    const relatedKeys = keys.filter(key =>
      key.includes(`page:${pageId}`) ||
      key.includes('page-by-title') ||
      key.includes('search:'),
    );

    for (const key of relatedKeys) {
      cache.del(key);
    }

    this.context.logger.debug(`Cache invalidated for pageId: ${pageId} | keysCleared: ${relatedKeys.length}`);
  }
}
