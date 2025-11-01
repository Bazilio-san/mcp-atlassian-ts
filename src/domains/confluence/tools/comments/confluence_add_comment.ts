import { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../../../types/confluence.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export const confluence_add_comment: ConfluenceToolWithHandler = {
  name: 'confluence_add_comment',
  description: 'Add a comment to a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to comment on',
      },
      body: {
        type: 'string',
        description: 'Comment text',
      },
      parentCommentId: {
        type: 'string',
        description: 'Parent comment ID for replies',
      },
    },
    required: ['pageId', 'body'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Add comment to Confluence page',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { body, parentCommentId } = args;
      const pageId = String(args.pageId);

      const commentInput: any = {
        type: 'comment',
        container: { type: 'page', id: pageId },
        body: {
          storage: {
            value: processBodyContent(body),
            representation: 'storage',
          },
        },
      };

      if (parentCommentId) {
        commentInput.ancestors = [{ id: parentCommentId }];
      }

      const response = await context.httpClient.post('/rest/api/content', commentInput, {
        ...(context.customHeaders && { headers: context.customHeaders }),
      });

      const comment = response.data;

      return {
        content: [
          {
            type: 'text',
            text:
              '**Comment Added Successfully**\n\n' +
              `**Page ID:** ${pageId}\n` +
              `**Comment ID:** ${comment.id}\n` +
              `**Author:** ${comment.history.createdBy.displayName}\n` +
              `**Created:** ${new Date(comment.history.createdDate).toLocaleString()}\n` +
              `**Comment:** ${body}`,
          },
        ],
      };
    });
  },
};

/**
 * Process body content for Confluence storage format
 */
function processBodyContent (body: string): string {
  // If the body already contains HTML/storage format, return as-is
  if (body.includes('<') && body.includes('>')) {
    return body;
  }

  // Convert plain text to basic storage format
  return `<p>${body.replace(/\n/g, '</p><p>')}</p>`;
}
