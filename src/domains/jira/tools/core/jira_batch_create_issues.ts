/**
 * JIRA tool module: Batch Create Issues
 * Creates multiple JIRA issues in a single request for improved efficiency
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { isObject } from '../../../../core/utils/tools.js';
import { trim } from '../../../../core/utils/text.js';

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
              description: `Project key (e.g., 'AITECH' or 'REQ') or ID (e.g.,1003)
Use 'jira_project_finder' tool to clarify Project Key`,
            },
            issueType: {
              type: 'string',
              description: `Issue type name or ID.
After clarifying the project key, use 'jira_get_project' tool which returns available issue types for project`,
            },
            summary: {
              type: 'string',
              description: 'Issue summary/title',
            },
            description: {
              type: 'string', // markdown
              description: 'Issue description in markdown format',
            },
            assignee: {
              type: 'string',
              description: 'Optional. The Jira username/login of the person to assign the issue to. E.g.: vpupkun',
            },
            priority: { // VVA
              type: 'string',
              description: 'Priority name (e.g., High, Medium, Low)',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: `Optional. Array of Labels for the issue (e.g.: ["bug", "urgent"])
The response of the 'jira_get_project' tool will contain available labels`,
              default: [],
            },
            components: { // VVA
              type: 'array',
              items: { type: 'string' },
              description: 'Array of component names',
              default: [],
            },
            customFields: {
              type: 'object',
              description: `Custom field values as key-value pairs (fieldId as key). 
The response of the 'jira_get_project' tool will contain information about filling in the available custom fields`,
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
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Batch creating ${issues.length} JIRA issues`);

    // Convert to the format expected by the JIRA API
    const issueUpdates = issues.map((issue: any) => ({
      fields: {
        project: {
          [/^\d+$/.test(issue.projectIdOrKey) ? 'id' : 'key']: issue.projectIdOrKey,
        },
        issuetype: { name: issue.issueType },
        summary: trim(issue.summary).substring(0, 400),
        description: mdToADF(issue.description),
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
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-bulk-post
    const response = await httpClient.post(`${config.restPath}/issue/bulk`, { issueUpdates });

    const result = response.data;
    const createdIssues = (result.issues || []).filter(isObject);

    const errorCount = result.errors?.length || undefined;

    const errors = errorCount
      ? result.errors?.map((error: any, index: number) => ({
        issueIndex: index,
        status: error.status,
        errorMessages: error.elementErrors?.errorMessages || [],
        fieldErrors: error.elementErrors?.errors || {},
      }))
      : undefined;

    const successCount = createdIssues.length;
    const totalRequested = issues.length;

    const message = `Created ${successCount} issues${successCount === totalRequested ? '' : ` of ${totalRequested} requested`}`;
    logger.info(message);

    // Build structured JSON
    const json = {
      operation: 'batch_create_issues',
      message,
      errorCount,
      createdIssues: createdIssues.map((issue: any) => ({
        key: issue.key,
        id: issue.id,
        self: issue.self,
        summary: issue.summary || undefined,
        created: new Date().toISOString(),
      })) || [],
      errors,
    };

    return formatToolResult(json);
  });
}
