/**
 * JIRA tool module: Add Comment
 * Adds a comment to a JIRA issue with optional visibility restrictions
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { IJiraComment, ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { jiraUserObj, stringOrADF2markdown } from '../../shared/utils.js';

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
        type: 'string', // markdown
        description: 'Comment text in markdown format',
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
    const { issueIdOrKey, visibility } = args;
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Adding JIRA comment to ${issueIdOrKey}`);

    // Build comment input
    const commentInput: any = { body: mdToADF(args.body) }; // VVT ADF
    if (visibility) {
      commentInput.visibility = visibility;
    }

    // Make API call to add comment
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-addComment
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-post
    const response = await httpClient.post(`${config.restPath}/issue/${issueIdOrKey}/comment`, commentInput);

    const comment = response.data;

    const { id, created, updated, author, visibility: vis } = comment as IJiraComment;
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
        body: stringOrADF2markdown(comment.body), // VVT ADF
        author: jiraUserObj(author),
        visibility: vis,
        issueUrl,
      },
    };

    return formatToolResult(json);
  });
}
