/**
 * Add label to Confluence page tool
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

export interface ConfluenceToolWithHandler extends Tool {
  handler: (args: any, context: ConfluenceToolContext) => Promise<any>;
}

export const confluence_add_label: ConfluenceToolWithHandler = {
  name: 'confluence_add_label',
  description: 'Add a label to a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to add label to',
      },
      label: {
        type: 'string',
        description: 'Label name to add',
      },
      prefix: {
        type: 'string',
        enum: ['global', 'my', 'team'],
        description: 'Label prefix type',
        default: 'global',
      },
    },
    required: ['pageId', 'label'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Add label to Confluence page',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { label, prefix = 'global' } = args;
      const pageId = String(args.pageId);

      // Create axios config with custom headers
      const axiosConfig = context.customHeaders ? { headers: context.customHeaders } : {};

      // Add label via HTTP client
      await context.httpClient.post(
        `/rest/api/content/${pageId}/label`,
        {
          prefix,
          name: label,
        },
        axiosConfig,
      );

      return {
        content: [
          {
            type: 'text',
            text:
              '**Label Added Successfully**\n\n' +
              `**Page ID:** ${pageId}\n` +
              `**Label:** ${label}\n` +
              `**Prefix:** ${prefix}\n` +
              `\n**Direct Link:** ${context.config.url}/wiki/spaces/${pageId}/pages`,
          },
        ],
      };
    });
  },
};
