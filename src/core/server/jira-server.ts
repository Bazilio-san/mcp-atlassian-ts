/**
 * JIRA-specific MCP server implementation
 */

import type { IConfig } from '../../types/config';
import type { ServerConfig, JiraConfig } from '../../types/index.js';
import { McpAtlassianServer } from './index.js';
import { ServiceToolRegistry } from './tools.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jira-server');

/**
 * JIRA-only MCP server
 */
export class JiraServer extends McpAtlassianServer {
  protected override toolRegistry: ServiceToolRegistry;

  constructor(config: IConfig) {
    // Convert IConfig to the expected ServerConfig and JiraConfig formats
    const {
      jira: {
        auth: {
          pat: pat,
          oauth2,
          apiToken,
        } = {},
        email,
        url,
        maxResults,
      },
      cache,
      logger: { level: logLevel },
      server: {
        port,
        transportType,
        environment,
      },
      rateLimit,
    } = config;

    const serverConfig: ServerConfig = { port, environment, logLevel, transportType, rateLimit, cache };

    // Build auth config from JIRA config
    let auth: any;
    if (pat) {
      auth = { type: 'pat', token: pat };
    } else if (oauth2?.clientId) {
      auth = { type: 'oauth2', ...oauth2 };
    } else if (apiToken && email) {
      auth = { type: 'basic', email, token: apiToken };
    }

    const jiraConfig: JiraConfig = { url, auth, maxResults };

    if (email) {
      jiraConfig.email = email;
    }

    // Initialize parent with service mode configuration
    super(serverConfig, jiraConfig);

    // Replace the default tool registry with JIRA-only registry
    this.toolRegistry = new ServiceToolRegistry(jiraConfig, 'jira');

    logger.info('JIRA server initialized');
  }

  /**
   * Register JIRA-specific tools only
   */
  protected override async registerTools(): Promise<void> {
    try {
      await this.toolRegistry.initializeTools();
      logger.info('JIRA tools registered successfully');
    } catch (error) {
      logger.error('Failed to register JIRA tools', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to register JIRA tools');
    }
  }

  /**
   * Override health check endpoint to show JIRA service info
   */
  protected override getHealthCheckInfo() {
    return {
      status: 'ok',
      service: 'mcp-atlassian-jira',
      version: '2.0.0',
      environment: this.serverConfig.environment,
      serviceMode: 'jira',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
