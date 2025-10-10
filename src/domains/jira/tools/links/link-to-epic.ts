/**
 * JIRA tool module: Link to Epic
 * Links a JIRA issue to an epic
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for linking a JIRA issue to an epic
 */
export const jira_link_to_epic: ToolWithHandler = {
  name: 'jira_link_to_epic',
  description: 'Link a JIRA issue to an epic',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key to link to epic',
      },
      epicKey: {
        type: 'string',
        description: 'Epic issue key',
      },
    },
    required: ['issueIdOrKey', 'epicKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Link JIRA issue to epic',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: linkToEpicHandler,
};

/**
 * Handler function for linking a JIRA issue to an epic
 */
async function linkToEpicHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, epicKey } = args;
    const { httpClient, config, logger, invalidateIssueCache } = context;

    logger.info('Linking issue to epic', { issueIdOrKey, epicKey });

    // Get the Epic Link field ID from configuration or use default
    const epicLinkFieldId = config.epicLinkFieldId || 'customfield_10014';
    logger.debug('Using Epic Link field ID', { epicLinkFieldId });

    // Update the epic link field
    const updateData = {
      fields: {
        [epicLinkFieldId]: epicKey,
      },
    };

    // Update the issue with the epic link
    await httpClient.put(`/rest/api/2/issue/${issueIdOrKey}`, updateData);

    // Invalidate cache for both issues
    invalidateIssueCache(issueIdOrKey);
    invalidateIssueCache(epicKey);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            '**Issue Linked to Epic Successfully**\n\n' +
            `**Issue:** ${issueIdOrKey}\n` +
            `**Epic:** ${epicKey}\n` +
            '\n**Direct Links:**\n' +
            `• Issue: ${config.url}/browse/${issueIdOrKey}\n` +
            `• Epic: ${config.url}/browse/${epicKey}`,
        },
      ],
    };
  });
}
