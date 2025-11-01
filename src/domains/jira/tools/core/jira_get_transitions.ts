/**
 * JIRA tool module: Get Transitions
 * Retrieves available transitions for a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { isObject } from '../../../../core/utils/tools.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting available transitions for a JIRA issue
 */
export const jira_get_transitions: ToolWithHandler = {
  name: 'jira_get_transitions',
  description: 'Get available transitions for a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
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
  handler: getTransitionsHandler,
};

/**
 * Handler function for getting available transitions for a JIRA issue
 */
async function getTransitionsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Fetching JIRA transitions for ${issueIdOrKey}`);

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getTransitions
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-transitions-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}/transitions`);
    const transitions = response.data.transitions;

    const i = `issue ${/^\d+$/.test(issueIdOrKey) ? 'id' : 'key'} ${issueIdOrKey}`;
    const message = transitions.length
      ? `${transitions.length} available transitions for ${i}`
      : `No transitions available for ${i}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'get_transitions',
      message,
      transitions: transitions.map((t: any) => ({
        id: t.id,
        name: t.name,
        to: isObject(t.to) ? {
          id: t.to.id,
          name: t.to.name,
          description: stringOrADF2markdown(t.to.description),
        } : undefined,
      })),
    };

    return formatToolResult(json);
  });
}
