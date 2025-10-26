/**
 * JIRA tool module: Get User Profile
 * Retrieves detailed user profile information by account ID or username
 */

import type { ToolContext } from '../../../../types/tool-context';
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
    const { httpClient, cache, logger, config } = context;

    logger.info(`Fetching JIRA user profile: login: ${login}`);

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'user', { login });

    // Fetch from cache or API
    const u = await cache.getOrSet(cacheKey, async () => {
      // Otherwise try as accountId first
      try {
        // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
        // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
        const response = await httpClient.get(`${config.restPath}/user`, {
          params: { accountId: login },
        });
        return response.data;
      } catch {
        // If accountId fails, try username search
        try {
          // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-getUser
          // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-get
          // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-get
          const response = await httpClient.get(`${config.restPath}/user`, {
            params: { username: login },
          });
          return response.data;
        } catch {
          // Last resort - try user search with query
          // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#user-findUsers
          // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-users/#api-rest-api-2-user-search-get
          // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-user-search/#api-rest-api-3-user-search-get
          const searchResponse = await httpClient.get(`${config.restPath}/user/search`, {
            params: { username: login, maxResults: 1 },
          });

          if (!searchResponse.data?.length) {
            throw new Error(`User not found: ${login}`);
          }

          return searchResponse.data[0];
        }
      }
    });

    const user = isObject(u) ? {
      key: u.key || undefined,
      name: u.name || undefined,
      accountId: u.accountId || undefined,
      displayName: u.displayName,
      emailAddress: u.emailAddress || undefined,
      active: u.active || false,
      timeZone: u.timeZone || undefined,
      avatarUrls: u.avatarUrls || undefined,
    } : null;

    const message = user
      ? 'User profile retrieved'
      : `User not found for login ${login}`;

    logger.info(message);

    // Format response for MCP
    const json = {
      success: !!user,
      operation: 'get_user_profile',
      login,
      message,
      user,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
