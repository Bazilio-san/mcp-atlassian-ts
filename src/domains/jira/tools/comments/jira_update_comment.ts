/**
 * JIRA tool module: Update Comment
 * Updates a specific comment in a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for updating a comment in a JIRA issue
 */
export const jira_update_comment: ToolWithHandler = {
  name: 'jira_update_comment',
  description: 'Update a specific comment in a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      commentId: {
        type: 'string',
        description: 'The ID of the comment to update',
      },
      body: {
        type: 'string',
        description: 'Updated comment text',
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
      expand: {
        type: 'string',
        description: 'Comma-separated list of fields to expand (e.g., "renderedBody,properties")',
      },
    },
    required: ['issueIdOrKey', 'commentId', 'body'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Update comment in JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: updateCommentHandler,
};

/**
 * Handler function for updating a comment in a JIRA issue
 */
async function updateCommentHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, commentId, body, visibility, expand } = args;
    const { httpClient, config, logger } = context;

    logger.info('Updating JIRA comment', { issueIdOrKey, commentId });

    // Build comment update input
    const commentInput: any = { body };
    if (visibility) {
      commentInput.visibility = visibility;
    }

    // Build query parameters for expand
    const params = new URLSearchParams();
    if (expand) {
      params.append('expand', expand);
    }

    const url = `/rest/api/2/issue/${issueIdOrKey}/comment/${commentId}${params.toString() ? '?' + params.toString() : ''}`;

    // Make API call to update comment
    const response = await httpClient.put(url, commentInput);

    const comment = response.data;

    // Build structured JSON
    const json = {
      success: true,
      operation: 'update_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message: `Comment ${commentId} updated successfully in ${issueIdOrKey}`,
      comment: {
        id: comment.id,
        self: comment.self,
        created: comment.created,
        updated: comment.updated,
        body: comment.body,
        renderedBody: comment.renderedBody,
        author: {
          key: comment.author?.key,
          name: comment.author?.name,
          displayName: comment.author?.displayName,
          emailAddress: comment.author?.emailAddress,
          avatarUrls: comment.author?.avatarUrls,
        },
        updateAuthor: comment.updateAuthor ? {
          key: comment.updateAuthor.key,
          name: comment.updateAuthor.name,
          displayName: comment.updateAuthor.displayName,
          emailAddress: comment.updateAuthor.emailAddress,
          avatarUrls: comment.updateAuthor.avatarUrls,
        } : undefined,
        visibility: comment.visibility,
        properties: comment.properties,
        issueUrl: `${config.origin}/browse/${issueIdOrKey}`,
      },
    };

    return formatToolResult(json);
  });
}