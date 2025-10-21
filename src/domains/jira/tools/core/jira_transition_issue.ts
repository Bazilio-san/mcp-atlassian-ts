/**
 * JIRA tool module: Transition Issue
 * Transitions a JIRA issue to a new status with optional fields and comment
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { isObject } from '../../../../core/utils/tools.js';

/**
 * Tool definition for transitioning a JIRA issue to a new status
 */
export const jira_transition_issue: ToolWithHandler = {
  name: 'jira_transition_issue',
  description: 'Transition a JIRA issue to a new status',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      transitionId: {
        type: 'string',
        description: 'Transition ID to execute',
      },
      comment: {
        type: 'string',
        description: 'Optional comment to add with the transition',
      },
      fields: {
        type: 'object',
        description: 'Field values required for the transition',
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
async function transitionIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, transitionId, comment, fields = {} } = args;
    const { httpClient, config, logger } = context;

    logger.info('Transitioning JIRA issue', { issueIdOrKey, transitionId });

    // Build transition data to match JIRA API format
    const transitionData: any = {
      transition: { id: transitionId },
      fields,
    };

    // Add comment if provided
    if (comment) {
      transitionData.comment = { body: comment };
    }
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getTransitions
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-get
    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/transitions`);
    const transitions = (response.data.transitions || []).filter(isObject);

    // Make API call to transition issue
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-doTransition
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-post
    await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/transitions`, transitionData);

    // Format response for MCP
    const json = {
      success: true,
      operation: 'transition_issue',
      message: `Issue ${issueIdOrKey} transitioned successfully (transition ID: ${transitionId})`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      transitionId: transitionId,
      transitionName: transitions.find((t: any) => t?.id === transitionId)?.name || undefined,
      comment: comment || null,
      fields: fields,
      link: `${config.origin}/browse/${issueIdOrKey}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
