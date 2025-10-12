/**
 * JIRA tool module: Get Project
 * Retrieves details of a specific JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for jira_get_project
 */
export const jira_get_project: ToolWithHandler = {
  name: 'jira_get_project',
  description: `Get details of a specific JIRA project by key or ID. 
Also returns the list of issue types available in the project (with their IDs) 
so the LLM Agent can choose the correct issueType name when creating an issue.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'The project key or ID',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand (e.g. ["description", "lead", "issueTypes", "url", "projectKeys", "permissions", "insight", "properties"])',
        default: [],
      },
      properties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project properties to include in the response',
        default: [],
      },
    },
    required: ['projectIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get JIRA project details',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getProjectHandler,
};

/**
 * Handler function for jira_get_project
 */
async function getProjectHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { powerHttpClient, httpClient, cache, logger, normalizeToArray } = context;
    const { projectIdOrKey, expand, properties } = args;

    logger.info('Fetching JIRA project details', { projectIdOrKey, expand, properties });

    // Use power client if available for general project data
    const client = powerHttpClient || httpClient;

    // Build query parameters
    const params: any = {};
    if (expand?.length) {
      params.expand = normalizeToArray(expand).join(',');
    }
    if (properties?.length) {
      params.properties = normalizeToArray(properties).join(',');
    }

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'project', {
      projectIdOrKey,
      expand: normalizeToArray(expand),
      properties: normalizeToArray(properties),
    });

    // Fetch from cache or API
    const project = await cache.getOrSet(cacheKey, async () => {
      const response = await client.get(`/rest/api/2/project/${projectIdOrKey}`, { params });
      return response.data;
    });

    if (!project) {
      const json = {
        found: false,
        operation: 'get_project',
        message: 'Project not found',
        [/^\d+$/.test(projectIdOrKey) ? 'projectId' : 'projectKey']: projectIdOrKey,
      };

      return formatToolResult(json);
    }

    // Sanitize project to include only allowed fields
    const filteredProject = (() => {
      const p: any = project || {};
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        projectTypeKey: p.projectTypeKey,
        archived: p.archived,
        url: p.url,
        lead: p.lead ? { key: p.lead.key, name: p.lead.name, displayName: p.lead.displayName } : undefined,
        issueTypes: Array.isArray(p.issueTypes)
          ? p.issueTypes.map(({ id, name, description, subtask }: any) => ({ id, name, description, subtask }))
          : undefined,
        versions: Array.isArray(p.versions)
          ? p.versions.map(({ id, name, description, archived, released }: any) => ({ id, name, description, archived, released }))
          : undefined,
      };
    })();

    const json = {
      found: true,
      operation: 'get_project',
      message: `Project details retrieved: ${filteredProject.name} (${filteredProject.key})`,
      project: filteredProject,
    };

    return formatToolResult(json);
  });
}
