/**
 * JIRA tool module: Get Issue
 * Retrieves detailed information about a JIRA issue by key or ID
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for getting a JIRA issue
 */
export const getIssueTool: Tool = {
  name: 'jira_get_issue',
  description: `Get detailed information about a JIRA issue by key or ID`,
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: `
Issue id or key can be used to uniquely identify an existing issue.
Issue id is a numerical identifier (e.g. 123).
Issue key is formatted as <project key>-<id> (e.g. ISSUE-123).
An example issue key is ISSUE-1.`,
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: `Additional fields to expand. e.g.: ["changelog", "transitions"]`,
        default: [],
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: `Specific fields to return. e.g.: ["summary", "status", "assignee"]`,
        default: [],
      },
    },
    required: ['issueKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for getting a JIRA issue
 */
export async function getIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKey, expand = [], fields } = args;
    const { httpClient, cache, config, logger, normalizeToArray, formatDescription } = context;

    logger.info('Fetching JIRA issue', { issueKey });

    // Build options
    const options = {
      expand: normalizeToArray(expand),
      fields: fields ? normalizeToArray(fields) : undefined,
    };

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'issue', { issueKey, ...options });

    // Fetch from cache or API
    const issue = await cache.getOrSet(cacheKey, async () => {
      const params: any = {};
      if (options.expand?.length) params.expand = options.expand.join(',');
      if (options.fields?.length) params.fields = options.fields.join(',');

      const response = await httpClient.get(`/rest/api/2/issue/${issueKey}`, { params });

      if (!response.data) {
        throw new NotFoundError('Issue', issueKey);
      }

      return response.data;
    });

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue: ${issue.key}**\n\n` +
            `**Summary:** ${issue.fields.summary}\n` +
            `**Status:** ${issue.fields.status.name}\n` +
            `**Assignee:** ${issue.fields.assignee?.displayName || 'Unassigned'}\n` +
            `**Reporter:** ${issue.fields.reporter.displayName}\n` +
            `**Created:** ${new Date(issue.fields.created).toLocaleString()}\n` +
            `**Updated:** ${new Date(issue.fields.updated).toLocaleString()}\n` +
            `**Priority:** ${issue.fields.priority?.name || 'None'}\n` +
            `**Issue Type:** ${issue.fields.issuetype.name}\n` +
            `**Project:** ${issue.fields.project.name} (${issue.fields.project.key})\n${
              issue.fields.labels?.length ? `**Labels:** ${issue.fields.labels.join(', ')}\n` : ''
            }${
              issue.fields.description
                ? `\n**Description:**\n${formatDescription(issue.fields.description)}\n`
                : ''
            }\n**Direct Link:** ${config.url}/browse/${issue.key}`,
        },
      ],
    };
  });
}