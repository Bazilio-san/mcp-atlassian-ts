/**
 * Confluence update page tool implementation
 */

import { withErrorHandling } from '../../../../core/errors.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ToolWithHandler } from '../../../../types/index.js';

export const confluence_update_page: ToolWithHandler = {
  name: 'confluence_update_page',
  description: 'Update an existing Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'number',
        description: 'The page ID to update',
      },
      title: {
        type: 'string',
        description: 'New page title',
      },
      body: {
        type: 'string',
        description: 'Updated page content',
      },
      versionComment: {
        type: 'string',
        description: `Comment for this version update. Visible in page history.
Examples: "Updated API documentation", "Fixed typos", "Added new section"`,
        default: 'Updated via MCP',
      },
      minorEdit: {
        type: 'boolean',
        description: 'Whether this is a minor edit',
        default: false,
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels to set on the page',
      },
    },
    required: ['pageId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Update existing Confluence page',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const {
        title,
        body,
        versionComment = 'Updated via MCP',
        minorEdit = false,
        labels,
      } = args;

      const pageId = String(args.pageId);

      function processBodyContent (body: string): string {
        // If the body already contains HTML/storage format, return as-is
        if (body.includes('<') && body.includes('>')) {
          return body;
        }

        // Convert plain text to basic storage format
        return `<p>${body.replace(/\n/g, '</p><p>')}</p>`;
      }

      // Get current page to increment version
      const currentPageResponse = await context.httpClient.get(`/rest/api/content/${pageId}`, {
        params: { expand: 'version,space' },
      });
      const currentPage = currentPageResponse.data;

      // Build the update input
      const updateInput: any = {
        version: {
          number: currentPage.version.number + 1,
          message: versionComment,
          minorEdit,
        },
        type: currentPage.type,
        title: title || currentPage.title,
      };

      if (body) {
        updateInput.body = {
          storage: {
            value: processBodyContent(body),
            representation: 'storage',
          },
        };
      }

      const response = await context.httpClient.put(`/rest/api/content/${pageId}`, updateInput);
      const updatedPage = response.data;

      // Invalidate cache for this page
      context.invalidatePageCache(pageId);

      // Update labels if provided
      if (labels) {
        // Remove existing labels and add new ones
        // Note: This is a simplified approach; in production, you might want to be more selective
        for (const labelName of labels) {
          try {
            await context.httpClient.post(`/rest/api/content/${pageId}/label`, {
              prefix: 'global',
              name: labelName,
            });
          } catch (error) {
            context.logger.warn('Failed to add label', { pageId, label: labelName, error });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text:
              '**Confluence Page Updated Successfully**\n\n' +
              `**Title:** ${updatedPage.title}\n` +
              `**ID:** ${pageId}\n` +
              `**Version:** ${updatedPage.version.number}\n` +
              `**Comment:** ${versionComment}\n` +
              `\n**Direct Link:** ${context.config.url}/wiki/spaces/${updatedPage.space.key}/pages/${pageId}`,
          },
        ],
      };
    });
  },
};
