#!/usr/bin/env node
/**
 * MCP Atlassian TypeScript Server - Main Entry Point
 *
 * A comprehensive TypeScript implementation of the MCP server for
 * Atlassian JIRA and Confluence with modern architecture and features.
 */

import { appConfig } from './bootstrap/init-config.js';
import { createAuthenticationManager, validateAuthConfig } from './core/auth';
import { initializeCache } from './core/cache';
import { ServerError } from './core/errors';
import { createServiceServer, validateServiceMode, type ServiceMode } from './core/server/factory.js';
import { createLogger } from './core/utils/logger.js';
import { pathToFileURL } from 'url';

const logger = createLogger('main');

/**
 * Parse CLI arguments
 */
function parseCliArguments(): { serviceMode?: ServiceMode; help?: boolean } {
  const args = process.argv.slice(2);
  const options: { serviceMode?: ServiceMode; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--service' || arg === '-s') {
      const serviceArg = args[i + 1];
      if (!serviceArg) {
        throw new Error('--service requires a value: jira or confluence');
      }
      if (!validateServiceMode(serviceArg)) {
        throw new Error(`Invalid service mode: ${serviceArg}. Valid options: jira, confluence`);
      }
      options.serviceMode = serviceArg;
      i++; // Skip the next argument since we consumed it
    }
  }

  return options;
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(`
MCP Atlassian TypeScript Server v2.0.0

Usage: npm start [-- [OPTIONS]]

Options:
  --service, -s <mode>   Service mode: jira or confluence (required)
  --help, -h            Show this help message

Service Modes:
  jira                  Run JIRA-only server with JIRA tools
  confluence           Run Confluence-only server with Confluence tools

Examples:
  npm start -- --service jira         # Run JIRA-only server
  npm start -- --service confluence   # Run Confluence-only server
  MCP_SERVICE=jira npm start          # Run JIRA-only server via env var
  MCP_SERVICE=confluence npm start    # Run Confluence-only server via env var

Environment Variables:
  MCP_SERVICE            Service mode (jira|confluence) - required
  JIRA_URL              JIRA instance URL
  JIRA_EMAIL            Email for JIRA authentication
  JIRA_API_TOKEN        API token for JIRA
  CONFLUENCE_URL        Confluence instance URL
  CONFLUENCE_EMAIL      Email for Confluence authentication
  CONFLUENCE_API_TOKEN  API token for Confluence
`);
}

/**
 * Build authentication config from app config
 */
function buildAuthConfig (atlassianConfig: any): any {
  const {
    auth: { pat, oauth2 = {}, apiToken } = {},
    email,
  } = atlassianConfig;
  if (pat) {
    return { type: 'pat', token: pat };
  } else if (oauth2.clientId) {
    return { type: 'oauth2', ...oauth2 };
  } else if (apiToken && email) {
    return { type: 'basic', email, token: apiToken };
  }

  throw new ServerError('No valid authentication method configured');
}

/**
 * Main application entry point
 */
async function main (cliServiceMode?: ServiceMode) {
  try {
    // Determine service mode (CLI args override config)
    const serviceMode = cliServiceMode || appConfig.server.serviceMode;

    if (!serviceMode) {
      throw new ServerError('Service mode is required. Set MCP_SERVICE environment variable or use --service flag');
    }

    logger.info('Starting MCP Atlassian TypeScript Server v2.0.0', { serviceMode });

    // Configuration is already loaded and validated in init-config.ts
    const { server: { environment, transportType, port }, jira, confluence, cache } = appConfig;

    // Override service mode in config for the server
    (appConfig.server as any).serviceMode = serviceMode;

    logger.info('Configuration loaded', { environment, transportType, serviceMode });

    // Initialize cache
    initializeCache(cache);
    logger.info('Cache initialized', { ...cache });

    // Test service-specific connectivity
    if (serviceMode === 'jira') {
      if (!jira?.url || jira.url === '***') {
        throw new ServerError('JIRA URL is required but not configured');
      }
      const authConfig = buildAuthConfig(jira);
      validateAuthConfig(authConfig);
      const authManager = createAuthenticationManager(authConfig, jira.url);
      const isConnected = await authManager.testAuthentication(jira.url);
      if (!isConnected) {
        throw new ServerError('Failed to authenticate with JIRA');
      }
      logger.info('JIRA authentication successful');
    } else if (serviceMode === 'confluence') {
      if (!confluence?.url || confluence.url === '***') {
        throw new ServerError('Confluence URL is required but not configured');
      }
      const authConfig = buildAuthConfig(confluence);
      validateAuthConfig(authConfig);
      const authManager = createAuthenticationManager(authConfig, confluence.url);
      const isConnected = await authManager.testAuthentication(confluence.url);
      if (!isConnected) {
        throw new ServerError('Failed to authenticate with Confluence');
      }
      logger.info('Confluence authentication successful');
    }

    // Create and configure MCP server based on service mode
    const mcpServer = createServiceServer(appConfig);

    // Start server based on transport type
    switch (transportType) {
      case 'stdio':
        logger.info('Starting server with STDIO transport');
        await mcpServer.startStdio();
        break;

      case 'http':
      case 'sse':
        logger.info('Starting server with HTTP/SSE transport', { port });
        await mcpServer.startHttp();
        break;

      default:
        throw new ServerError(`Unsupported transport type: ${transportType}`);
    }

    logger.info('MCP Atlassian Server started successfully', { serviceMode });

    // Keep the process alive for HTTP/SSE transport
    if (transportType === 'http' || transportType === 'sse') {
      // Keep the process alive
      const keepAlive = setInterval(() => {
        // This keeps the event loop alive
      }, 60000); // Check every minute

      // Clear interval on shutdown
      process.on('SIGINT', () => {
        clearInterval(keepAlive);
      });
      process.on('SIGTERM', () => {
        clearInterval(keepAlive);
      });
    }
  } catch (error) {
    logger.fatal('Failed to start MCP Atlassian Server', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

/**
 * Setup process event handlers
 */
function setupProcessHandlers () {
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
function displayBanner (serviceMode: ServiceMode) {
  if (process.env.NODE_ENV === 'development') {
    const serviceDescription = {
      jira: '🎯 JIRA-Only Server',
      confluence: '📝 Confluence-Only Server'
    }[serviceMode] || '❓ Unknown Service Mode';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    MCP Atlassian TypeScript Server v2.0.0                    ║
║    Modern, Type-safe, Production-ready                       ║
║                                                              ║
║    ${serviceDescription.padEnd(56)} ║
║    🔒 Secure Authentication (Basic/PAT/OAuth2)               ║
║    ⚡ High Performance Caching                               ║
║    📝 Comprehensive Logging                                  ║
║    🛡️  Error Handling & Rate Limiting                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
  }
}

// Bootstrap the application
const currentFileUrl = import.meta.url;
const mainFileUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';

if (currentFileUrl === mainFileUrl) {
  try {
    // Parse CLI arguments
    const { serviceMode, help } = parseCliArguments();

    // Show help if requested
    if (help) {
      displayHelp();
      process.exit(0);
    }

    if (serviceMode) {
      displayBanner(serviceMode);
    }
    setupProcessHandlers();

    // Start the application with service mode
    main(serviceMode).catch(error => {
      console.error('Failed to start application:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error parsing arguments:', error instanceof Error ? error.message : String(error));
    displayHelp();
    process.exit(1);
  }
}
