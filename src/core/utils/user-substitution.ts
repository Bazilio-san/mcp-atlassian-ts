/**
 * User substitution utilities
 */

import { createLogger } from './logger.js';
import type { SubstitutionConfig } from '../../types/index.js';

const logger = createLogger('user-substitution');

/**
 * Apply user substitution to HTTP headers based on configuration
 */
export function substituteUserInHeaders (
  headers: Record<string, string>,
  substitutionConfig?: SubstitutionConfig
): Record<string, string> {
  if (!substitutionConfig) {
    return headers;
  }

  const { users, httpHeader } = substitutionConfig;

  // Create a copy of headers to avoid mutation
  const modifiedHeaders = { ...headers };

  // Check if the target header exists (case-insensitive)
  const headerKeys = Object.keys(modifiedHeaders);
  const targetHeaderKey = headerKeys.find(key =>
    key.toLowerCase() === httpHeader.toLowerCase()
  );

  if (!targetHeaderKey) {
    logger.debug('Target header not found in request', {
      httpHeader,
      availableHeaders: headerKeys
    });
    return modifiedHeaders;
  }

  const originalUser = modifiedHeaders[targetHeaderKey];
  const substituteUser = originalUser ? users[originalUser] : undefined;

  if (substituteUser) {
    logger.info('Substituting user in header', {
      header: httpHeader,
      originalUser,
      substituteUser
    });

    modifiedHeaders[targetHeaderKey] = substituteUser;
  } else {
    logger.debug('No substitution found for user', {
      header: httpHeader,
      originalUser,
      availableSubstitutions: Object.keys(users)
    });
  }

  return modifiedHeaders;
}

/**
 * Check if substitution configuration is valid
 */
export function validateSubstitutionConfig (config: SubstitutionConfig): boolean {
  if (!config.httpHeader || typeof config.httpHeader !== 'string') {
    logger.error('Invalid substitution config: httpHeader must be a non-empty string');
    return false;
  }

  if (!config.users || typeof config.users !== 'object') {
    logger.error('Invalid substitution config: users must be an object');
    return false;
  }

  // Check that all mappings are strings
  for (const [key, value] of Object.entries(config.users)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      logger.error('Invalid substitution config: all user mappings must be strings', { key, value });
      return false;
    }
  }

  logger.info('Substitution config validated successfully', {
    httpHeader: config.httpHeader,
    userMappings: Object.keys(config.users).length
  });

  return true;
}