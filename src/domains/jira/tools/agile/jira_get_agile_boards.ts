/**
 * JIRA tool module: Get Agile Boards
 * Retrieves all agile boards in the JIRA instance
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { ToolWithHandler } from '../../../../types';

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
        description: 'Filters boards by type. Valid values: scrum, kanban, simple',
      },
      name: {
        type: 'string',
        description: 'Filters boards by name (case-insensitive)',
      },
      projectKeyOrId: {
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
    const { httpClient, cache, logger } = context;
    const { startAt = 0, maxResults = 50, type, name, projectKeyOrId } = args;

    logger.info('Fetching JIRA agile boards', args);

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (type) params.type = type;
    if (name) params.name = name;
    if (projectKeyOrId) params.projectKeyOrId = projectKeyOrId;

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'agileBoards', params);

    // Fetch from cache or API
    const boardsResult = await cache.getOrSet(cacheKey, async () => {
      logger.info('Making API call to get agile boards');
      const response = await httpClient.get('/rest/agile/1.0/board', { params });
      return response.data;
    });

    if (!boardsResult.values || boardsResult.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '**No agile boards found**',
          },
        ],
      };
    }

    const boardsList = boardsResult.values
      .map((board: any) =>
        `• **${board.name}** (ID: ${board.id}) - ${board.type}${
          board.location?.projectName ? ` | Project: ${board.location.projectName}` : ''
        }`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Found ${boardsResult.values.length} agile board(s):**\n\n` +
            boardsList +
            `\n\n**Total:** ${boardsResult.total} board(s) available${
              boardsResult.isLast ? '' : ` (showing ${boardsResult.values.length})`
            }`,
        },
      ],
    };
  });
}
