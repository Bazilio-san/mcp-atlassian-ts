/**
 * JIRA tool module: Get Projects
 * Retrieves all accessible JIRA projects for the authenticated user
 */

import type { ToolContext } from '../../../../types/tool-context';
import { generateCacheKey } from '../../../../core/cache.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for jira_get_projects
 */
export const jira_get_projects: ToolWithHandler = {
  name: 'jira_get_projects',
  description: `Get *ALL ACCESSIBLE* JIRA projects for the authenticated user. 
For each project returns: key, name, description, projectTypeKey`,
  inputSchema: {
    type: 'object',
    properties: {
      expand: { // VVA help LLM work with this
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand (e.g. ["description", "lead", "issueTypes"])',
        default: [],
      },
      topRecentProjects: {
        type: 'number',
        description: 'Number of recent projects to return. Default - no restrictions',
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
    const { httpClient, cache, logger, config } = context;
    const { expand, topRecentProjects } = args;

    logger.info(`Fetching JIRA projects: expand: ${expand} | topRecentProjects: ${topRecentProjects}`);

    // Build query parameters
    const params: any = {};
    if (expand?.length) {
      params.expand = normalizeToArray(expand).join(',');
    }
    if (topRecentProjects) {
      params.recent = topRecentProjects;
    }

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'projects', { expand: normalizeToArray(expand), topRecentProjects });

    // Fetch from cache or API
    const projects = await cache.getOrSet(cacheKey, async () => {
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getAllProjects
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-get
      // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-search-get
      const response = await httpClient.get(`${config.restPath}/project`, { params });
      return response.data || [];
    });

    const count = projects.length;
    const message = count
      ? `Found ${projects.length} JIRA projects`
      : 'No JIRA projects found';
    logger.info(message);

    const json = {
      found: !!count,
      operation: 'get_projects',
      message,
      projects: projects.map(({ key, name, description, projectTypeKey, projectCategory: _projectCategory }: any) => ({
        key,
        name,
        description: stringOrADF2markdown(description),
        projectTypeKey,
        // projectCategory: _projectCategory?.name || undefined,
      })),
    };

    return formatToolResult(json);
  });
}
