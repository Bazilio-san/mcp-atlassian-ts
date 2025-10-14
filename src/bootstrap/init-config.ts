import './dotenv.js';  // Load environment variables first
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import type { IConfig, IToolsConfig } from '../types/config.js';
import { createLogger } from '../core/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logger = createLogger('config');

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
  if (typeof value !== 'string') {
    return false;
  }
  const cleaned = value.replace(/\*+/g, '').trim();
  return cleaned.length > 0;
}

export const hasStringValue = (v: any): boolean => (typeof v === 'string' && v.replace(/\*+/g, '').length > 0);

/**
 * Build authentication configuration from yaml and environment
 */
function buildAuthConfig (prefix: 'JIRA' | 'CONFLUENCE', yamlAuth?: any) {
  const auth: any = {};

  // Basic auth - check env first, then yaml
  const username = getEnv(`${prefix}_USERNAME`) || yamlAuth?.basic?.username;
  const password = getEnv(`${prefix}_PASSWORD`) || yamlAuth?.basic?.password;

  if (hasValue(username) && hasValue(password)) {
    auth.basic = { username, password };
  }

  // PAT - check env first, then yaml
  const pat = getEnv(`${prefix}_PAT`) || yamlAuth?.pat;
  if (hasValue(pat)) {
    auth.pat = pat;
  }

  // OAuth2 - check env first, then yaml
  const clientId = getEnv(`${prefix}_OAUTH_CLIENT_ID`) || yamlAuth?.oauth2?.clientId;
  const clientSecret = getEnv(`${prefix}_OAUTH_CLIENT_SECRET`) || yamlAuth?.oauth2?.clientSecret;
  const accessToken = getEnv(`${prefix}_OAUTH_ACCESS_TOKEN`) || yamlAuth?.oauth2?.accessToken;
  const refreshToken = getEnv(`${prefix}_OAUTH_REFRESH_TOKEN`) || yamlAuth?.oauth2?.refreshToken;
  const redirectUri = getEnv(`${prefix}_OAUTH_REDIRECT_URI`) || yamlAuth?.oauth2?.redirectUri;

  if (hasValue(clientId) && hasValue(clientSecret) && hasValue(accessToken)) {
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
 * Normalize tools configuration
 */
function normalizeToolsConfig (config: any): IToolsConfig | undefined {
  if (!config) {
    return undefined;
  }

  const result: IToolsConfig = {
    include: 'ALL',
    exclude: [],
  };

  // Handle include
  if (config.include === 'ALL' || config.include === undefined || config.include === null) {
    result.include = 'ALL';
  } else if (Array.isArray(config.include)) {
    result.include = config.include.filter((item: any) => typeof item === 'string');
    if (result.include.length === 0) {
      result.include = 'ALL';
    }
  } else {
    result.include = 'ALL';
  }

  // Handle exclude
  if (Array.isArray(config.exclude)) {
    result.exclude = config.exclude.filter((item: any) => typeof item === 'string');
  } else if (config.exclude && typeof config.exclude === 'string') {
    result.exclude = [config.exclude];
  }

  return result;
}

/**
 * Load raw YAML configuration if it exists
 */
function loadYamlConfig (): any | null {
  try {
    const configPath = join(process.cwd(), 'config.yaml');

    if (!existsSync(configPath)) {
      logger.debug('No config.yaml found, using environment variables only');
      return null;
    }

    const fileContent = readFileSync(configPath, 'utf8');
    const yamlConfig = YAML.parse(fileContent);

    if (!yamlConfig) {
      logger.warn('config.yaml exists but is empty');
      return null;
    }

    logger.info('Configuration loaded from config.yaml');
    return yamlConfig;
  } catch (error) {
    logger.error('Failed to load config.yaml', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Build application configuration from YAML and environment variables
 * Priority: environment variables > config.yaml > defaults
 */
function buildConfig (): IConfig {
  const yaml = loadYamlConfig();

  // Helper to get value with priority: env > yaml > default
  const getValue = <T> (envKey: string, yamlPath: string[], defaultValue: T): T => {
    if (process.env[envKey] !== undefined) {
      return getEnv(envKey, defaultValue);
    }
    // Navigate through yaml path
    let yamlValue = yaml;
    for (const key of yamlPath) {
      yamlValue = yamlValue?.[key];
    }
    if (yamlValue !== undefined && yamlValue !== null) {
      return yamlValue;
    }

    return defaultValue;
  };

  // Service mode from env or yaml
  const serviceMode = getEnv('MCP_SERVICE') || yaml?.server?.serviceMode;

  return {
    // Package metadata from package.json
    name: packageJson.name,
    productName: 'MCP Atlassian TS',
    version: packageJson.version,
    description: packageJson.description,

    // Server configuration
    server: {
      port: getValue('SERVER_PORT', ['server', 'port'], 3000),
      host: getValue('SERVER_HOST', ['server', 'host'], '0.0.0.0'),
      transportType: getValue('TRANSPORT_TYPE', ['server', 'transportType'], 'http') as 'stdio' | 'http' | 'sse',
      token: getValue('SERVER_TOKEN', ['server', 'token'], undefined),
      ...(serviceMode && { serviceMode: serviceMode as 'jira' | 'confluence' }),
    },

    // JIRA configuration
    jira: (() => {
      const jiraConfig: any = {
        url: getValue('JIRA_URL', ['jira', 'url'], ''),
        auth: buildAuthConfig('JIRA', yaml?.jira?.auth),
        maxResults: getValue('JIRA_MAX_RESULTS', ['jira', 'maxResults'], 50),
        epicLinkFieldId: getValue('JIRA_EPIC_LINK_FIELD_ID', ['jira', 'epicLinkFieldId'], 'customfield_10014'),
      };
      const jiraTools = normalizeToolsConfig(yaml?.jira?.usedInstruments);
      if (jiraTools) {
        jiraConfig.usedInstruments = jiraTools;
      }

      // Power endpoint configuration
      const powerBaseUrl = getEnv('JIRA_POWER_BASE_URL') || yaml?.jira?.powerEndpoint?.baseUrl;
      if (hasValue(powerBaseUrl)) {
        const powerAuth: any = {};

        // Power endpoint basic auth
        const powerUsername = getEnv('JIRA_POWER_USER') || yaml?.jira?.powerEndpoint?.auth?.basic?.username;
        const powerPassword = getEnv('JIRA_POWER_PASS') || yaml?.jira?.powerEndpoint?.auth?.basic?.password;

        if (hasValue(powerUsername) && hasValue(powerPassword)) {
          powerAuth.basic = { username: powerUsername, password: powerPassword };
        }

        // Power endpoint PAT
        const powerPat = getEnv('JIRA_POWER_PAT') || yaml?.jira?.powerEndpoint?.auth?.pat;
        if (hasValue(powerPat)) {
          powerAuth.pat = powerPat;
        }

        // Power endpoint OAuth2
        const powerClientId = getEnv('JIRA_POWER_OAUTH_CLIENT_ID') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.clientId;
        const powerClientSecret = getEnv('JIRA_POWER_OAUTH_CLIENT_SECRET') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.clientSecret;
        const powerAccessToken = getEnv('JIRA_POWER_OAUTH_ACCESS_TOKEN') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.accessToken;

        if (hasValue(powerClientId) && hasValue(powerClientSecret) && hasValue(powerAccessToken)) {
          powerAuth.oauth2 = {
            type: 'oauth2' as const,
            clientId: powerClientId,
            clientSecret: powerClientSecret,
            accessToken: powerAccessToken,
            ...(hasValue(getEnv('JIRA_POWER_OAUTH_REFRESH_TOKEN') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.refreshToken) &&
              { refreshToken: getEnv('JIRA_POWER_OAUTH_REFRESH_TOKEN') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.refreshToken }),
            ...(hasValue(getEnv('JIRA_POWER_OAUTH_REDIRECT_URI') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.redirectUri) &&
              { redirectUri: getEnv('JIRA_POWER_OAUTH_REDIRECT_URI') || yaml?.jira?.powerEndpoint?.auth?.oauth2?.redirectUri }),
          };
        }

        // Only add powerEndpoint if auth is configured
        if (Object.keys(powerAuth).length > 0) {
          jiraConfig.powerEndpoint = {
            baseUrl: powerBaseUrl,
            auth: powerAuth,
          };
        }
      }

      return jiraConfig;
    })(),

    // Confluence configuration
    confluence: (() => {
      const confConfig: any = {
        url: getValue('CONFLUENCE_URL', ['confluence', 'url'], ''),
        auth: buildAuthConfig('CONFLUENCE', yaml?.confluence?.auth),
        maxResults: getValue('CONFLUENCE_MAX_RESULTS', ['confluence', 'maxResults'], 50),
      };
      const confTools = normalizeToolsConfig(yaml?.confluence?.usedInstruments);
      if (confTools) {
        confConfig.usedInstruments = confTools;
      }
      return confConfig;
    })(),

    // Logging configuration
    logger: {
      level: getValue('LOG_LEVEL', ['logger', 'level'], 'info') as 'debug' | 'info' | 'warn' | 'error',
      pretty: getValue('LOG_PRETTY', ['logger', 'pretty'], true),
    },

    // Rate limiting configuration
    rateLimit: {
      windowMs: getValue('RATE_LIMIT_WINDOW_MS', ['rateLimit', 'windowMs'], 900000), // 15 minutes
      maxRequests: getValue('RATE_LIMIT_MAX_REQUESTS', ['rateLimit', 'maxRequests'], 100),
    },

    // Cache configuration
    cache: {
      ttlSeconds: getValue('CACHE_TTL_SECONDS', ['cache', 'ttlSeconds'], 300), // 5 minutes
      maxItems: getValue('CACHE_MAX_ITEMS', ['cache', 'maxItems'], 1000),
    },

    // SSL/TLS configuration
    ssl: {
      rejectUnauthorized: getValue('NODE_TLS_REJECT_UNAUTHORIZED', ['ssl', 'rejectUnauthorized'], true),
    },

    // Feature flags
    features: yaml?.features || {},

    // Response format configuration
    isReturnJson: getValue('IS_RETURN_JSON', ['isReturnJson'], false),
  };
}

export const appConfig: IConfig = buildConfig();

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

/**
 * Check if a specific tool should be enabled based on configuration
 */
export function isToolEnabledByConfig (toolName: string): boolean {
  // Determine which service this tool belongs to
  const service = toolName.startsWith('jira_') ? 'jira' :
    toolName.startsWith('confluence_') ? 'confluence' :
      null;

  // Utility tools are always enabled
  if (!service) {
    return true;
  }

  const serviceConfig = service === 'jira' ? appConfig.jira : appConfig.confluence;
  const toolsConfig = serviceConfig.usedInstruments;

  // If no tool config, all tools are enabled by default
  if (!toolsConfig) {
    return true;
  }

  // Check if tool is explicitly excluded
  if (toolsConfig.exclude.includes(toolName)) {
    logger.debug(`Tool ${toolName} is explicitly excluded`);
    return false;
  }

  // Check include list
  if (toolsConfig.include === 'ALL') {
    return true;
  }

  // If include is a list, tool must be in it
  const isIncluded = toolsConfig.include.includes(toolName);
  if (!isIncluded) {
    logger.debug(`Tool ${toolName} is not in include list`);
  }

  return isIncluded;
}

/**
 * Get tool configuration for a service
 */
export function getServiceToolConfig (service: 'jira' | 'confluence'): IToolsConfig | undefined {
  const serviceConfig = service === 'jira' ? appConfig.jira : appConfig.confluence;
  return serviceConfig.usedInstruments;
}
