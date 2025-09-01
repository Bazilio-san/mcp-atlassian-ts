/**
 * JIRA API client with comprehensive functionality
 */

import { createAuthenticationManager } from '../../core/auth/index.js';
import { getCache, generateCacheKey } from '../../core/cache/index.js';
import { withErrorHandling, NotFoundError, ValidationError } from '../../core/errors/index.js';
import { createLogger } from '../../core/utils/logger.js';

import type {
  AtlassianConfig,
  JiraIssue,
  JiraSearchRequest,
  JiraSearchResponse,
  JiraProject,
  JiraTransition,
  JiraIssueInput,
  JiraCommentInput,
  JiraComment,
  JiraWorklogInput,
  JiraWorklog,
} from '../../types/index.js';
import type { AxiosInstance } from 'axios';

const logger = createLogger('jira-client');

/**
 * JIRA API client with full functionality
 */
export class JiraClient {
  private httpClient: AxiosInstance;
  private config: AtlassianConfig;
  private cache = getCache();

  constructor(config: AtlassianConfig) {
    this.config = config;
    const authManager = createAuthenticationManager(config.auth, config.url);
    this.httpClient = authManager.getHttpClient();
  }

  /**
   * Test connectivity and authentication
   */
  async healthCheck(): Promise<{ status: string; user?: any; error?: string }> {
    return withErrorHandling(async () => {
      const response = await this.httpClient.get('/rest/api/2/myself');

      return {
        status: 'ok',
        user: {
          displayName: response.data.displayName,
          accountId: response.data.accountId,
          emailAddress: response.data.emailAddress,
          active: response.data.active,
        },
      };
    });
  }

