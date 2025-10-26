/**
 * JIRA tool module: Create Sprint
 * Creates a new sprint in an agile board
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { inRFC3339 } from '../../../../core/constants.js';
import { trim } from '../../../../core/utils/text.js';

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
        description: `Start date of the sprint ${inRFC3339}. Optional.`,
        format: 'date-time',
      },
      endDate: {
        type: 'string',
        description: `End date of the sprint ${inRFC3339}. Optional.`,
        format: 'date-time',
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
 * VVM: ALL FIELDS ARE VALIDATED
 */
async function createSprintHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, logger, config } = context;
    const { name, originBoardId, goal, startDate, endDate } = args;

    logger.info(`Creating JIRA sprint '${name}' on board id: ${originBoardId} | goal: ${goal}`);

    // Build sprint data
    const sprintData: any = { name: trim(name).substring(0, 400), originBoardId };

    if (goal) {
      sprintData.goal = goal;
    }
    if (startDate) {
      sprintData.startDate = convertToIsoUtc(
        startDate,
        `The Start date (startDate) parameter was passed in the wrong format '${startDate}'. Needed ${inRFC3339}`,
      );
    }
    if (endDate) {
      sprintData.endDate = convertToIsoUtc(
        endDate,
        `The End date (endDate) parameter was passed in the wrong format: '${endDate}'. Needed ${inRFC3339}`,
      );
    }

    // Create sprint via API
    // https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-createSprint
    // https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-post
    // https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-rest-agile-1-0-sprint-post
    const response = await httpClient.post('/rest/agile/1.0/sprint', sprintData);

    if (!response.data) {
      throw new Error('Failed to create sprint - no data returned');
    }

    const sprint = response.data;


    const message = `Sprint '${sprint.name}' #${sprint.id} created successfully`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'create_sprint',
      message,
      sprint: {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        originBoardId: sprint.originBoardId,
        goal: sprint.goal || '',
        startDate: convertToIsoUtc(sprint.startDate),
        endDate: convertToIsoUtc(sprint.endDate),
        completeDate: convertToIsoUtc(sprint.completeDate),
        url: `${config.origin}/secure/RapidBoard.jspa?rapidView=${sprint.originBoardId}&view=reporting&chart=sprintRetrospective&sprint=${sprint.id}`,
      },
    };

    return formatToolResult(json);
  });
}
