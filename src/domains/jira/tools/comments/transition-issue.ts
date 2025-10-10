/**
 * JIRA tool module: Transition Issue
 * Transitions a JIRA issue to a new status with optional fields and comment
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for transitioning a JIRA issue to a new status
 */
export const jira_transition_issue: ToolWithHandler = {
  name: 'jira_transition_issue',
  description: `Transition a JIRA issue to a new status`,
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: `The issue ID (e.g., 123) or key (e.g., PROJ-123)`,
      },
      transitionId: {
        type: 'string',
        description: `Transition ID to execute`,
      },
      comment: {
        type: 'string',
        description: `Optional comment to add with the transition`,
      },
      fields: {
        type: 'object',
        description: `Field values required for the transition`,
        additionalProperties: true,
      },
    },
    required: ['issueIdOrKey', 'transitionId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Transition JIRA issue to new status',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: transitionIssueHandler,
};

/**
 * Handler function for transitioning a JIRA issue to a new status
 */
async function transitionIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, transitionId, comment, fields = {} } = args;
    const { httpClient, config, logger } = context;

    logger.info('Transitioning JIRA issue', { issueIdOrKey, transitionId });

    // Build transition data to match JIRA API format
    const transitionData: any = {
      transition: { id: transitionId },
      fields
    };

    // Add comment if provided
    if (comment) {
      transitionData.comment = { body: comment };
    }

    // Make API call to transition issue
    await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/transitions`, transitionData);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**Issue Transitioned Successfully**\n\n` +
            `**Issue:** ${issueIdOrKey}\n` +
            `**Transition ID:** ${transitionId}\n${
              comment ? `**Comment:** ${comment}\n` : ''
            }\n**Direct Link:** ${config.url}/browse/${issueIdOrKey}`,
        },
      ],
    };
  });
}
