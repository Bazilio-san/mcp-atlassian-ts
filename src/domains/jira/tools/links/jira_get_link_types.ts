/**
 * JIRA tool module: Get Link Types
 * Retrieves all available JIRA issue link types
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { isObject } from '../../../../core/utils/tools.js';

/**
 * Tool definition for getting JIRA issue link types
 */
export const jira_get_link_types: ToolWithHandler = {
  name: 'jira_get_link_types',
  description: 'Get all available JIRA issue link types',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve all JIRA issue link types',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getLinkTypesHandler,
};

/**
 * Handler function for getting JIRA issue link types
 */
async function getLinkTypesHandler (_args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA issue link types');

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'linkTypes', {});

    // Fetch from cache or API
    const linkTypes = await cache.getOrSet(cacheKey, async () => {
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLinkType-getIssueLinkTypes
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-link-types/#api-rest-api-2-issuelinktype-get
      const response = await httpClient.get('/rest/api/2/issueLinkType');
      return response.data.issueLinkTypes || [];
    }, 600); // Cache for 10 minutes

    const json = {
      success: true,
      operation: 'get_link_types',
      issueLinkTypes: linkTypes
        .filter(isObject)
        .map((lt: any) => ({
          id: lt.id,
          name: lt.name,
          inward: lt.inward,
          outward: lt.outward,
        })),
    };

    return formatToolResult(json);
  });
}
