#!/usr/bin/env node
/**
 * MCP Atlassian TypeScript Server - Main Entry Point
 *
 * A comprehensive TypeScript implementation of the MCP server for
 * Atlassian JIRA and Confluence with modern architecture and features.
 */

import { appConfig } from './bootstrap/init-config';
import { createAuthenticationManager, validateAuthConfig } from './core/auth';
import { initializeCache } from './core/cache';
import { ServerError } from './core/errors';
import { createMcpServer } from './core/server';
import { createLogger } from './core/utils/logger.js';
import { pathToFileURL } from 'url';

const logger = createLogger('main');

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
async function main () {
  try {
    logger.info('Starting MCP Atlassian TypeScript Server v2.0.0');

    // Configuration is already loaded and validated in init-config.ts
    const { server: { environment, transportType, port }, atlassian, cache } = appConfig;
    const { url } = atlassian;

    logger.info('Configuration loaded', { environment, transportType, atlassianUrl: url });

    // Build auth config from appConfig
    const authConfig = buildAuthConfig(atlassian);
    validateAuthConfig(authConfig);

    // Initialize cache
    initializeCache(cache);
    logger.info('Cache initialized', { ...cache });

    // Test Atlassian connectivity
    const authManager = createAuthenticationManager(authConfig, url);
    const isConnected = await authManager.testAuthentication(url);

    if (!isConnected) {
      throw new ServerError('Failed to authenticate with Atlassian services');
    }

    logger.info('Atlassian authentication successful');

    // Create and configure MCP server
    const mcpServer = createMcpServer(appConfig);

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

    logger.info('MCP Atlassian Server started successfully');

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
function displayBanner () {
  if (process.env.NODE_ENV === 'development') {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    MCP Atlassian TypeScript Server v2.0.0                    ║
║    Modern, Type-safe, Production-ready                       ║
║                                                              ║
║    🚀 JIRA & Confluence Integration                          ║
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
  displayBanner();
  setupProcessHandlers();

  // Start the application
  main().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
