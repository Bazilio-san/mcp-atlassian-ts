/**
 * JIRA tool module: Remove Issue Link
 * Removes a link between JIRA issues
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for removing a JIRA issue link
 */
export const removeIssueLinkTool: Tool = {
  name: 'jira_remove_issue_link',
  description: `Remove a link between JIRA issues`,
  inputSchema: {
    type: 'object',
    properties: {
      linkId: {
        type: 'string',
        description: `Link ID to remove`,
      },
    },
    required: ['linkId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Remove link between JIRA issues',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for removing a JIRA issue link
 */
export async function removeIssueLinkHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { linkId } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Removing JIRA issue link', { linkId });

    // Remove the link
    await httpClient.delete(`/rest/api/2/issueLink/${linkId}`);

    // Clear search cache since links may affect search results
    cache.keys()
      .filter(key => key.includes('jira:search'))
      .forEach(key => cache.del(key));

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: `**Issue Link Removed Successfully**\n\n**Link ID:** ${linkId}`,
        },
      ],
    };
  });
}