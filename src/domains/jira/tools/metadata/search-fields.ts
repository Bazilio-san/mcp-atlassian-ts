/**
 * JIRA tool module: Search Fields
 * Searches for JIRA fields (including custom fields)
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for searching JIRA fields
 */
export const jira_search_fields: ToolWithHandler = {
  name: 'jira_search_fields',
  description: 'Search for JIRA fields (including custom fields)',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to filter fields by name or key',
      },
    },
    additionalProperties: false,
  },
  annotations: {
    title: 'Search JIRA fields including custom fields',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: searchFieldsHandler,
};

/**
 * Handler function for searching JIRA fields
 */
async function searchFieldsHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { query } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Searching JIRA fields', { query });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'fields', { query });

    // Fetch from cache or API
    const fields = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get('/rest/api/2/field');
      let allFields = response.data;

      if (query) {
        allFields = allFields.filter(
          (field: any) =>
            field.name.toLowerCase().includes(query.toLowerCase()) ||
            field.key.toLowerCase().includes(query.toLowerCase())
        );
      }

      return allFields;
    });

    if (fields.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: query ? `No fields found matching "${query}"` : 'No fields found',
          },
        ],
      };
    }

    const fieldsList = fields
      .map((field: any) => `• **${field.name}** (${field.key}) - ${field.schema?.type || 'unknown type'}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Fields ${query ? `matching "${query}"` : ''}**\n\n` +
            `**Found:** ${fields.length} fields\n\n${fieldsList}`,
        },
      ],
    };
  });
}
