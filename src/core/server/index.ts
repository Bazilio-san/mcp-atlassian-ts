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
import type { Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  PingRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import type { ServerConfig, JCConfig } from '../../types/index.js';
import { createJsonRpcErrorResponse, toError, toStr, ServerError, ToolExecutionError } from '../errors/errors.js';
import { getCache } from '../cache.js';
import { ToolRegistry } from './tools.js';
import { AuthenticationManager } from '../auth/auth-manager.js';
import { appConfig, getSafeAppConfig } from '../../bootstrap/init-config.js';
import { createAboutPageRenderer, AboutPageRenderer } from './about-renderer.js';
import { formatRateLimitError, isRateLimitError } from '../utils/rate-limit.js';
import { substituteUserInHeaders } from '../utils/user-substitution.js';
import { checkPortAvailability } from '../utils/port-check.js';
import { ServiceModeJC } from '../../types/config';
import chalk from 'chalk';
import { createRequestLogger, logger as lgr } from '../utils/logger.js';
import { McpAtlassianError } from '../errors/McpAtlassianError.js';

const logger = lgr.getSubLogger({ name: chalk.yellow('server') });

// Types for refactored MCP handlers
interface ExecutionContext {
  authHeaders?: Record<string, string>;
  rateLimitKey?: string;
  enableRateLimit?: boolean;
}


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
  protected serviceMode: ServiceModeJC;

  constructor (serverConfig: ServerConfig, serviceConfig: JCConfig, serviceMode: ServiceModeJC) {
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
    this.serviceMode = serviceMode;
    // Don't call registerTools here - let it be called explicitly after construction
  }

  /**
   * Get list of available resources (can be overridden by subclasses)
   */
  protected getResourcesList (): Resource[] {
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
   * Get resources list with content for About page display
   */
  protected async getResourcesWithContent (): Promise<any[]> {
    const resources = this.getResourcesList();
    const resourcesWithContent = [];

    for (const resource of resources) {
      try {
        const resourceContent = await this.handleResourceRead(resource.uri);
        resourcesWithContent.push({
          ...resource,
          content: resourceContent,
        });
      } catch (err) {
        logger.warn(`Failed to read resource content for ${resource.uri}: error: ${toStr(err)}`);
        resourcesWithContent.push({
          ...resource,
          content: { error: 'Failed to load resource content' },
        });
      }
    }

    return resourcesWithContent;
  }

  /**
   * Handle resource read requests (can be overridden by subclasses)
   */
  protected async handleResourceRead (uri: string): Promise<any> {
    switch (uri) {
      case 'atlassian://config':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getSafeAppConfig(), null, 2),
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
   * Handle tools list requests with optional context for custom authentication
   */
  private async handleToolsList (context?: ExecutionContext): Promise<{ tools: any[] }> {
    const tools = await this.toolRegistry.listTools(context?.authHeaders);
    logger.info(`Tools listed: count: ${tools.length}`);
    return { tools };
  }

  /**
   * Handle tool call requests with optional context
   */
  private async handleToolCall (name: string, args: any, context?: ExecutionContext): Promise<any> {
    logger.info(`Tool '${name}' called | hasArgs: ${!!args} | authMode: ${context?.rateLimitKey ? 'http' : 'stdio'}`);

    try {
      // Apply rate limiting if enabled
      if (context?.enableRateLimit && context?.rateLimitKey) {
        await this.rateLimiter.consume(context.rateLimitKey);
      }

      // Execute tool
      const result = await this.toolRegistry.executeTool(name, args || {}, context?.authHeaders);

      logger.info(`Tool '${name}' executed successfully`);
      return result;
    } catch (err: Error | any) {
      // Handle rate limit errors
      if (isRateLimitError(err)) {
        const rateLimitMessage = formatRateLimitError(
          err as any,
          this.serverConfig.rateLimit.maxRequests,
        );
        logger.warn(`Rate limit exceeded: tool: '${name}' | rateLimitKey: ${context?.rateLimitKey}`);
        throw new ServerError(rateLimitMessage);
      }

      if (err instanceof McpAtlassianError || err instanceof ToolExecutionError) {
        throw err;
      }

      throw new ServerError(`Tool execution failed: ${toStr(err)}`, undefined, err.printed);
    }
  }

  /**
   * Handle ping requests
   */
  private handlePing (): { pong: boolean } {
    return { pong: true };
  }

  /**
   * Setup common MCP handlers on a server instance
   */
  private setupCommonHandlers (server: Server, _enableRateLimit = false): void {
    // Handle list_tools requests
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return this.handleToolsList();
    });

    // Handle tool_call requests
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const context: ExecutionContext = {
        enableRateLimit: false, // STDIO doesn't use rate limiting
      };
      return this.handleToolCall(name, args, context);
    });

    // Handle list_resources requests
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: this.getResourcesList() };
    });

    // Handle resource read requests
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.handleResourceRead(request.params.uri);
    });

    // Handle ping requests
    server.setRequestHandler(PingRequestSchema, async () => {
      return this.handlePing();
    });
  }

  /**
   * Handle HTTP MCP request with unified logic
   */
  private async handleHttpMcpRequest (method: string, params: any, context: ExecutionContext): Promise<any> {
    switch (method) {
      case 'initialize':
        const { protocolVersion, capabilities: clientCapabilities, clientInfo } = params || {};
        logger.info(`MCP client initializing: protocolVersion: ${protocolVersion} | clientCapabilities: ${JSON.stringify(clientCapabilities)} | clientInfo: ${JSON.stringify(clientInfo)}`);
        return {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
            logging: {},
          },
          serverInfo: {
            name: 'mcp-atlassian-ts',
            version: appConfig.version || '1.0.0',
          },
        };

      case 'tools/list':
        return this.handleToolsList(context);

      case 'tools/call':
        const { name, arguments: args } = params;
        return this.handleToolCall(name, args, context);

      case 'resources/list':
        return { resources: this.getResourcesList() };

      case 'resources/read':
        return this.handleResourceRead(params.uri);

      case 'prompts/list':
        return { prompts: [] };

      case 'ping':
        return this.handlePing();

      default:
        throw new ServerError(`Unknown method: ${method}`);
    }
  }

  /**
   * Setup MCP server handlers
   */
  protected setupServerHandlers (): void {
    this.setupCommonHandlers(this.server, false);
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
      logger.error('Failed to register tools', toError(error));
      logger.error('Failed to register tools', toError(error));
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
      logger.error('Failed to start server with STDIO transport', toError(error));
      throw new ServerError('Failed to start STDIO server');
    }
  }

  /**
   * Start server with HTTP/SSE transport
   */
  async startHttp (): Promise<void> {
    try {
      // Check port availability first
      await checkPortAvailability(this.serverConfig.port);

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
        this.serviceMode,
        0, // Will be updated after tools are registered
      );

      // Root endpoint with About page
      this.app.get('/', async (req, res) => {
        try {
          // Update tools, resources, and prompts data if available
          if (this.toolRegistry && this.aboutPageRenderer) {
            try {
              const tools = await this.toolRegistry.listTools();
              const resources = await this.getResourcesWithContent();

              // For now, prompts are empty as per current implementation
              const prompts: Prompt[] = [];

              this.aboutPageRenderer!.setAllData(tools, resources, prompts);
            } catch (error: Error | any) {
              logger.warn('Failed to get tools, resources, and prompts data for about page', error);
            }
          }

          const html = this.aboutPageRenderer!.renderFullPage();
          res.type('html').send(html);
        } catch (error) {
          logger.error('Failed to render about page', toError(error));
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
              id: 1,
              error: {
                code: -32001,
                message: 'Authentication required',
              },
            });
          }

          logger.info(`SSE client connected: authMode: ${authContext.mode} | headersCount: ${Object.keys(authContext.headers)?.length || 0}`);

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

          // Setup common handlers with SSE-specific context
          this.setupCommonHandlers(sseServer, true);

          // Override tool call handler to use authentication headers and rate limiting
          sseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            // Apply user substitution if configured
            let headers = authContext.headers;
            if (this.serverConfig.subst) {
              headers = substituteUserInHeaders(headers, this.serviceMode, this.serverConfig.subst);
            }

            const context: ExecutionContext = {
              authHeaders: headers,
              rateLimitKey: authContext.mode === 'system'
                ? `sse-system-${req.ip}`
                : `sse-headers-${req.ip}`,
              enableRateLimit: true,
            };

            return this.handleToolCall(name, args, context);
          });

          res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
          const transport = new SSEServerTransport('/sse', res);
          await sseServer.connect(transport);

          logger.info('SSE connection established successfully');
          return;
        } catch (error) {
          logger.error('SSE connection failed', toError(error));
          return res.status(500).json(createJsonRpcErrorResponse(
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
              id: req.body?.id ?? 1,
              error: {
                code: -32001,
                message: 'Authentication required',
              },
            });
          }

          // Rate limiting with different keys for different auth modes
          const clientId = authContext.mode === 'system'
            ? `system-${req.ip}`
            : `headers-${req.ip}`;

          try {
            await this.rateLimiter.consume(clientId);
          } catch (rateLimitError) {
            if (isRateLimitError(rateLimitError)) {
              const rateLimitMessage = formatRateLimitError(
                rateLimitError as any,
                this.serverConfig.rateLimit.maxRequests,
              );
              logger.warn(`Rate limit exceeded in HTTP: ip: ${req.ip} | authMode: ${authContext.mode}`);
              return res.status(200).json({
                jsonrpc: '2.0',
                id: req.body?.id ?? 1,
                error: {
                  code: -32000,
                  message: rateLimitMessage,
                },
              });
            }
            throw rateLimitError;
          }

          // Use authentication headers from context
          let authHeaders = authContext.headers;

          // Apply user substitution if configured
          if (this.serverConfig.subst) {
            authHeaders = substituteUserInHeaders(authHeaders, this.serviceMode, this.serverConfig.subst);
          }

          // Process MCP request directly
          const { method, params, id } = req.body;

          logger.info(`HTTP MCP request received: ${method} | id: ${id} | authMode: ${authContext.mode} | headersCount: ${Object.keys(authHeaders)?.length || 0}`);

          let result;

          // Handle special cases that don't return standard results
          if (method === 'notifications/initialized') {
            // Client has finished initialization
            logger.info('MCP client initialization completed');
            // Notifications don't return a response - just log and continue
            return res.status(204).send(); // No content response
          }

          // Use unified handler for all other methods
          const context: ExecutionContext = {
            authHeaders,
            rateLimitKey: authContext.mode === 'system'
              ? `system-${req.ip}`
              : `headers-${req.ip}`,
            enableRateLimit: true,
          };

          result = await this.handleHttpMcpRequest(method, params, context);

          return res.json({
            jsonrpc: '2.0',
            id,
            result,
          });
        } catch (error: Error | any) {
          if (!error.printed) {
            logger.error('MCP request failed', toError(error));
            error.printed = true;
          }
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
              message: toStr(error),
            };
          }

          return res.json({
            jsonrpc: '2.0',
            id: req.body?.id ?? 1,
            error: errorResponse,
          });
        }
      });

      // 404 handler for unknown routes
      this.app.use((req: express.Request, res: express.Response) => {
        res.status(404).json({
          error: 'Not Found',
          message: `Cannot ${req.method} ${req.path}`,
          availableEndpoints: {
            about: 'GET /',
            health: 'GET /health',
            sse: 'GET /sse',
            mcp: 'POST /mcp',
          },
        });
      });

      // Error handling middleware (must have 4 parameters for Express to recognize it)
      this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error('Express error handler', error);

        if (!res.headersSent) {
          res.status(500).json(createJsonRpcErrorResponse(error));
        }
      });

      // Start HTTP server with proper error handling
      const port = this.serverConfig.port;
      const server = this.app.listen(port, '0.0.0.0', () => {
        logger.info(`MCP server started with HTTP transport on port ${port}`);
        logger.info(`About page: http://localhost:${port}/`);
        logger.info(`Health check: http://localhost:${port}/health`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
      });

      // Handle port conflicts and other server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use. Please choose a different port or stop the process using this port.`);
          logger.error('To use a different port, set SERVER_PORT environment variable to another value (e.g., SERVER_PORT=3001)');
          process.exit(1);
        } else {
          logger.error('Failed to start HTTP server', error);
          process.exit(1);
        }
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server with HTTP transport', toError(error));
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
        logger.error('Error during graceful shutdown', toError(error));
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
