/**
 * JIRA tool module: Get Projects
 * Retrieves all accessible JIRA projects for the authenticated user
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for jira_get_projects
 */
export const jira_get_projects: ToolWithHandler = {
  name: 'jira_get_projects',
  description: 'Get all accessible JIRA projects for the authenticated user',
  inputSchema: {
    type: 'object',
    properties: {
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand (e.g. ["description", "lead", "issueTypes"])',
        default: [],
      },
      recent: {
        type: 'number',
        description: 'Number of recent projects to return',
        minimum: 1,
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get JIRA projects',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getProjectsHandler,
};

/**
 * Handler function for jira_get_projects
 */
async function getProjectsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, normalizeToArray } = context;
    const { expand, recent } = args;

    logger.info('Fetching JIRA projects', { expand, recent });

    // Build query parameters
    const params: any = {};
    if (expand?.length) {
      params.expand = normalizeToArray(expand).join(',');
    }
    if (recent) {
      params.recent = recent;
    }

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'projects', { expand: normalizeToArray(expand), recent });

    // Fetch from cache or API
    const projects = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get('/rest/api/2/project', { params });
      return response.data || [];
    });

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '**No JIRA projects found**',
          },
        ],
      };
    }

    const projectsList = projects
      .map((p: any) => `• **${p.name}** (${p.key}) - ${p.projectTypeKey}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**JIRA Projects (${projects.length} found)**\n\n${projectsList}`,
        },
      ],
    };
  });
}
