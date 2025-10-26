/**
 * JIRA tool module: Link to Epic
 * Links a JIRA issue to an epic
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
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
      epicKey: {  // VVQ сказать, где брать
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
    const { httpClient, config, logger } = context;

    logger.info(`Linking issue ${issueIdOrKey} to epic ${epicKey}`);

    // Try using Agile API first (most reliable method)
    try {
      logger.info('Trying Agile API to link issue to epic');

      // Use the Agile API to link issue to epic
      // https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/epic-addIssuesToEpic
      // https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-epic/#api-agile-1-0-epic-epicidorkey-issue-post
      // https://developer.atlassian.com/cloud/jira/software/rest/api-group-epic/#api-rest-agile-1-0-epic-epicidorkey-issue-post
      await httpClient.post(`/rest/agile/1.0/epic/${epicKey}/issue`, {
        issues: [issueIdOrKey],
      });

      logger.info('Successfully linked using Agile API');
    } catch (agileError: any) {
      // If Agile API fails, try using Epic Link field as fallback
      const fieldIdEpicLink = config.fieldId!.epicLink;
      if (fieldIdEpicLink) {
        logger.info(`Agile API failed, trying Epic Link field: fieldIdEpicLink: ${fieldIdEpicLink}`);

        try {
          // Update the epic link field
          const updateData = {
            fields: {
              [fieldIdEpicLink]: epicKey,
            },
          };

          // Update the issue with the epic link
          await httpClient.put(`${config.restPath}/issue/${issueIdOrKey}`, updateData);
          logger.info('Successfully linked using Epic Link field');
        } catch (fieldError: any) {
          // If both methods fail, provide comprehensive error
          const errorMessage = fieldError.response?.data?.errors?.[fieldIdEpicLink] ||
            fieldError.message ||
            'Failed to link issue to epic';
          throw new Error(`Unable to link issue to epic. ${errorMessage}. Epic: ${epicKey}, Issue: ${issueIdOrKey}`);
        }
      } else {
        // No fallback available, throw original error
        if (agileError.response?.status === 404) {
          throw new Error(`Epic ${epicKey} not found or issue ${issueIdOrKey} not found`);
        }
        throw new Error(`Agile API failed and no Epic Link field configured: ${agileError.message}`);
      }
    }

    const message = `Issue ${/^\d+$/.test(issueIdOrKey) ? 'id' : 'key'} ${issueIdOrKey} successfully linked to epic ${epicKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'link_to_epic',
      message,
      links: {
        issue: `${config.origin}/browse/${issueIdOrKey}`,
        epic: `${config.origin}/browse/${epicKey}`,
      },
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
