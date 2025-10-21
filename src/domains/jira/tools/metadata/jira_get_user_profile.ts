/**
 * JIRA tool module: Get User Profile
 * Retrieves detailed user profile information by account ID or username
 */

import type { ToolContext } from '../../shared/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { isObject } from '../../../../core/utils/tools.js';

/**
 * Tool definition for getting a JIRA user profile
 */
export const jira_get_user_profile: ToolWithHandler = {
  name: 'jira_get_user_profile',
  description: 'Get detailed user profile information by account ID or username',
  inputSchema: {
    type: 'object',
    properties: {
      login: {
        type: 'string',
        description: 'User account ID or username',
      },
    },
    required: ['login'],
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
    const { login } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA user profile', { login });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'user', { login });

    // Fetch from cache or API
    const user = await cache.getOrSet(cacheKey, async () => {
      // Otherwise try as accountId first
      try {
        // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
        // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get
        const response = await httpClient.get('/rest/api/2/user', {
          params: { accountId: login },
        });
        return response.data;
      } catch {
        // If accountId fails, try username search
        try {
          // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
          // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get
          const response = await httpClient.get('/rest/api/2/user', {
            params: { username: login },
          });
          return response.data;
        } catch {
          // Last resort - try user search with query
          // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-findUsers
          // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-search-get
          const searchResponse = await httpClient.get('/rest/api/2/user/search', {
            params: { username: login, maxResults: 1 },
          });

          if (!searchResponse.data?.length) {
            throw new Error(`User not found: ${login}`);
          }

          return searchResponse.data[0];
        }
      }
    });

    // Format response for MCP
    const json = {
      success: true,
      operation: 'get_user_profile',
      login,
      message: 'User profile retrieved',
      user: isObject(user) ? {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || undefined,
        active: user.active || false,
        timeZone: user.timeZone || undefined,
        avatarUrls: user.avatarUrls || undefined,
        key: user.key || undefined,
        name: user.name || undefined,
      } : null,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
