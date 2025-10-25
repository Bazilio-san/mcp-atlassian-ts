/**
 * JIRA Priority Service
 * Fetches and manages priority enums dynamically from JIRA
 */

import type { AxiosInstance } from 'axios';
import { createLogger } from '../../../core/utils/logger.js';
import { getCache } from '../../../core/cache.js';
import type { JCConfig } from '../../../types/index.js';

const logger = createLogger('priority-service');

export interface JiraPriority {
  id: string;
  name: string;
  description?: string;
}

/**
 * Fetch priorities from JIRA and cache them
 */
export async function getCachedPriorityObjects (httpClient: AxiosInstance, config: JCConfig): Promise<JiraPriority[]> {
  const cache = getCache();
  const cacheKey = 'jira_priorities';
  let cachedPriorities: JiraPriority[] | undefined;
  try {
    // Use cache to store priorities for session
    cachedPriorities = await cache.getOrSet(
      cacheKey,
      async (): Promise<JiraPriority[] | undefined> => {
        logger.info('Fetching priorities from JIRA API');
        // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#priority-getPriorities
        // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-priorities/#api-rest-api-2-priority-get
        const response = await httpClient!.get(`${config.restPath}/priority`);
        const priorities = response.data;
        if (!Array.isArray(priorities)) {
          logger.warn(`Invalid priorities response format: ${priorities}`);
          return;
        }
        logger.info(`Priorities fetched successfully: count: ${priorities.length}`);
        return priorities.map(({ id, name, description }) => ({ id, name, description }));
      },
      3600, // Cache for 1 hour
    );
  } catch (error) {
    logger.error('Failed to fetch priorities from JIRA', error instanceof Error ? error : new Error(String(error)));
  }
  return cachedPriorities || [];
}


/**
 * Get array of priority names
 * Returns cached priorities or fallback priorities if not yet fetched */
export const getPriorityNamesArray = async (httpClient: AxiosInstance, config: JCConfig): Promise<string[]> => {
  return (await getCachedPriorityObjects(httpClient, config)).map(({ name }) => name);
};


