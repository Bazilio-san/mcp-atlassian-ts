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
  description: 'Get details of a specific JIRA project by key or ID',
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'The project ID or project key',
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
      properties: normalizeToArray(properties)
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

    // Format project details
    let details = [
      `**${project.name}** (${project.key})`,
      `ID: ${project.id}`,
      `Type: ${project.projectTypeKey}`,
      `Style: ${project.style || 'N/A'}`,
    ];

    if (project.lead) {
      details.push(`Lead: ${project.lead.displayName || project.lead.name} (${project.lead.accountId || project.lead.key})`);
    }

    if (project.description) {
      details.push(`\nDescription: ${project.description}`);
    }

    if (project.url) {
      details.push(`URL: ${project.url}`);
    }

    if (project.avatarUrls) {
      details.push(`Avatar: ${project.avatarUrls['48x48'] || project.avatarUrls['32x32'] || project.avatarUrls['16x16']}`);
    }

    if (project.issueTypes && project.issueTypes.length > 0) {
      details.push(`\nIssue Types (${project.issueTypes.length}):`);
      project.issueTypes.forEach((type: any) => {
        details.push(`• ${type.name}${type.subtask ? ' (subtask)' : ''}`);
      });
    }

    if (project.components && project.components.length > 0) {
      details.push(`\nComponents (${project.components.length}):`);
      project.components.forEach((comp: any) => {
        details.push(`• ${comp.name}${comp.lead ? ` (Lead: ${comp.lead.displayName})` : ''}`);
      });
    }

    if (project.versions && project.versions.length > 0) {
      details.push(`\nVersions (${project.versions.length}):`);
      project.versions.forEach((ver: any) => {
        details.push(`• ${ver.name}${ver.released ? ' (released)' : ''}${ver.archived ? ' (archived)' : ''}`);
      });
    }

    if (project.permissions) {
      const permissionList = Object.entries(project.permissions)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => key);
      if (permissionList.length > 0) {
        details.push(`\nPermissions: ${permissionList.join(', ')}`);
      }
    }

    if (project.properties && Object.keys(project.properties).length > 0) {
      details.push('\nProperties:');
      Object.entries(project.properties).forEach(([key, value]) => {
        details.push(`• ${key}: ${JSON.stringify(value)}`);
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: details.join('\n'),
        },
      ],
    };
  });
}