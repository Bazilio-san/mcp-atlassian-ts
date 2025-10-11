/**
 * Tool configuration loader
 * Loads and manages tool inclusion/exclusion from config.yaml
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('tool-config');

export interface ToolsConfig {
  jira: {
    include: 'ALL' | string[];
    exclude: string[];
  };
  confluence: {
    include: 'ALL' | string[];
    exclude: string[];
  };
}

export interface ConfigYaml {
  usedInstruments: ToolsConfig;
}

/**
 * Load tool configuration from config.yaml
 */
export function loadToolConfig (): ToolsConfig | null {
  try {
    // Look for config.yaml in project root
    const configPath = join(process.cwd(), 'config.yaml');

    if (!existsSync(configPath)) {
      logger.info('No config.yaml found, using default configuration (all tools enabled)');
      return null;
    }

    const fileContent = readFileSync(configPath, 'utf8');
    const config = YAML.parse(fileContent) as ConfigYaml;

    if (!config?.usedInstruments) {
      logger.warn('config.yaml exists but usedInstruments section is missing, using defaults');
      return null;
    }

    // Validate and normalize configuration
    const toolsConfig: ToolsConfig = {
      jira: normalizeServiceConfig(config.usedInstruments.jira, 'jira'),
      confluence: normalizeServiceConfig(config.usedInstruments.confluence, 'confluence')
    };

    logger.debug('Tool configuration loaded from config.yaml', {
      jira: {
        include: Array.isArray(toolsConfig.jira.include) ? toolsConfig.jira.include.length : 'ALL',
        exclude: toolsConfig.jira.exclude.length
      },
      confluence: {
        include: Array.isArray(toolsConfig.confluence.include) ? toolsConfig.confluence.include.length : 'ALL',
        exclude: toolsConfig.confluence.exclude.length
      }
    });

    return toolsConfig;
  } catch (error) {
    logger.error('Failed to load config.yaml', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Normalize service configuration
 */
function normalizeServiceConfig (
  config: any,
  service: 'jira' | 'confluence'
): { include: 'ALL' | string[]; exclude: string[] } {
  const result = {
    include: 'ALL' as 'ALL' | string[],
    exclude: [] as string[]
  };

  if (!config) {
    logger.debug(`No configuration for ${service}, defaulting to ALL`);
    return result;
  }

  // Handle include
  if (config.include === 'ALL' || config.include === undefined || config.include === null) {
    result.include = 'ALL';
  } else if (Array.isArray(config.include)) {
    result.include = config.include.filter((item: any) => typeof item === 'string');
    if (result.include.length === 0) {
      result.include = 'ALL';
    }
  } else {
    logger.warn(`Invalid include configuration for ${service}, defaulting to ALL`);
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
 * Check if a specific tool should be enabled based on configuration
 */
export function isToolEnabledByConfig (toolName: string, config: ToolsConfig | null): boolean {
  // If no config, all tools are enabled by default
  if (!config) {
    return true;
  }

  // Determine which service this tool belongs to
  const service = toolName.startsWith('jira_') ? 'jira' :
                 toolName.startsWith('confluence_') ? 'confluence' :
                 null;

  // Utility tools are always enabled
  if (!service) {
    return true;
  }

  const serviceConfig = config[service];

  // Check if tool is explicitly excluded
  if (serviceConfig.exclude.includes(toolName)) {
    logger.debug(`Tool ${toolName} is explicitly excluded`);
    return false;
  }

  // Check include list
  if (serviceConfig.include === 'ALL') {
    return true;
  }

  // If include is a list, tool must be in it
  const isIncluded = serviceConfig.include.includes(toolName);
  if (!isIncluded) {
    logger.debug(`Tool ${toolName} is not in include list`);
  }

  return isIncluded;
}

/**
 * Get a list of all configured tools
 */
export function getConfiguredTools (config: ToolsConfig | null): {
  jira: { enabled: string[]; disabled: string[] };
  confluence: { enabled: string[]; disabled: string[] };
} {
  if (!config) {
    return {
      jira: { enabled: [], disabled: [] },
      confluence: { enabled: [], disabled: [] }
    };
  }

  // This would be populated with actual tool names when needed
  // For now, return the configuration structure
  return {
    jira: {
      enabled: config.jira.include === 'ALL' ? [] : config.jira.include,
      disabled: config.jira.exclude
    },
    confluence: {
      enabled: config.confluence.include === 'ALL' ? [] : config.confluence.include,
      disabled: config.confluence.exclude
    }
  };
}
