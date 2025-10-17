/**
 * JIRA tool module: Get Comments
 * Gets all comments for a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

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

    logger.info('Getting JIRA comments', { issueIdOrKey, startAt, maxResults });

    // Build query parameters
    const params = new URLSearchParams();
    params.append('startAt', startAt.toString());
    params.append('maxResults', maxResults.toString());

    if (orderBy) {
      params.append('orderBy', orderBy);
    }

    if (expand) {
      params.append('expand', expand);
    }

    // Make API call to get comments
    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/comment?${params.toString()}`);

    const commentsData = response.data;

    // Build structured JSON
    const json = {
      success: true,
      operation: 'get_comments',
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      message: `Retrieved ${commentsData.comments?.length || 0} comments for ${issueIdOrKey}`,
      pagination: {
        startAt: commentsData.startAt,
        maxResults: commentsData.maxResults,
        total: commentsData.total,
      },
      comments: commentsData.comments?.map((comment: any) => ({
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
      })) || [],
      issueUrl: `${config.origin}/browse/${issueIdOrKey}`,
    };

    return formatToolResult(json);
  });
}