/**
 * Confluence API client with comprehensive functionality
 */

import { createAuthenticationManager } from '../../core/auth/index.js';
import { getCache, generateCacheKey } from '../../core/cache/index.js';
import { withErrorHandling, NotFoundError, ValidationError } from '../../core/errors/index.js';
import { createLogger } from '../../core/utils/logger.js';

import type {
  JCConfig,
  ConfluencePage,
  ConfluenceSpace,
  ConfluenceSearchRequest,
  ConfluenceSearchResponse,
  ConfluencePageInput,
  ConfluencePageUpdateInput,
  ConfluenceComment,
  ConfluenceCommentInput,
  ConfluenceLabel,
  ConfluenceLabelInput,
} from '../../types/index.js';
import type { AxiosInstance } from 'axios';

const logger = createLogger('confluence-client');

/**
 * Confluence API client with full functionality
 */
export class ConfluenceClient {
  private httpClient: AxiosInstance;
  private config: JCConfig;
  private cache = getCache();
  private customHeaders: Record<string, string> = {};

  constructor(config: JCConfig) {
    this.config = config;
    if (!config.url || config.url === '***') {
      throw new Error('Confluence URL is required but not configured');
    }
    if (!config.auth) {
      throw new Error('Confluence authentication is required but not configured');
    }
    const authManager = createAuthenticationManager(config.auth, config.url);
    this.httpClient = authManager.getHttpClient();
  }

