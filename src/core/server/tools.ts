/**
 * Tool registry and management system
 */

import { ConfluenceToolsManager } from '../../domains/confluence/tools.js';
import { JiraToolsManager } from '../../domains/jira/tools.js';
import { getCache } from '../cache/index.js';
import { ToolExecutionError, ValidationError } from '../errors/index.js';
import { createLogger } from '../utils/logger.js';

import type { JiraConfig, ConfluenceConfig } from '../../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { appConfig } from '../../bootstrap/init-config.js';
import type { ServiceMode } from './factory.js';

/**
 * Check if a specific tool is enabled
 */
export function isToolEnabled (toolName: string): boolean {
  let enabledTools: string | string[] = appConfig.features?.enabledTools || '';

  // If enabledTools is a string (from env var), split it
  if (typeof enabledTools === 'string') {
    enabledTools = (enabledTools as string)
      .split(',')
      .map(tool => tool.trim())
      .filter(tool => tool.length > 0);
  } else if (Array.isArray(enabledTools)) {
    enabledTools = [];
  }

  // If no tools are specified, all are enabled
  if (enabledTools.length === 0) {
    return true;
  }

  return enabledTools.includes(toolName);
}

// Import tool implementations

const logger = createLogger('tools');

/**
 * Central registry for all MCP tools
 */
export class ToolRegistry {
  protected serviceConfig: JiraConfig | ConfluenceConfig;
  protected jiraTools: JiraToolsManager | null = null;
  protected confluenceTools: ConfluenceToolsManager | null = null;
  protected toolsMap: Map<string, Tool> = new Map();

  constructor(serviceConfig: JiraConfig | ConfluenceConfig) {
    this.serviceConfig = serviceConfig;
    
    // Create tool managers based on what config we have
    // This is a flexible approach that allows JIRA or Confluence tools
    // even when only one service config is provided
    try {
      this.jiraTools = new JiraToolsManager(serviceConfig as JiraConfig);
    } catch {
      // If JIRA config is invalid, jiraTools remains null
    }
    
    try {
      this.confluenceTools = new ConfluenceToolsManager(serviceConfig as ConfluenceConfig);
    } catch {
      // If Confluence config is invalid, confluenceTools remains null
    }
  }

  /**
   * Initialize and register all available tools
   */
  async initializeTools(): Promise<void> {
    try {
      logger.info('Initializing tools...');

      let jiraToolsCount = 0;
      let confluenceToolsCount = 0;

      // Initialize and register JIRA tools if available
      if (this.jiraTools) {
        await this.jiraTools.initialize();
        const jiraTools = this.jiraTools.getAvailableTools();
        for (const tool of jiraTools) {
          if (isToolEnabled(tool.name)) {
            this.toolsMap.set(tool.name, tool);
            logger.debug('Registered JIRA tool', { name: tool.name });
            jiraToolsCount++;
          }
        }
      }

      // Initialize and register Confluence tools if available
      if (this.confluenceTools) {
        await this.confluenceTools.initialize();
        const confluenceTools = this.confluenceTools.getAvailableTools();
        for (const tool of confluenceTools) {
          if (isToolEnabled(tool.name)) {
            this.toolsMap.set(tool.name, tool);
            logger.debug('Registered Confluence tool', { name: tool.name });
            confluenceToolsCount++;
          }
        }
      }

      // Register utility tools
      this.registerUtilityTools();

      logger.info('Tools initialized', {
        total: this.toolsMap.size,
        jira: jiraToolsCount,
        confluence: confluenceToolsCount,
      });
    } catch (error) {
      logger.error('Failed to initialize tools', error instanceof Error ? error : new Error(String(error)));
      throw new ToolExecutionError('system', 'Failed to initialize tools');
    }
  }

