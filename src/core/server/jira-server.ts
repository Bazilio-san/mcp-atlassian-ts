/**
 * JIRA-specific MCP server implementation
 */

import type { IConfig } from '../../types/config';
import type { ServerConfig, JCConfig } from '../../types/index.js';
import type { AxiosInstance } from 'axios';
import { McpAtlassianServer } from './index.js';
import { ServiceToolRegistry } from './tools.js';
import { createLogger } from '../utils/logger.js';
import { hasStringValue, appConfig } from '../../bootstrap/init-config.js';
import { createAuthenticationManager } from '../auth.js';
import { getCache } from '../cache.js';
import { ServerError } from '../errors.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const logger = createLogger('jira-server');

// Global power HTTP client for JIRA
export let powerHttpClient: AxiosInstance | undefined;

/**
 * JIRA-only MCP server
 */
export class JiraServer extends McpAtlassianServer {
  protected override toolRegistry: ServiceToolRegistry;

  constructor (config: IConfig) {
    // Convert IConfig to the expected ServerConfig and JiraConfig formats
    const {
      jira: {
        auth: {
          basic: { username, password } = {},
          pat,
          oauth2,
        } = {},
        url,
        origin,
        maxResults,
        epicLinkFieldId,
        powerEndpoint,
      },
      cache,
      logger: { level: logLevel },
      server: {
        port,
        transportType,
      },
      rateLimit,
      subst,
    } = config;

    const serverConfig: ServerConfig = {
      port,
      logLevel,
      transportType,
      rateLimit,
      cache,
      ...(subst && { subst }),
    };

    // Build auth config from JIRA config - prioritize Basic auth
    let auth: any;
    if (hasStringValue(username) && hasStringValue(password)) {
      auth = { type: 'basic', username, password };
    } else if (hasStringValue(pat)) {
      auth = { type: 'pat', token: pat };
    } else if (oauth2?.clientId) {
      auth = { ...oauth2, type: 'oauth2' };
    }

    const jiraConfig: JCConfig = { url, origin, auth, maxResults };
    if (epicLinkFieldId) {
      jiraConfig.epicLinkFieldId = epicLinkFieldId;
    }

    // Create power HTTP client if configured
    if (powerEndpoint?.baseUrl && powerEndpoint?.auth) {
      // Convert IAuth to AuthConfig format
      let powerAuthConfig: any;
      if (powerEndpoint.auth.basic?.username && powerEndpoint.auth.basic?.password) {
        powerAuthConfig = {
          type: 'basic',
          username: powerEndpoint.auth.basic.username,
          password: powerEndpoint.auth.basic.password,
        };
      } else if (powerEndpoint.auth.pat) {
        powerAuthConfig = {
          type: 'pat',
          token: powerEndpoint.auth.pat,
        };
      } else if (powerEndpoint.auth.oauth2?.clientId) {
        powerAuthConfig = {
          ...powerEndpoint.auth.oauth2,
          type: 'oauth2',
        };
      }

      const powerAuthManager = createAuthenticationManager(
        powerAuthConfig,
        powerEndpoint.baseUrl,
      );
      powerHttpClient = powerAuthManager.getHttpClient();
      logger.info('Power endpoint configured for JIRA', {
        baseUrl: powerEndpoint.baseUrl,
      });
    }

    // Initialize parent with service mode configuration
    super(serverConfig, jiraConfig);

    // Replace the default tool registry with JIRA-only registry
    this.toolRegistry = new ServiceToolRegistry(jiraConfig, 'jira');

    // Setup JIRA-specific handlers after parent initialization
    this.setupServerHandlers();

    logger.info('JIRA server initialized');
  }

  /**
   * Register JIRA-specific tools only
   */
  override async registerTools (): Promise<void> {
    try {
      await this.toolRegistry.initializeTools();
      logger.info('JIRA tools registered successfully');
    } catch (error) {
      logger.error('Failed to register JIRA tools', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to register JIRA tools');
    }
  }

  /**
   * Override to add JIRA-specific resources
   */
  protected override setupServerHandlers (): void {
    super.setupServerHandlers();

    // Override list_resources to add JIRA-specific resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const baseResources = await this.getBaseResources();

      // Add JIRA-specific resources
      if (this.serviceConfig.url && this.serviceConfig.auth) {
        baseResources.push({
          uri: 'jira://priorities',
          name: 'JIRA Priorities',
          description: 'List of available priorities from JIRA instance',
          mimeType: 'application/json',
        });
      }

      return { resources: baseResources };
    });

