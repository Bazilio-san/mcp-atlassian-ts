/**
 * JIRA tool module: Batch Create Issues
 * Creates multiple JIRA issues in a single request for improved efficiency
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for batch creating JIRA issues
 */
export const jira_batch_create_issues: ToolWithHandler = {
  name: 'jira_batch_create_issues',
  description: `Create multiple JIRA issues in a single request`,
  inputSchema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Project key (e.g., PROJ)',
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
          required: ['project', 'issueType', 'summary'],
          additionalProperties: false,
        },
        description: `Array of issues to create`,
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
async function batchCreateIssuesHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issues } = args;
    const { httpClient, logger } = context;

    logger.info('Batch creating JIRA issues', { count: issues.length });

    // Convert to the format expected by the JIRA API
    const issueInputs = issues.map((issue: any) => ({
      fields: {
        project: { key: issue.project },
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
    const response = await httpClient.post('/rest/api/2/issue/bulk', {
      issueUpdates: issueInputs,
    });

    const result = response.data;
    const successCount = result.issues?.length || 0;
    const errorCount = result.errors?.length || 0;

    let resultText =
      `**Batch Issue Creation Results**\n\n` +
      `**Total Issues:** ${issues.length}\n` +
      `**Successfully Created:** ${successCount}\n` +
      `**Errors:** ${errorCount}\n\n`;

    if (result.issues?.length > 0) {
      resultText += `**Created Issues:**\n`;
      result.issues.forEach((issue: any) => {
        resultText += `• **${issue.key}**: ${issue.summary || 'No summary'}\n`;
      });
    }

    if (result.errors?.length > 0) {
      resultText += `\n**Errors:**\n`;
      result.errors.forEach((error: any, index: number) => {
        resultText += `• Issue ${index + 1}: ${error.elementErrors?.errorMessages?.[0] || error.status}\n`;
      });
    }

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  });
}
