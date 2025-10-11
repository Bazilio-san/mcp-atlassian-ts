/**
 * JIRA tool module: Update Issue
 * Updates an existing JIRA issue with new field values
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Create tool definition for updating a JIRA issue with dynamic epicLinkFieldId
 */
export function jira_update_issue (epicLinkFieldId?: string): ToolWithHandler {
  const epicLinkInfo = epicLinkFieldId
    ? `\nTo unlink an issue from an Epic, set custom field "${epicLinkFieldId}" to null`
    : '';

  return {
    name: 'jira_update_issue',
    description: `Update a JIRA issue fields: summary, description, assignee, priority, labels, customFields${epicLinkInfo}`,
    inputSchema: {
      type: 'object',
      properties: {
        issueIdOrKey: {
          type: 'string',
          description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
        },
        summary: {
          type: 'string',
          description: 'Updated summary/title',
        },
        description: {
          type: 'string',
          description: 'Updated description',
        },
        assignee: {
          type: 'string',
          description: 'New assignee account ID or email',
        },
        priority: {
          type: 'string',
          description: 'New priority name or ID',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to set (replaces existing). e.g.: ["bug", "urgent"]',
          default: [],
        },
        customFields: {
          type: 'object',
          description: 'Custom field values as key-value pairs',
          default: {},
        },
      },
      required: ['issueIdOrKey'],
      additionalProperties: false,
    },
    annotations: {
      title: 'Update existing JIRA issue',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: updateIssueHandler,
  };
}

/**
 * Handler function for updating a JIRA issue
 */
async function updateIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const {
      issueIdOrKey,
      summary,
      description,
      assignee,
      priority,
      labels,
      customFields = {},
    } = args;
    const { httpClient, config, logger, normalizeToArray } = context;

    logger.info('Updating JIRA issue', { issueIdOrKey });

    // Build update data
    const updateData: any = { fields: { ...customFields } };

    if (summary) updateData.fields.summary = summary;
    if (description) updateData.fields.description = description;
    if (assignee) updateData.fields.assignee = { accountId: assignee };
    if (priority) updateData.fields.priority = { name: priority };
    if (labels) updateData.fields.labels = normalizeToArray(labels);

    // Make API call
    await httpClient.put(`/rest/api/2/issue/${issueIdOrKey}`, updateData);

    // Invalidate cache for this issue
    context.invalidateIssueCache(issueIdOrKey);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            '**JIRA Issue Updated Successfully**\n\n' +
            `**Key:** ${issueIdOrKey}\n` +
            `Updated fields: ${Object.keys(updateData.fields).join(', ')}\n` +
            `\n**Direct Link:** ${config.url}/browse/${issueIdOrKey}`,
        },
      ],
    };
  });
}
