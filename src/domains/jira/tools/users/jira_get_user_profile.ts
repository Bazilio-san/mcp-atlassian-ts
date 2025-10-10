/**
 * JIRA tool module: Get User Profile
 * Retrieves detailed user profile information by account ID or email
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for getting a JIRA user profile
 */
export const jira_get_user_profile: ToolWithHandler = {
  name: 'jira_get_user_profile',
  description: 'Get detailed user profile information by account ID or email',
  inputSchema: {
    type: 'object',
    properties: {
      userIdOrEmail: {
        type: 'string',
        description: 'User account ID or email address',
      },
    },
    required: ['userIdOrEmail'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA user profile',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getUserProfileHandler,
};

/**
 * Handler function for getting a JIRA user profile
 */
async function getUserProfileHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { userIdOrEmail } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA user profile', { userIdOrEmail });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'user', { userIdOrEmail });

    // Fetch from cache or API
    const user = await cache.getOrSet(cacheKey, async () => {
      // Try by account ID first, then by email
      try {
        const response = await httpClient.get('/rest/api/2/user', {
          params: { accountId: userIdOrEmail },
        });
        return response.data;
      } catch {
        // Fallback to email search
        const searchResponse = await httpClient.get('/rest/api/2/user/search', {
          params: { query: userIdOrEmail, maxResults: 1 },
        });

        if (!searchResponse.data || searchResponse.data.length === 0) {
          throw new Error(`User not found: ${userIdOrEmail}`);
        }

        return searchResponse.data[0];
      }
    });

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            '**JIRA User Profile**\n\n' +
            `**Display Name:** ${user.displayName}\n` +
            `**Account ID:** ${user.accountId}\n` +
            `**Email:** ${user.emailAddress || 'Not available'}\n` +
            `**Active:** ${user.active ? 'Yes' : 'No'}\n` +
            `**Time Zone:** ${user.timeZone || 'Not set'}\n${
              user.avatarUrls ? `**Avatar:** ${user.avatarUrls['48x48']}\n` : ''
            }`,
        },
      ],
    };
  });
}