  /**
   * Register utility and system tools
   */
  protected registerUtilityTools(): void {
    // Cache management tool
    this.toolsMap.set('cache_clear', {
      name: 'cache_clear',
      description: 'Clear the cache to force fresh API calls',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              'Optional pattern to match keys for selective clearing (supports wildcards)',
          },
        },
        additionalProperties: false,
      },
    });

    // Cache statistics tool
    this.toolsMap.set('cache_stats', {
      name: 'cache_stats',
      description: 'Get current cache statistics and performance metrics',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    });

    // System health check tool
    this.toolsMap.set('health_check', {
      name: 'health_check',
      description: 'Check the health and connectivity of Atlassian services',
      inputSchema: {
        type: 'object',
        properties: {
          detailed: {
            type: 'boolean',
            description: 'Include detailed diagnostic information',
            default: false,
          },
        },
        additionalProperties: false,
      },
    });

    logger.debug('Utility tools registered');
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<Tool[]> {
    return Array.from(this.toolsMap.values());
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    const tool = this.toolsMap.get(name);
    if (!tool) {
      throw new ToolExecutionError(name, `Tool '${name}' not found`);
    }

    logger.info('Executing tool', { name, hasArgs: !!args && Object.keys(args).length > 0 });

    try {
      // Validate arguments against schema
      this.validateToolArguments(tool, args);

      // Execute tool based on category
      if (name.startsWith('jira_')) {
        if (!this.jiraTools) {
          throw new ToolExecutionError(name, 'JIRA tools are not available - no JIRA configuration provided');
        }
        return await this.jiraTools.executeTool(name, args);
      } else if (name.startsWith('confluence_')) {
        if (!this.confluenceTools) {
          throw new ToolExecutionError(name, 'Confluence tools are not available - no Confluence configuration provided');
        }
        return await this.confluenceTools.executeTool(name, args);
      } else {
        // Execute utility tools
        return await this.executeUtilityTool(name, args);
      }
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, error instanceof Error ? error : new Error(String(error)));

      if (error instanceof ValidationError || error instanceof ToolExecutionError) {
        throw error;
      }

      throw new ToolExecutionError(name, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute utility tools
   */
  private async executeUtilityTool(name: string, args: Record<string, any>): Promise<any> {
    const cache = getCache();

    switch (name) {
      case 'cache_clear':
        const pattern = args.pattern as string | undefined;
        if (pattern) {
          // Selective clearing based on pattern
          const keys = cache.keys();
          const matchingKeys = keys.filter(key =>
            pattern.includes('*')
              ? new RegExp(pattern.replace(/\*/g, '.*')).test(key)
              : key.includes(pattern)
          );

          for (const key of matchingKeys) {
            cache.del(key);
          }

          return {
            content: [
              {
                type: 'text',
                text: `Cleared ${matchingKeys.length} cache entries matching pattern '${pattern}'`,
              },
            ],
          };
        } else {
          // Clear all cache
          cache.flush();
          return {
            content: [
              {
                type: 'text',
                text: 'Cache cleared successfully',
              },
            ],
          };
        }

      case 'cache_stats':
        const stats = cache.getStats();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };

      case 'health_check':
        const detailed = (args.detailed as boolean) || false;
        const healthInfo = await this.performHealthCheck(detailed);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(healthInfo, null, 2),
            },
          ],
        };

      default:
        throw new ToolExecutionError(name, `Unknown utility tool: ${name}`);
    }
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(detailed: boolean): Promise<any> {
    const health: any = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      services: {},
    };

    // Check JIRA connectivity if available
    if (this.jiraTools) {
      try {
        health.services.jira = await this.jiraTools.healthCheck();
      } catch (error) {
        health.services.jira = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
      }
    }

    // Check Confluence connectivity if available  
    if (this.confluenceTools) {
      try {
        health.services.confluence = await this.confluenceTools.healthCheck();
      } catch (error) {
        health.services.confluence = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
      }
    }

    if (detailed) {
      const cache = getCache();
      health.cache = cache.getStats();
      health.memory = process.memoryUsage();
      health.uptime = process.uptime();
    }

    return health;
  }

  /**
   * Validate tool arguments against schema
   */
  private validateToolArguments(tool: Tool, args: Record<string, any>): void {
    // Basic validation - in production, you might want to use a proper JSON schema validator
    if (!tool.inputSchema || tool.inputSchema.type !== 'object') {
      return;
    }

    const schema = tool.inputSchema;
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Check required properties
    for (const requiredProp of required) {
      if (!(requiredProp in args)) {
        throw new ValidationError(`Missing required parameter: ${requiredProp}`);
      }
    }

    // Basic type checking for provided properties
    for (const [key, value] of Object.entries(args)) {
      const propSchema = properties[key];
      if (propSchema && typeof propSchema === 'object' && 'type' in propSchema) {
        const expectedType = propSchema.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType !== actualType && value !== null && value !== undefined) {
          throw new ValidationError(
            `Invalid type for parameter ${key}: expected ${expectedType}, got ${actualType}`
          );
        }
      }
    }
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.toolsMap.get(name);
  }

  /**
   * Check if tool exists and is enabled
   */
  hastool(name: string): boolean {
    return this.toolsMap.has(name);
  }

  /**
   * Get enabled tool names by category
   */
  getEnabledToolsByCategory(): {
    jira: string[];
    confluence: string[];
    utility: string[];
  } {
    const tools = Array.from(this.toolsMap.keys());

    return {
      jira: tools.filter(name => name.startsWith('jira_')),
      confluence: tools.filter(name => name.startsWith('confluence_')),
      utility: tools.filter(name => !name.startsWith('jira_') && !name.startsWith('confluence_')),
    };
  }
}

