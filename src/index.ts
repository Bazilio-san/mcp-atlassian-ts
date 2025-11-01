#!/usr/bin/env node
/**
 * MCP Atlassian TS Server - Main Entry Point
 *
 * A comprehensive TypeScript implementation of the MCP server for
 * Atlassian JIRA and Confluence with modern architecture and features.
 */

import { pathToFileURL } from 'url';
import { appConfig, hasStringValue } from './bootstrap/init-config.js';
import { createAuthenticationManager, validateAuthConfig } from './core/auth.js';
import { initializeCache } from './core/cache.js';
import { toError, toStr, ServerError } from './core/errors/errors.js';
import { createServiceServer } from './core/server/factory.js';
import { ServiceModeJC } from './types/config';
import chalk from 'chalk';
import { logger as lgr } from './core/utils/logger.js';

const logger = lgr.getSubLogger({ name: chalk.bgYellow('main') });

/**
 * Get available service modes
 */
export function getAvailableServiceModes (): ServiceModeJC[] {
  return ['jira', 'confluence'];
}

/**
 * Validate service mode
 */
export function validateServiceMode (mode: string): mode is ServiceModeJC {
  return getAvailableServiceModes().includes(mode as ServiceModeJC);
}

/**
 * Parse CLI arguments
 */
function parseCliArguments (): { serviceMode?: ServiceModeJC; help?: boolean } {
  const args = process.argv.slice(2);
  const options: { serviceMode?: ServiceModeJC; help?: boolean } = {};

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
function displayHelp (): void {
  console.log(`
${appConfig.productName} Server v${appConfig.version}

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
  MCP_SERVICE_MODE=jira npm start          # Run JIRA-only server via env var
  MCP_SERVICE_MODE=confluence npm start    # Run Confluence-only server via env var

Environment Variables:
  MCP_SERVICE_MODE            Service mode (jira|confluence) - required
  JIRA_URL              JIRA instance URL
  JIRA_USERNAME         Username for JIRA authentication
  JIRA_PASSWORD         Password/token for JIRA authentication
  CONFLUENCE_URL        Confluence instance URL
  CONFLUENCE_USERNAME   Username for Confluence authentication
  CONFLUENCE_PASSWORD   Password/token for Confluence authentication
`);
}

/**
 * Build authentication config from app config
 */
function buildAuthConfig (
  auth: {
    basic?: {
      username?: string;
      password?: string
    };
    pat?: string;
    oauth2?: any
  } | undefined,
): any {
  if (!auth) {
    throw new ServerError('Authentication configuration is missing');
  }
  const {
    pat: token,
    basic: { username, password } = {},
    oauth2 = {},
  } = auth;
  if (hasStringValue(token)) {
    return { type: 'pat', token };
  } else if (hasStringValue(oauth2.clientId)) {
    return { type: 'oauth2', ...oauth2 };
  } else if (hasStringValue(username) && hasStringValue(password)) {
    return { type: 'basic', username, password };
  } else {
    throw new ServerError('No valid authentication method configured');
  }
}

/**
 * Main application entry point
 */
async function main (cliServiceMode?: ServiceModeJC) {
  try {
    // Determine service mode (CLI args override config)
    let { serviceMode } = appConfig.server;
    if (cliServiceMode) {
      // Override service mode
      serviceMode = cliServiceMode;
      (appConfig.server as any).serviceMode = serviceMode;
    }
    // Configuration is already loaded and validated in init-config.ts
    const { server: { transportType, port }, jira, confluence, cache, productName, version } = appConfig;

    if (!serviceMode) {
      throw new ServerError('Service mode is required. Set MCP_SERVICE_MODE environment variable or use --service flag');
    }

    logger.info(`Starting ${productName} Server v${version}: serviceMode: ${serviceMode} / ${serviceMode}.url = ${(appConfig as any)[serviceMode].url}`);

    const err = new Error('ddddddddddddddddddddddddd');
    logger.error(err);
    logger.error('Error', toError(err));
    logger.info(`Starting ${productName} Server v${version}: serviceMode: ${serviceMode} / ${serviceMode}.url = ${(appConfig as any)[serviceMode].url}`);

    // Initialize cache
    initializeCache(cache);
    logger.info(`Cache initialized: ${JSON.stringify(cache)}`);

    // Test service-specific connectivity
    if (serviceMode === 'jira') {
      if (!jira?.url || jira.url === '***') {
        throw new ServerError('JIRA URL is required but not configured');
      }
      const authConfig = buildAuthConfig(jira.auth || {});
      validateAuthConfig(authConfig);
      const authManager = createAuthenticationManager(authConfig, jira.url);
      const v = jira.apiVersion;
      const isConnected = await authManager.testAuthentication(`${jira.url}/rest/api/${v}/${v === 2 ? 'serverInfo' : 'myself'}`);
      if (!isConnected) {
        throw new ServerError('Failed to authenticate with JIRA');
      }
      logger.info('JIRA authentication successful');
    } else if (serviceMode === 'confluence') {
      if (!confluence?.url || confluence.url === '***') {
        throw new ServerError('Confluence URL is required but not configured');
      }
      const authConfig = buildAuthConfig(confluence.auth || {});
      validateAuthConfig(authConfig);
      const authManager = createAuthenticationManager(authConfig, confluence.url);
      const isConnected = await authManager.testAuthentication(`${confluence.url}/rest/api/user/current`);
      if (!isConnected) {
        throw new ServerError('Failed to authenticate with Confluence');
      }
      logger.info('Confluence authentication successful');
    }

    // Create and configure MCP server based on service mode
    const mcpServer = createServiceServer(appConfig);

    // Initialize tools after server creation (needed for proper inheritance)
    await mcpServer.registerTools();

    // Start server based on transport type
    switch (transportType) {
      case 'stdio':
        logger.info('Starting server with STDIO transport');
        await mcpServer.startStdio();
        break;

      case 'http':
      case 'sse':
        logger.info(`Starting server with HTTP/SSE transport: port: ${port}`);
        await mcpServer.startHttp();
        break;

      default:
        throw new ServerError(`Unsupported transport type: ${transportType}`);
    }

    logger.info(`MCP Atlassian Server started successfully: serviceMode: ${serviceMode}`);

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
    logger.fatal('Failed to start MCP Atlassian Server', toError(error));
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
    const errorReason = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal(`Unhandled promise rejection: reason: ${toStr(errorReason)} | promise: ${String(promise)}`, errorReason);

    // Check for common port-related errors
    if (errorReason instanceof Error && errorReason.message.includes('EADDRINUSE')) {
      logger.error('Port conflict detected: The server port is already in use.');
      logger.error('Please use a different port or stop the process using this port.');
    }

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
function displayBanner (serviceMode: ServiceModeJC) {
  if (process.env.NODE_ENV === 'development') {
    const serviceDescription = {
      jira: '🎯 JIRA-Only Server',
      confluence: '📝 Confluence-Only Server',
    }[serviceMode] || '❓ Unknown Service Mode';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ${appConfig.productName} Server v${appConfig.version}                    ║
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
    console.error('Error parsing arguments:', toStr(error));
    displayHelp();
    process.exit(1);
  }
}
