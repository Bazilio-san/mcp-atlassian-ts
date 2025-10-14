/**
 * Confluence get page by title tool implementation
 */

import { withErrorHandling } from '../../../../core/errors.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';

export const confluence_get_page_by_title: ToolWithHandler = {
  name: 'confluence_get_page_by_title',
  description: 'Get Confluence page(s) by space key and title',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: {
        type: 'string',
        description: `Confluence space key. Uppercase identifier for the space.
Examples: "PROJ", "TEAM", "DOC".`,
      },
      title: {
        type: 'string',
        description: 'The page title',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Fields to expand.',
        default: ['body.storage', 'version', 'space'],
      },
    },
    required: ['spaceKey', 'title'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve Confluence page by space and title',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { spaceKey, title, expand } = args;

      const cacheKey = `page-by-title:${spaceKey}:${title}:${JSON.stringify(expand)}`;
      const pages = await context.cache.getOrSet(
        cacheKey,
        async () => {
          const response = await context.httpClient.get('/rest/api/content', {
            params: {
              spaceKey,
              title,
              expand: context.normalizeToArray(expand).join(','),
            },
          });
          return response.data.results;
        },
        600, // 10 minutes cache for page content
      );

      if (pages.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No pages found with title "${title}" in space ${spaceKey}`,
            },
          ],
        };
      }

      // Return the first page (most common case)
      const page = pages[0]!; // Safe because we check pages.length === 0 above

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

      return {
        content: [
          {
            type: 'text',
            text:
              `**Confluence Page: ${page.title}**\n\n` +
              `**ID:** ${page.id}\n` +
              `**Space:** ${page.space.name} (${page.space.key})\n` +
              `**Type:** ${page.type}\n` +
              `**Version:** ${page.version.number}\n${
                pages.length > 1
                  ? `**Note:** ${pages.length} pages found with this title, showing the first one.\n`
                  : ''
              }${
                page.body?.storage
                  ? `\n**Content:**\n${formatContent(page.body.storage.value)}\n`
                  : ''
              }\n**Direct Link:** ${context.config.url}/wiki/spaces/${page.space.key}/pages/${page.id}`,
          },
        ],
      };
    });
  },
};