  /**
   * Set custom headers for all requests
   */
  setCustomHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...headers };
    logger.debug('Custom headers set for Confluence client', { headers: Object.keys(headers) });
  }

  /**
   * Get current custom headers
   */
  getCustomHeaders(): Record<string, string> {
    return { ...this.customHeaders };
  }

  /**
   * Get HTTP client with custom headers applied
   */
  private getHttpClientWithCustomHeaders(): AxiosInstance {
    if (Object.keys(this.customHeaders).length === 0) {
      return this.httpClient;
    }

    const authManager = createAuthenticationManager(this.config.auth, this.config.url);
    const client = authManager.getHttpClient();

    // Add custom headers to the client
    client.interceptors.request.use(
      config => {
        if (config.headers) {
          Object.assign(config.headers, this.customHeaders);
        }
        return config;
      },
      error => Promise.reject(error)
    );

    return client;
  }

  /**
   * Test connectivity and authentication
   */
  async healthCheck(): Promise<{ status: string; user?: any; error?: string }> {
    return withErrorHandling(async () => {
      // Confluence doesn't have a direct /myself endpoint, so we'll use space list
      const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/space', {
        params: { limit: 1 },
      });

      return {
        status: 'ok',
        spacesAvailable: response.data.size,
      };
    });
  }

  // === Content Management ===

  /**
   * Get content (page/blogpost) by ID
   */
  async getContent(
    contentId: string,
    options: {
      expand?: string[];
      status?: 'current' | 'trashed' | 'draft';
      version?: number;
    } = {}
  ): Promise<ConfluencePage> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'content', { contentId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence content', { contentId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get(`/wiki/rest/api/content/${contentId}`, {
          params,
        });

        if (!response.data) {
          throw new NotFoundError('Content', contentId);
        }

        return response.data;
      });
    });
  }

  /**
   * Get content by space and title
   */
  async getContentBySpaceAndTitle(
    spaceKey: string,
    title: string,
    options: {
      expand?: string[];
      status?: 'current' | 'trashed' | 'draft';
    } = {}
  ): Promise<ConfluencePage[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'contentByTitle', {
        spaceKey,
        title,
        ...options,
      });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence content by title', { spaceKey, title });

        const params: any = {
          spaceKey,
          title,
          ...options,
        };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/content', { params });
        return response.data.results;
      });
    });
  }

  /**
   * Search content using CQL
   */
  async searchContent(searchRequest: ConfluenceSearchRequest): Promise<ConfluenceSearchResponse> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'search', searchRequest);

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Searching Confluence content', {
            cql: searchRequest.cql,
            limit: searchRequest.limit,
          });

          // Apply default limit if not specified
          const request = {
            ...searchRequest,
            limit: searchRequest.limit || this.config.maxResults || 50,
          };

          const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/search', { params: request });
          return response.data;
        },
        60
      ); // Cache for 1 minute
    });
  }

  /**
   * Create new content (page/blogpost)
   */
  async createContent(contentInput: ConfluencePageInput): Promise<ConfluencePage> {
    return withErrorHandling(async () => {
      logger.info('Creating Confluence content', {
        type: contentInput.type,
        space: contentInput.space.key,
        title: contentInput.title,
      });

      // Validate required fields
      if (!contentInput.title) {
        throw new ValidationError('Title is required for content creation');
      }
      if (!contentInput.space?.key) {
        throw new ValidationError('Space key is required for content creation');
      }
      if (!contentInput.body?.storage?.value) {
        throw new ValidationError('Body content is required for content creation');
      }

      const response = await this.getHttpClientWithCustomHeaders().post('/wiki/rest/api/content', contentInput);

      // Clear cache for space and search results
      this.invalidateContentCache(response.data.id, contentInput.space.key);

      return response.data;
    });
  }

  /**
   * Update existing content
   */
  async updateContent(
    contentId: string,
    updateData: ConfluencePageUpdateInput
  ): Promise<ConfluencePage> {
    return withErrorHandling(async () => {
      logger.info('Updating Confluence content', { contentId });

      // Validate version number
      if (!updateData.version?.number) {
        throw new ValidationError('Version number is required for content updates');
      }

      const response = await this.getHttpClientWithCustomHeaders().put(`/wiki/rest/api/content/${contentId}`, updateData);

      // Clear cache for this content
      this.invalidateContentCache(contentId);

      return response.data;
    });
  }


  // === Space Management ===

  /**
   * Get all spaces
   */
  async getSpaces(
    options: {
      spaceKey?: string[];
      type?: 'global' | 'personal';
      status?: 'current' | 'archived';
      label?: string[];
      expand?: string[];
      start?: number;
      limit?: number;
    } = {}
  ): Promise<{ results: ConfluenceSpace[]; size: number; start: number; limit: number }> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'spaces', options);

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching Confluence spaces');

          const params: any = { ...options };
          if (options.spaceKey?.length) params.spaceKey = options.spaceKey.join(',');
          if (options.label?.length) params.label = options.label.join(',');
          if (options.expand?.length) params.expand = options.expand.join(',');

          const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/space', { params });
          return response.data;
        },
        300
      ); // Cache for 5 minutes
    });
  }

  /**
   * Get space by key
   */
  async getSpace(
    spaceKey: string,
    options: {
      expand?: string[];
    } = {}
  ): Promise<ConfluenceSpace> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'space', { spaceKey, ...options });

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching Confluence space', { spaceKey });

          const params: any = {};
          if (options.expand?.length) params.expand = options.expand.join(',');

          const response = await this.getHttpClientWithCustomHeaders().get(`/wiki/rest/api/space/${spaceKey}`, {
            params,
          });

          if (!response.data) {
            throw new NotFoundError('Space', spaceKey);
          }

          return response.data;
        },
        300
      ); // Cache for 5 minutes
    });
  }

  /**
   * Get content for a space
   */
  async getSpaceContent(
    spaceKey: string,
    options: {
      type?: 'page' | 'blogpost';
      title?: string;
      status?: 'current' | 'trashed' | 'draft';
      expand?: string[];
      start?: number;
      limit?: number;
    } = {}
  ): Promise<{ results: ConfluencePage[]; size: number; start: number; limit: number }> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'spaceContent', { spaceKey, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence space content', { spaceKey });

        const params: any = {
          spaceKey,
          ...options,
        };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/content', { params });
        return response.data;
      });
    });
  }

  // === Comments ===

  /**
   * Get comments for content
   */
  async getComments(
    contentId: string,
    options: {
      expand?: string[];
      start?: number;
      limit?: number;
      location?: string;
      depth?: 'all' | string;
    } = {}
  ): Promise<{ results: ConfluenceComment[]; size: number }> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'comments', { contentId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence comments', { contentId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get(
          `/wiki/rest/api/content/${contentId}/child/comment`,
          { params }
        );
        return response.data;
      });
    });
  }

  /**
   * Add comment to content
   */
  async addComment(commentInput: ConfluenceCommentInput): Promise<ConfluenceComment> {
    return withErrorHandling(async () => {
      logger.info('Adding Confluence comment', { containerId: commentInput.container.id });

      if (!commentInput.body?.storage?.value) {
        throw new ValidationError('Comment body is required');
      }

      const response = await this.getHttpClientWithCustomHeaders().post('/wiki/rest/api/content', commentInput);

      // Clear cache for the container content
      this.invalidateContentCache(commentInput.container.id);

      return response.data;
    });
  }

  // === Labels ===


  /**
   * Add label to content
   */
  async addLabel(contentId: string, label: ConfluenceLabelInput): Promise<ConfluenceLabel> {
    return withErrorHandling(async () => {
      logger.info('Adding Confluence label', { contentId, label: label.name });

      const response = await this.getHttpClientWithCustomHeaders().post(`/wiki/rest/api/content/${contentId}/label`, [
        label,
      ]);

      // Clear cache for this content
      this.invalidateContentCache(contentId);

      return response.data.results[0];
    });
  }

  /**
   * Remove label from content
   */
  async removeLabel(contentId: string, labelName: string): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Removing Confluence label', { contentId, labelName });

      await this.getHttpClientWithCustomHeaders().delete(`/wiki/rest/api/content/${contentId}/label/${labelName}`);

      // Clear cache for this content
      this.invalidateContentCache(contentId);
    });
  }

  // === Attachments ===

  /**
   * Get attachments for content
   */
  async getAttachments(
    contentId: string,
    options: {
      expand?: string[];
      start?: number;
      limit?: number;
      filename?: string;
      mediaType?: string;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'attachments', { contentId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence attachments', { contentId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get(
          `/wiki/rest/api/content/${contentId}/child/attachment`,
          { params }
        );
        return response.data;
      });
    });
  }

  // === Extended API Methods ===

  /**
   * Search for users in Confluence
   */
  async searchUsers(query: string, limit: number = 50): Promise<any[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'userSearch', { query, limit });

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Searching Confluence users', { query, limit });

          const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/search/user', {
            params: { cql: `user.fullname ~ "${query}" OR user.email ~ "${query}"`, limit },
          });

          return response.data.results || [];
        },
        300
      );
    });
  }


  /**
   * Get labels for content
   */
  async getLabels(
    contentId: string,
    options: {
      prefix?: string;
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'labels', { contentId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence labels', { contentId });

        const response = await this.getHttpClientWithCustomHeaders().get(`/wiki/rest/api/content/${contentId}/label`, {
          params: options,
        });

        return response.data;
      });
    });
  }

  /**
   * Get page children
   */
  async getPageChildren(
    pageId: string,
    options: {
      expand?: string[];
      start?: number;
      limit?: number;
      type?: string;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'pageChildren', { pageId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence page children', { pageId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get(`/wiki/rest/api/content/${pageId}/child/page`, {
          params,
        });

        return response.data;
      });
    });
  }


  /**
   * Delete content
   */
  async deleteContent(contentId: string, status?: 'trashed' | 'deleted'): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Deleting Confluence content', { contentId, status });

      if (status === 'trashed') {
        // Move to trash first
        await this.getHttpClientWithCustomHeaders().put(`/wiki/rest/api/content/${contentId}`, {
          version: { number: 1 }, // Will be updated automatically
          status: 'trashed',
        });
      } else {
        // Permanent deletion
        await this.getHttpClientWithCustomHeaders().delete(`/wiki/rest/api/content/${contentId}`);
      }

      this.invalidateContentCache(contentId);
    });
  }

  /**
   * Get all pages with a specific label
   */
  async getPagesByLabel(
    labelName: string,
    options: {
      spaceKey?: string;
      expand?: string[];
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'pagesByLabel', { labelName, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence pages by label', { labelName });

        let cql = `label = "${labelName}" AND type = page`;
        if (options.spaceKey) {
          cql += ` AND space = "${options.spaceKey}"`;
        }

        const params: any = {
          cql,
          start: options.start || 0,
          limit: options.limit || 50,
          excerpt: 'none',
        };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/content/search', { params });
        return response.data;
      });
    });
  }

  /**
   * Get content history
   */
  async getContentHistory(
    contentId: string,
    options: {
      expand?: string[];
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'contentHistory', { contentId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching Confluence content history', { contentId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.getHttpClientWithCustomHeaders().get(`/wiki/rest/api/content/${contentId}/history`, {
          params,
        });

        return response.data;
      });
    });
  }


  // === Utility Methods ===

  /**
   * Invalidate cache entries related to content
   */
  private invalidateContentCache(contentId: string, spaceKey?: string): void {
    const cache = getCache();
    const keys = cache.keys();

    // Find and delete cache entries related to this content
    const relatedKeys = keys.filter(
      key =>
        key.includes(contentId) ||
        key.includes('confluence:search') ||
        (spaceKey && key.includes(spaceKey))
    );

    for (const key of relatedKeys) {
      cache.del(key);
    }

    logger.debug('Cache invalidated for content', {
      contentId,
      spaceKey,
      keysCleared: relatedKeys.length,
    });
  }

  /**
   * Get current user information (via space permissions)
   */
  async getCurrentUser(): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('confluence', 'currentUser', {});

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          // Confluence REST API doesn't have a direct /myself endpoint
          // We'll get user info from the first space we can access
          const spacesResponse = await this.getHttpClientWithCustomHeaders().get('/wiki/rest/api/space', {
            params: { limit: 1, expand: 'permissions' },
          });

          if (spacesResponse.data.results.length > 0) {
            return {
              hasAccess: true,
              spacesAccessible: spacesResponse.data.size,
            };
          }

          return { hasAccess: false };
        },
        300
      ); // Cache for 5 minutes
    });
  }

  /**
   * Get configuration for the client
   */
  getConfig(): JCConfig {
    return this.config;
  }

  /**
   * Get the underlying HTTP client with custom headers applied
   */
  getHttpClient(): AxiosInstance {
    return this.getHttpClientWithCustomHeaders();
  }
}
