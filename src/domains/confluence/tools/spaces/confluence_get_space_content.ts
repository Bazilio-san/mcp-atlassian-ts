import { withErrorHandling } from '../../../../core/errors/index.js';
import { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../../../types/confluence.js';

export const confluence_get_space_content: ConfluenceToolWithHandler = {
  name: 'confluence_get_space_content',
  description: 'Get content (pages/blogposts) from a Confluence space',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: {
        type: 'string',
        description: `Confluence space key. Uppercase identifier for the space.
Examples: "PROJ", "TEAM", "DOC"`,
      },
      type: {
        type: 'string',
        enum: ['page', 'blogpost'],
        description: 'Type of content to retrieve',
        default: 'page',
      },
      status: {
        type: 'string',
        enum: ['current', 'trashed', 'draft'],
        description: 'Content status',
        default: 'current',
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
    required: ['spaceKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve content from Confluence space',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const {
        spaceKey,
        type = 'page',
        status = 'current',
        expand,
        limit = 50,
      } = args;

      const response = await context.httpClient.get('/rest/api/content', {
        params: {
          spaceKey,
          type,
          status,
          expand: context.normalizeToArray(expand).join(','),
          limit,
        },
        ...(context.customHeaders && { headers: context.customHeaders }),
      });

      const contentResult = response.data;

      if (contentResult.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No ${type} content found in space ${spaceKey}`,
            },
          ],
        };
      }

      const contentList = contentResult.results
        .map(
          (content: any) =>
            `• **${content.title}** (v${content.version.number}) - ${new Date(content.version.when).toLocaleDateString()}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**${type === 'page' ? 'Pages' : 'Blog Posts'} in Space ${spaceKey}**\n\n` +
              `**Found:** ${contentResult.size} items (showing ${contentResult.results.length})\n\n` +
              `${contentList}`,
          },
        ],
      };
    });
  },
};
