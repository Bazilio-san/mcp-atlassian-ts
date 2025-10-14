/**
 * JIRA tool module: Get Epics for Project
 * Retrieves all epics for a specific project (excluding completed ones)
 * Use this tool when you need to link an issue to an epic, unlink from an epic, or create an epic-related issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for getting epics for a project
 */
export const jira_get_epics_for_project: ToolWithHandler = {
  name: 'jira_get_epics_for_project',
  description: 'Get all epics for a specific project (excluding completed ones). Use when linking/unlinking issues to epics or creating epic-related issues.',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: `
Project key can be used to identify a JIRA project.
Project key is usually an abbreviated format (e.g. PROJ, TEST, DEV).
An example project key is TEST.
This is required to identify which project's epics to retrieve.`,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of epics to return (default: 1000)',
        minimum: 1,
        maximum: 1000,
        default: 1000,
      },
    },
    required: ['projectKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get project epics',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getEpicsForProjectHandler,
};

/**
 * Handler function for getting epics for a project
 */
async function getEpicsForProjectHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { projectKey, maxResults = 1000 } = args;
    const { httpClient, config, logger } = context;

    if (!projectKey || projectKey.trim() === '') {
      throw new ValidationError('Project key is required and cannot be empty');
    }

    logger.info('Fetching epics for project', { projectKey, maxResults });

    // Make API request to search for epics
    const response = await httpClient.post('/rest/api/2/search', {
      jql: `project = ${projectKey} AND issuetype = Epic AND statusCategory != Done ORDER BY key DESC`,
      fields: ['key', 'summary'],
      maxResults,
    });

    const searchResults = response.data;
    const issues = searchResults.issues || [];

    const json = {
      success: true,
      operation: 'get_epics_for_project',
      message: issues.length
        ? `Found ${issues.length} active epics for project ${projectKey}`
        : `No active epics found for project ${projectKey}`,
      projectKey,
      total: issues.length,
      maxResults,
      epics: issues.map((issue: any) => {
        const fields = issue.fields;
        return {
          id: issue.id,
          key: issue.key,
          summary: fields.summary || '',
          issueUrl: `${config.origin}/browse/${issue.key}`,
        };
      }),
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
