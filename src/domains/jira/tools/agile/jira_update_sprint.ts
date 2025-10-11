/**
 * JIRA tool module: Update Sprint
 * Updates an existing sprint with new information
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { ppj } from '../../../../core/utils/text.js';

/**
 * Tool definition for updating a sprint
 */
export const jira_update_sprint: ToolWithHandler = {
  name: 'jira_update_sprint',
  description: 'Update an existing sprint. Can modify name, goal, dates, and state.',
  inputSchema: {
    type: 'object',
    properties: {
      sprintId: {
        type: 'number',
        description: 'ID of the sprint to update',
      },
      name: {
        type: 'string',
        description: 'New name for the sprint (optional)',
      },
      goal: {
        type: 'string',
        description: 'New goal or objective for the sprint (optional)',
      },
      state: {
        type: 'string',
        description: 'New state for the sprint. Valid values: active, closed, future',
      },
      startDate: {
        type: 'string',
        description: 'New start date in ISO 8601 format (e.g., 2023-01-01T00:00:00.000Z). Optional.',
      },
      endDate: {
        type: 'string',
        description: 'New end date in ISO 8601 format (e.g., 2023-01-15T00:00:00.000Z). Optional.',
      },
      completeDate: {
        type: 'string',
        description: 'Complete date in ISO 8601 format when closing a sprint. Optional.',
      },
    },
    required: ['sprintId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Update Sprint',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: updateSprintHandler,
};

/**
 * Handler function for updating a sprint
 */
async function updateSprintHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, logger, config } = context;
    const { sprintId, name, goal, state, startDate, endDate, completeDate } = args;

    logger.info('Updating JIRA sprint', { sprintId, name, state });

    // Build update data - only include provided fields
    const sprintData: any = {};
    if (name !== undefined) sprintData.name = name;
    if (goal !== undefined) sprintData.goal = goal;
    if (state !== undefined) sprintData.state = state;
    if (startDate !== undefined) sprintData.startDate = startDate;
    if (endDate !== undefined) sprintData.endDate = endDate;
    if (completeDate !== undefined) sprintData.completeDate = completeDate;

    // If no fields to update, return error
    if (Object.keys(sprintData).length === 0) {
      throw new Error('No fields specified for update. Provide at least one field to update.');
    }

    // Update sprint via API
    const response = await httpClient.put(`/rest/agile/1.0/sprint/${sprintId}`, sprintData);

    if (!response.data) {
      throw new NotFoundError('Sprint', sprintId.toString());
    }

    const sprint = response.data;

    logger.info('Sprint updated successfully', { sprintId: sprint.id, name: sprint.name, state: sprint.state });

    const fmtD = (v: string) => v ? new Date(v).toLocaleDateString() : null;

    const json = {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        originBoardId: sprint.originBoardId,
        goal: sprint.goal || '',
        startDate: fmtD(sprint.startDate),
        endDate: fmtD(sprint.endDate),
        completeDate: fmtD(sprint.completeDate),
        url: `${config.url}/secure/RapidBoard.jspa?rapidView=${sprint.originBoardId}&view=reporting&chart=sprintRetrospective&sprint=${sprint.id}`,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: 'Sprint updated successfully',
        },
        {
          type: 'text',
          text: ppj(json),
        },
      ],
    };
  });
}