  /**
   * Get user profile by account ID or email
   */
  async getUserProfile(userIdOrEmail: string): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'user', { userIdOrEmail });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA user profile', { userIdOrEmail });

        // Try by account ID first, then by email
        try {
          const response = await this.httpClient.get(`/rest/api/2/user`, {
            params: { accountId: userIdOrEmail },
          });
          return response.data;
        } catch (error) {
          // Fallback to email search
          const searchResponse = await this.httpClient.get('/rest/api/2/user/search', {
            params: { query: userIdOrEmail, maxResults: 1 },
          });

          if (searchResponse.data.length === 0) {
            throw new NotFoundError('User', userIdOrEmail);
          }

          return searchResponse.data[0];
        }
      });
    });
  }

  // === Issue Management ===

  /**
   * Get issue by key or ID
   */
  async getIssue(
    issueIdOrKey: string,
    options: {
      expand?: string[];
      fields?: string[];
      properties?: string[];
    } = {}
  ): Promise<JiraIssue> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'issue', { issueIdOrKey, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA issue', { issueIdOrKey });

        const params: any = {};
        if (options.expand?.length) params.expand = options.expand.join(',');
        if (options.fields?.length) params.fields = options.fields.join(',');
        if (options.properties?.length) params.properties = options.properties.join(',');

        const response = await this.httpClient.get(`/rest/api/2/issue/${issueIdOrKey}`, { params });

        if (!response.data) {
          throw new NotFoundError('Issue', issueIdOrKey);
        }

        return response.data;
      });
    });
  }

  /**
   * Search issues using JQL
   */
  async searchIssues(searchRequest: JiraSearchRequest): Promise<JiraSearchResponse> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'search', searchRequest);

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Searching JIRA issues', {
            jql: searchRequest.jql,
            maxResults: searchRequest.maxResults,
          });

          // Apply default maxResults if not specified
          const request = {
            ...searchRequest,
            maxResults: searchRequest.maxResults || this.config.jira?.maxResults || 50,
          };

          const response = await this.httpClient.post('/rest/api/2/search', request);
          return response.data;
        },
        60
      ); // Cache for 1 minute
    });
  }

  /**
   * Create a new issue
   */
  async createIssue(issueInput: JiraIssueInput): Promise<JiraIssue> {
    return withErrorHandling(async () => {
      logger.info('Creating JIRA issue', {
        project: issueInput.fields.project,
        issueType: issueInput.fields.issuetype,
        summary: issueInput.fields.summary,
      });

      // Validate required fields
      if (!issueInput.fields.summary) {
        throw new ValidationError('Summary is required for issue creation');
      }
      if (!issueInput.fields.project) {
        throw new ValidationError('Project is required for issue creation');
      }
      if (!issueInput.fields.issuetype) {
        throw new ValidationError('Issue type is required for issue creation');
      }

      const response = await this.httpClient.post('/rest/api/2/issue', issueInput);

      // Clear cache for project and search results
      this.invalidateIssueCache(response.data.key);

      return response.data;
    });
  }

  /**
   * Update an existing issue
   */
  async updateIssue(
    issueIdOrKey: string,
    updateData: {
      fields?: Partial<JiraIssue['fields']>;
      update?: Record<string, any>;
      properties?: Array<{ key: string; value: any }>;
    }
  ): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Updating JIRA issue', { issueIdOrKey });

      await this.httpClient.put(`/rest/api/2/issue/${issueIdOrKey}`, updateData);

      // Clear cache for this issue
      this.invalidateIssueCache(issueIdOrKey);
    });
  }

  /**
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: string, deleteSubtasks: boolean = false): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Deleting JIRA issue', { issueIdOrKey, deleteSubtasks });

      const params = deleteSubtasks ? { deleteSubtasks: 'true' } : {};
      await this.httpClient.delete(`/rest/api/2/issue/${issueIdOrKey}`, { params });

      // Clear cache for this issue
      this.invalidateIssueCache(issueIdOrKey);
    });
  }

  // === Comments ===

  /**
   * Get comments for an issue
   */
  async getComments(
    issueIdOrKey: string,
    options: {
      startAt?: number;
      maxResults?: number;
      orderBy?: string;
      expand?: string[];
    } = {}
  ): Promise<{ comments: JiraComment[]; total: number }> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'comments', { issueIdOrKey, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA comments', { issueIdOrKey });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');

        const response = await this.httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/comment`, {
          params,
        });

        return {
          comments: response.data.comments,
          total: response.data.total,
        };
      });
    });
  }

  /**
   * Add comment to an issue
   */
  async addComment(issueIdOrKey: string, commentInput: JiraCommentInput): Promise<JiraComment> {
    return withErrorHandling(async () => {
      logger.info('Adding JIRA comment', { issueIdOrKey });

      const response = await this.httpClient.post(
        `/rest/api/2/issue/${issueIdOrKey}/comment`,
        commentInput
      );

      // Clear cache for this issue's comments
      this.invalidateIssueCache(issueIdOrKey);

      return response.data;
    });
  }

  // === Transitions ===

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueIdOrKey: string): Promise<JiraTransition[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'transitions', { issueIdOrKey });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA transitions', { issueIdOrKey });

        const response = await this.httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/transitions`);

        return response.data.transitions;
      });
    });
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(
    issueIdOrKey: string,
    transition: {
      id: string;
      fields?: Record<string, any>;
      update?: Record<string, any>;
      comment?: JiraCommentInput;
    }
  ): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Transitioning JIRA issue', { issueIdOrKey, transitionId: transition.id });

      const transitionData = {
        transition: { id: transition.id },
        fields: transition.fields,
        update: transition.update,
        comment: transition.comment,
      };

      await this.httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/transitions`, transitionData);

      // Clear cache for this issue
      this.invalidateIssueCache(issueIdOrKey);
    });
  }

  // === Worklogs ===

  /**
   * Get worklogs for an issue
   */
  async getWorklogs(
    issueIdOrKey: string,
    options: {
      startAt?: number;
      maxResults?: number;
      startedAfter?: string;
      startedBefore?: string;
    } = {}
  ): Promise<{ worklogs: JiraWorklog[]; total: number }> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'worklogs', { issueIdOrKey, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA worklogs', { issueIdOrKey });

        const response = await this.httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/worklog`, {
          params: options,
        });

        return {
          worklogs: response.data.worklogs,
          total: response.data.total,
        };
      });
    });
  }

  /**
   * Add worklog to an issue
   */
  async addWorklog(issueIdOrKey: string, worklogInput: JiraWorklogInput): Promise<JiraWorklog> {
    return withErrorHandling(async () => {
      logger.info('Adding JIRA worklog', { issueIdOrKey, timeSpent: worklogInput.timeSpent });

      const response = await this.httpClient.post(
        `/rest/api/2/issue/${issueIdOrKey}/worklog`,
        worklogInput
      );

      // Clear cache for this issue
      this.invalidateIssueCache(issueIdOrKey);

      return response.data;
    });
  }

  // === Projects ===

  /**
   * Get all projects
   */
  async getProjects(
    options: {
      expand?: string[];
      recent?: number;
      properties?: string[];
    } = {}
  ): Promise<JiraProject[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'projects', options);

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching JIRA projects');

          const params: any = { ...options };
          if (options.expand?.length) params.expand = options.expand.join(',');
          if (options.properties?.length) params.properties = options.properties.join(',');

          const response = await this.httpClient.get('/rest/api/2/project', { params });
          return response.data;
        },
        300
      ); // Cache for 5 minutes
    });
  }

  /**
   * Get project by key or ID
   */
  async getProject(
    projectIdOrKey: string,
    options: {
      expand?: string[];
      properties?: string[];
    } = {}
  ): Promise<JiraProject> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'project', { projectIdOrKey, ...options });

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching JIRA project', { projectIdOrKey });

          const params: any = {};
          if (options.expand?.length) params.expand = options.expand.join(',');
          if (options.properties?.length) params.properties = options.properties.join(',');

          const response = await this.httpClient.get(`/rest/api/2/project/${projectIdOrKey}`, {
            params,
          });
          return response.data;
        },
        300
      ); // Cache for 5 minutes
    });
  }

  // === Utility Methods ===

  /**
   * Invalidate cache entries related to an issue
   */
  private invalidateIssueCache(issueKey: string): void {
    const cache = getCache();
    const keys = cache.keys();

    // Find and delete cache entries related to this issue
    const relatedKeys = keys.filter(
      key => key.includes(issueKey) || key.includes('jira:search') || key.includes('jira:projects')
    );

    for (const key of relatedKeys) {
      cache.del(key);
    }

    logger.debug('Cache invalidated for issue', { issueKey, keysCleared: relatedKeys.length });
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'currentUser', {});

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          const response = await this.httpClient.get('/rest/api/2/myself');
          return response.data;
        },
        300
      ); // Cache for 5 minutes
    });
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'serverInfo', {});

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          const response = await this.httpClient.get('/rest/api/2/serverInfo');
          return response.data;
        },
        600
      ); // Cache for 10 minutes
    });
  }

  /**
   * Get configuration for the client
   */
  getConfig(): AtlassianConfig {
    return this.config;
  }

  /**
   * Get the underlying HTTP client
   */
  getHttpClient(): AxiosInstance {
    return this.httpClient;
  }

  // === Extended API Methods ===

  /**
   * Delete an issue
   */
  async deleteIssue(issueIdOrKey: string, deleteSubtasks: boolean = false): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Deleting JIRA issue', { issueIdOrKey, deleteSubtasks });

      await this.httpClient.delete(`/rest/api/2/issue/${issueIdOrKey}`, {
        params: { deleteSubtasks },
      });

      this.invalidateIssueCache(issueIdOrKey);
    });
  }

  /**
   * Search for fields (custom fields)
   */
  async searchFields(query?: string): Promise<any[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'fields', { query });

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Searching JIRA fields', { query });

          const response = await this.httpClient.get('/rest/api/2/field');
          let fields = response.data;

          if (query) {
            fields = fields.filter(
              (field: any) =>
                field.name.toLowerCase().includes(query.toLowerCase()) ||
                field.key.toLowerCase().includes(query.toLowerCase())
            );
          }

          return fields;
        },
        600
      ); // Cache for 10 minutes
    });
  }

  /**
   * Get project versions
   */
  async getProjectVersions(projectIdOrKey: string): Promise<any[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'versions', { projectIdOrKey });

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching JIRA project versions', { projectIdOrKey });

          const response = await this.httpClient.get(
            `/rest/api/2/project/${projectIdOrKey}/versions`
          );
          return response.data;
        },
        300
      );
    });
  }

  /**
   * Create project version
   */
  async createVersion(versionInput: {
    name: string;
    projectId: string;
    description?: string;
    releaseDate?: string;
    startDate?: string;
    archived?: boolean;
    released?: boolean;
  }): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Creating JIRA version', {
        name: versionInput.name,
        projectId: versionInput.projectId,
      });

      const response = await this.httpClient.post('/rest/api/2/version', versionInput);

      // Invalidate versions cache
      this.cache
        .keys()
        .filter(key => key.includes('jira:versions'))
        .forEach(key => this.cache.del(key));

      return response.data;
    });
  }

  /**
   * Batch create versions
   */
  async batchCreateVersions(
    versions: Array<{
      name: string;
      projectId: string;
      description?: string;
      releaseDate?: string;
      startDate?: string;
    }>
  ): Promise<any[]> {
    return withErrorHandling(async () => {
      logger.info('Batch creating JIRA versions', { count: versions.length });

      const results = [];
      for (const version of versions) {
        try {
          const created = await this.createVersion(version);
          results.push(created);
        } catch (error) {
          logger.warn('Failed to create version', { version: version.name, error });
          results.push({ error: error.message, version: version.name });
        }
      }

      return results;
    });
  }

  /**
   * Get issue link types
   */
  async getLinkTypes(): Promise<any[]> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'linkTypes', {});

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching JIRA link types');

          const response = await this.httpClient.get('/rest/api/2/issueLinkType');
          return response.data.issueLinkTypes;
        },
        600
      ); // Cache for 10 minutes
    });
  }

  /**
   * Create issue link
   */
  async createIssueLink(linkData: {
    type: { name: string } | { id: string };
    inwardIssue: { key: string } | { id: string };
    outwardIssue: { key: string } | { id: string };
    comment?: { body: string };
  }): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Creating JIRA issue link', { linkData });

      await this.httpClient.post('/rest/api/2/issueLink', linkData);

      // Invalidate cache for linked issues
      const inwardKey =
        'key' in linkData.inwardIssue ? linkData.inwardIssue.key : linkData.inwardIssue.id;
      const outwardKey =
        'key' in linkData.outwardIssue ? linkData.outwardIssue.key : linkData.outwardIssue.id;
      this.invalidateIssueCache(inwardKey);
      this.invalidateIssueCache(outwardKey);
    });
  }

  /**
   * Create remote issue link
   */
  async createRemoteIssueLink(
    issueIdOrKey: string,
    linkData: {
      url: string;
      title: string;
      summary?: string;
      icon?: { url16x16: string; title: string };
    }
  ): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Creating JIRA remote issue link', { issueIdOrKey, url: linkData.url });

      const response = await this.httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/remotelink`, {
        object: linkData,
      });

      this.invalidateIssueCache(issueIdOrKey);
      return response.data;
    });
  }

  /**
   * Remove issue link
   */
  async removeIssueLink(linkId: string): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Removing JIRA issue link', { linkId });

      await this.httpClient.delete(`/rest/api/2/issueLink/${linkId}`);

      // Clear search cache since links may affect search results
      this.cache
        .keys()
        .filter(key => key.includes('jira:search'))
        .forEach(key => this.cache.del(key));
    });
  }

  /**
   * Link issue to epic
   */
  async linkToEpic(issueKey: string, epicKey: string): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Linking issue to epic', { issueKey, epicKey });

      // Update the epic link field
      await this.updateIssue(issueKey, {
        fields: {
          customfield_10014: epicKey, // Epic Link field (may vary by instance)
        },
      });
    });
  }

  /**
   * Download issue attachments metadata
   */
  async getAttachments(issueIdOrKey: string): Promise<any[]> {
    return withErrorHandling(async () => {
      const issue = await this.getIssue(issueIdOrKey, { expand: ['attachment'] });
      return issue.fields.attachment || [];
    });
  }

  /**
   * Download attachment content
   */
  async downloadAttachment(attachmentId: string): Promise<Buffer> {
    return withErrorHandling(async () => {
      logger.info('Downloading JIRA attachment', { attachmentId });

      const response = await this.httpClient.get(`/rest/api/2/attachment/${attachmentId}`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    });
  }

  /**
   * Batch create issues
   */
  async batchCreateIssues(issues: JiraIssueInput[]): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Batch creating JIRA issues', { count: issues.length });

      const response = await this.httpClient.post('/rest/api/2/issue/bulk', {
        issueUpdates: issues,
      });

      // Clear relevant caches
      this.cache
        .keys()
        .filter(key => key.includes('jira:search') || key.includes('jira:projects'))
        .forEach(key => this.cache.del(key));

      return response.data;
    });
  }

  /**
   * Batch get issue changelogs (Cloud only)
   */
  async batchGetChangelogs(issueKeys: string[]): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Batch fetching JIRA changelogs', { count: issueKeys.length });

      // For Cloud instances, use the bulk API
      const response = await this.httpClient.post('/rest/api/2/issue/changelog/list', {
        issueIds: issueKeys,
      });

      return response.data;
    });
  }

  // === Agile API Methods ===

  /**
   * Get agile boards
   */
  async getAgileBoards(
    options: {
      startAt?: number;
      maxResults?: number;
      type?: string;
      name?: string;
      projectKeyOrId?: string;
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'agileBoards', options);

      return this.cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching JIRA agile boards');

          const response = await this.httpClient.get('/rest/agile/1.0/board', {
            params: options,
          });

          return response.data;
        },
        300
      );
    });
  }

  /**
   * Get board issues
   */
  async getBoardIssues(
    boardId: string,
    options: {
      startAt?: number;
      maxResults?: number;
      jql?: string;
      expand?: string[];
      fields?: string[];
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'boardIssues', { boardId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA board issues', { boardId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');
        if (options.fields?.length) params.fields = options.fields.join(',');

        const response = await this.httpClient.get(`/rest/agile/1.0/board/${boardId}/issue`, {
          params,
        });

        return response.data;
      });
    });
  }

  /**
   * Get sprints from board
   */
  async getSprintsFromBoard(
    boardId: string,
    options: {
      startAt?: number;
      maxResults?: number;
      state?: 'active' | 'closed' | 'future';
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'boardSprints', { boardId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA board sprints', { boardId });

        const response = await this.httpClient.get(`/rest/agile/1.0/board/${boardId}/sprint`, {
          params: options,
        });

        return response.data;
      });
    });
  }

  /**
   * Get sprint issues
   */
  async getSprintIssues(
    sprintId: string,
    options: {
      startAt?: number;
      maxResults?: number;
      jql?: string;
      expand?: string[];
      fields?: string[];
    } = {}
  ): Promise<any> {
    return withErrorHandling(async () => {
      const cacheKey = generateCacheKey('jira', 'sprintIssues', { sprintId, ...options });

      return this.cache.getOrSet(cacheKey, async () => {
        logger.info('Fetching JIRA sprint issues', { sprintId });

        const params: any = { ...options };
        if (options.expand?.length) params.expand = options.expand.join(',');
        if (options.fields?.length) params.fields = options.fields.join(',');

        const response = await this.httpClient.get(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
          params,
        });

        return response.data;
      });
    });
  }

  /**
   * Create sprint
   */
  async createSprint(sprintData: {
    name: string;
    originBoardId: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Creating JIRA sprint', {
        name: sprintData.name,
        boardId: sprintData.originBoardId,
      });

      const response = await this.httpClient.post('/rest/agile/1.0/sprint', sprintData);

      // Clear board sprints cache
      this.cache
        .keys()
        .filter(key => key.includes('jira:boardSprints') || key.includes('jira:agileBoards'))
        .forEach(key => this.cache.del(key));

      return response.data;
    });
  }

  /**
   * Update sprint
   */
  async updateSprint(
    sprintId: string,
    sprintData: {
      name?: string;
      goal?: string;
      state?: 'active' | 'closed' | 'future';
      startDate?: string;
      endDate?: string;
    }
  ): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Updating JIRA sprint', { sprintId });

      const response = await this.httpClient.put(`/rest/agile/1.0/sprint/${sprintId}`, sprintData);

      // Clear sprint-related caches
      this.cache
        .keys()
        .filter(
          key => key.includes(`jira:sprintIssues:${sprintId}`) || key.includes('jira:boardSprints')
        )
        .forEach(key => this.cache.del(key));

      return response.data;
    });
  }
}
