/**
 * Server factory for creating service-specific MCP servers
 */

import type { IConfig } from '../../../_types_/config.js';
import { McpAtlassianServer } from './index.js';
import { JiraServer } from './jira-server.js';
import { ConfluenceServer } from './confluence-server.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('server-factory');

/**
 * Service mode type
 */
export type ServiceMode = 'jira' | 'confluence';

/**
 * Create appropriate MCP server based on service mode
 */
export function createServiceServer(config: IConfig): McpAtlassianServer {
  const serviceMode: ServiceMode = config.server.serviceMode as ServiceMode;
  
  if (!serviceMode) {
    throw new Error('Service mode is required. Set MCP_SERVICE environment variable to "jira" or "confluence"');
  }

  logger.info('Creating server', { serviceMode });

  switch (serviceMode) {
    case 'jira':
      return new JiraServer(config);
    
    case 'confluence':
      return new ConfluenceServer(config);
    
    default:
      throw new Error(`Invalid service mode: ${serviceMode}. Must be 'jira' or 'confluence'`);
  }
}

/**
 * Get available service modes
 */
export function getAvailableServiceModes(): ServiceMode[] {
  return ['jira', 'confluence'];
}

/**
 * Validate service mode
 */
export function validateServiceMode(mode: string): mode is ServiceMode {
  return getAvailableServiceModes().includes(mode as ServiceMode);
}