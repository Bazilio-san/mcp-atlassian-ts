/**
 * Configuration management for the MCP Atlassian server
 */

import { config } from 'dotenv';
import { z } from 'zod';
import type { AtlassianConfig, ServerConfig, AuthConfig } from '../../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('config');

// Load environment variables
config();

// Validation schemas
const AuthSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('basic'),
    email: z.string().email(),
    token: z.string().min(1),
  }),
  z.object({
    type: z.literal('pat'),
    token: z.string().min(1),
  }),
  z.object({
    type: z.literal('oauth2'),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    accessToken: z.string().min(1),
    refreshToken: z.string().optional(),
    redirectUri: z.string().url().optional(),
  }),
]);

const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  environment: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  transportType: z.enum(['stdio', 'http', 'sse']).default('http'),
  rateLimit: z.object({
    windowMs: z.number().int().positive().default(900000), // 15 minutes
    maxRequests: z.number().int().positive().default(100),
  }),
  cache: z.object({
    ttlSeconds: z.number().int().positive().default(300), // 5 minutes
    maxItems: z.number().int().positive().default(1000),
  }),
});

const AtlassianConfigSchema = z.object({
  url: z.string().url(),
  email: z.string().email().optional(),
  auth: AuthSchema,
  jira: z.object({
    maxResults: z.number().int().positive().default(50),
    defaultProject: z.string().optional(),
  }).optional(),
  confluence: z.object({
    maxResults: z.number().int().positive().default(50),
    defaultSpace: z.string().optional(),
  }).optional(),
});

/**
 * Load and validate server configuration from environment variables
 */
export function loadServerConfig(): ServerConfig {
  try {
    const config = {
      port: parseInt(process.env.PORT || '3000', 10),
      environment: (process.env.NODE_ENV as any) || 'development',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      transportType: (process.env.TRANSPORT_TYPE as any) || 'http',
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      },
      cache: {
        ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
        maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
      },
    };

    return ServerConfigSchema.parse(config);
  } catch (error) {
    logger.error('Failed to load server configuration:', error);
    throw new Error('Invalid server configuration');
  }
}

/**
 * Load and validate Atlassian configuration from environment variables
 */
export function loadAtlassianConfig(): AtlassianConfig {
  try {
    const atlassianUrl = process.env.ATLASSIAN_URL;
    if (!atlassianUrl) {
      throw new Error('ATLASSIAN_URL environment variable is required');
    }

    // Determine authentication method
    let auth: AuthConfig;
    
    if (process.env.ATLASSIAN_OAUTH_ACCESS_TOKEN) {
      // OAuth 2.0
      auth = {
        type: 'oauth2',
        clientId: process.env.ATLASSIAN_OAUTH_CLIENT_ID!,
        clientSecret: process.env.ATLASSIAN_OAUTH_CLIENT_SECRET!,
        accessToken: process.env.ATLASSIAN_OAUTH_ACCESS_TOKEN!,
        refreshToken: process.env.ATLASSIAN_OAUTH_REFRESH_TOKEN,
        redirectUri: process.env.ATLASSIAN_OAUTH_REDIRECT_URI,
      };
    } else if (process.env.ATLASSIAN_PAT) {
      // Personal Access Token
      auth = {
        type: 'pat',
        token: process.env.ATLASSIAN_PAT,
      };
    } else if (process.env.ATLASSIAN_EMAIL && process.env.ATLASSIAN_API_TOKEN) {
      // Basic Auth
      auth = {
        type: 'basic',
        email: process.env.ATLASSIAN_EMAIL,
        token: process.env.ATLASSIAN_API_TOKEN,
      };
    } else {
      throw new Error('No valid authentication method found. Please set either ATLASSIAN_PAT, or ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN, or OAuth credentials.');
    }

    const config = {
      url: atlassianUrl,
      email: process.env.ATLASSIAN_EMAIL,
      auth,
      jira: {
        maxResults: parseInt(process.env.JIRA_MAX_RESULTS || '50', 10),
        defaultProject: process.env.JIRA_DEFAULT_PROJECT,
      },
      confluence: {
        maxResults: parseInt(process.env.CONFLUENCE_MAX_RESULTS || '50', 10),
        defaultSpace: process.env.CONFLUENCE_DEFAULT_SPACE,
      },
    };

    return AtlassianConfigSchema.parse(config);
  } catch (error) {
    logger.error('Failed to load Atlassian configuration:', error);
    throw new Error('Invalid Atlassian configuration');
  }
}

/**
 * Get enabled tools from environment variable
 */
export function getEnabledTools(): string[] {
  const enabledTools = process.env.ENABLED_TOOLS?.trim();
  
  if (!enabledTools) {
    return []; // Return empty array to enable all tools
  }
  
  return enabledTools
    .split(',')
    .map(tool => tool.trim())
    .filter(tool => tool.length > 0);
}

/**
 * Check if a specific tool is enabled
 */
export function isToolEnabled(toolName: string): boolean {
  const enabledTools = getEnabledTools();
  
  // If no tools are specified, all are enabled
  if (enabledTools.length === 0) {
    return true;
  }
  
  return enabledTools.includes(toolName);
}

/**
 * Get SSL/TLS configuration
 */
export function getSslConfig() {
  return {
    rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    verifyPeer: process.env.SSL_VERIFY_PEER !== 'false',
  };
}

/**
 * Validate environment setup
 */
export function validateEnvironment(): void {
  const requiredVars = ['ATLASSIAN_URL'];
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate auth configuration
  const hasBasicAuth = process.env.ATLASSIAN_EMAIL && process.env.ATLASSIAN_API_TOKEN;
  const hasPat = process.env.ATLASSIAN_PAT;
  const hasOAuth = process.env.ATLASSIAN_OAUTH_ACCESS_TOKEN;
  
  if (!hasBasicAuth && !hasPat && !hasOAuth) {
    throw new Error('No valid authentication method configured');
  }
  
  logger.info('Environment validation passed');
}

// Configuration instances (lazy-loaded)
let _serverConfig: ServerConfig | null = null;
let _atlassianConfig: AtlassianConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (!_serverConfig) {
    _serverConfig = loadServerConfig();
  }
  return _serverConfig;
}

export function getAtlassianConfig(): AtlassianConfig {
  if (!_atlassianConfig) {
    _atlassianConfig = loadAtlassianConfig();
  }
  return _atlassianConfig;
}