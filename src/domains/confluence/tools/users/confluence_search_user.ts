/**
 * Search for users in Confluence by name or email
 */

import { withErrorHandling } from '../../../../core/errors/index.js';
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import type { ConfluenceToolWithHandler } from '../../shared/types.js';

export const confluence_search_user: ConfluenceToolWithHandler = {
  name: 'confluence_search_user',
  description: 'Search for users in Confluence by name or email',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (name or email)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Search Confluence users by name or email',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { query, limit = 50 } = args;

      // Create axios config with custom headers
      const axiosConfig = context.customHeaders ? { headers: context.customHeaders } : {};

      // Search users via HTTP client
      const response = await context.httpClient.get(
        '/rest/api/search/user',
        {
          ...axiosConfig,
          params: {
            cql: `user.fullname ~ "${query}" OR user.email ~ "${query}"`,
            limit,
          },
        },
      );

      const users = response.data.results || [];

      if (users.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No users found matching "${query}"`,
            },
          ],
        };
      }

      const usersList = users
        .map(
          (user: any) =>
            `• **${user.displayName}** (${user.username})\n` +
            `  Email: ${user.email || 'Not available'}\n` +
            `  Active: ${user.active ? 'Yes' : 'No'}`,
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `**Confluence Users matching "${query}"**\n\n` +
              `**Found:** ${users.length} users\n\n` +
              `${usersList}`,
          },
        ],
      };
    });
  },
};
