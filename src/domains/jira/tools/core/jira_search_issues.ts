/**
 * JIRA tool module: Search Issues
 * Searches for JIRA issues using JQL (JIRA Query Language)
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for searching JIRA issues
 */
export const jira_search_issues: ToolWithHandler = {
  name: 'jira_search_issues',
  description: 'Search for JIRA issues using JQL (JIRA Query Language)',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query string (e.g., "project = PROJ AND status = Open")',
      },
      startAt: {
        type: 'number',
        description: 'Starting index for results',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 50,
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return. e.g.: ["summary", "status", "assignee"]',
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand. e.g.: ["changelog", "transitions"]',
        default: [],
      },
    },
    required: ['jql'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Search JIRA issues using JQL',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: searchIssuesHandler,
};

/**
 * Handler function for searching JIRA issues
 */
async function searchIssuesHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { jql, startAt = 0, maxResults = 50, fields, expand } = args;
    const { httpClient, cache, config, logger, normalizeToArray } = context;

    logger.info('Searching JIRA issues', { jql, maxResults });

    // Build search request
    const searchRequest: any = {
      jql,
      startAt,
      maxResults: Math.min(maxResults, config.maxResults || 100),
      expand: normalizeToArray(expand),
    };
    if (fields) {
      searchRequest.fields = normalizeToArray(fields);
    }

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'search', searchRequest);

    // Search issues
    const searchResult = await cache.getOrSet(
      cacheKey,
      async () => {
        const params: any = {
          jql: searchRequest.jql,
          startAt: searchRequest.startAt,
          maxResults: searchRequest.maxResults,
        };
        if (searchRequest.expand?.length) {
          params.expand = searchRequest.expand.join(',');
        }
        if (searchRequest.fields?.length) {
          params.fields = searchRequest.fields.join(',');
        }

        const response = await httpClient.get('/rest/api/2/search', { params });
        return response.data || [];
      },
      60, // Cache for 1 minute
    );

    // Format search results as JSON
    const json = {
      success: true,
      operation: 'search_issues',
      message: searchResult.issues.length
        ? `Found ${searchResult.total} issues (showing ${searchResult.issues.length})`
        : `No issues found`,
      jql: jql,
      total: searchResult.total || 0,
      showing: searchResult.issues.length,
      issues: (searchResult.issues || []).map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
        priority: issue.fields.priority ? issue.fields.priority.name : 'None',
        issueType: issue.fields.issuetype ? issue.fields.issuetype.name : 'Unknown',
      })),
      searchUrl: `${config.url}/issues/?jql=${encodeURIComponent(jql)}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
