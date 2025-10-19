/**
 * JIRA tool module: Batch Create Issues
 * Creates multiple JIRA issues in a single request for improved efficiency
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for batch creating JIRA issues
 */
export const jira_batch_create_issues: ToolWithHandler = {
  name: 'jira_batch_create_issues',
  description: 'Create multiple JIRA issues in a single request',
  inputSchema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            projectIdOrKey: {
              type: 'string',
              description: 'Project id or key (e.g., 1000 or PROJ)',
            },
            issueType: {
              type: 'string',
              description: 'Issue type name (e.g., Task, Bug, Story)',
            },
            summary: {
              type: 'string',
              description: 'Issue summary/title',
            },
            description: {
              type: 'string',
              description: 'Issue description',
            },
            assignee: {
              type: 'string',
              description: 'Assignee account ID or email',
            },
            priority: {
              type: 'string',
              description: 'Priority name (e.g., High, Medium, Low)',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of labels',
              default: [],
            },
            components: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of component names',
              default: [],
            },
            customFields: {
              type: 'object',
              description: 'Custom field values as key-value pairs',
              default: {},
            },
          },
          required: ['projectIdOrKey', 'issueType', 'summary'],
          additionalProperties: false,
        },
        description: 'Array of issues to create',
        minItems: 1,
      },
    },
    required: ['issues'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create multiple JIRA issues in batch',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: batchCreateIssuesHandler,
};

/**
 * Handler function for batch creating JIRA issues
 */
async function batchCreateIssuesHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issues } = args;
    const { httpClient, logger } = context;

    logger.info('Batch creating JIRA issues', { count: issues.length });

    // Convert to the format expected by the JIRA API
    const issueUpdates = issues.map((issue: any) => ({
      fields: {
        project: {
          [/^\d+$/.test(issue.projectIdOrKey) ? 'id' : 'key']: issue.projectIdOrKey,
        },
        issuetype: { name: issue.issueType },
        summary: issue.summary,
        description: issue.description,
        assignee: issue.assignee ? { accountId: issue.assignee } : undefined,
        priority: issue.priority ? { name: issue.priority } : undefined,
        labels: issue.labels || [],
        components: issue.components?.map((c: string) => ({ name: c })) || [],
        ...issue.customFields,
      },
    }));

    // Make API call
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssues
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-bulk-post
    const response = await httpClient.post('/rest/api/2/issue/bulk', { issueUpdates });

    const result = response.data;
    const successCount = result.issues?.length || 0;
    const errorCount = result.errors?.length || 0;

    // Build structured JSON
    const json = {
      operation: 'batch_create_issues',
      totalRequested: issues.length,
      successCount,
      errorCount,
      createdIssues: result.issues?.map((issue: any) => ({
        key: issue.key,
        id: issue.id,
        self: issue.self,
        summary: issue.summary || null,
        created: new Date().toISOString(),
      })) || [],
      errors: result.errors?.map((error: any, index: number) => ({
        issueIndex: index,
        status: error.status,
        errorMessages: error.elementErrors?.errorMessages || [],
        fieldErrors: error.elementErrors?.errors || {},
      })) || [],
    };

    return formatToolResult(json);
  });
}
