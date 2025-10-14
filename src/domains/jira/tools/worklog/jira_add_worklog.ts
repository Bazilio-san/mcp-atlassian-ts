/**
 * JIRA tool module: Add Worklog
 * Adds a worklog entry to a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for adding JIRA worklog entry
 */
export const jira_add_worklog: ToolWithHandler = {
  name: 'jira_add_worklog',
  description: 'Add a worklog entry to a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      timeSpent: {
        type: 'string',
        description: 'Time spent (e.g., "1h 30m", "2d 4h")',
      },
      comment: {
        type: 'string',
        description: 'Worklog comment',
      },
      started: {
        type: 'string',
        description: 'When work started (ISO format)',
      },
      visibility: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['group', 'role'],
          },
          value: {
            type: 'string',
          },
        },
        description: 'Worklog visibility restrictions',
      },
    },
    required: ['issueIdOrKey', 'timeSpent'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Add worklog entry to JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: addWorklogHandler,
};

/**
 * Handler function for adding JIRA worklog entry
 */
async function addWorklogHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, timeSpent, comment, started, visibility } = args;
    const { httpClient, config, logger } = context;

    logger.info('Adding JIRA worklog', { issueIdOrKey, timeSpent });

    // Build worklog input
    const worklogInput: any = { timeSpent };
    if (comment) {worklogInput.comment = comment;}
    if (started) {worklogInput.started = started;}
    if (visibility) {worklogInput.visibility = visibility;}

    const response = await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/worklog`, worklogInput);
    const worklog = response.data;

    const json = {
      success: true,
      operation: 'add_worklog',
      message: `Worklog added successfully to ${issueIdOrKey}: ${timeSpent} by ${worklog.author.displayName}`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      worklog: {
        id: worklog.id,
        timeSpent: timeSpent,
        timeSpentSeconds: worklog.timeSpentSeconds,
        comment: comment || null,
        started: worklog.started,
        author: {
          accountId: worklog.author.accountId,
          displayName: worklog.author.displayName,
          emailAddress: worklog.author.emailAddress || null,
        },
        visibility: visibility || null,
      },
      link: `${config.url}/browse/${issueIdOrKey}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