/**
 * Service-specific tool registry that only initializes tools for specific services
 */
export class ServiceToolRegistry extends ToolRegistry {
  private serviceMode: ServiceMode;

  constructor(serviceConfig: JiraConfig | ConfluenceConfig, serviceMode: ServiceMode) {
    super(serviceConfig);
    this.serviceMode = serviceMode;
    
    // Override the parent's approach - create only the tools we need based on service mode
    this.jiraTools = null;
    this.confluenceTools = null;
    
    if (serviceMode === 'jira') {
      this.jiraTools = new JiraToolsManager(serviceConfig as JiraConfig);
    }
    
    if (serviceMode === 'confluence') {
      this.confluenceTools = new ConfluenceToolsManager(serviceConfig as ConfluenceConfig);
    }
  }

  /**
   * Initialize tools based on service mode
   */
  override async initializeTools(): Promise<void> {
    try {
      logger.info('Initializing tools for service mode', { serviceMode: this.serviceMode });

      // Initialize only the relevant tool managers based on service mode
      if (this.serviceMode === 'jira' && this.jiraTools) {
        await this.jiraTools.initialize();
        
        // Register JIRA tools
        const jiraTools = this.jiraTools.getAvailableTools();
        for (const tool of jiraTools) {
          if (isToolEnabled(tool.name)) {
            this.toolsMap.set(tool.name, tool);
            logger.debug('Registered JIRA tool', { name: tool.name });
          }
        }
      }

      if (this.serviceMode === 'confluence' && this.confluenceTools) {
        await this.confluenceTools.initialize();
        
        // Register Confluence tools
        const confluenceTools = this.confluenceTools.getAvailableTools();
        for (const tool of confluenceTools) {
          if (isToolEnabled(tool.name)) {
            this.toolsMap.set(tool.name, tool);
            logger.debug('Registered Confluence tool', { name: tool.name });
          }
        }
      }

      // Always register utility tools
      this.registerUtilityTools();

      // Count tools by service
      const jiraCount = this.serviceMode === 'jira' && this.jiraTools
        ? this.jiraTools.getAvailableTools().filter(t => isToolEnabled(t.name)).length 
        : 0;
      const confluenceCount = this.serviceMode === 'confluence' && this.confluenceTools
        ? this.confluenceTools.getAvailableTools().filter(t => isToolEnabled(t.name)).length 
        : 0;

      logger.info('Service-specific tools initialized', {
        serviceMode: this.serviceMode,
        total: this.toolsMap.size,
        jira: jiraCount,
        confluence: confluenceCount,
      });
    } catch (error) {
      logger.error('Failed to initialize service-specific tools', error instanceof Error ? error : new Error(String(error)));
      throw new ToolExecutionError('system', 'Failed to initialize service-specific tools');
    }
  }

  /**
   * Override health check to only check relevant services
   */
  protected override async performHealthCheck(detailed: boolean): Promise<any> {
    const health: any = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      serviceMode: this.serviceMode,
      services: {},
    };

    // Check JIRA connectivity only if needed
    if (this.serviceMode === 'jira' && this.jiraTools) {
      try {
        health.services.jira = await this.jiraTools.healthCheck();
      } catch (error) {
        health.services.jira = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
      }
    }

    // Check Confluence connectivity only if needed
    if (this.serviceMode === 'confluence' && this.confluenceTools) {
      try {
        health.services.confluence = await this.confluenceTools.healthCheck();
      } catch (error) {
        health.services.confluence = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
        health.status = 'degraded';
      }
    }

    if (detailed) {
      const cache = getCache();
      health.cache = cache.getStats();
      health.memory = process.memoryUsage();
      health.uptime = process.uptime();
    }

    return health;
  }

  /**
   * Get service mode
   */
  getServiceMode(): ServiceMode {
    return this.serviceMode;
  }
}
