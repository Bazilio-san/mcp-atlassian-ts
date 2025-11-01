/**
 * JIRA tool module: Get Sprints from Board
 * Retrieves all sprints from a specific agile board
 */

import type { ToolContext } from '../../../../types/tool-context';
import { NotFoundError } from '../../../../core/errors/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { STATE_ENUM } from '../../../../core/constants.js';
import { ValidationError } from '../../../../core/errors/ValidationError.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting sprints from board
 */
export const jira_get_sprints_from_board: ToolWithHandler = {
  name: 'jira_get_sprints_from_board',
  description: 'Get all sprints from a specific agile board. Returns sprints with their status and dates.',
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'number',
        description: 'ID of the board to get sprints from',
      },
      startAt: {
        type: 'number',
        description: 'The starting index of the returned sprints. Default is 0.',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'The maximum number of sprints to return. Default is 50.',
        default: 50,
      },
      state: {
        type: 'string',
        description: 'Filter sprints by state. Valid values: active, future, closed',
        enum: STATE_ENUM,
      },
    },
    required: ['boardId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get Board Sprints',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getSprintsFromBoardHandler,
};

/**
 * Handler function for getting sprints from board
 */
async function getSprintsFromBoardHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;
    const { boardId, startAt = 0, maxResults = 50, state } = args;

    logger.info(`Fetching JIRA board sprints: boardId: ${boardId} | state: ${state}`);

    // Build query parameters
    const params: any = { startAt, maxResults };

    if (state !== undefined) {
      if (!STATE_ENUM.includes(state)) {
        throw new ValidationError(`Valid value for parameter state is: ${STATE_ENUM.join(', ')}`);
      }
      params.state = state;
    }
    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'boardSprints', { boardId, ...params });

    // Fetch from cache or API
    const sprintsResult = await cache.getOrSet(cacheKey, async () => {
      // https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllSprints
      // https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-boardid-sprint-get
      // https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-boardid-sprint-get
      const response = await httpClient.get(`/rest/agile/1.0/board/${boardId}/sprint`, { params });

      if (!response.data) {
        throw new NotFoundError('Board', boardId.toString());
      }

      return response.data;
    });
    const { values = [], total } = sprintsResult || {};
    const count = values?.length || 0;

    const message = count
      ? `Found ${count} sprint(s) on board ${boardId}. Total: ${total || count} sprint(s) available${sprintsResult.isLast ? '' : ` (showing ${count})`}`
      : `No sprints found on board ${boardId}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'get_sprints_from_board',
      message,
      sprints: values.map((sprint: any) => {
        return {
          id: sprint.id,
          name: sprint.name,
          state: sprint.state,
          startDate: convertToIsoUtc(sprint.startDate) || null,
          endDate: convertToIsoUtc(sprint.endDate) || null,
          goal: sprint.goal || '',
          boardId,
        };
      }),
    };

    return formatToolResult(json);
  });
}
