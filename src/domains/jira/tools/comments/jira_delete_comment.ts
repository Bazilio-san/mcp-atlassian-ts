/**
 * JIRA tool module: Delete Comment
 * Deletes a specific comment from a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for deleting a comment from a JIRA issue
 */
export const jira_delete_comment: ToolWithHandler = {
  name: 'jira_delete_comment',
  description: 'Delete a specific comment from a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      commentId: {
        type: 'string',
        description: 'The ID of the comment to delete',
      },
    },
    required: ['issueIdOrKey', 'commentId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Delete comment from JIRA issue',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: deleteCommentHandler,
};

/**
 * Handler function for deleting a comment from a JIRA issue
 */
async function deleteCommentHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, commentId } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Deleting JIRA comment #${commentId} on ${issueIdOrKey}`);

    // Make API call to delete comment
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-deleteComment
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-delete
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-delete
    const response = await httpClient.delete(`${config.restPath}/issue/${issueIdOrKey}/comment/${commentId}`);

    const message = `Comment ${commentId} deleted successfully from ${issueIdOrKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'delete_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      commentId,
      message,
      statusCode: response.status,
      issueUrl: `${config.origin}/browse/${issueIdOrKey}`,
    };

    return formatToolResult(json);
  });
}
