/**
 * JIRA tool module: Add Worklog
 * Adds a worklog entry to a JIRA issue
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for adding JIRA worklog entry
 */
export const addWorklogTool: Tool = {
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
};

/**
 * Handler function for adding JIRA worklog entry
 */
export async function addWorklogHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, timeSpent, comment, started, visibility } = args;
    const { httpClient, config, logger, invalidateIssueCache } = context;

    logger.info('Adding JIRA worklog', { issueIdOrKey, timeSpent });

    // Build worklog input
    const worklogInput: any = { timeSpent };
    if (comment) worklogInput.comment = comment;
    if (started) worklogInput.started = started;
    if (visibility) worklogInput.visibility = visibility;

    const response = await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/worklog`, worklogInput);
    const worklog = response.data;

    // Clear cache for this issue
    invalidateIssueCache(issueIdOrKey);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Worklog Added Successfully**\n\n` +
            `**Issue:** ${issueIdOrKey}\n` +
            `**Time Spent:** ${timeSpent}\n` +
            `**Author:** ${worklog.author.displayName}\n` +
            `**Started:** ${new Date(worklog.started).toLocaleString()}\n${
              comment ? `**Comment:** ${comment}\n` : ''
            }\n**Direct Link:** ${config.url}/browse/${issueIdOrKey}`,
        },
      ],
    };
  });
}