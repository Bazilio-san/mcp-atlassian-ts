/**
 * JIRA tool module: Get Comments
 * Gets all comments for a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { IJiraComment, ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { jiraUserObj, stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting all comments from a JIRA issue
 */
export const jira_get_comments: ToolWithHandler = {
  name: 'jira_get_comments',
  description: 'Get all comments for a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      startAt: {
        type: 'number',
        description: 'The index of the first comment to return (default: 0)',
        minimum: 0,
      },
      maxResults: {
        type: 'number',
        description: 'The maximum number of comments to return (default: 50)',
        minimum: 1,
        maximum: 1000,
      },
      orderBy: {
        type: 'string',
        description: 'Order comments by created date',
        enum: ['created', '+created', '-created'],
      },
      expand: {
        type: 'string',
        description: 'Comma-separated list of fields to expand (e.g., "renderedBody,properties")',
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get comments from JIRA issue',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getCommentsHandler,
};

/**
 * Handler function for getting all comments from a JIRA issue
 */
async function getCommentsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, startAt = 0, maxResults = 50, orderBy, expand } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Getting JIRA comments for ${issueIdOrKey} | startAt: ${startAt} | maxResults: ${maxResults}`);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('startAt', startAt.toString());
    params.append('maxResults', maxResults.toString());

    if (orderBy) {
      params.append('orderBy', orderBy); // VVT
    }

    if (expand) {
      params.append('expand', expand);
    }

    // Make API call to get comments
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getComments
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-comments/#api-rest-api-2-issue-issueidorkey-comment-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/#api-rest-api-3-issue-issueidorkey-comment-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}/comment?${params.toString()}`);

    const commentsData = response.data;

    const message = `Retrieved ${commentsData.comments?.length || 0} comments for ${issueIdOrKey}`;
    logger.info(message);

    // Build structured JSON
    const issueUrl = `${config.origin}/browse/${issueIdOrKey}`;
    const json = {
      success: true,
      operation: 'get_comments',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message,
      pagination: {
        startAt: commentsData.startAt,
        maxResults: commentsData.maxResults,
        total: commentsData.total,
      },
      comments: commentsData.comments?.map((comment: IJiraComment) => {
        const { id, created, updated, body, renderedBody, author, updateAuthor, visibility, properties } = comment;
        const linkToComment = `${issueUrl}?focusedCommentId=${id}#comment-${id}`;
        return {
          id,
          linkToComment,
          created: convertToIsoUtc(created),
          updated: convertToIsoUtc(updated),
          body: stringOrADF2markdown(body), // VVT ADF
          renderedBody,
          author: jiraUserObj(author),
          updateAuthor: jiraUserObj(updateAuthor),
          visibility,
          properties,
        };
      }) || [],
      issueUrl,
    };

    return formatToolResult(json);
  });
}
