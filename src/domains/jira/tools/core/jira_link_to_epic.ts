/**
 * JIRA tool module: Link to Epic
 * Links a JIRA issue to an epic
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ppj } from '../../../../core/utils/text.js';
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
    const { httpClient, config, logger } = context;

    logger.info('Linking issue to epic', { issueIdOrKey, epicKey });

    // Try using Agile API first (most reliable method)
    try {
      logger.info('Trying Agile API to link issue to epic');

      // Use the Agile API to link issue to epic
      await httpClient.post(`/rest/agile/1.0/epic/${epicKey}/issue`, {
        issues: [issueIdOrKey]
      });

      logger.info('Successfully linked using Agile API');
    } catch (agileError: any) {
      // If Agile API fails, try using Epic Link field as fallback
      const epicLinkFieldId = config.epicLinkFieldId;

      logger.info('Epic Link field configuration', {
        epicLinkFieldId,
        configuredValue: config.epicLinkFieldId,
        envValue: process.env.JIRA_EPIC_LINK_FIELD_ID
      });

      if (epicLinkFieldId) {
        logger.info('Agile API failed, trying Epic Link field', { epicLinkFieldId });

        try {
          // Update the epic link field
          const updateData = {
            fields: {
              [epicLinkFieldId]: epicKey,
            },
          };

          // Update the issue with the epic link
          await httpClient.put(`/rest/api/2/issue/${issueIdOrKey}`, updateData);
          logger.info('Successfully linked using Epic Link field');
        } catch (fieldError: any) {
          // If both methods fail, provide comprehensive error
          const errorMessage = fieldError.response?.data?.errors?.[epicLinkFieldId] ||
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

    // Format response for MCP
    const json = {
      success: true,
      operation: 'link_to_epic',
      message: `Issue ${issueIdOrKey} successfully linked to epic ${epicKey}`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      epicKey: epicKey,
      links: {
        issue: `${config.url}/browse/${issueIdOrKey}`,
        epic: `${config.url}/browse/${epicKey}`
      },
      timestamp: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: ppj(json),
        },
      ],
    };
  });
}
