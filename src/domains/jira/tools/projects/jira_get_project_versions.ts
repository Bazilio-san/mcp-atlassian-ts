/**
 * JIRA tool module: Get Project Versions
 * Retrieves all versions for a specific JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
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

    if (versions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No versions found for project ${projectIdOrKey}**`,
          },
        ],
      };
    }

    const versionsList = versions
      .map(
        (v: any) =>
          `• **${v.name}** ${v.released ? '(Released)' : '(Unreleased)'} ${v.archived ? '[Archived]' : ''}`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Project Versions for ${projectIdOrKey}**\n\n${versionsList}`,
        },
      ],
    };
  });
}
