/**
 * JIRA tool module: Add Worklog
 * Adds a worklog entry to a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { jiraUserObj, stringOrADF2markdown } from '../../shared/utils.js';

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
        description: 'When work started. ISO 8601 format (e.g., 2023-01-15T00:00:00.000Z)',
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
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Adding JIRA worklog to the issue ${issueIdOrKey} | timeSpent: ${timeSpent}`);

    // Build worklog input
    const worklogInput: any = { timeSpent };
    if (comment) {
      worklogInput.comment = mdToADF(comment);
    }
    if (started) {
      worklogInput.started = convertToIsoUtc(started);
    }
    if (visibility) {
      worklogInput.visibility = visibility;
    }

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addWorklog
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-post
    const response = await httpClient.post(`${config.restPath}/issue/${issueIdOrKey}/worklog`, worklogInput);
    const worklog = response.data || {};
    const author = jiraUserObj(worklog.author);

    const i = `issue${/^\d+$/.test(issueIdOrKey) ? 'Id' : 'Key'}`;
    const message = `Worklog added successfully to ${i} ${issueIdOrKey}: ${timeSpent} by ${author?.displayName || 'Unknown'}`;

    logger.info(message);

    const json = {
      success: true,
      operation: 'add_worklog',
      message,
      [i]: issueIdOrKey,
      worklog: {
        id: worklog.id,
        timeSpent: timeSpent,
        timeSpentSeconds: worklog.timeSpentSeconds,
        comment: stringOrADF2markdown(comment) || undefined,
        started: convertToIsoUtc(worklog.started),
        author,
        visibility: visibility || undefined,
      },
      link: `${config.origin}/browse/${issueIdOrKey}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
