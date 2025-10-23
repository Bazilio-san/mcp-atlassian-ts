import './dotenv.js';  // Load environment variables first
import configModule from 'config';
import { IConfig, IToolsConfig, ServiceModeJC } from '../types/config.js';

export const config: IConfig = configModule.util.toObject();

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../core/utils/logger.js';
import { getBaseUrl } from '../core/utils/tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logger = createLogger('config');

// Read package.json for metadata (from project root)
// Handle both development (src/) and production (dist/src/) scenarios
const isProduction = __dirname.includes('dist');
const packageJsonPath = isProduction
  ? join(__dirname, '..', '..', '..', 'package.json')  // dist/src/bootstrap -> project root
  : join(__dirname, '..', '..', 'package.json');        // src/bootstrap -> project root
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));


interface IConfigSource {
  name: string;
  original?: string | undefined;
  parsed: any;
}

export const configInfo = () => {
  const configSrc: IConfigSource[] = configModule.util.getConfigSources();
  const customEnvSrc = configSrc.find((o) => o.name.includes('custom-environment-variables'))?.original || '';
  const envsUsed: any = {};
  [...customEnvSrc.matchAll(/^ *[^\s:]+: ([A-Z_\d]+)/img)].map((arr) => arr[1]).forEach((name) => {
    if (process.env[name!] !== undefined) {
      envsUsed[name!] = process.env[name!];
    }
  });

  const [, configDir = ''] = /^(.+?)([^\\/]+)$/.exec(configSrc[0]!.name) || [];
  console.log('configDir', configDir);
  console.log(configSrc.map((v) => v.name.replace(configDir, '')));
};


export const hasStringValue = (v: any): boolean => (typeof v === 'string' && v.replace(/\*+/g, '').length > 0);

/**
 * Normalize tools configuration
 */
function normalizeToolsConfig (cfg: IToolsConfig | undefined): IToolsConfig {
  const result: IToolsConfig = {
    include: 'ALL',
    exclude: [],
  };
  if (!cfg) {
    return result;
  }
  // Handle include
  if (cfg.include === 'ALL' || cfg.include === undefined || cfg.include === null) {
    result.include = 'ALL';
  } else if (Array.isArray(cfg.include)) {
    result.include = cfg.include.filter((item: any) => typeof item === 'string');
    if (result.include.length === 0) {
      result.include = 'ALL';
    }
  } else {
    result.include = 'ALL';
  }

  // Handle exclude
  if (Array.isArray(cfg.exclude)) {
    result.exclude = cfg.exclude.filter((item: any) => typeof item === 'string');
  } else if (cfg.exclude && typeof cfg.exclude === 'string') {
    result.exclude = [cfg.exclude];
  }

  return result;
}

/**
 * Build application configuration from YAML and environment variables
 * Priority: environment variables > config.yaml > defaults
 */
function buildConfig (): IConfig {
  const cfg = {
    ...config,
    // Package metadata from package.json
    name: packageJson.name,
    productName: packageJson.productName,
    version: packageJson.version,
    description: packageJson.description,
  };
  const { jira, confluence } = cfg;
  jira.apiVersion = String(jira.apiVersion) === '2' ? 2 : 3;
  jira.restPath = `/rest/api/${jira.apiVersion}`;
  jira.origin = getBaseUrl(jira.url);
  jira.usedInstruments = normalizeToolsConfig(jira.usedInstruments);
  if (!jira.fieldId.epicLink) {
    jira.fieldId.epicLink = 'customfield_10008';
  }
  if (!jira.fieldId.epicName) {
    jira.fieldId.epicName = 'customfield_10011';
  }
  if (!jira.fieldId.storyPoints) {
    jira.fieldId.storyPoints = 'customfield_10024';
  }

  jira.usedInstruments = normalizeToolsConfig(jira.usedInstruments);
  confluence.origin = getBaseUrl(confluence.url);
  confluence.usedInstruments = normalizeToolsConfig(confluence.usedInstruments);
  const serviceMode = cfg.server.serviceMode || 'both';
  if (!['jira', 'confluence', 'both'].includes(serviceMode)) {
    throw new Error(`serviceMode has an incorrect value: ${serviceMode}`);
  }

  const validateServiceConfig = (service: ServiceModeJC) => {
    if ([service, 'both'].includes(serviceMode)) {
      const sc = cfg[service];

      if (!sc.url) {
        throw new Error('JIRA URL configuration is missing. Please provide JIRA_URL or set it in config.');
      }

      const hasBasicAuth = sc.auth?.basic?.username && sc.auth?.basic?.password;
      const hasPat = hasStringValue(sc.auth?.pat);
      const hasOAuth = sc.auth?.oauth2?.clientId;

      if (!hasBasicAuth && !hasPat && !hasOAuth) {
        throw new Error('No JIRA authentication method configured. Please provide Basic Auth (username/password), PAT, or OAuth2 credentials');
      }
    }
  };
  validateServiceConfig('jira');
  validateServiceConfig('confluence');
  return cfg;
}

export const appConfig: IConfig = buildConfig();

configInfo();

/**
 * Returns configuration with sensitive data masked for safe display
 */
export function getSafeAppConfig (): any {
  const config = JSON.parse(JSON.stringify(appConfig)); // Deep clone
  ['jira', 'confluence'].forEach((v) => {
    const a = config[v]?.auth;
    // Mask JIRA sensitive data
    if (a?.basic?.password) {
      a.basic.password = '[MASKED]';
    }
    if (a?.pat) {
      a.pat = '[MASKED]';
    }
    if (a?.oauth2?.clientSecret) {
      a.oauth2.clientSecret = '[MASKED]';
    }
    if (a?.oauth2?.accessToken) {
      a.oauth2.accessToken = '[MASKED]';
    }
    if (a?.oauth2?.refreshToken) {
      a.oauth2.refreshToken = '[MASKED]';
    }
  });
  if (config.server?.token) {
    config.server.token = '[MASKED]';
  }
  return config;
}

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
