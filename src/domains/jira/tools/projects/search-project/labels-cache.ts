/**
 * JIRA Project Labels Cache
 * Caches project labels using fast gadget API with fallback to issue search
 */

import type { ToolContext } from '../../../shared/tool-context.js';
import { generateCacheKey } from '../../../../../core/cache.js';
import { powerHttpClient } from '../../../../../core/server/jira-server.js';

export interface ProjectLabelsResult {
  labels: string[];
  source: 'gadget' | 'search' | 'cache' | 'empty';
  fetchedAt: string;
  projectKey: string;
  projectId: string;
}

interface GadgetApiResponse {
  groups: {
    key: string;
    labels: {
      label: string;
      searchUrl: string;
    }[];
  }[];
  field: string;
  project: string;
}

interface SearchApiResponse {
  issues: {
    id: string;
    key: string;
    fields: {
      labels: string[];
    };
  }[];
  total: number;
  startAt: number;
  maxResults: number;
}

/**
 * In-memory cache for labels to avoid repeated API calls within the same session
 */
const labelsMemoryCache = new Map<string, { labels: string[]; timestamp: number; ttl: number }>();

/**
 * Cache TTL in milliseconds (1 hour)
 */
const LABELS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get project labels from cache or fetch from JIRA
 * Uses fast gadget API with fallback to issue search
 */
export async function getProjectLabels (
  projectKey: string,
  projectId: string,
  context: ToolContext,
): Promise<ProjectLabelsResult> {
  const { cache, logger } = context;

  // Check memory cache first
  const memoryCacheKey = `labels_${projectKey}`;
  const memoryEntry = labelsMemoryCache.get(memoryCacheKey);
  if (memoryEntry && Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
    logger.debug('Labels found in memory cache', { projectKey, count: memoryEntry.labels.length });
    return {
      labels: memoryEntry.labels,
      source: 'cache',
      fetchedAt: new Date(memoryEntry.timestamp).toISOString(),
      projectKey,
      projectId
    };
  }

  // Generate cache key for persistent cache
  const cacheKey = generateCacheKey('jira', 'project_labels', { projectKey });

  try {
    const cachedLabels = await cache.getOrSet(
      cacheKey,
      async (): Promise<ProjectLabelsResult> => {
        logger.info('Fetching project labels', { projectKey, projectId });

        // Try fast gadget API first
        try {
          const gadgetLabels = await fetchLabelsFromGadgetApi(projectId, logger);
          if (gadgetLabels.length > 0) {
            logger.info('Labels fetched from gadget API', {
              projectKey,
              count: gadgetLabels.length,
              method: 'gadget'
            });
            return {
              labels: gadgetLabels,
              source: 'gadget',
              fetchedAt: new Date().toISOString(),
              projectKey,
              projectId
            };
          }
        } catch (gadgetError) {
          logger.warn('Gadget API failed, trying fallback method', {
            projectKey,
            error: gadgetError instanceof Error ? gadgetError.message : String(gadgetError)
          });
        }

        // Fallback to issue search
        try {
          const searchLabels = await fetchLabelsFromIssueSearch(projectKey, logger);
          logger.info('Labels fetched from issue search', {
            projectKey,
            count: searchLabels.length,
            method: 'search'
          });
          return {
            labels: searchLabels,
            source: 'search',
            fetchedAt: new Date().toISOString(),
            projectKey,
            projectId
          };
        } catch (searchError) {
          logger.error('Both methods failed to fetch labels', {
            projectKey,
            gadgetError: 'gadget API failed',
            searchError: searchError instanceof Error ? searchError.message : String(searchError)
          });
          return {
            labels: [],
            source: 'empty',
            fetchedAt: new Date().toISOString(),
            projectKey,
            projectId
          };
        }
      },
      LABELS_CACHE_TTL / 1000 // Cache TTL in seconds
    );

    // Update memory cache
    labelsMemoryCache.set(memoryCacheKey, {
      labels: cachedLabels.labels,
      timestamp: Date.now(),
      ttl: LABELS_CACHE_TTL
    });

    return cachedLabels;
  } catch (error) {
    logger.error('Failed to get project labels', {
      projectKey,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      labels: [],
      source: 'empty',
      fetchedAt: new Date().toISOString(),
      projectKey,
      projectId
    };
  }
}

/**
 * Fetch labels using fast gadget API
 */
async function fetchLabelsFromGadgetApi (
  projectId: string,
  logger: any
): Promise<string[]> {
  if (!powerHttpClient) {
    throw new Error('powerHttpClient is required for gadget API');
  }

  logger.debug('Fetching labels from gadget API', { projectId });

  const response = await powerHttpClient.get(
    `/rest/gadget/1.0/labels/gadget/project-${projectId}/labels`
  );

  const data = response.data as GadgetApiResponse;

  if (!data.groups || !Array.isArray(data.groups)) {
    logger.warn('Invalid gadget API response format', { data });
    throw new Error('Invalid gadget API response format');
  }

  // Extract all labels from all groups
  const allLabels: string[] = [];
  for (const group of data.groups) {
    if (group.labels && Array.isArray(group.labels)) {
      for (const labelObj of group.labels) {
        if (labelObj.label) {
          allLabels.push(labelObj.label);
        }
      }
    }
  }

  // Remove duplicates and sort
  const uniqueLabels = [...new Set(allLabels)].sort();

  logger.debug('Gadget API labels extracted', {
    projectId,
    totalGroups: data.groups.length,
    totalLabels: allLabels.length,
    uniqueLabels: uniqueLabels.length
  });

  return uniqueLabels;
}

/**
 * Fallback: fetch labels by searching issues with labels
 */
async function fetchLabelsFromIssueSearch (
  projectKey: string,
  logger: any
): Promise<string[]> {
  if (!powerHttpClient) {
    throw new Error('powerHttpClient is required for issue search');
  }

  logger.debug('Fetching labels from issue search', { projectKey });

  const searchPayload = {
    jql: `project = ${projectKey} AND labels IS NOT EMPTY ORDER BY updated DESC`,
    fields: ['labels'],
    maxResults: 1000
  };

  const response = await powerHttpClient.post('/rest/api/2/search', searchPayload);
  const data = response.data as SearchApiResponse;

  if (!data.issues || !Array.isArray(data.issues)) {
    logger.warn('Invalid search API response format', { data });
    throw new Error('Invalid search API response format');
  }

  // Extract all unique labels from all issues
  const allLabels = new Set<string>();

  for (const issue of data.issues) {
    if (issue.fields?.labels && Array.isArray(issue.fields.labels)) {
      for (const label of issue.fields.labels) {
        if (typeof label === 'string' && label.trim()) {
          allLabels.add(label.trim());
        }
      }
    }
  }

  const uniqueLabels = [...allLabels].sort();

  logger.debug('Issue search labels extracted', {
    projectKey,
    totalIssues: data.issues.length,
    totalLabels: uniqueLabels.length
  });

  return uniqueLabels;
}

/**
 * Clear labels cache for a specific project
 */
export function clearProjectLabelsCache (projectKey: string, context: ToolContext): void {
  const memoryCacheKey = `labels_${projectKey}`;
  labelsMemoryCache.delete(memoryCacheKey);

  const cacheKey = generateCacheKey('jira', 'project_labels', { projectKey });
  context.cache.del(cacheKey);

  context.logger.info('Project labels cache cleared', { projectKey });
}

/**
 * Clear all labels cache
 */
export function clearAllLabelsCache (context: ToolContext): void {
  labelsMemoryCache.clear();
  context.logger.info('All labels cache cleared');
}
