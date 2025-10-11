/**
 * JIRA tool module: Get Project
 * Retrieves details of a specific JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
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

const FORMAT_AS_JSON = true;

/**
 * Handler function for jira_get_project
 */
async function getProjectHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, normalizeToArray } = context;
    const { projectIdOrKey, expand, properties } = args;

    logger.info('Fetching JIRA project details', { projectIdOrKey, expand, properties });

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
      const response = await httpClient.get(`/rest/api/2/project/${projectIdOrKey}`, { params });
      return response.data;
    });

    if (!project) {
      return {
        content: [
          {
            type: 'text',
            text: `**Project not found: ${projectIdOrKey}**`,
          },
        ],
      };
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
          ? p.issueTypes.map((t: any) => ({ id: t.id, description: t.description, name: t.name, subtask: t.subtask }))
          : undefined,
        versions: Array.isArray(p.versions)
          ? p.versions.map((v: any) => ({ id: v.id, description: v.description, name: v.name, archived: v.archived, released: v.released }))
          : undefined,
      };
    })();

    let text = '';
    if (FORMAT_AS_JSON) {
      text = JSON.stringify(filteredProject, null, 2);
    } else {
      // Format project details using only allowed fields
      let details = [
        `**${filteredProject.name}** (${filteredProject.key})`,
        `ID: ${filteredProject.id}`,
        `Type: ${filteredProject.projectTypeKey}`,
        ...(filteredProject.archived !== undefined ? [`Archived: ${filteredProject.archived ? 'yes' : 'no'}`] : []),
      ];

      if (filteredProject.lead) {
        const l = filteredProject.lead as any;
        details.push(`Lead: ${l.displayName || l.name} (${l.key || ''})`.trim());
      }

      if (filteredProject.description) {
        details.push(`\nDescription: ${filteredProject.description}`);
      }

      if (filteredProject.url) {
        details.push(`URL: ${filteredProject.url}`);
      }

      if (filteredProject.issueTypes && filteredProject.issueTypes.length > 0) {
        details.push(`\nIssue Types (${filteredProject.issueTypes.length}):`);
        (filteredProject.issueTypes as any[]).forEach((type: any) => {
          details.push(`• ${type.name}${type.subtask ? ' (subtask)' : ''}`);
        });
      }

      if (filteredProject.versions && filteredProject.versions.length > 0) {
        details.push(`\nVersions (${filteredProject.versions.length}):`);
        (filteredProject.versions as any[]).forEach((ver: any) => {
          details.push(`• ${ver.name}${ver.released ? ' (released)' : ''}${ver.archived ? ' (archived)' : ''}`);
        });
      }
      text = details.join('\n');
    }
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  });
}
