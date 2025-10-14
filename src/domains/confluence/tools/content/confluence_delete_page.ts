/**
 * Confluence delete page tool implementation
 */

import { withErrorHandling } from '../../../../core/errors.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';

export const confluence_delete_page: ToolWithHandler = {
  name: 'confluence_delete_page',
  description: 'Delete a Confluence page (move to trash or permanent)',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to delete',
      },
      permanent: {
        type: 'boolean',
        description: 'Whether to delete permanently (true) or move to trash (false)',
        default: false,
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Delete Confluence page permanently or move to trash',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { permanent = false } = args;
      const pageId = String(args.pageId);

      // Set status to either 'deleted' (permanent) or 'trashed' (soft delete)
      const status = permanent ? 'deleted' : 'trashed';

      await context.httpClient.put(`/rest/api/content/${pageId}`, {
        status: status,
        version: {
          number: 1, // Required for status change
        },
      });

      // Invalidate cache for this page
      context.invalidatePageCache(pageId);

      return {
        content: [
          {
            type: 'text',
            text:
              `**Confluence Page ${permanent ? 'Deleted' : 'Moved to Trash'} Successfully**\n\n` +
              `**Page ID:** ${pageId}\n` +
              `**Action:** ${permanent ? 'Permanent deletion' : 'Moved to trash'}`,
          },
        ],
      };
    });
  },
};
