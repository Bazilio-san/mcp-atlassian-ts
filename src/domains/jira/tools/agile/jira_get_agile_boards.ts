/**
 * JIRA tool module: Get Agile Boards
 * Retrieves all agile boards in the JIRA instance
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for getting agile boards
 */
export const jira_get_agile_boards: ToolWithHandler = {
  name: 'jira_get_agile_boards',
  description: 'Get all agile boards available in JIRA. Returns a list of Scrum and Kanban boards with their details.',
  inputSchema: {
    type: 'object',
    properties: {
      startAt: {
        type: 'number',
        description: 'The starting index of the returned boards. Default is 0.',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'The maximum number of boards to return. Default is 50.',
        default: 50,
      },
      type: {
        type: 'string',
        description: 'Filters boards by type',
        enum: ['scrum', 'kanban', 'simple'],
      },
      name: {
        type: 'string',
        description: 'Filters boards by name (case-insensitive)',
      },
      projectIdOrKey: {
        type: 'string',
        description: 'Filters boards by project key or ID',
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get Agile Boards',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getAgileBoardsHandler,
};

/**
 * Handler function for getting agile boards
 */
async function getAgileBoardsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, logger } = context;
    const { startAt = 0, maxResults = 50, type, name, projectIdOrKey } = args;

    logger.info(`Fetching JIRA agile boards ${JSON.stringify(args)}`);

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (type) {
      params.type = type;
    }
    if (name) {
      params.name = name;
    }
    if (projectIdOrKey) {
      params.projectIdOrKey = projectIdOrKey;
    }

    // https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/board-getAllBoards
    // https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-board/#api-agile-1-0-board-get
    // https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-rest-agile-1-0-board-get
    const response = await httpClient.get('/rest/agile/1.0/board', { params });
    const boardsResult = response.data;

    const { values = [], total } = boardsResult || {};
    const count = values?.length || 0;

    const message =  count ? `Returned ${count} agile board(s) of ${total} (startAt ${startAt})` : 'No agile boards found';
    logger.info(message);

    const json = {
      success: true,
      operation: 'get_agile_boards',
      message,
      total,
      startAt,
      maxResults,
      count,
      agileBoards: values,
    };

    return formatToolResult(json);
  });
}
