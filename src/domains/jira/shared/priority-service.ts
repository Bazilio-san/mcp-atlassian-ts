/**
 * JIRA Priority Service
 * Fetches and manages priority enums dynamically from JIRA
 */

import { powerHttpClient } from '../../../core/server/jira-server.js';
import { createLogger } from '../../../core/utils/logger.js';
import { getCache } from '../../../core/cache.js';

const logger = createLogger('priority-service');

export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
}

/**
 * Global cache for dynamic priorities
 */
let cachedPriorities: JiraPriority[] = [];
let _prioritiesFetched = false;

/**
 * Fetch priorities from JIRA and cache them
 */
export async function getCachedPriorityObjects (): Promise<JiraPriority[]> {
  if (!powerHttpClient) {
    throw new Error('powerHttpClient is required for fetch Priorities');
  }
  const cache = getCache();
  const cacheKey = 'jira_priorities';

  try {
    // Use cache to store priorities for session
    cachedPriorities = await cache.getOrSet(
      cacheKey,
      async (): Promise<JiraPriority[]> => {
        logger.info('Fetching priorities from JIRA API');
        const response = await powerHttpClient!.get('/rest/api/2/priority');

        if (!Array.isArray(response.data)) {
          logger.warn('Invalid priorities response format', { response: response.data });
          return [];
        }

        return response.data as JiraPriority[];
      },
      3600, // Cache for 1 hour
    );

    logger.info('Priorities fetched successfully', { count: cachedPriorities.length });
    _prioritiesFetched = true;
  } catch (error) {
    logger.error('Failed to fetch priorities from JIRA', error instanceof Error ? error : new Error(String(error)));
  }
  return cachedPriorities;
}



/**
 * Get array of priority names
 * Returns cached priorities or fallback priorities if not yet fetched */
export const getPriorityNamesArray = async (): Promise<string[]> => {
  return (await getCachedPriorityObjects()).map(({ name }) => name);
};


