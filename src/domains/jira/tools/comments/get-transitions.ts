/**
 * JIRA tool module: Get Transitions
 * Retrieves available transitions for a JIRA issue
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for getting available transitions for a JIRA issue
 */
export const getTransitionsTool: Tool = {
  name: 'jira_get_transitions',
  description: `Get available transitions for a JIRA issue`,
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: `The issue ID (e.g., 123) or key (e.g., PROJ-123)`,
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve available JIRA issue transitions',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for getting available transitions for a JIRA issue
 */
export async function getTransitionsHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA transitions', { issueIdOrKey });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'transitions', { issueIdOrKey });

    // Fetch from cache or API
    const transitions = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/transitions`);
      return response.data.transitions;
    });

    // Handle empty transitions
    if (transitions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No transitions available for issue ${issueIdOrKey}**`,
          },
        ],
      };
    }

    // Format transitions list
    const transitionsList = transitions
      .map((t: any) => `• **${t.name}** (ID: ${t.id}) → ${t.to.name}`)
      .join('\n');

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: `**Available Transitions for ${issueIdOrKey}**\n\n${transitionsList}`,
        },
      ],
    };
  });
}