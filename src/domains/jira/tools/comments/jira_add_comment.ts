/**
 * JIRA tool module: Add Comment
 * Adds a comment to a JIRA issue with optional visibility restrictions
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for adding a comment to a JIRA issue
 */
export const jira_add_comment: ToolWithHandler = {
  name: 'jira_add_comment',
  description: 'Add a comment to a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      body: {
        type: 'string',
        description: 'Comment text',
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
            description: 'Group name or role name',
          },
        },
        description: 'Comment visibility restrictions',
      },
    },
    required: ['issueIdOrKey', 'body'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Add comment to JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: addCommentHandler,
};

/**
 * Handler function for adding a comment to a JIRA issue
 */
async function addCommentHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, body, visibility } = args;
    const { httpClient, config, logger } = context;

    logger.info('Adding JIRA comment', { issueIdOrKey });

    // Build comment input
    const commentInput: any = { body };
    if (visibility) {
      commentInput.visibility = visibility;
    }

    // Make API call to add comment
    const response = await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/comment`, commentInput);

    const comment = response.data;

    // Build structured JSON
    const json = {
      success: true,
      operation: 'add_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message: `Comment added successfully to ${issueIdOrKey}`,
      comment: {
        id: comment.id,
        self: comment.self,
        created: comment.created,
        updated: comment.updated,
        body: comment.body,
        author: {
          key: comment.author.key,
          name: comment.author.name,
          displayName: comment.author.displayName,
          emailAddress: comment.author.emailAddress,
        },
        visibility: comment.visibility,
        issueUrl: `${config.url}/browse/${issueIdOrKey}`,
      },
    };

    return formatToolResult(json);
  });
}
