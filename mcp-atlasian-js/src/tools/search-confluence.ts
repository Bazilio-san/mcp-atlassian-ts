import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ConfluenceV2Service } from '../services/confluencev2';
import { formatResponse, formatErrorResponse } from './utils';

/**
 * Register the search-confluence tool with the MCP server
 * @param server The MCP server instance
 * @param confluenceService The ConfluenceV2 service instance
 */
export function registerSearchConfluenceTool(
  server: McpServer,
  confluenceService: ConfluenceV2Service,
) {
  server.tool(
    'search_confluence',
    {
      searchText: z.string().describe('Text to search for in page content'),
      spaceKey: z
        .string()
        .optional()
        .describe('Optional space key to limit search to a specific space'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results to return (default: 25)'),
      start: z
        .number()
        .optional()
        .default(0)
        .describe('Starting index for pagination (default: 0)'),
    },
    async ({ searchText, spaceKey, limit = 25, start = 0 }) => {
      try {
        const results = await confluenceService.searchPagesByContent(
          searchText,
          spaceKey,
          limit,
          start,
        );
        return formatResponse(results, true);
      } catch (err) {
        return formatErrorResponse(err);
      }
    },
  );
}
