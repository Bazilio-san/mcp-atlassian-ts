/**
 * Get pages by label from Confluence tool
 */

import { withErrorHandling } from '../../../../core/errors.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';

export interface ConfluenceToolWithHandler extends Tool {
  handler: (args: any, context: ConfluenceToolContext) => Promise<any>;
}

export const confluence_get_pages_by_label: ConfluenceToolWithHandler = {
  name: 'confluence_get_pages_by_label',
  description: 'Find all pages with a specific label',
  inputSchema: {
    type: 'object',
    properties: {
      label: {
        type: 'string',
        description: 'Label name to search for',
      },
      spaceKey: {
        type: 'string',
        description: 'Filter by space key',
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
    required: ['label'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve pages with specific label',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { label, spaceKey, expand, limit = 50 } = args;

      // Build CQL query
      let cql = `label = "${label}" AND type = page`;
      if (spaceKey) {
        cql += ` AND space = "${spaceKey}"`;
      }

      // Build query parameters
      const params: any = {
        cql,
        offset: 0,
        limit,
      };

      if (expand) {
        params.expand = normalizeToArray(expand).join(',');
      }

      // Create axios config with custom headers and params
      const axiosConfig: any = { params };
      if (context.customHeaders) {
        axiosConfig.headers = context.customHeaders;
      }

      // Search pages via HTTP client
      const response = await context.httpClient.get(
        '/rest/api/search',
        axiosConfig,
      );

      const pagesResult = response.data;

      if (pagesResult.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `**No pages found with label "${label}"${spaceKey ? ` in space ${spaceKey}` : ''}**`,
            },
          ],
        };
      }

      const pagesList = pagesResult.results
        .map(
          (result: any) => {
            const page = result.content;
            return (
              `• **${result.title}** (${result.space?.name || 'Unknown'})\n` +
              `  Version: ${page.version?.number || 'N/A'} - ${page.version?.when ? new Date(page.version.when).toLocaleDateString() : 'N/A'}\n` +
              `  URL: ${context.config.url}/wiki/spaces/${result.space?.key || 'UNKNOWN'}/pages/${page.id}`
            );
          },
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**Pages with Label "${label}"**\n\n` +
              `**Found:** ${pagesResult.totalSize} pages (showing ${pagesResult.results.length})\n\n` +
              `${pagesList}`,
          },
        ],
      };
    });
  },
};
