/**
 * JIRA tool module: Get Board Issues
 * Retrieves all issues from a specific agile board
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for getting board issues
 */
export const jira_get_board_issues: ToolWithHandler = {
  name: 'jira_get_board_issues',
  description: `Get all issues from a specific agile board. Supports filtering and field selection.`,
  inputSchema: {
    type: 'object',
    properties: {
      boardId: {
        type: 'number',
        description: 'ID of the board to get issues from',
      },
      startAt: {
        type: 'number',
        description: 'The starting index of the returned issues. Default is 0.',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'The maximum number of issues to return. Default is 50.',
        default: 50,
      },
      jql: {
        type: 'string',
        description: 'JQL query to filter issues further',
      },
      validateQuery: {
        type: 'boolean',
        description: 'Whether to validate the JQL query. Default is true.',
        default: true,
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return for each issue. e.g.: ["summary", "status", "assignee"]',
        default: [],
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand. e.g.: ["changelog", "transitions"]',
        default: [],
      },
    },
    required: ['boardId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get Board Issues',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getBoardIssuesHandler,
};

/**
 * Handler function for getting board issues
 */
async function getBoardIssuesHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, normalizeToArray, config } = context;
    const { boardId, startAt = 0, maxResults = 50, jql, validateQuery = true, fields = [], expand = [] } = args;

    logger.info('Fetching JIRA board issues', { boardId, maxResults, jql });

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (jql) params.jql = jql;
    if (validateQuery !== undefined) params.validateQuery = validateQuery;

    const normalizedFields = normalizeToArray(fields);
    const normalizedExpand = normalizeToArray(expand);

    if (normalizedFields.length) params.fields = normalizedFields.join(',');
    if (normalizedExpand.length) params.expand = normalizedExpand.join(',');

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'boardIssues', { boardId, ...params });

    // Fetch from cache or API
    const issuesResult = await cache.getOrSet(cacheKey, async () => {
      logger.info('Making API call to get board issues');
      const response = await httpClient.get(`/rest/agile/1.0/board/${boardId}/issue`, { params });

      if (!response.data) {
        throw new NotFoundError('Board', boardId.toString());
      }

      return response.data;
    });

    if (!issuesResult.issues || issuesResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issues found on board ${boardId}**`,
          },
        ],
      };
    }

    const issuesList = issuesResult.issues
      .map((issue: any) =>
        `• **${issue.key}** - ${issue.fields.summary}\n` +
        `  Status: ${issue.fields.status.name} | ` +
        `Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'} | ` +
        `Type: ${issue.fields.issuetype.name}${
          issue.fields.priority ? ` | Priority: ${issue.fields.priority.name}` : ''
        }\n` +
        `  Link: ${config.url}/browse/${issue.key}`,
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Found ${issuesResult.issues.length} issue(s) on board ${boardId}:**\n\n` +
            issuesList +
            `\n\n**Total:** ${issuesResult.total} issue(s) available${
              issuesResult.isLast ? '' : ` (showing ${issuesResult.issues.length})`
            }`,
        },
      ],
    };
  });
}
