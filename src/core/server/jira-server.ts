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
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { getCachedPriorityObjects } from '../../domains/jira/shared/priority-service.js';

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

    // No need to call setupServerHandlers - parent already did it

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
  protected override getResourcesList (): Resource[] {
    const baseResources = super.getResourcesList();

    // Add JIRA-specific resources
    if (this.serviceConfig.url && this.serviceConfig.auth) {
      baseResources.push({
        uri: 'jira://priorities',
        name: 'JIRA Priorities',
        description: 'List of available priorities from JIRA instance',
        mimeType: 'application/json',
      });
    }

    return baseResources;
  }

  /**
   * Override to handle JIRA-specific resources
   */
  protected override async handleResourceRead (uri: string): Promise<any> {
    // Handle JIRA-specific resources first
    if (uri === 'jira://priorities') {
      const priorities = await getCachedPriorityObjects();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ priorities }, null, 2),
        }],
      };
    }

    // Delegate to parent for base resources
    return super.handleResourceRead(uri);
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
