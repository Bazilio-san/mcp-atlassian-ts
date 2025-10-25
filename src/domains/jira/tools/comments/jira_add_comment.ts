/**
 * JIRA tool module: Add Comment
 * Adds a comment to a JIRA issue with optional visibility restrictions
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';

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

    logger.info(`Adding JIRA comment to ${issueIdOrKey}`);

    // Build comment input
    const commentInput: any = { body };
    if (visibility) {
      commentInput.visibility = visibility;
    }

    // Make API call to add comment
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addComment
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-post
    const response = await httpClient.post(`${config.restPath}/issue/${issueIdOrKey}/comment`, commentInput);

    const comment = response.data;

    const { id, created, updated, body: b, author, visibility: vis } = comment;
    const issueUrl = `${config.origin}/browse/${issueIdOrKey}`;
    const linkToComment = `${issueUrl}?focusedCommentId=${id}#comment-${id}`;

    const message = `Comment ${id} added successfully to ${issueIdOrKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'add_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message,
      comment: {
        id,
        linkToComment,
        created: convertToIsoUtc(created),
        updated: convertToIsoUtc(updated),
        body: b,
        author: isObject(author) ? {
          key: author?.key,
          name: author?.name,
          displayName: author?.displayName,
          emailAddress: author?.emailAddress,
        } : undefined,
        visibility: vis,
        issueUrl,
      },
    };

    return formatToolResult(json);
  });
}
