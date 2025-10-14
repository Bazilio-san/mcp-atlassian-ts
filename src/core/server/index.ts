// noinspection ES6PreferShortImport

/**
 * MCP Server implementation with multiple transport support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  PingRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ServerConfig, JCConfig } from '../../types/index.js';
import { createLogger, createRequestLogger } from '../utils/logger.js';
import { createErrorResponse, McpAtlassianError, ServerError } from '../errors.js';
import { getCache } from '../cache.js';
import { createAuthenticationManager } from '../auth.js';
import { ToolRegistry } from './tools.js';
import { AuthenticationManager } from '../auth/auth-manager.js';
import { appConfig } from '../../bootstrap/init-config.js';
import { createAboutPageRenderer, AboutPageRenderer } from './about-renderer.js';

const logger = createLogger('server');

// MCP protocol date-version per spec; used for HTTP/Streamable HTTP header negotiation
const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * MCP Atlassian Server with multiple transport support
 */
export class McpAtlassianServer {
  protected server: Server;
  protected serverConfig: ServerConfig;
  protected serviceConfig: JCConfig;
  protected toolRegistry: ToolRegistry;
  protected rateLimiter: RateLimiterMemory;
  protected authManager: AuthenticationManager;
  protected app?: express.Application;
  protected aboutPageRenderer?: AboutPageRenderer;

  constructor (serverConfig: ServerConfig, serviceConfig: JCConfig) {
    this.serverConfig = serverConfig;
    this.serviceConfig = serviceConfig;

    // Initialize authentication manager
    this.authManager = new AuthenticationManager();

    // Initialize MCP server
    this.server = new Server(
      {
        name: appConfig.name,
        version: appConfig.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      },
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: 'mcp-atlassian',
      points: this.serverConfig.rateLimit.maxRequests,
      duration: this.serverConfig.rateLimit.windowMs / 1000, // Convert to seconds
    });

    // Initialize tool registry (will be overridden by subclasses if needed)
    this.toolRegistry = new ToolRegistry(serviceConfig);

