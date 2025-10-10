/**
 * JIRA tool module: Search Issues
 * Searches for JIRA issues using JQL (JIRA Query Language)
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for searching JIRA issues
 */
export const jira_search_issues: ToolWithHandler = {
  name: 'jira_search_issues',
  description: `Search for JIRA issues using JQL (JIRA Query Language)`,
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: `JQL query string (e.g., "project = PROJ AND status = Open")`,
      },
      startAt: {
        type: 'number',
        description: `Starting index for results`,
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: `Maximum number of results to return`,
        default: 50,
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: `Specific fields to return. e.g.: ["summary", "status", "assignee"]`,
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: `Additional fields to expand. e.g.: ["changelog", "transitions"]`,
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
async function searchIssuesHandler(args: any, context: ToolContext): Promise<any> {
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
        if (searchRequest.expand?.length) params.expand = searchRequest.expand.join(',');
        if (searchRequest.fields?.length) params.fields = searchRequest.fields.join(',');

        const response = await httpClient.get('/rest/api/2/search', { params });
        return response.data;
      },
      60 // Cache for 1 minute
    );

    // Handle empty results
    if (searchResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No issues found for JQL: ${jql}`,
          },
        ],
      };
    }

    // Format issues list
    const issuesList = searchResult.issues
      .map((issue: any) => `• **${issue.key}**: ${issue.fields.summary} (${issue.fields.status.name})`)
      .join('\n');

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Search Results**\n\n` +
            `**JQL:** ${jql}\n` +
            `**Found:** ${searchResult.total} issues (showing ${searchResult.issues.length})\n\n` +
            `${issuesList}\n\n` +
            `**Search URL:** ${config.url}/issues/?jql=${encodeURIComponent(jql)}`,
        },
      ],
    };
  });
}
