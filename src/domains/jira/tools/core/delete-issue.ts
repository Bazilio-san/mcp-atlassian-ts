/**
 * JIRA tool module: Delete Issue
 * Permanently deletes a JIRA issue and optionally its subtasks
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
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
    const { httpClient, logger, invalidateIssueCache } = context;

    logger.info('Deleting JIRA issue', { issueIdOrKey, deleteSubtasks });

    // Build query parameters
    const params = deleteSubtasks ? { deleteSubtasks: 'true' } : {};

    // Make API call
    await httpClient.delete(`/rest/api/2/issue/${issueIdOrKey}`, { params });

    // Invalidate cache for this issue
    invalidateIssueCache(issueIdOrKey);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            '**JIRA Issue Deleted Successfully**\n\n' +
            `**Key:** ${issueIdOrKey}\n` +
            `**Subtasks Deleted:** ${deleteSubtasks ? 'Yes' : 'No'}`,
        },
      ],
    };
  });
}
