/**
 * JIRA tool module: Get Link Types
 * Retrieves all available JIRA issue link types
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for getting JIRA issue link types
 */
export const jira_get_link_types: ToolWithHandler = {
  name: 'jira_get_link_types',
  description: `Get all available JIRA issue link types`,
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
async function getLinkTypesHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA issue link types');

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'linkTypes', {});

    // Fetch from cache or API
    const linkTypes = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get('/rest/api/2/issueLinkType');
      return response.data.issueLinkTypes || [];
    }, 600); // Cache for 10 minutes

    if (linkTypes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issue link types found**`,
          },
        ],
      };
    }

    const linkTypesList = linkTypes
      .map((lt: any) => `• **${lt.name}**: ${lt.inward} ↔ ${lt.outward}`)
      .join('\n');

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: `**Available Issue Link Types**\n\n${linkTypesList}`,
        },
      ],
    };
  });
}
