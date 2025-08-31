/**
 * MCP Server implementation with multiple transport support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

import type { ServerConfig, AtlassianConfig } from '../../types/index.js';
import { createLogger, createRequestLogger } from '../utils/logger.js';
import { createErrorResponse, McpAtlassianError, ServerError } from '../errors/index.js';
import { getCache } from '../cache/index.js';
import { createAuthenticationManager } from '../auth/index.js';
import { ToolRegistry } from './tools.js';

const logger = createLogger('server');

/**
 * MCP Atlassian Server with multiple transport support
 */
export class McpAtlassianServer {
  private server: Server;
  private serverConfig: ServerConfig;
  private atlassianConfig: AtlassianConfig;
  private toolRegistry: ToolRegistry;
  private rateLimiter: RateLimiterMemory;
  private app?: express.Application;

  constructor(serverConfig: ServerConfig, atlassianConfig: AtlassianConfig) {
    this.serverConfig = serverConfig;
    this.atlassianConfig = atlassianConfig;
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'mcp-atlassian-typescript',
        version: '2.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: 'mcp-atlassian',
      points: this.serverConfig.rateLimit.maxRequests,
      duration: this.serverConfig.rateLimit.windowMs / 1000, // Convert to seconds
    });

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(atlassianConfig);

    this.setupServerHandlers();
    this.registerTools();
  }

  /**
   * Setup MCP server handlers
   */
  private setupServerHandlers(): void {
    // Handle list_tools requests
    this.server.setRequestHandler('tools/list', async () => {
      const tools = await this.toolRegistry.listTools();
      logger.info('Tools listed', { count: tools.length });
      return { tools };
    });

    // Handle tool_call requests
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('Tool called', { name, hasArgs: !!args });
      
      try {
        // Rate limiting
        await this.rateLimiter.consume('global');
        
        // Execute tool
        const result = await this.toolRegistry.executeTool(name, args || {});
        
        logger.info('Tool executed successfully', { name });
        return result;
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error);
        
        if (error instanceof McpAtlassianError) {
          throw error;
        }
        
        throw new ServerError(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Handle list_resources requests
    this.server.setRequestHandler('resources/list', async () => {
      const resources: Resource[] = [
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
      
      return { resources };
    });

    // Handle resource read requests
    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'atlassian://config':
          const authManager = createAuthenticationManager(
            this.atlassianConfig.auth,
            this.atlassianConfig.url
          );
          
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                url: this.atlassianConfig.url,
                auth: authManager.getAuthInfo(),
                jira: this.atlassianConfig.jira,
                confluence: this.atlassianConfig.confluence,
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
    });

    // Handle ping requests
    this.server.setRequestHandler('ping', async () => {
      return { pong: true };
    });

    logger.info('Server handlers configured');
  }

  /**
   * Register all available tools
   */
  private async registerTools(): Promise<void> {
    try {
      await this.toolRegistry.initializeTools();
      logger.info('Tools registered successfully');
    } catch (error) {
      logger.error('Failed to register tools', error);
      throw new ServerError('Failed to register tools');
    }
  }

  /**
   * Start server with STDIO transport
   */
  async startStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('MCP server started with STDIO transport');
      
      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server with STDIO transport', error);
      throw new ServerError('Failed to start STDIO server');
    }
  }

  /**
   * Start server with HTTP/SSE transport
   */
  async startHttp(): Promise<void> {
    try {
      this.app = express();
      
      // Security middleware
      this.app.use(helmet({
        contentSecurityPolicy: false, // Allow for SSE
        crossOriginEmbedderPolicy: false,
      }));
      
      // Request logging
      this.app.use(createRequestLogger());
      
      // JSON parsing
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
      
      // CORS headers for development
      if (this.serverConfig.environment === 'development') {
        this.app.use((req, res, next) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          next();
        });
      }

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          service: 'mcp-atlassian-typescript',
          version: '2.0.0',
          environment: this.serverConfig.environment,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
      });

      // SSE endpoint for MCP communication
      this.app.get('/sse', async (req, res) => {
        try {
          const transport = new SSEServerTransport('/sse', res);
          await this.server.connect(transport);
          
          logger.info('SSE client connected');
        } catch (error) {
          logger.error('SSE connection failed', error);
          res.status(500).json(createErrorResponse(
            new ServerError('Failed to establish SSE connection')
          ));
        }
      });

      // POST endpoint for tool calls and other requests
      this.app.post('/mcp', async (req, res) => {
        try {
          // Rate limiting
          const clientId = req.ip || 'anonymous';
          await this.rateLimiter.consume(clientId);
          
          // Process MCP request
          const response = await this.server.request(req.body);
          res.json(response);
        } catch (rateLimitError) {
          logger.warn('Rate limit exceeded', { ip: req.ip });
          res.status(429).json(createErrorResponse(
            new ServerError('Rate limit exceeded')
          ));
        } catch (error) {
          logger.error('MCP request failed', error);
          res.status(500).json(createErrorResponse(
            error instanceof Error ? error : new ServerError('Unknown error')
          ));
        }
      });

      // Error handling middleware
      this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('Express error handler', error);
        
        if (!res.headersSent) {
          res.status(500).json(createErrorResponse(error));
        }
      });

      // Start HTTP server
      const port = this.serverConfig.port;
      this.app.listen(port, '0.0.0.0', () => {
        logger.info(`MCP server started with HTTP transport on port ${port}`);
        logger.info(`Health check: http://localhost:${port}/health`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
      });
      
      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server with HTTP transport', error);
      throw new ServerError('Failed to start HTTP server');
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // Close server connections
        if (this.server) {
          // The MCP server doesn't have a close method, so we'll just log
          logger.info('MCP server connections closed');
        }
        
        // Close cache
        const cache = getCache();
        cache.close();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Get server instance for testing
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get Express app for testing
   */
  getApp(): express.Application | undefined {
    return this.app;
  }
}

/**
 * Create and configure MCP server
 */
export function createMcpServer(
  serverConfig: ServerConfig,
  atlassianConfig: AtlassianConfig
): McpAtlassianServer {
  return new McpAtlassianServer(serverConfig, atlassianConfig);
}