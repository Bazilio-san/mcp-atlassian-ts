/**
 * JIRA tool module: Get Priorities
 * Retrieves all available JIRA priorities with caching (1 hour TTL)
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for getting JIRA priorities
 */
export const jira_get_priorities: ToolWithHandler = {
  name: 'jira_get_priorities',
  description: 'Get all available JIRA priorities. Returns array of { id, name, description }',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    title: 'Get JIRA priorities',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getPrioritiesHandler,
};

/**
 * Handler function for getting JIRA priorities
 */
async function getPrioritiesHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, powerHttpClient, cache, logger } = context;

    logger.info('Fetching JIRA priorities');

    // Use power client if available for general priority metadata
    const client = powerHttpClient || httpClient;

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'priorities', {});

    // Fetch from cache or API with 1 hour TTL
    const priorities = await cache.getOrSet(cacheKey, async () => {
      const response = await client.get('/rest/api/2/priority');
      return response.data || [];
    }, 3600); // 1 hour cache TTL

    const json = {
      success: true,
      operation: 'get_priorities',
      message: priorities.length
        ? `Found ${priorities.length} JIRA priorities`
        : 'No JIRA priorities found',
      total: priorities.length,
      priorities: priorities.map(({id, name, description}: any) => ({id, name, description})),
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
