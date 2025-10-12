/**
 * JIRA tool module: Find Epics
 * Retrieves list of epics by project key
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for finding JIRA epics
 */
export const jira_find_epic: ToolWithHandler = {
  name: 'jira_find_epic',
  description: `Retrieves list of epics by project key.
  Use this when user asks to create a JIRA task, after clarifying the key of project, or when getting an error like "Epic with name ... not found in project".`,
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
    const params = {
      jql: jqlParts.join(' AND '),
      fields: `summary,${epicNameFieldId},status,created,updated`,
      maxResults,
    };

    const response = await httpClient.get('/rest/api/2/search', { params });

    if (!response.data || !Array.isArray(response.data.issues)) {
      return formatToolResult([]);
    }

    // Map the epics to a simplified format
    const epics = response.data.issues.map((epic: any) => ({
      key: epic.key,
      epicName: epic.fields[epicNameFieldId] || epic.fields.summary,
      summary: epic.fields.summary,
      status: epic.fields.status?.name,
      statusCategory: epic.fields.status?.statusCategory?.name,
      created: epic.fields.created,
      updated: epic.fields.updated,
      url: `${config.url}/browse/${epic.key}`,
    }));

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