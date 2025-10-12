/**
 * JIRA tool module: Get Sprints from Board
 * Retrieves all sprints from a specific agile board
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

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

    logger.info('Fetching JIRA board sprints', { boardId, state });

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (state) params.state = state;

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'boardSprints', { boardId, ...params });

    // Fetch from cache or API
    const sprintsResult = await cache.getOrSet(cacheKey, async () => {
      logger.info('Making API call to get board sprints');
      const response = await httpClient.get(`/rest/agile/1.0/board/${boardId}/sprint`, { params });

      if (!response.data) {
        throw new NotFoundError('Board', boardId.toString());
      }

      return response.data;
    });

    if (!sprintsResult.values || sprintsResult.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No sprints found on board ${boardId}**`,
          },
        ],
      };
    }


    // Приводим данные к унифицированной структуре и формируем список
    const sprints = sprintsResult.values.map((sprint: any) => {
      let dateInfo = '';
      if (sprint.startDate && sprint.endDate) {
        const startDate = new Date(sprint.startDate).toLocaleDateString();
        const endDate = new Date(sprint.endDate).toLocaleDateString();
        dateInfo = ` (${startDate} - ${endDate})`;
      } else if (sprint.startDate) {
        const startDate = new Date(sprint.startDate).toLocaleDateString();
        dateInfo = ` (Started: ${startDate})`;
      }

      return {
        id: sprint.id,
        name: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate || null,
        endDate: sprint.endDate || null,
        goal: sprint.goal || '',
        boardId,
        dateInfo, // пригодится для человекочитаемого списка
      };
    });

    const json = {
      success: true,
      operation: 'get_sprints_from_board',
      message: `Found ${sprintsResult.values.length} sprint(s) on board ${boardId}
Total: ${sprintsResult.total || sprintsResult.values.length} sprint(s) available${
        sprintsResult.isLast ? '' : ` (showing ${sprintsResult.values.length})`}`,
      sprints,
    };

    return formatToolResult(json);
  });
}
