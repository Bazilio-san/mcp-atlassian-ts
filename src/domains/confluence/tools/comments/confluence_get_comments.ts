import { withErrorHandling } from '../../../../core/errors.js';
import { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../../../types/confluence.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';

export const confluence_get_comments: ConfluenceToolWithHandler = {
  name: 'confluence_get_comments',
  description: 'Get comments for a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to get comments for',
      },
      location: {
        type: 'string',
        enum: ['inline', 'footer'],
        description: 'Comment location type',
      },
      expand: {
        anyOf: [
          { type: 'string', description: 'Single field to expand' },
          { type: 'array', items: { type: 'string' }, description: 'Multiple fields to expand' },
        ],
        description: `Additional fields to expand.
Can be a single string or array of strings`,
        default: ['body.view', 'history.lastUpdated'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve comments from Confluence page',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { location, expand, limit = 50 } = args;
      const pageId = String(args.pageId);

      const params: any = {
        expand: normalizeToArray(expand).join(','),
        limit,
      };

      if (location) {
        params.location = location;
      }

      const response = await context.httpClient.get(`/rest/api/content/${pageId}/child/comment`, {
        params,
        ...(context.customHeaders && { headers: context.customHeaders }),
      });

      const commentsResult = response.data;

      if (commentsResult.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `**No comments found for page ${pageId}**`,
            },
          ],
        };
      }

      const commentsList = commentsResult.results
        .map(
          (comment: any) =>
            `• **${comment.history.createdBy.displayName}** - ${new Date(comment.history.createdDate).toLocaleDateString()}\n` +
            `  ${formatContent(comment.body?.view?.value || comment.body?.storage?.value || 'No content')}`,
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**Comments for Page ${pageId}**\n\n` +
              `**Total:** ${commentsResult.size} comments\n\n` +
              `${commentsList}`,
          },
        ],
      };
    });
  },
};

/**
 * Format content for display
 */
function formatContent (content: string): string {
  // Basic formatting for storage format content
  if (!content) {
    return '';
  }

  // Remove common Confluence storage format tags for better readability
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace escaped ampersands
    .replace(/&lt;/g, '<') // Replace escaped less-than
    .replace(/&gt;/g, '>') // Replace escaped greater-than
    .trim();
}
