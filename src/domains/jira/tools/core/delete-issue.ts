/**
 * JIRA tool module: Delete Issue
 * Permanently deletes a JIRA issue and optionally its subtasks
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for deleting a JIRA issue
 */
export const deleteIssueTool: Tool = {
  name: 'jira_delete_issue',
  description: `Delete a JIRA issue permanently`,
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: `The issue key (e.g., PROJ-123) or ID`,
      },
      deleteSubtasks: {
        type: 'boolean',
        description: `Whether to delete subtasks as well`,
        default: false,
      },
    },
    required: ['issueKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Delete JIRA issue permanently',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for deleting a JIRA issue
 */
export async function deleteIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKey, deleteSubtasks = false } = args;
    const { httpClient, logger } = context;

    logger.info('Deleting JIRA issue', { issueKey, deleteSubtasks });

    // Build query parameters
    const params = deleteSubtasks ? { deleteSubtasks: 'true' } : {};

    // Make API call
    await httpClient.delete(`/rest/api/2/issue/${issueKey}`, { params });

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Deleted Successfully**\n\n` +
            `**Key:** ${issueKey}\n` +
            `**Subtasks Deleted:** ${deleteSubtasks ? 'Yes' : 'No'}`,
        },
      ],
    };
  });
}