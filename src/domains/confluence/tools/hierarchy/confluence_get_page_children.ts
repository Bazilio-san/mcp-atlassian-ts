/**
 * Get child pages of a Confluence page
 */

import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../shared/types.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export const confluence_get_page_children: ConfluenceToolWithHandler = {
  name: 'confluence_get_page_children',
  description: 'Get child pages of a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'Parent page ID',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand',
        default: ['version', 'space'],
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
    title: 'Retrieve child pages of Confluence page',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { expand, limit = 50 } = args;
      const pageId = String(args.pageId);

      // Create axios config with custom headers
      const axiosConfig = context.customHeaders ? { headers: context.customHeaders } : {};

      // Get child pages via HTTP client
      const childrenResult = await context.httpClient.get(
        `/rest/api/content/${pageId}/child/page`,
        {
          ...axiosConfig,
          params: {
            expand: normalizeToArray(expand).join(','),
            limit,
          },
        },
      );

      const childrenData = childrenResult.data;

      if (!childrenData.results || childrenData.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `**No child pages found for page ${pageId}**`,
            },
          ],
        };
      }

      const childrenList = childrenData.results
        .map(
          (child: any) =>
            `• **${child.title}**\n` +
            `  Version: ${child.version.number}\n` +
            `  URL: ${context.config.url}/wiki/spaces/${child.space.key}/pages/${child.id}`,
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**Child Pages of ${pageId}**\n\n` +
              `**Total:** ${childrenData.size} pages\n\n` +
              `${childrenList}`,
          },
        ],
      };
    });
  },
};
