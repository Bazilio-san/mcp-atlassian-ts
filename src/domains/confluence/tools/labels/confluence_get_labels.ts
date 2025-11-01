/**
 * Get labels from Confluence page tool
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export interface ConfluenceToolWithHandler extends Tool {
  handler: (args: any, context: ConfluenceToolContext) => Promise<any>;
}

export const confluence_get_labels: ConfluenceToolWithHandler = {
  name: 'confluence_get_labels',
  description: 'Get all labels for a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to get labels for',
      },
      prefix: {
        type: 'string',
        description: 'Filter by label prefix',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
        minimum: 1,
        maximum: 200,
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve labels from Confluence page',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { prefix, limit = 50 } = args;
      const pageId = String(args.pageId);

      // Build query parameters
      const params: any = { limit };
      if (prefix) {
        params.prefix = prefix;
      }

      // Create axios config with custom headers and params
      const axiosConfig: any = { params };
      if (context.customHeaders) {
        axiosConfig.headers = context.customHeaders;
      }

      // Get labels via HTTP client
      const response = await context.httpClient.get(
        `/rest/api/content/${pageId}/label`,
        axiosConfig,
      );

      const labelsResult = response.data;

      if (labelsResult.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `**No labels found for page ${pageId}**`,
            },
          ],
        };
      }

      const labelsList = labelsResult.results
        .map((label: any) => `• **${label.name}** (${label.prefix})`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**Labels for Page ${pageId}**\n\n` +
              `**Total:** ${labelsResult.size} labels\n\n` +
              `${labelsList}`,
          },
        ],
      };
    });
  },
};