    // Override resource read to handle JIRA-specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'jira://priorities') {
        const priorities = await this.fetchJiraPriorities();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(priorities, null, 2),
          }],
        };
      }

      // Delegate to parent for base resources
      return this.handleBaseResourceRead(uri);
    });
  }

  /**
   * Get base resources (common to all services)
   */
  private async getBaseResources () {
    return [
      {
        uri: 'atlassian://config',
        name: 'Atlassian Configuration',
        description: 'Current Atlassian configuration and connection status',
        mimeType: 'application/json',
      },
      {
        uri: 'atlassian://cache/stats',
        name: 'Cache Statistics',
        description: 'Current cache statistics and performance metrics',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Handle base resource reading
   */
  private async handleBaseResourceRead (uri: string) {
    switch (uri) {
      case 'atlassian://config':
        const authManager = createAuthenticationManager(
          this.serviceConfig.auth,
          this.serviceConfig.url,
        );

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              url: this.serviceConfig.url,
              auth: authManager.getAuthInfo(),
              config: this.serviceConfig,
            }, null, 2),
          }],
        };

      case 'atlassian://cache/stats':
        const cache = getCache();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(cache.getStats(), null, 2),
          }],
        };

      default:
        throw new ServerError(`Unknown resource URI: ${uri}`);
    }
  }

  /**
   * Fetch JIRA priorities for MCP resource
   */
  protected override async fetchJiraPriorities (): Promise<any> {
    const cache = getCache();
    const cacheKey = 'jira_priorities_resource';

    try {
      const authManager = createAuthenticationManager(
        this.serviceConfig.auth,
        this.serviceConfig.url,
        10000,
      );

      const priorities = await cache.getOrSet(
        cacheKey,
        async () => {
          logger.info('Fetching priorities from JIRA API for MCP resource');

          const httpClient = authManager.getHttpClient();
          const response = await httpClient.get('/rest/api/2/priority');

          if (!Array.isArray(response.data)) {
            logger.warn('Invalid priorities response format', { response: response.data });
            return [];
          }

          return response.data.map((priority: any) => ({
            id: priority.id,
            name: priority.name,
            description: priority.description || null,
            iconUrl: priority.iconUrl || null,
            statusColor: priority.statusColor || null,
          }));
        },
        3600, // Cache for 1 hour
      );

      logger.info('Priorities fetched successfully for MCP resource', {
        count: priorities.length,
      });

      return {
        priorities,
        metadata: {
          fetchedAt: new Date().toISOString(),
          count: priorities.length,
          cacheKey,
          cacheTtl: 3600,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch priorities from JIRA for MCP resource', error instanceof Error ? error : new Error(String(error)));

      // Fallback to common JIRA priorities if fetch fails
      const fallbackPriorities = [
        { id: '1', name: 'Highest', description: 'This problem will block progress.' },
        { id: '2', name: 'High', description: 'Serious problem that could block progress.' },
        { id: '3', name: 'Medium', description: 'Has the potential to affect progress.' },
        { id: '4', name: 'Low', description: 'Minor problem or easily worked around.' },
        { id: '5', name: 'Lowest', description: 'Trivial problem with little or no impact on progress.' },
      ];

      logger.info('Using fallback priorities for MCP resource', { count: fallbackPriorities.length });

      return {
        priorities: fallbackPriorities,
        metadata: {
          fetchedAt: new Date().toISOString(),
          count: fallbackPriorities.length,
          fallback: true,
          reason: 'JIRA API fetch failed',
        },
      };
    }
  }

  /**
   * Override health check endpoint to show JIRA service info
   */
  protected override getHealthCheckInfo () {
    return {
      status: 'ok',
      service: 'mcp-atlassian-jira',
      version: appConfig.version,
      serviceMode: 'jira',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
