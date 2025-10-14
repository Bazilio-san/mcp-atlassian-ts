/**
 * JIRA tool module: Create Sprint
 * Creates a new sprint in an agile board
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for creating a sprint
 */
export const jira_create_sprint: ToolWithHandler = {
  name: 'jira_create_sprint',
  description: 'Create a new sprint in an agile board. The sprint will be created in the future state.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the sprint',
      },
      originBoardId: {
        type: 'number',
        description: 'ID of the board where the sprint will be created',
      },
      goal: {
        type: 'string',
        description: 'Goal or objective of the sprint (optional)',
      },
      startDate: {
        type: 'string',
        description: 'Start date of the sprint in ISO 8601 format (e.g., 2023-01-01T00:00:00.000Z). Optional.',
      },
      endDate: {
        type: 'string',
        description: 'End date of the sprint in ISO 8601 format (e.g., 2023-01-15T00:00:00.000Z). Optional.',
      },
    },
    required: ['name', 'originBoardId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create Sprint',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: createSprintHandler,
};

/**
 * Handler function for creating a sprint
 */
async function createSprintHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, logger, config } = context;
    const { name, originBoardId, goal, startDate, endDate } = args;

    logger.info('Creating JIRA sprint', { name, originBoardId, goal });

    // Build sprint data
    const sprintData: any = { name, originBoardId };

    if (goal) {
      sprintData.goal = goal;
    }
    if (startDate) {
      sprintData.startDate = startDate;
    }
    if (endDate) {
      sprintData.endDate = endDate;
    }

    // Create sprint via API
    const response = await httpClient.post('/rest/agile/1.0/sprint', sprintData);

    if (!response.data) {
      throw new Error('Failed to create sprint - no data returned');
    }

    const sprint = response.data;

    logger.info('Sprint created successfully', { sprintId: sprint.id, name: sprint.name });

    const fmtD = (v: string) => (v ? new Date(v).toLocaleDateString() : null);

    const json = {
      success: true,
      operation: 'create_sprint',
      message: 'Sprint created successfully',
      sprint: {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        originBoardId: sprint.originBoardId,
        goal: sprint.goal || '',
        startDate: fmtD(sprint.startDate),
        endDate: fmtD(sprint.endDate),
        completeDate: fmtD(sprint.completeDate),
        url: `${config.origin}/secure/RapidBoard.jspa?rapidView=${sprint.originBoardId}&view=reporting&chart=sprintRetrospective&sprint=${sprint.id}`,
      },
    };

    return formatToolResult(json);
  });
}
