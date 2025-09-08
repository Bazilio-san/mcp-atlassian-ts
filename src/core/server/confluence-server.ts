/**
 * Confluence-specific MCP server implementation
 */

import type { IConfig } from '../../../_types_/config.js';
import type { ServerConfig, ConfluenceConfig } from '../../types/index.js';
import { McpAtlassianServer } from './index.js';
import { ServiceToolRegistry } from './tools.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('confluence-server');

/**
 * Confluence-only MCP server
 */
export class ConfluenceServer extends McpAtlassianServer {
  protected override toolRegistry: ServiceToolRegistry;

  constructor(config: IConfig) {
    // Convert IConfig to the expected ServerConfig and ConfluenceConfig formats
    const {
      confluence: {
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

    // Build auth config from Confluence config
    let auth: any;
    if (pat) {
      auth = { type: 'pat', token: pat };
    } else if (oauth2?.clientId) {
      auth = { type: 'oauth2', ...oauth2 };
    } else if (apiToken && email) {
      auth = { type: 'basic', email, token: apiToken };
    }

    const confluenceConfig: ConfluenceConfig = { url, auth, maxResults };

    if (email) {
      confluenceConfig.email = email;
    }

    // Initialize parent with service mode configuration
    super(serverConfig, confluenceConfig);

    // Replace the default tool registry with Confluence-only registry
    this.toolRegistry = new ServiceToolRegistry(confluenceConfig, 'confluence');
    
    logger.info('Confluence server initialized');
  }

  /**
   * Register Confluence-specific tools only
   */
  protected override async registerTools(): Promise<void> {
    try {
      await this.toolRegistry.initializeTools();
      logger.info('Confluence tools registered successfully');
    } catch (error) {
      logger.error('Failed to register Confluence tools', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to register Confluence tools');
    }
  }

  /**
   * Override health check endpoint to show Confluence service info
   */
  protected override getHealthCheckInfo() {
    return {
      status: 'ok',
      service: 'mcp-atlassian-confluence',
      version: '2.0.0',
      environment: this.serverConfig.environment,
      serviceMode: 'confluence',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}