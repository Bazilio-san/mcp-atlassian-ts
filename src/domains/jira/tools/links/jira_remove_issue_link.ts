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
    const { httpClient, cache, config, logger } = context;

    logger.info(`Removing JIRA issue link: linkId: ${linkId}`);

    // Remove the link
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issueLink-deleteIssueLink
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-links/#api-rest-api-2-issuelink-linkid-delete
    await httpClient.delete(`${config.restPath}/issueLink/${linkId}`);

    // Clear search cache since links may affect search results
    cache.keys()
      .filter(key => key.includes('jira:search'))
      .forEach(key => cache.del(key));

    const message = `Issue Link #${linkId} removed successfully`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'remove_issue_link',
      message,
    };

    return formatToolResult(json);
  });
}
