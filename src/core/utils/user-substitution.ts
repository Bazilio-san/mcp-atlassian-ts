/**
 * User substitution utilities
 */

import { createLogger } from './logger.js';
import { ISubstitutionConfig, ServiceModeJC } from '../../types/config';

const logger = createLogger('user-substitution');

/**
 * Apply user substitution to HTTP headers based on configuration
 */
export function substituteUserInHeaders (
  headers: Record<string, string>,
  serviceMode: ServiceModeJC,
  substitutionConfig?: ISubstitutionConfig,
): Record<string, string> {
  if (!substitutionConfig) {
    return headers;
  }

  const { httpHeader } = substitutionConfig;
  const users = substitutionConfig[serviceMode];
  const httpHeaderName = (httpHeader || '').toLowerCase();
  // Create a copy of headers to avoid mutation
  const modifiedHeaders = { ...headers };

  // Check if the target header exists (case-insensitive)
  const headerKeys = Object.keys(modifiedHeaders);
  const targetHeaderKey = headerKeys.find((key) => key.toLowerCase() === httpHeaderName);

  if (!targetHeaderKey) {
    logger.debug(`Target header '${httpHeader}' not found in request; available headers: ${JSON.stringify(headerKeys)}`);
    return modifiedHeaders;
  }

  const originalUser = modifiedHeaders[targetHeaderKey];
  const substituteUser = users && originalUser ? users[originalUser] : undefined;
  if (substituteUser) {
    modifiedHeaders[targetHeaderKey] = substituteUser;
  }

  return modifiedHeaders;
}

