/**
 * Confluence search tool implementation
 */

import { withErrorHandling } from '../../../../core/errors.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';

export const confluence_search: ToolWithHandler = {
  name: 'confluence_search',
  description: 'Search Confluence content using CQL (Confluence Query Language)',
  inputSchema: {
    type: 'object',
    properties: {
      cql: {
        type: 'string',
        description: `CQL query string for searching content.
Examples:
"space = SPACE AND title ~ \\"keyword\\"",
"type = page AND creator = currentUser()"`,
      },
      offset: {
        type: 'number',
        description: `Zero-based results offset for pagination.
Specifies how many items to skip before returning the current page of results.
Examples: With limit = 50: 0 (items 1–50), 50 (items 51–100), 100 (items 101–150)`,
        default: 0,
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results per page',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
      excerpt: {
        type: 'string',
        enum: ['indexed', 'highlight', 'none'],
        description: 'Type of excerpt to include',
        default: 'highlight',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand',
        default: [],
      },
    },
    required: ['cql'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Search Confluence content using CQL',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { cql, offset = 0, limit = 50, excerpt = 'highlight', expand } = args;

      const searchResult = await context.cache.getOrSet(
        `search:${JSON.stringify({ cql, offset, limit, excerpt, expand })}`,
        async () => {
          const response = await context.httpClient.get('/rest/api/content/search', {
            params: {
              cql,
              start: offset,
              limit,
              excerpt,
              expand: context.normalizeToArray(expand).join(','),
            },
          });
          return response.data;
        },
        300, // 5 minutes cache for search results
      );

      if (searchResult.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No content found for CQL: ${cql}`,
            },
          ],
        };
      }

      const resultsList = searchResult.results
        .map((result: any) => {
          const content = result.content;
          return (
            `• **${result.title}** (${content.type})\n` +
            `  Space: ${result.space?.name || 'Unknown'}\n` +
            `  URL: ${result.url}\n${result.excerpt ? `  Excerpt: ${result.excerpt}\n` : ''}`
          );
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              '**Confluence Search Results**\n\n' +
              `**CQL:** ${cql}\n` +
              `**Found:** ${searchResult.totalSize} results (showing ${searchResult.results.length})\n\n` +
              `${resultsList}`,
          },
        ],
      };
    });
  },
};
