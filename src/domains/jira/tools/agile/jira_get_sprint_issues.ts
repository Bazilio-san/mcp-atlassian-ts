/**
 * JIRA tool module: Get Sprint Issues
 * Retrieves all issues from a specific sprint
 */

import type { ToolContext } from '../../../../types/tool-context';
import { NotFoundError } from '../../../../core/errors/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, normalizeToArray } from '../../../../core/utils/tools.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting sprint issues
 */
export const jira_get_sprint_issues: ToolWithHandler = {
  name: 'jira_get_sprint_issues',
  description: 'Get all issues from a specific sprint. Supports filtering and field selection.',
  inputSchema: {
    type: 'object',
    properties: {
      sprintId: {
        type: 'number',
        description: 'ID of the sprint to get issues from',
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
    required: ['sprintId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get Sprint Issues',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getSprintIssuesHandler,
};

/**
 * Handler function for getting sprint issues
 */
async function getSprintIssuesHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, logger, config } = context;
    const { sprintId, startAt = 0, maxResults = 50, jql, validateQuery = true, fields = [], expand = [] } = args;

    logger.info(`Fetching JIRA sprint issues: sprintId: ${sprintId} | maxResults: ${maxResults} | jql: ${jql}`);

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

    // https://docs.atlassian.com/jira-software/REST/8.13.0/#agile/1.0/sprint-getIssuesForSprint
    // https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-sprint/#api-agile-1-0-sprint-sprintid-issue-get
    // https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-rest-agile-1-0-sprint-sprintid-issue-get
    const response = await httpClient.get(`/rest/agile/1.0/sprint/${sprintId}/issue`, { params });

    if (!response.data) {
      throw new NotFoundError('Sprint', sprintId.toString());
    }

    const { issues = [], total } = response.data || {};
    const count = issues?.length || 0;

    const message = count
      ? `Found ${count} issue(s) in sprint ${sprintId}. Total: ${total} issue(s) available, showing ${count}`
      : `No issues found in sprint ${sprintId}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'get_sprint_issues',
      message,
      total,
      count,
      startAt,
      maxResults,
      issues: issues.map((issue: any) => {
        const f = issue.fields || {};
        const statusName = f.status?.name;
        const status =
          f.resolution?.name ? `${statusName} (${f.resolution.name})` : statusName;

        return {
          key: issue.key,
          summary: f.summary,
          status,
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
          // Additional sprint metric field (if available)
          storyPoints: f[config.fieldId!.storyPoints],
          created: convertToIsoUtc(f.created),
          updated: convertToIsoUtc(f.updated),
        };
      }),
    };

    return formatToolResult(json);
  });
}
