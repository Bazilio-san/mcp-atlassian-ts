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
let prioritiesFetched = false;

const fallbackPriorities: JiraPriority[] = [
  { id: '1', name: 'Highest' },
  { id: '2', name: 'High' },
  { id: '3', name: 'Medium' },
  { id: '4', name: 'Low' },
  { id: '5', name: 'Lowest' },
  { id: '6', name: 'Critical' },
  { id: '7', name: 'Major' },
  { id: '8', name: 'Minor' },
  { id: '9', name: 'Trivial' },
  { id: '10', name: 'Blocker' },
];

/**
 * Fetch priorities from JIRA and cache them
 */
export async function fetchAndCachePriorities (): Promise<string[]> {
  if (!powerHttpClient) {
    throw new Error('powerHttpClient is required for fetch Priorities');
  }
  const cache = getCache();
  const cacheKey = 'jira_priorities';

  try {
    // Use cache to store priorities for session
    const priorities = await cache.getOrSet(
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
      3600 // Cache for 1 hour
    );

    // Update global cache
    cachedPriorities = priorities;
    prioritiesFetched = true;

    // Extract priority names for return
    const priorityNames = priorities.map(({ name }) => name).filter(name => name);

    logger.info('Priorities fetched successfully', {
      count: priorityNames.length,
      priorities: priorityNames
    });

    return priorityNames;
  } catch (error) {
    logger.error('Failed to fetch priorities from JIRA', error instanceof Error ? error : new Error(String(error)));

    // Fallback to common JIRA priorities if fetch fails

    cachedPriorities = fallbackPriorities;
    prioritiesFetched = true;

    const fallbackNames = fallbackPriorities.map(({ name }) => name);
    logger.info('Using fallback priorities', { priorities: fallbackNames });
    return fallbackNames;
  }
}

/**
 * Get array of priority objects
 * Returns cached priorities or fallback priorities if not yet fetched
 */
export const getCachedPriorityObjects = (): JiraPriority[] => {
  return (prioritiesFetched || cachedPriorities.length) ?  cachedPriorities : fallbackPriorities;
};

/**
 * Get array of priority names
 * Returns cached priorities or fallback priorities if not yet fetched */
export function getPriorityNamesArray (): string[] {
  return getCachedPriorityObjects().map(({ name }) => name);
}


