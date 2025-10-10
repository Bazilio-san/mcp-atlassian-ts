/**
 * JIRA tool module: Update Issue
 * Updates an existing JIRA issue with new field values
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for updating a JIRA issue
 */
export const updateIssueTool: Tool = {
  name: 'jira_update_issue',
  description: `Update an existing JIRA issue`,
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: `The issue key (e.g., PROJ-123) or ID`,
      },
      summary: {
        type: 'string',
        description: `Updated summary/title`,
      },
      description: {
        type: 'string',
        description: `Updated description`,
      },
      assignee: {
        type: 'string',
        description: `New assignee account ID or email`,
      },
      priority: {
        type: 'string',
        description: `New priority name or ID`,
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: `Labels to set (replaces existing). e.g.: ["bug", "urgent"]`,
        default: [],
      },
      customFields: {
        type: 'object',
        description: `Custom field values as key-value pairs`,
        default: {},
      },
    },
    required: ['issueKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Update existing JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for updating a JIRA issue
 */
export async function updateIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const {
      issueKey,
      summary,
      description,
      assignee,
      priority,
      labels,
      customFields = {},
    } = args;
    const { httpClient, config, logger, normalizeToArray } = context;

    logger.info('Updating JIRA issue', { issueKey });

    // Build update data
    const updateData: any = { fields: { ...customFields } };

    if (summary) updateData.fields.summary = summary;
    if (description) updateData.fields.description = description;
    if (assignee) updateData.fields.assignee = { accountId: assignee };
    if (priority) updateData.fields.priority = { name: priority };
    if (labels) updateData.fields.labels = normalizeToArray(labels);

    // Make API call
    await httpClient.put(`/rest/api/2/issue/${issueKey}`, updateData);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Updated Successfully**\n\n` +
            `**Key:** ${issueKey}\n` +
            `Updated fields: ${Object.keys(updateData.fields).join(', ')}\n` +
            `\n**Direct Link:** ${config.url}/browse/${issueKey}`,
        },
      ],
    };
  });
}