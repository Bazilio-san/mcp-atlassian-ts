/**
 * Get version history of a Confluence page
 */

import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../shared/types.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export const confluence_get_page_history: ConfluenceToolWithHandler = {
  name: 'confluence_get_page_history',
  description: 'Get version history of a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to get history for',
      },
      expand: {
        anyOf: [
          { type: 'string', description: 'Single field to expand' },
          { type: 'array', items: { type: 'string' }, description: 'Multiple fields to expand' },
        ],
        description: `Additional fields to expand.
Can be a single string or array of strings`,
        default: ['lastUpdated', 'previousVersion', 'contributors'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of versions to return',
        default: 25,
        minimum: 1,
        maximum: 50,
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve version history of Confluence page',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { expand, limit = 25 } = args;
      const pageId = String(args.pageId);

      // Create axios config with custom headers
      const axiosConfig = context.customHeaders ? { headers: context.customHeaders } : {};

      // Get page history via HTTP client
      const historyResponse = await context.httpClient.get(
        `/rest/api/content/${pageId}/history`,
        {
          ...axiosConfig,
          params: {
            expand: normalizeToArray(expand).join(','),
            limit,
          },
        },
      );

      const historyResult = historyResponse.data;

      if (!historyResult.lastUpdated && !historyResult.previousVersion) {
        return {
          content: [
            {
              type: 'text',
              text: `**No version history available for page ${pageId}**`,
            },
          ],
        };
      }

      let historyText = `**Version History for Page ${pageId}**\n\n`;

      if (historyResult.lastUpdated) {
        const lastUpdate = historyResult.lastUpdated;
        historyText +=
          '**Last Updated:**\n' +
          `• **When:** ${new Date(lastUpdate.when).toLocaleString()}\n` +
          `• **By:** ${lastUpdate.by.displayName}\n` +
          `• **Message:** ${lastUpdate.message || 'No message'}\n\n`;
      }

      if (historyResult.previousVersion) {
        const prevVersion = historyResult.previousVersion;
        historyText +=
          '**Previous Version:**\n' +
          `• **Version:** ${prevVersion.number}\n` +
          `• **When:** ${new Date(prevVersion.when).toLocaleString()}\n` +
          `• **By:** ${prevVersion.by.displayName}\n\n`;
      }

      if (historyResult.contributors?.publishers) {
        const contributors = historyResult.contributors.publishers.users;
        if (contributors.length > 0) {
          historyText += '**Contributors:**\n';
          contributors.forEach((user: any) => {
            historyText += `• ${user.displayName}\n`;
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: historyText,
          },
        ],
      };
    });
  },
};
