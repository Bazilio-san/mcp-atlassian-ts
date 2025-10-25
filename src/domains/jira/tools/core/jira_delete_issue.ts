/**
 * JIRA tool module: Delete Issue
 * Permanently deletes a JIRA issue and optionally its subtasks
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for deleting a JIRA issue
 */
export const jira_delete_issue: ToolWithHandler = {
  name: 'jira_delete_issue',
  description: 'Delete a JIRA issue permanently',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      deleteSubtasks: {
        type: 'boolean',
        description: 'Whether to delete subtasks as well',
        default: false,
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Delete JIRA issue permanently',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: deleteIssueHandler,
};

/**
 * Handler function for deleting a JIRA issue
 */
async function deleteIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, deleteSubtasks = false } = args;
    const { httpClient, config, logger } = context;

    const withSubtasks = deleteSubtasks ? ' with subtasks' : '';
    logger.info(`Deleting JIRA issue ${issueIdOrKey}${withSubtasks}`);

    // Build query parameters
    const params = deleteSubtasks ? { deleteSubtasks: 'true' } : {};

    // Make API call
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-delete
    await httpClient.delete(`${config.restPath}/issue/${issueIdOrKey}`, { params });

    const message = `Issue ${/^\d+$/.test(issueIdOrKey) ? 'id' : 'key'} ${issueIdOrKey}${withSubtasks} successfully deleted`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'delete_issue',
      message,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
