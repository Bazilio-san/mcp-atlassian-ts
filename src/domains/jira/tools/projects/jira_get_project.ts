/**
 * JIRA tool module: Get Project
 * Retrieves details of a specific JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { getProjectLabels } from './search-project/labels-cache.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { getPriorityNamesArray } from '../../shared/priority-service.js';

/**
 * Tool definition for jira_get_project
 */
export const jira_get_project: ToolWithHandler = {
  name: 'jira_get_project',
  description: `Returns details of a specific JIRA project by key or ID: 
id, 
key,
name,
description,
url,
issueTypes: {id, name, description, subtask)[], // list of issue types available in the project so the LLM Agent can choose the correct issueType name when creating an issue
labels: // Project label array
projectTypeKey,
archived,
lead?: {key, name, displayName},
`,
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
        description: 'Additional fields to expand (e.g. ["description", "issueTypes", "lead", "issueTypeHierarchy" ])',
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
    const { httpClient, cache, logger, config } = context;
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
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProject
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-projectidorkey-get
      const response = await httpClient.get(`${config.restPath}/project/${projectIdOrKey}`, { params });
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
    let priorityNames: string[] | undefined;
    try {
      priorityNames = await getPriorityNamesArray(httpClient, config);
    } catch (error) {
      logger.warn('Failed to retrieve priority names', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Get project labels using cache system
    let projectLabels: string[] = [];
    if (project.key && project.id) {
      try {
        const labelsResult = await getProjectLabels(httpClient, project.key, String(project.id), context);
        projectLabels = labelsResult.labels;
      } catch (error) {
        logger.warn('Failed to retrieve project labels', {
          projectKey: project.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sanitize project to include only allowed fields
    const filteredProject: FilteredProject = (() => {
      const p: any = project || {};
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        projectTypeKey: p.projectTypeKey,
        archived: p.archived,
        url: p.url,
        issueTypes: Array.isArray(p.issueTypes)
          ? p.issueTypes.map(({ id, name, description, subtask }: any) => ({ id, name, description, subtask }))
          : undefined,
        labels: projectLabels,
        priorityNames,
        lead: p.lead ? {
          key: p.lead.key,
          name: p.lead.name,
          displayName: p.lead.displayName,
        } : undefined,
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

interface FilteredProject {
  id?: string | number;
  key?: string;
  name?: string;
  description?: string;
  projectTypeKey?: string;
  archived?: boolean;
  url?: string;
  issueTypes?: {
    id?: string;
    name?: string;
    description?: string;
    subtask?: boolean;
  }[];
  labels: string[],
  lead?: {
    key?: string;
    name?: string;
    displayName?: string;
  } | undefined;
}
