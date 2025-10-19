import { withErrorHandling } from '../../../../core/errors.js';
import { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../../../types/confluence.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';

export const confluence_get_space: ConfluenceToolWithHandler = {
  name: 'confluence_get_space',
  description: 'Get detailed information about a specific Confluence space',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: {
        type: 'string',
        description: `Confluence space key. Uppercase identifier for the space.
Examples: "PROJ", "TEAM", "DOC"`,
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand',
        default: ['description', 'homepage'],
      },
    },
    required: ['spaceKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve specific Confluence space',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { spaceKey, expand } = args;

      const response = await context.httpClient.get(`/rest/api/space/${spaceKey}`, {
        params: {
          expand: normalizeToArray(expand).join(','),
        },
        ...(context.customHeaders && { headers: context.customHeaders }),
      });

      const space = response.data;

      return {
        content: [
          {
            type: 'text',
            text:
              `**Confluence Space: ${space.name}**\n\n` +
              `**Key:** ${space.key}\n` +
              `**Type:** ${space.type}\n` +
              `**Status:** ${space.status}\n${
                space.description
                  ? `**Description:** ${space.description.plain.value}\n`
                  : ''
              }${
                space.homepage ? `**Homepage:** ${space.homepage.title}\n` : ''
              }\n**Direct Link:** ${context.config.url}/wiki/spaces/${space.key}`,
          },
        ],
      };
    });
  },
};
