/**
 * JIRA tool module: Find Epics
 * Retrieves list of epics by project key
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';

/**
 * Tool definition for finding JIRA epics
 */
export const jira_get_epics_for_project: ToolWithHandler = {
  name: 'jira_get_epics_for_project',
  description: `Use this tool when a user asks to create a issue under a specific epic and the project key is already known. 
It fetches the project’s epics so you can pick the exact epic key. For each epic it returns: key, epicName, summary, status, url.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'The key of the project to search for epics',
      },
      includeCompleted: {
        type: 'boolean',
        description: 'Include completed epics (statusCategory = Done). Default is false.',
        default: false,
      },
      includeMoreInfo: {
        type: 'boolean',
        description: `If true, include epics details: id, summary, status, url. 
Otherwise returns only epic names. Default is false.`,
        default: false,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of epics to return. Default is 1000.',
        default: 1000,
      },
    },
    required: ['projectKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Find JIRA epics',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: findEpicHandler,
};

/**
 * Handler function for finding JIRA epics
 */
async function findEpicHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { projectKey, includeCompleted = false, maxResults = 1000, includeMoreInfo } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Getting epics for project ${projectKey}${includeCompleted ? ' include completed' : ''}`);

    // Build JQL query
    const jqlParts = ['issuetype=Epic', `project=${projectKey}`];

    // Exclude completed epics by default
    if (!includeCompleted) {
      jqlParts.push('statusCategory != Done');
    }
    // Get epic name field ID from config
    const { epicName = '' } = config.fieldId!;

    // Search for epics
    const requestBody = {
      jql: jqlParts.join(' AND ') + ' ORDER BY updated DESC',
      fields: ['summary', epicName, 'status', 'created', 'updated'].filter(Boolean),
      maxResults,
    };

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#search-search
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-get
    const { data } = (await httpClient.post(`${config.restPath}/search`, requestBody)) || {};

    const { issues = [], total } = data || {};

    const epics = issues
      .filter(isObject)
      .map((epic: any) => {
        const { id, key } = epic;
        const fields = epic.fields || {};
        return {
          id,
          key,
          epicName: fields[epicName] || fields.summary,
          summary: fields.summary,
          status: fields.status?.name,
          statusCategory: fields.status?.statusCategory?.name,
          created: convertToIsoUtc(fields.created),
          updated: convertToIsoUtc(fields.updated),
          url: `${config.origin}/browse/${epic.key}`,
        };
      });

    // Sort epics by updated date (most recent first)
    epics.sort((a: any, b: any) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    const count = epics.length;


    const message = count
      ? `Found ${count} epics for project ${projectKey}${total !== count ? ` (showing ${count} of ${total} total)` : ''}`
      : `No epics found for project ${projectKey}`;
    logger.info(message);

    const json: any = {
      success: true,
      operation: 'get_epics_for_project',
      message,
    };

    if (includeMoreInfo) {
      json.epics = epics;
    } else {
      json.epicNames = epics.map((e: any) => e.epicName);
    }
    return formatToolResult(json);
  });
}
