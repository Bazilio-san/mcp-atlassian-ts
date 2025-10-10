import { withErrorHandling } from '../../../../core/errors/index.js';
import { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../../../types/confluence.js';

export const confluence_get_spaces: ConfluenceToolWithHandler = {
  name: 'confluence_get_spaces',
  description: 'Get all Confluence spaces accessible to the user',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['global', 'personal'],
        description: 'Type of spaces to retrieve',
      },
      status: {
        type: 'string',
        enum: ['current', 'archived'],
        description: 'Status of spaces to retrieve',
        default: 'current',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand',
        default: [],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
        minimum: 1,
        maximum: 300,
      },
    },
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve all Confluence spaces',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { type, status = 'current', expand, limit = 50 } = args;

      const spacesResult = await context.httpClient.get('/rest/api/space', {
        params: {
          type,
          status,
          expand: context.normalizeToArray(expand).join(','),
          limit
        },
        ...(context.customHeaders && { headers: context.customHeaders })
      });

      const spaces = spacesResult.data;

      if (spaces.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No Confluence spaces found',
            },
          ],
        };
      }

      const spacesList = spaces.results
        .map((space: any) => `• **${space.name}** (${space.key}) - ${space.type}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `**Confluence Spaces (${spaces.results.length} found)**\n\n${spacesList}`,
          },
        ],
      };
    });
  }
};