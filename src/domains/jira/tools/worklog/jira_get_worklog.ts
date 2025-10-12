/**
 * JIRA tool module: Get Worklog
 * Retrieves worklog entries for a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ppj } from '../../../../core/utils/text.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for getting JIRA worklog entries
 */
export const jira_get_worklog: ToolWithHandler = {
  name: 'jira_get_worklog',
  description: 'Get worklog entries for a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      startAt: {
        type: 'number',
        description: 'Starting index',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum results to return',
        default: 50,
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue worklog entries',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getWorklogHandler,
};

/**
 * Handler function for getting JIRA worklog entries
 */
async function getWorklogHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, startAt = 0, maxResults = 50 } = args;
    const { httpClient, logger } = context;

    logger.info('Fetching JIRA worklog entries', { issueIdOrKey });

    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/worklog`, {
      params: { startAt, maxResults },
    });
    const worklogResult = response.data;

    if (worklogResult.worklogs.length === 0) {
      const emptyResult = {
        operation: 'get_worklog',
        issueKey: issueIdOrKey,
        total: 0,
        showing: 0,
        worklogs: [],
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: ppj(emptyResult),
          },
          {
            type: 'text',
            text: `No worklog entries found for ${issueIdOrKey}`,
          },
        ],
      };
    }

    const json = {
      success: true,
      operation: 'get_worklog',
      text: `Found ${worklogResult.total} worklog entries for ${issueIdOrKey} (showing ${worklogResult.worklogs.length})`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      total: worklogResult.total,
      showing: worklogResult.worklogs.length,
      worklogs: worklogResult.worklogs.map((w: any) => ({
        id: w.id,
        timeSpent: w.timeSpent,
        timeSpentSeconds: w.timeSpentSeconds,
        comment: w.comment || null,
        started: w.started,
        created: w.created,
        updated: w.updated,
        author: {
          accountId: w.author.accountId,
          displayName: w.author.displayName,
          emailAddress: w.author.emailAddress || null
        },
        visibility: w.visibility || null
      })),
      timestamp: new Date().toISOString()
    };

    return formatToolResult(json);
  });
}
