/**
 * JIRA tool module: Update Comment
 * Updates a specific comment in a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';

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
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-updateComment
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-put
    const response = await httpClient.put(url, commentInput);

    const comment = response.data;

    const { id, created, updated, body: b, renderedBody, author, updateAuthor, visibility: vis, properties } = comment;
    const issueUrl = `${config.origin}/browse/${issueIdOrKey}`;
    const linkToComment = `${issueUrl}?focusedCommentId=${id}#comment-${id}`;
    // Build structured JSON
    const json = {
      success: true,
      operation: 'update_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message: `Comment ${commentId} updated successfully in ${issueIdOrKey}`,
      comment: {
        id,
        created: convertToIsoUtc(created),
        updated: convertToIsoUtc(updated),
        body: b,
        renderedBody,
        linkToComment,
        author: {
          key: author?.key,
          name: author?.name,
          displayName: author?.displayName,
          emailAddress: author?.emailAddress,
        },
        updateAuthor: comment.updateAuthor ? {
          key: updateAuthor.key,
          name: updateAuthor.name,
          displayName: updateAuthor.displayName,
          emailAddress: updateAuthor.emailAddress,
        } : undefined,
        visibility: vis,
        properties,
        issueUrl,
      },
    };

    return formatToolResult(json);
  });
}
