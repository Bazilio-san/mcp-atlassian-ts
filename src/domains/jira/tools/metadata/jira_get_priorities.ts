/**
 * JIRA tool module: Get Priorities
 * Retrieves all available JIRA priorities with caching (1 hour TTL)
 */

import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { getCachedPriorityObjects } from '../../shared/priority-service.js';
import { ToolWithHandler } from '../../../../types';
import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting JIRA priorities
 */
export const jira_get_priorities: ToolWithHandler = {
  name: 'jira_get_priorities',
  description: 'Get all available JIRA priorities. Returns array of { id, name, description }',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  annotations: {
    title: 'Get JIRA priorities',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getPrioritiesHandler,
};

/**
 * Handler function for getting JIRA priorities
 */
async function getPrioritiesHandler (args_: any, context: ToolContext): Promise<any> {
  const { httpClient, config } = context;
  return withErrorHandling(async () => {
    const priorities = await getCachedPriorityObjects(httpClient, config);

    const json = {
      success: true,
      operation: 'get_priorities',
      message: priorities.length
        ? `Found ${priorities.length} JIRA priorities`
        : 'No JIRA priorities found',
      total: priorities.length,
      priorities: priorities.map(({ id, name, description }: any) => ({ id, name, description })),
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
