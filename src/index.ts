#!/usr/bin/env node
/**
 * MCP Atlassian TypeScript Server - Main Entry Point
 *
 * A comprehensive TypeScript implementation of the MCP server for
 * Atlassian JIRA and Confluence with modern architecture and features.
 */

import { createAuthenticationManager, validateAuthConfig } from './core/auth/index.js';
import { initializeCache } from './core/cache/index.js';
import { getServerConfig, getAtlassianConfig, validateEnvironment } from './core/config/index.js';
import { ServerError } from './core/errors/index.js';
import { createMcpServer } from './core/server/index.js';
import { createLogger } from './core/utils/logger.js';

const logger = createLogger('main');

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('Starting MCP Atlassian TypeScript Server v2.0.0');

    // Validate environment configuration
    validateEnvironment();

    // Load configuration
    const serverConfig = getServerConfig();
    const atlassianConfig = getAtlassianConfig();

    logger.info('Configuration loaded', {
      environment: serverConfig.environment,
      transportType: serverConfig.transportType,
      atlassianUrl: atlassianConfig.url,
      authType: atlassianConfig.auth.type,
    });

    // Validate authentication configuration
    validateAuthConfig(atlassianConfig.auth);

    // Initialize cache
    initializeCache(serverConfig.cache);
    logger.info('Cache initialized', {
      ttlSeconds: serverConfig.cache.ttlSeconds,
      maxItems: serverConfig.cache.maxItems,
    });

    // Test Atlassian connectivity
    const authManager = createAuthenticationManager(atlassianConfig.auth, atlassianConfig.url);
    const isConnected = await authManager.testAuthentication(atlassianConfig.url);

    if (!isConnected) {
      throw new ServerError('Failed to authenticate with Atlassian services');
    }

    logger.info('Atlassian authentication successful');

    // Create and configure MCP server
    const mcpServer = createMcpServer(serverConfig, atlassianConfig);

    // Start server based on transport type
    switch (serverConfig.transportType) {
      case 'stdio':
        logger.info('Starting server with STDIO transport');
        await mcpServer.startStdio();
        break;

      case 'http':
      case 'sse':
        logger.info('Starting server with HTTP/SSE transport', {
          port: serverConfig.port,
        });
        await mcpServer.startHttp();
        break;

      default:
        throw new ServerError(`Unsupported transport type: ${serverConfig.transportType}`);
    }

    logger.info('MCP Atlassian Server started successfully');
  } catch (error) {
    logger.fatal('Failed to start MCP Atlassian Server', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

/**
 * Handle CLI arguments for different modes
 */
function handleCliArguments() {
  const args = process.argv.slice(2);

  // Help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP Atlassian TypeScript Server v2.0.0

Usage: mcp-atlassian [options]

Options:
  --help, -h          Show this help message
  --version, -v       Show version information
  --stdio             Force STDIO transport (overrides config)
  --http              Force HTTP transport (overrides config)
  --port <port>       Set HTTP port (overrides config)
  --debug             Enable debug logging (overrides config)
  
Environment Variables:
  ATLASSIAN_URL       Atlassian instance URL (required)
  ATLASSIAN_EMAIL     Email for basic auth
  ATLASSIAN_API_TOKEN API token for basic auth
  ATLASSIAN_PAT       Personal Access Token
  PORT                HTTP server port (default: 3000)
  LOG_LEVEL           Logging level (debug, info, warn, error)
  TRANSPORT_TYPE      Transport type (stdio, http, sse)
  
Examples:
  mcp-atlassian --stdio              # Start with STDIO transport
  mcp-atlassian --http --port 8080   # Start HTTP server on port 8080
  mcp-atlassian --debug              # Start with debug logging
  
For more information, visit: https://github.com/example/mcp-atlassian-typescript
`);
    process.exit(0);
  }

  // Version flag
  if (args.includes('--version') || args.includes('-v')) {
    console.log('MCP Atlassian TypeScript Server v2.0.0');
    process.exit(0);
  }

  // Override transport type based on CLI args
  if (args.includes('--stdio')) {
    process.env.TRANSPORT_TYPE = 'stdio';
  } else if (args.includes('--http')) {
    process.env.TRANSPORT_TYPE = 'http';
  }

  // Override port
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    process.env.PORT = args[portIndex + 1];
  }

  // Override log level for debug
  if (args.includes('--debug')) {
    process.env.LOG_LEVEL = 'debug';
  }
}

/**
 * Setup process event handlers
 */
function setupProcessHandlers() {
  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.fatal('Uncaught exception', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason : new Error(String(reason)),
      promise: String(promise),
    });
    process.exit(1);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

/**
 * Display startup banner
 */
function displayBanner() {
  if (process.env.NODE_ENV === 'development') {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    MCP Atlassian TypeScript Server v2.0.0                   ║
║    Modern, Type-safe, Production-ready                      ║
║                                                              ║
║    🚀 JIRA & Confluence Integration                          ║
║    🔒 Secure Authentication (Basic/PAT/OAuth2)              ║
║    ⚡ High Performance Caching                              ║
║    📝 Comprehensive Logging                                 ║
║    🛡️  Error Handling & Rate Limiting                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
  }
}

// Bootstrap the application
if (import.meta.url === `file://${process.argv[1]}`) {
  displayBanner();
  handleCliArguments();
  setupProcessHandlers();

  // Start the application
  main().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
