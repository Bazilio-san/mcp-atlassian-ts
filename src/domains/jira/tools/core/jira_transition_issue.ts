/**
 * JIRA tool module: Transition Issue
 * Transitions a JIRA issue to a new status with optional fields and comment
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { isNonEmptyObject, isObject } from '../../../../core/utils/tools.js';
import { trim } from '../../../../core/utils/text.js';

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
        description: `Transition ID to execute. 
To get the transitions available for an issue, use 'jira_get_transitions' tool`,
      },
      comment: {
        type: 'string', // markdown
        description: 'Optional comment to add with the transition. In markdown format',
      },
      fields: { // VVQ formalize?
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
    const { issueIdOrKey, transitionId } = args;
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Transitioning JIRA issue ${issueIdOrKey} | transitionId: ${transitionId}`);

    // Build transition data to match JIRA API format
    const transitionData: any = {
      transition: { id: transitionId },
    };
    const fields = isNonEmptyObject(args.fields) ? args.fields : undefined;
    if (fields) {
      transitionData.fields = fields;
    }
    const comment = trim(args.comment) ? args.comment : undefined;
    if (comment !== undefined) {
      transitionData.comment = { body: mdToADF(comment) }; // VVT ADF
    }
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getTransitions
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}/transitions`);
    const transitions = (response.data.transitions || []).filter(isObject);

    // Make API call to transition issue
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-doTransition
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-post
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-post
    await httpClient.post(`${config.restPath}/issue/${issueIdOrKey}/transitions`, transitionData);

    const i = `${/^\d+$/.test(issueIdOrKey) ? 'id' : 'key'} ${issueIdOrKey}`;
    const message = `Issue ${i} transitioned successfully (transition ID: ${transitionId})`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'transition_issue',
      message,
      transitionName: transitions.find((t: any) => t?.id === transitionId)?.name || undefined,
      comment,
      fields,
      link: `${config.origin}/browse/${issueIdOrKey}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
