/**
 * JIRA tool module: Get Transitions
 * Retrieves available transitions for a JIRA issue
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

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
    const { httpClient, logger } = context;

    logger.info('Fetching JIRA transitions', { issueIdOrKey });

    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/transitions`);
    const transitions = response.data.transitions;

    const json = {
      success: true,
      operation: 'get_transitions',
      message: transitions.length
        ? `Available Transitions for issue ${issueIdOrKey}`
        : `No transitions available for issue ${issueIdOrKey}`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      transitions: transitions.map((t: any) => ({
        id: t.id,
        name: t.name,
        to: {
          id: t.to.id,
          name: t.to.name,
          description: t.to.description,
        },
      })),
    };

    return formatToolResult(json);
  });
}
