/**
 * JIRA Priority Service
 * Fetches and manages priority enums dynamically from JIRA
 */

import type { ToolContext } from './tool-context.js';

export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  statusColor?: string;
}

/**
 * Global cache for dynamic priorities
 */
let cachedPriorities: string[] = [];
let prioritiesFetched = false;

/**
 * Fetch priorities from JIRA and cache them
 */
export async function fetchAndCachePriorities (context: ToolContext): Promise<string[]> {
  const cacheKey = 'jira_priorities_enum';

  try {
    // First try power client if available
    const client = context.powerHttpClient || context.httpClient;

    // Use cache to store priorities for session
    const priorities = await context.cache.getOrSet(
      cacheKey,
      async (): Promise<JiraPriority[]> => {
        context.logger.info('Fetching priorities from JIRA API');
        const response = await client.get('/rest/api/2/priority');

        if (!Array.isArray(response.data)) {
          context.logger.warn('Invalid priorities response format', { response: response.data });
          return [];
        }

        return response.data as JiraPriority[];
      },
      3600 // Cache for 1 hour
    );

    // Extract priority names
    const priorityNames = priorities.map(({ name }) => name).filter(name => name);

    // Update global cache
    cachedPriorities = priorityNames;
    prioritiesFetched = true;

    context.logger.info('Priorities fetched successfully', {
      count: priorityNames.length,
      priorities: priorityNames
    });

    return priorityNames;
  } catch (error) {
    context.logger.error('Failed to fetch priorities from JIRA', error instanceof Error ? error : new Error(String(error)));

    // Fallback to common JIRA priorities if fetch fails
    const fallbackPriorities = [
      'Highest',
      'High',
      'Medium',
      'Low',
      'Lowest',
      'Critical',
      'Major',
      'Minor',
      'Trivial',
      'Blocker',
    ];

    cachedPriorities = fallbackPriorities;
    prioritiesFetched = true;

    context.logger.info('Using fallback priorities', { priorities: fallbackPriorities });
    return fallbackPriorities;
  }
}

/**
 * Get cached priorities (for use in tool schema)
 * Returns fallback priorities if not yet fetched
 */
export function getCachedPriorities (): string[] {
  if (!prioritiesFetched || cachedPriorities.length === 0) {
    // Return fallback priorities if not yet fetched
    return [
      'Highest',
      'High',
      'Medium',
      'Low',
      'Lowest',
      'Critical',
      'Major',
      'Minor',
      'Trivial',
      'Blocker',
    ];
  }

  return cachedPriorities;
}

/**
 * Check if priorities have been fetched from server
 */
export function arePrioritiesFetched (): boolean {
  return prioritiesFetched;
}

/**
 * Reset priority cache (for testing)
 */
export function resetPriorityCache (): void {
  cachedPriorities = [];
  prioritiesFetched = false;
}