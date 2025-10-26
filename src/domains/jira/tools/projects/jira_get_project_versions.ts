/**
 * JIRA tool module: Get Project Versions
 * Retrieves all versions for a specific JIRA project
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { stringOrADF2markdown } from '../../shared/utils.js';

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
    const { httpClient, cache, logger, config } = context;
    const { projectIdOrKey } = args;

    logger.info(`Fetching JIRA versions for project ${projectIdOrKey}`);

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'versions', { projectIdOrKey });

    // Fetch from cache or API
    const versions = await cache.getOrSet(cacheKey, async () => {
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProjectVersions
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-project-projectidorkey-versions-get
      // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-versions/#api-rest-api-3-project-projectidorkey-version-get
      const response = await httpClient.get(`${config.restPath}/project/${projectIdOrKey}/versions`);
      return response.data || [];
    });

    const i = `project ${/^\d+$/.test(projectIdOrKey) ? 'id' : 'key'}`;
    const message = versions.length
      ? `Found ${versions.length} versions for ${i}`
      : `No versions found for ${i}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'get_project_versions',
      message,
      total: versions.length,
      versions: versions.map((v: any) => ({
        id: v.id,
        name: v.name,
        description: stringOrADF2markdown(v.description) || null,
        released: v.released || false,
        archived: v.archived || false,
        releaseDate: v.releaseDate || null,
        startDate: v.startDate || null,
      })),
    };

    return formatToolResult(json);
  });
}
