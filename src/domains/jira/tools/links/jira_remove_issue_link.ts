/**
 * JIRA tool module: Remove Issue Link
 * Removes a link between JIRA issues
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for removing a JIRA issue link
 */
export const jira_remove_issue_link: ToolWithHandler = {
  name: 'jira_remove_issue_link',
  description: 'Remove a link between JIRA issues',
  inputSchema: {
    type: 'object',
    properties: {
      linkId: {
        type: 'string',
        description: 'Link ID to remove',
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
  handler: removeIssueLinkHandler,
};

/**
 * Handler function for removing a JIRA issue link
 */
async function removeIssueLinkHandler (args: any, context: ToolContext): Promise<any> {
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

    const json = {
      success: true,
      operation: 'remove_issue_link',
      imessage: `Issue Link Removed Successfully\nLink ID: ${linkId}`,
    };

    return formatToolResult(json);
  });
}
