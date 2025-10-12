/**
 * JIRA tool module: Get User Profile
 * Retrieves detailed user profile information by account ID or email
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
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
      usernameOrEmail: {
        type: 'string',
        description: 'User account ID or email address',
      },
    },
    required: ['usernameOrEmail'],
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
    const { usernameOrEmail } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA user profile', { usernameOrEmail });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'user', { usernameOrEmail });

    // Fetch from cache or API
    const user = await cache.getOrSet(cacheKey, async () => {
      // Check if the input looks like an email
      const isEmail = usernameOrEmail.includes('@');

      // If it looks like an email, search directly by username/email
      if (isEmail) {
        const response = await httpClient.get('/rest/api/2/user', {
          params: { username: usernameOrEmail },
        });
        return response.data;
      }

      // Otherwise try as accountId first
      try {
        const response = await httpClient.get('/rest/api/2/user', {
          params: { accountId: usernameOrEmail },
        });
        return response.data;
      } catch (_error: any) {
        // If accountId fails, try username search
        try {
          const response = await httpClient.get('/rest/api/2/user', {
            params: { username: usernameOrEmail },
          });
          return response.data;
        } catch {
          // Last resort - try user search with query
          const searchResponse = await httpClient.get('/rest/api/2/user/search', {
            params: { username: usernameOrEmail, maxResults: 1 },
          });

          if (!searchResponse.data || searchResponse.data.length === 0) {
            throw new Error(`User not found: ${usernameOrEmail}`);
          }

          return searchResponse.data[0];
        }
      }
    });

    // Format response for MCP
    const json = {
      success: true,
      operation: 'get_user_profile',
      [/@/.test(usernameOrEmail) ? 'email' : 'login']: usernameOrEmail,
      message: `User profile retrieved: ${user.displayName} (${user.accountId})`,
      user: {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || null,
        active: user.active || false,
        timeZone: user.timeZone || null,
        avatarUrls: user.avatarUrls || null,
        key: user.key || null,
        name: user.name || null,
      },
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
