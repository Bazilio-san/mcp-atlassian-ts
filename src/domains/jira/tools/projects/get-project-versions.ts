/**
 * JIRA tool module: Get Project Versions
 * Retrieves all versions for a specific JIRA project
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for jira_get_project_versions
 */
export const jira_get_project_versions: ToolWithHandler = {
  name: 'jira_get_project_versions',
  description: `Get all versions for a specific JIRA project`,
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'The project key or ID to get versions for (e.g. "TEST" or "10000")',
      },
    },
    required: ['projectKey'],
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
async function getProjectVersionsHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;
    const { projectKey } = args;

    logger.info('Fetching JIRA project versions', { projectKey });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'versions', { projectKey });

    // Fetch from cache or API
    const versions = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get(`/rest/api/2/project/${projectKey}/versions`);
      return response.data || [];
    });

    if (versions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No versions found for project ${projectKey}**`,
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
          text: `**Project Versions for ${projectKey}**\n\n${versionsList}`,
        },
      ],
    };
  });
}
