import './dotenv.js';  // Load environment variables first
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { IConfig } from '../types/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read package.json for metadata (from project root)
// Handle both development (src/) and production (dist/src/) scenarios
const isProduction = __dirname.includes('dist');
const packageJsonPath = isProduction
  ? join(__dirname, '..', '..', '..', 'package.json')  // dist/src/bootstrap -> project root
  : join(__dirname, '..', '..', 'package.json');        // src/bootstrap -> project root
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

/**
 * Get environment variable value with type conversion
 */
function getEnv (key: string, defaultValue: any = undefined): any {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  // Handle boolean values
  if (defaultValue === true || defaultValue === false) {
    return value.toLowerCase() === 'true';
  }

  // Handle numeric values
  if (typeof defaultValue === 'number') {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // Handle array values (comma-separated)
  if (Array.isArray(defaultValue)) {
    return value ? value.split(',').map(s => s.trim()).filter(Boolean) : defaultValue;
  }

  // Return string value or undefined if empty
  return value || defaultValue;
}

/**
 * Check if a string value is meaningful (not empty, not just asterisks)
 */
function hasValue (value: any): boolean {
  if (typeof value !== 'string') return false;
  const cleaned = value.replace(/\*+/g, '').trim();
  return cleaned.length > 0;
}

export const hasStringValue = (v: any): boolean => (typeof v === "string" && v.replace(/\*+/g, '').length > 0);

/**
 * Build authentication configuration from environment
 */
function buildAuthConfig (prefix: 'JIRA' | 'CONFLUENCE') {
  const username = getEnv(`${prefix}_USERNAME`);
  const password = getEnv(`${prefix}_PASSWORD`);
  const pat = getEnv(`${prefix}_PAT`);
  const clientId = getEnv(`${prefix}_OAUTH_CLIENT_ID`);
  const clientSecret = getEnv(`${prefix}_OAUTH_CLIENT_SECRET`);
  const accessToken = getEnv(`${prefix}_OAUTH_ACCESS_TOKEN`);
  const refreshToken = getEnv(`${prefix}_OAUTH_REFRESH_TOKEN`);
  const redirectUri = getEnv(`${prefix}_OAUTH_REDIRECT_URI`);

  // Build OAuth2 config only if we have required fields
  const hasOAuth = hasValue(clientId) && hasValue(clientSecret) && hasValue(accessToken);
  const hasBasic = hasValue(username) && hasValue(password);

  const auth: any = {};

  if (hasBasic) {
    auth.basic = { username, password };
  }

  if (hasValue(pat)) {
    auth.pat = pat;
  }

  if (hasOAuth) {
    auth.oauth2 = {
      type: 'oauth2' as const,
      clientId: clientId!,
      clientSecret: clientSecret!,
      accessToken: accessToken!,
      ...(hasValue(refreshToken) && { refreshToken }),
      ...(hasValue(redirectUri) && { redirectUri }),
    };
  }

  return auth;
}

/**
 * Application configuration built from environment variables
 */
export const appConfig: IConfig = {
  // Package metadata from package.json
  name: packageJson.name,
  productName: 'MCP Atlassian',
  version: packageJson.version,
  description: packageJson.description,

  // Server configuration
  server: {
    port: getEnv('SERVER_PORT', 3000),
    host: getEnv('SERVER_HOST', '0.0.0.0'),
    transportType: getEnv('TRANSPORT_TYPE', 'http') as 'stdio' | 'http' | 'sse',
    ...(getEnv('MCP_SERVICE') && { serviceMode: getEnv('MCP_SERVICE') as 'jira' | 'confluence' }),
  },

  // JIRA configuration
  jira: {
    url: getEnv('JIRA_URL', ''),
    auth: buildAuthConfig('JIRA'),
    maxResults: getEnv('JIRA_MAX_RESULTS', 50),
    epicLinkFieldId: getEnv('JIRA_EPIC_LINK_FIELD_ID', 'customfield_10014'),
  },

  // Confluence configuration
  confluence: {
    url: getEnv('CONFLUENCE_URL', ''),
    auth: buildAuthConfig('CONFLUENCE'),
    maxResults: getEnv('CONFLUENCE_MAX_RESULTS', 50),
  },

  // Logging configuration
  logger: {
    level: getEnv('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
    pretty: getEnv('LOG_PRETTY', true),
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: getEnv('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnv('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // Cache configuration
  cache: {
    ttlSeconds: getEnv('CACHE_TTL_SECONDS', 300), // 5 minutes
    maxItems: getEnv('CACHE_MAX_ITEMS', 1000),
  },

  // SSL/TLS configuration
  ssl: {
    rejectUnauthorized: getEnv('NODE_TLS_REJECT_UNAUTHORIZED', true),
  },

  // Feature flags
  features: {
    enabledTools: getEnv('ENABLED_TOOLS', []),
  },
};

const { confluence, jira } = appConfig;

// Optional: Validate required configuration
const validateConfig = () => {
  const serviceMode = appConfig.server.serviceMode;

  // Validate service-specific configuration based on MCP_SERVICE
  if (serviceMode === 'jira' || !serviceMode) {
    // Validate JIRA configuration
    if (!jira.url) {
      throw new Error('JIRA URL configuration is missing. Please provide JIRA_URL or set it in config.');
    }

    // Validate JIRA authentication is configured
    const hasBasicAuth = jira.auth?.basic?.username && jira.auth?.basic?.password;
    const hasPat = hasStringValue(jira.auth?.pat);
    const hasOAuth = jira.auth?.oauth2?.clientId;

    if (!hasBasicAuth && !hasPat && !hasOAuth) {
      throw new Error('No JIRA authentication method configured. Please provide Basic Auth (username/password), PAT, or OAuth2 credentials');
    }
  }

  if (serviceMode === 'confluence') {
    // Validate Confluence configuration
    if (!confluence.url) {
      throw new Error('Confluence URL configuration is missing. Please provide CONFLUENCE_URL or set it in config.');
    }

    // Validate Confluence authentication is configured
    const hasBasicAuth = confluence.auth?.basic?.username && confluence.auth?.basic?.password;
    const hasPat = hasStringValue(confluence.auth?.pat);
    const hasOAuth = confluence.auth?.oauth2?.clientId;

    if (!hasBasicAuth && !hasPat && !hasOAuth) {
      throw new Error('No Confluence authentication method configured. Please provide Basic Auth (username/password), PAT, or OAuth2 credentials');
    }
  }
};

validateConfig();
