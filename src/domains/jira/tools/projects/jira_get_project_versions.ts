/**
 * JIRA tool module: Get Project Versions
 * Retrieves all versions for a specific JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for jira_get_project_versions
 */
export const jira_get_project_versions: ToolWithHandler = {
  name: 'jira_get_project_versions',
  description: 'Get all versions for a specific JIRA project',
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'The project key or ID to get versions for (e.g. "TEST" or "10000")',
      },
    },
    required: ['projectIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get project versions',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getProjectVersionsHandler,
};

/**
 * Handler function for jira_get_project_versions
 */
async function getProjectVersionsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;
    const { projectIdOrKey } = args;

    logger.info('Fetching JIRA project versions', { projectIdOrKey });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'versions', { projectIdOrKey });

    // Fetch from cache or API
    const versions = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get(`/rest/api/2/project/${projectIdOrKey}/versions`);
      return response.data || [];
    });

    const json = {
      success: true,
      operation: 'get_project_versions',
      message: versions.length
        ? `Found ${versions.length} versions for project ${projectIdOrKey}`
        : `No versions found for project ${projectIdOrKey}`,
      [/^\d+$/.test(projectIdOrKey) ? 'projectId' : 'projectKey']: projectIdOrKey,
      total: versions.length,
      versions: versions.map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description || null,
        released: v.released || false,
        archived: v.archived || false,
        releaseDate: v.releaseDate || null,
        startDate: v.startDate || null,
      })),
    };

    return formatToolResult(json);
  });
}
