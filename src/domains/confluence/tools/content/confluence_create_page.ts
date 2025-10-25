/**
 * Confluence create page tool implementation
 */

import { ehs, withErrorHandling } from '../../../../core/errors.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';

export const confluence_create_page: ToolWithHandler = {
  name: 'confluence_create_page',
  description: 'Create a new Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: {
        type: 'string',
        description: `Confluence space key where the page will be created. Uppercase identifier.
Examples: "PROJ", "TEAM", "DOC"`,
      },
      title: {
        type: 'string',
        description: 'Page title. Human-readable page name.',
      },
      body: {
        type: 'string',
        description: 'Page content. HTML-like Confluence markup or plain text.',
      },
      parentId: {
        type: 'number',
        description: `Parent page ID for page hierarchy.
Makes this page a child of the specified parent`,
      },
      type: {
        type: 'string',
        enum: ['page', 'blogpost'],
        description: 'Content type',
        default: 'page',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: `Labels to add to the page. Array of label names.
Examples: ["core-documentation", "api"]`,
        default: [],
      },
    },
    required: ['spaceKey', 'title', 'body'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create new Confluence page',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { spaceKey, title, body, parentId, type = 'page', labels = [] } = args;

      function processBodyContent (body: string): string {
        // If the body already contains HTML/storage format, return as-is
        if (body.includes('<') && body.includes('>')) {
          return body;
        }

        // Convert plain text to basic storage format
        return `<p>${body.replace(/\n/g, '</p><p>')}</p>`;
      }

      // Build the page input
      const pageInput: any = {
        type,
        title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: processBodyContent(body),
            representation: 'storage',
          },
        },
      };

      if (parentId) {
        pageInput.ancestors = [{ id: parentId }];
      }

      const response = await context.httpClient.post('/rest/api/content', pageInput);
      const createdPage = response.data;

      // Invalidate related cache entries
      context.invalidatePageCache(createdPage.id);

      // Add labels if provided
      if (labels.length > 0) {
        for (const labelName of labels) {
          try {
            await context.httpClient.post(`/rest/api/content/${createdPage.id}/label`, {
              prefix: 'global',
              name: labelName,
            });
          } catch (err: Error | any) {
            context.logger.warn(`Failed to add label ${labelName} to the pageId ${createdPage.id} | error: ${ehs(err)}`);
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text:
              '**Confluence Page Created Successfully**\n\n' +
              `**Title:** ${title}\n` +
              `**ID:** ${createdPage.id}\n` +
              `**Space:** ${spaceKey}\n` +
              `**Type:** ${type}\n${
                labels.length > 0 ? `**Labels:** ${labels.join(', ')}\n` : ''
              }\n**Direct Link:** ${context.config.url}/wiki/spaces/${spaceKey}/pages/${createdPage.id}`,
          },
        ],
      };
    });
  },
};
