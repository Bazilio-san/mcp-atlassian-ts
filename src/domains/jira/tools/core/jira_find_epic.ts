/**
 * JIRA tool module: Find Epics
 * Retrieves list of epics by project key
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';

/**
 * Tool definition for finding JIRA epics
 */
export const jira_find_epic: ToolWithHandler = {
  name: 'jira_find_epic',
  description: `Use this tool when a user asks to create a task under a specific epic and the project key is already known. 
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
    const { projectKey, includeCompleted = false, maxResults = 1000 } = args;
    const { httpClient, config, logger } = context;

    logger.info('Finding epics for project', { projectKey, includeCompleted });

    // Build JQL query
    const jqlParts = ['issuetype=Epic', `project=${projectKey}`];

    // Exclude completed epics by default
    if (!includeCompleted) {
      jqlParts.push('statusCategory != Done');
    }

    // Get epic name field ID from config
    const epicNameFieldId = (config as any).customFields?.epicName || 'customfield_10011';

    // Search for epics
    const requestBody = {
      jql: jqlParts.join(' AND '),
      fields: ['summary', epicNameFieldId, 'status', 'created', 'updated'],
      maxResults,
    };

    const response = await httpClient.post('/rest/api/2/search', requestBody); // VVT

    if (!response.data || !Array.isArray(response.data.issues)) {
      return formatToolResult([]);
    }

    // Map the epics to a simplified format
    const epics = response.data.issues.map((epic: any) => {
      const { key, fields } = epic;
      return {
        key,
        epicName: fields[epicNameFieldId] || fields.summary,
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

    const result = {
      projectKey,
      epicCount: epics.length,
      epics,
      epicNames: epics.map((e: any) => e.epicName), // Quick list of just epic names for easy reference
    };

    return formatToolResult(result);
  });
}
