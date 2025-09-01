/**
 * Tool registry and management system
 */

import { ConfluenceToolsManager } from '../../domains/confluence/tools.js';
import { JiraToolsManager } from '../../domains/jira/tools.js';
import { getCache } from '../cache/index.js';
import { isToolEnabled } from '../config/index.js';
import { ToolExecutionError, ValidationError } from '../errors/index.js';
import { createLogger } from '../utils/logger.js';

import type { AtlassianConfig } from '../../types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations

const logger = createLogger('tools');

/**
 * Central registry for all MCP tools
 */
export class ToolRegistry {
  private atlassianConfig: AtlassianConfig;
  private jiraTools: JiraToolsManager;
  private confluenceTools: ConfluenceToolsManager;
  private toolsMap: Map<string, Tool> = new Map();

  constructor(atlassianConfig: AtlassianConfig) {
    this.atlassianConfig = atlassianConfig;
    this.jiraTools = new JiraToolsManager(atlassianConfig);
    this.confluenceTools = new ConfluenceToolsManager(atlassianConfig);
  }

  /**
   * Initialize and register all available tools
   */
  async initializeTools(): Promise<void> {
    try {
      logger.info('Initializing tools...');

      // Initialize tool managers
      await this.jiraTools.initialize();
      await this.confluenceTools.initialize();

      // Register JIRA tools
      const jiraTools = this.jiraTools.getAvailableTools();
      for (const tool of jiraTools) {
        if (isToolEnabled(tool.name)) {
          this.toolsMap.set(tool.name, tool);
          logger.debug('Registered JIRA tool', { name: tool.name });
        }
      }

      // Register Confluence tools
      const confluenceTools = this.confluenceTools.getAvailableTools();
      for (const tool of confluenceTools) {
        if (isToolEnabled(tool.name)) {
          this.toolsMap.set(tool.name, tool);
          logger.debug('Registered Confluence tool', { name: tool.name });
        }
      }

      // Register utility tools
      this.registerUtilityTools();

      logger.info('Tools initialized', {
        total: this.toolsMap.size,
        jira: jiraTools.filter(t => isToolEnabled(t.name)).length,
        confluence: confluenceTools.filter(t => isToolEnabled(t.name)).length,
      });
    } catch (error) {
      logger.error('Failed to initialize tools', error);
      throw new ToolExecutionError('system', 'Failed to initialize tools');
    }
  }

  /**
   * Register utility and system tools
   */
  private registerUtilityTools(): void {
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
        return await this.jiraTools.executeTool(name, args);
      } else if (name.startsWith('confluence_')) {
        return await this.confluenceTools.executeTool(name, args);
      } else {
        // Execute utility tools
        return await this.executeUtilityTool(name, args);
      }
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, error);

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
  private async performHealthCheck(detailed: boolean): Promise<any> {
    const health: any = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      services: {},
    };

    try {
      // Check JIRA connectivity
      health.services.jira = await this.jiraTools.healthCheck();
    } catch (error) {
      health.services.jira = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      health.status = 'degraded';
    }

    try {
      // Check Confluence connectivity
      health.services.confluence = await this.confluenceTools.healthCheck();
    } catch (error) {
      health.services.confluence = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      health.status = 'degraded';
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
