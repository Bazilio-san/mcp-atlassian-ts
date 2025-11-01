/**
 * JIRA tool module: Update Comment
 * Updates a specific comment in a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { getVisibility, jiraUserObj, stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

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
        type: 'string', // markdown
        description: 'Updated comment text in markdown format',
      },
      visibility: getVisibility('Comment'),
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
    const { issueIdOrKey, commentId, visibility, expand } = args;
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Updating JIRA comment #${commentId} on ${issueIdOrKey}`);

    // Build comment update input
    const commentInput: any = { body: mdToADF(args.body) };
    if (visibility) {
      commentInput.visibility = visibility;
    }

    // Build query parameters for expand
    const params = new URLSearchParams();
    if (expand) {
      params.append('expand', expand);
    }

    const url = `${config.restPath}/issue/${issueIdOrKey}/comment/${commentId}${params.toString() ? '?' + params.toString() : ''}`;

    // Make API call to update comment
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-updateComment
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-id-put
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-id-put
    const response = await httpClient.put(url, commentInput);

    const comment = response.data;

    const { id, created, updated, renderedBody, author, updateAuthor, visibility: vis, properties } = comment;
    const issueUrl = `${config.origin}/browse/${issueIdOrKey}`;
    const linkToComment = `${issueUrl}?focusedCommentId=${id}#comment-${id}`;

    const message = `Comment ${commentId} updated successfully in ${issueIdOrKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'update_comment',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message,
      comment: {
        id,
        created: convertToIsoUtc(created),
        updated: convertToIsoUtc(updated),
        body: stringOrADF2markdown(comment.body), // VVT ADF
        renderedBody,
        linkToComment,
        author: jiraUserObj(author),
        updateAuthor: jiraUserObj(updateAuthor),
        visibility: vis,
        properties,
        issueUrl,
      },
    };

    return formatToolResult(json);
  });
}
