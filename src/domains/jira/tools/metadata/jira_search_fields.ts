/**
 * JIRA tool module: Search Fields
 * Searches for JIRA fields (including custom fields)
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

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
async function searchFieldsHandler (args: any, context: ToolContext): Promise<any> {
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
            (field.name && field.name.toLowerCase().includes(query.toLowerCase())) ||
            (field.key && field.key.toLowerCase().includes(query.toLowerCase())) ||
            (field.id && field.id.toLowerCase().includes(query.toLowerCase()))
        );
      }
      return allFields;
    });

    const q = query ? ` matching "${query}"` : '';
    const message = fields.length
      ? `Found ${fields.length} JIRA fields${q}`
      : `No fields found${q}`;


    const json = {
      success: true,
      operation: 'search_fields',
      message,
      query: query || null,
      total: fields.length,
      fields: fields.map((field: any) => ({
        id: field.id,
        key: field.key || field.id,
        name: field.name || field.id || 'Unnamed field',
        type: field.schema?.type || 'unknown',
        custom: field.custom || false,
        orderable: field.orderable || false,
        searchable: field.searchable || false
      })),
      timestamp: new Date().toISOString()
    };

    return formatToolResult(json);
  });
}
