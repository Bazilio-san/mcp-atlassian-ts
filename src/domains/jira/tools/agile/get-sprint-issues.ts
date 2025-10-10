/**
 * JIRA tool module: Get Sprint Issues
 * Retrieves all issues from a specific sprint
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for getting sprint issues
 */
export const getSprintIssuesTool: Tool = {
  name: 'jira_get_sprint_issues',
  description: `Get all issues from a specific sprint. Supports filtering and field selection.`,
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
};

/**
 * Handler function for getting sprint issues
 */
export async function getSprintIssuesHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, normalizeToArray, config } = context;
    const { sprintId, startAt = 0, maxResults = 50, jql, validateQuery = true, fields = [], expand = [] } = args;

    logger.info('Fetching JIRA sprint issues', { sprintId, maxResults, jql });

    // Build query parameters
    const params: any = { startAt, maxResults };
    if (jql) params.jql = jql;
    if (validateQuery !== undefined) params.validateQuery = validateQuery;

    const normalizedFields = normalizeToArray(fields);
    const normalizedExpand = normalizeToArray(expand);

    if (normalizedFields.length) params.fields = normalizedFields.join(',');
    if (normalizedExpand.length) params.expand = normalizedExpand.join(',');

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'sprintIssues', { sprintId, ...params });

    // Fetch from cache or API
    const issuesResult = await cache.getOrSet(cacheKey, async () => {
      logger.info('Making API call to get sprint issues');
      const response = await httpClient.get(`/rest/agile/1.0/sprint/${sprintId}/issue`, { params });

      if (!response.data) {
        throw new NotFoundError('Sprint', sprintId.toString());
      }

      return response.data;
    });

    if (!issuesResult.issues || issuesResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issues found in sprint ${sprintId}**`,
          },
        ],
      };
    }

    const issuesList = issuesResult.issues
      .map((issue: any) => {
        let statusDetails = issue.fields.status.name;
        if (issue.fields.resolution) {
          statusDetails += ` (${issue.fields.resolution.name})`;
        }

        return (
          `• **${issue.key}** - ${issue.fields.summary}\n` +
          `  Status: ${statusDetails} | ` +
          `Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'} | ` +
          `Type: ${issue.fields.issuetype.name}${
            issue.fields.priority ? ` | Priority: ${issue.fields.priority.name}` : ''
          }${issue.fields.customfield_10016 ? ` | Story Points: ${issue.fields.customfield_10016}` : ''}\n` +
          `  Link: ${config.url}/browse/${issue.key}`
        );
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Found ${issuesResult.issues.length} issue(s) in sprint ${sprintId}:**\n\n` +
            issuesList +
            `\n\n**Total:** ${issuesResult.total} issue(s) available${
              issuesResult.isLast ? '' : ` (showing ${issuesResult.issues.length})`
            }`,
        },
      ],
    };
  });
}