    this.setupServerHandlers();
    // Don't call registerTools here - let it be called explicitly after construction
  }

  /**
   * Setup MCP server handlers
   */
  protected setupServerHandlers (): void {
    // Handle list_tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.toolRegistry.listTools();
      logger.info('Tools listed', { count: tools.length });
      return { tools };
    });

    // Handle tool_call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info('Tool called', { name, hasArgs: !!args });

      try {
        // Rate limiting
        await this.rateLimiter.consume('global');

        // Execute tool (STDIO/SSE transport doesn't have custom headers)
        const result = await this.toolRegistry.executeTool(name, args || {});

        logger.info('Tool executed successfully', { name });
        return result;
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error instanceof Error ? error : new Error(String(error)));

        if (error instanceof McpAtlassianError) {
          throw error;
        }

        throw new ServerError(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Handle list_resources requests
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

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
    });

    // Handle ping requests
    this.server.setRequestHandler(PingRequestSchema, async () => {
      return { pong: true };
    });

    logger.info('Server handlers configured');
  }

  /**
   * Register all available tools
   */
  async registerTools (): Promise<void> {
    try {
      await this.toolRegistry.initializeTools();
      logger.info('Tools registered successfully');
    } catch (error) {
      logger.error('Failed to register tools', error instanceof Error ? error : new Error(String(error)));
      throw new ServerError('Failed to register tools');
    }
  }


  /**
   * Start server with STDIO transport
   */
  async startStdio (): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP server started with STDIO transport');

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server with STDIO transport', error instanceof Error ? error : new Error(String(error)));
      throw new ServerError('Failed to start STDIO server');
    }
  }

  /**
   * Start server with HTTP/SSE transport
   */
  async startHttp (): Promise<void> {
    try {
      this.app = express();

      // Security middleware
      this.app.use(helmet({
        contentSecurityPolicy: false, // Allow for SSE
        crossOriginEmbedderPolicy: false,
      }));

      // Request logging
      this.app.use(createRequestLogger());

      // MCP protocol version header for HTTP/Streamable HTTP per spec
      this.app.use((req, res, next) => {
        res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
        // Expose the header to browsers in dev mode
        if (process.env.NODE_ENV === 'development') {
          const existing = res.getHeader('Access-Control-Expose-Headers');
          const expose = Array.isArray(existing) ? existing.join(',') : (existing || '');
          const values = new Set((expose as string).split(',').map(v => v.trim()).filter(Boolean));
          values.add('MCP-Protocol-Version');
          res.setHeader('Access-Control-Expose-Headers', Array.from(values).join(', '));
        }
        next();
      });

      // JSON parsing
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // CORS headers for development
      if (process.env.NODE_ENV === 'development') {
        this.app.use((req, res, next) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Server-Token, X-JIRA-Token, X-JIRA-Username, X-JIRA-Password, X-Confluence-Token, X-Confluence-Username, X-Confluence-Password');
          next();
        });
      }

      // Authentication middleware - apply to MCP endpoints
      this.app.use('/mcp', this.authManager.authenticationMiddleware());
      this.app.use('/sse', this.authManager.authenticationMiddleware());

      // Initialize About page renderer
      this.aboutPageRenderer = createAboutPageRenderer(
        this.serverConfig,
        this.serviceConfig,
        0 // Will be updated after tools are registered
      );

      // Root endpoint with About page
      this.app.get('/', async (req, res) => {
        try {
          // Update tools count if available
          if (this.toolRegistry && this.aboutPageRenderer) {
            try {
              const tools = await this.toolRegistry.listTools();
              this.aboutPageRenderer!.setToolsCount(tools.length);
            } catch (error: Error |any) {
              logger.warn('Failed to get tools count for about page', error);
            }
          }

          const html = this.aboutPageRenderer!.renderFullPage();
          res.type('html').send(html);
        } catch (error) {
          logger.error('Failed to render about page', error instanceof Error ? error : new Error(String(error)));
          res.status(500).send('Error rendering about page');
        }
      });

      
      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json(this.getHealthCheckInfo());
      });

      // SSE endpoint for MCP communication
      this.app.get('/sse', async (req, res) => {
        try {
          // Get authentication context from middleware
          const authContext = AuthenticationManager.getAuthContext(req);
          if (!authContext) {
            return res.status(401).json({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: 'Authentication required'
              }
            });
          }

          logger.info('SSE client connected', {
            authMode: authContext.mode,
            headersCount: Object.keys(authContext.headers).length,
          });

          // Create a separate server instance for this SSE connection with custom auth headers
          const sseServer = new Server(
            {
              name: appConfig.name,
              version: appConfig.version,
            },
            {
              capabilities: {
                resources: {},
                tools: {},
                prompts: {},
              },
            },
          );

          // Override tool call handler to use authentication headers
          sseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            logger.info('SSE tool called', { name, authMode: authContext.mode });

            // Rate limiting
            const clientId = authContext.mode === 'system'
              ? `sse-system-${req.ip}`
              : `sse-headers-${req.ip}`;
            await this.rateLimiter.consume(clientId);

            // Execute tool with authentication headers from context
            return await this.toolRegistry.executeTool(name, args || {}, authContext.headers);
          });

          // Setup other handlers (tools/list, resources, etc.)
          sseServer.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = await this.toolRegistry.listTools();
            return { tools };
          });

          sseServer.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
              resources: [
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
              ],
            };
          });

          sseServer.setRequestHandler(PingRequestSchema, async () => {
            return { pong: true };
          });

          res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
          const transport = new SSEServerTransport('/sse', res);
          await sseServer.connect(transport);

          logger.info('SSE connection established successfully');
          return;
        } catch (error) {
          logger.error('SSE connection failed', error instanceof Error ? error : new Error(String(error)));
          return res.status(500).json(createErrorResponse(
            new ServerError('Failed to establish SSE connection'),
          ));
        }
      });

      // POST endpoint for tool calls and other requests
      this.app.post('/mcp', async (req, res) => {
        try {
          // Get authentication context from middleware
          const authContext = AuthenticationManager.getAuthContext(req);
          if (!authContext) {
            return res.status(401).json({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: 'Authentication required'
              }
            });
          }

          // Rate limiting with different keys for different auth modes
          const clientId = authContext.mode === 'system'
            ? `system-${req.ip}`
            : `headers-${req.ip}`;
          await this.rateLimiter.consume(clientId);

          // Use authentication headers from context
          const authHeaders = authContext.headers;

          // Process MCP request directly
          const { method, params, id } = req.body;

          logger.info('HTTP MCP request received', {
            method,
            id,
            authMode: authContext.mode,
            headersCount: Object.keys(authHeaders).length,
          });

          let result;

          switch (method) {
            case 'tools/list':
              const tools = await this.toolRegistry.listTools();
              result = { tools };
              break;

            case 'tools/call':
              const { name, arguments: args } = params;
              result = await this.toolRegistry.executeTool(name, args || {}, authHeaders);
              break;

            case 'resources/list':
              result = {
                resources: [
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
                ],
              };
              break;

            case 'ping':
              result = { pong: true };
              break;

            default:
              throw new ServerError(`Unknown method: ${method}`);
          }

          return res.json({
            jsonrpc: '2.0',
            id,
            result,
          });
        } catch (error) {
          const errorString = error instanceof Error ? error.toString() : String(error);
          if (errorString.includes('Rate limit')) {
            logger.warn('Rate limit exceeded', { ip: req.ip });
            return res.status(429).json(createErrorResponse(
              new ServerError('Rate limit exceeded'),
            ));
          } else {
            logger.error('MCP request failed', error instanceof Error ? error : new Error(String(error)));

            // Extract detailed error information for MCP response
            let errorResponse;
            if (error instanceof McpAtlassianError) {
              // Use full error structure with details for better debugging
              const errorObj = error.toJSON();
              errorResponse = {
                code: -1,
                message: errorObj.message,
                data: {
                  code: errorObj.code,
                  details: errorObj.details,
                  // stack: process.env.NODE_ENV === 'development' ? errorObj.stack : undefined
                },
              };
            } else {
              // Standard error handling for non-MCP errors
              errorResponse = {
                code: -1,
                message: error instanceof Error ? error.message : String(error),
              };
            }

            return res.json({
              jsonrpc: '2.0',
              id: req.body?.id || null,
              error: errorResponse,
            });
          }
        }
      });

      // Error handling middleware
      this.app.use((error: Error, req: express.Request, res: express.Response) => {
        logger.error('Express error handler', error);

        if (!res.headersSent) {
          res.status(500).json(createErrorResponse(error));
        }
      });

      // Start HTTP server
      const port = this.serverConfig.port;
      this.app.listen(port, '0.0.0.0', () => {
        logger.info(`MCP server started with HTTP transport on port ${port}`);
        logger.info(`About page: http://localhost:${port}/`);
        logger.info(`Health check: http://localhost:${port}/health`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server with HTTP transport', error instanceof Error ? error : new Error(String(error)));
      throw new ServerError('Failed to start HTTP server');
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown (): void {
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
        logger.error('Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Get server instance for testing
   */
  getServer (): Server {
    return this.server;
  }

  /**
   * Get Express app for testing
   */
  getApp (): express.Application | undefined {
    return this.app;
  }

  /**
   * Get health check information (can be overridden by subclasses)
   */
  protected getHealthCheckInfo (): any {
    return {
      status: 'ok',
      service: appConfig.name,
      version: appConfig.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Re-export factory function for convenience
export { createServiceServer } from './factory.js';
