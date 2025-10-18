/**
 * JIRA tool module: Get Board Issues
 * Retrieves all issues from a specific agile board
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for getting board issues
 */
export const jira_get_board_issues: ToolWithHandler = {
  name: 'jira_get_board_issues',
  description: 'Get all issues from a specific agile board. Supports filtering and field selection.',
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
    const { httpClient, logger, normalizeToArray, config } = context;
    const { boardId, startAt = 0, maxResults = 50, jql, validateQuery = true, fields = [], expand = [] } = args;

    logger.info('Fetching JIRA board issues', { boardId, maxResults, jql });

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (jql) {
      params.jql = jql;
    }
    if (validateQuery !== undefined) {
      params.validateQuery = validateQuery;
    }

    const normalizedFields = normalizeToArray(fields);
    const normalizedExpand = normalizeToArray(expand);

    if (normalizedFields.length) {
      params.fields = normalizedFields.join(',');
    }
    if (normalizedExpand.length) {
      params.expand = normalizedExpand.join(',');
    }

    logger.info('Making API call to get board issues');
    const response = await httpClient.get(`/rest/agile/1.0/board/${boardId}/issue`, { params });

    if (!response.data) {
      throw new NotFoundError('Board', boardId.toString());
    }

    const issuesResult = response.data;
    const count = issuesResult?.issues?.length || 0;
    const issues = issuesResult?.issues || [];

    const json = {
      success: true,
      operation: 'get_board_issues',
      message: count
        ? `Found ${count} issue(s) on board ${boardId}
Total: ${issuesResult.total} issue(s) available${issuesResult.isLast ? '' : ` (showing ${count})`}`
        : `No issues found on board ${boardId}`,
      issues: issues.map((issue: any) => {
        const f = issue.fields || {};
        return {
          key: issue.key,
          summary: f.summary,
          status: f.status?.name,
          assignee: f.assignee?.displayName || 'Unassigned',
          reporter: f.reporter?.displayName || 'Unassigned',
          type: {
            name: f.issuetype?.name,
          },
          priority: f.priority?.name,
          link: `${config.origin}/browse/${issue.key}`,
          project: {
            key: f.project?.key,
            name: f.project?.name,
          },
        };
      }),
    };

    return formatToolResult(json);
  });
}
