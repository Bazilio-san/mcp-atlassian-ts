/**
 * JIRA tool module: Update Issue
 * Updates an existing JIRA issue with new field values
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { normalizeToArray } from '../../../../core/utils/tools.js';

/**
 * Create tool definition for updating a JIRA issue with dynamic parameters
 * @param fieldIdEpicLink - Epic link custom field ID
 * @param priorityNamesArray - Optional array of valid priority names for enum constraint
 */
export async function createJiraUpdateIssueTool (
  fieldIdEpicLink?: string,
  priorityNamesArray?: string[],
): Promise<ToolWithHandler> {
  const epicLinkInfo = fieldIdEpicLink
    ? `To unlink an issue from an Epic, set custom field "${fieldIdEpicLink}" to null`
    : '';

  const result: ToolWithHandler = {
    name: 'jira_update_issue',
    description: `Update a JIRA issue fields:
- summary
- description
- assignee
- priority
- labels
- customFields

To get information about the available priority, labels, customFields, and the rules for filling them, first call the 'jira_get_project' tool

${epicLinkInfo}`,
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
          type: 'string', // markdown
          description: 'Updated description in markdown format',
        },
        assignee: {
          type: 'string', // VVQ extract and parameterize depending on version
          description: 'New assignee account ID or email',
        },
        priority: {
          type: 'string',
          description: 'New priority name',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to set (replaces existing). e.g.: ["bug", "urgent"]',
          default: [],
        },
        customFields: {
          type: 'object',
          description: `Custom field values as key-value pairs (fieldId as key).
The response of the 'jira_get_project' tool will contain information about filling in the available custom fields`,
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

  // Add priority enum constraint if priority names are provided
  if (priorityNamesArray?.length) {
    // @ts-ignore
    result.inputSchema.properties.priority.enum = priorityNamesArray;
  }

  return result;
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
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Updating JIRA issue: issueIdOrKey: ${issueIdOrKey}`);


    const fields = { ...customFields };

    if (summary) {
      fields.summary = summary;
    }
    if (description) {
      fields.description = mdToADF(description); // VVT
    }
    if (assignee) {
      fields.assignee = { accountId: assignee };
    }
    if (priority) {
      fields.priority = { name: priority };
    }
    if (labels) {
      fields.labels = normalizeToArray(labels);
    }

    // Make API call
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-editIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-put
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
    await httpClient.put(`${config.restPath}/issue/${issueIdOrKey}`, { fields });

    const i = `${/^\d+$/.test(issueIdOrKey) ? 'id' : 'key'} ${issueIdOrKey}`;
    const message = `JIRA issue ${i} updated successfully`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'update_issue',
      message,
      updatedFields: Object.keys(fields),
      fieldValues: fields,
      link: `${config.origin}/browse/${issueIdOrKey}`,
      updated: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
