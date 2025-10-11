/**
 * JIRA tool module: Create Issue
 * Creates a new JIRA issue with specified fields
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { ppj } from '../../../../core/utils/text.js';

/**
 * Tool definition for creating a JIRA issue
 */
export const jira_create_issue: ToolWithHandler = {
  name: 'jira_create_issue',
  description: 'Create a new JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'Project key or ID',
      },
      issueType: {
        type: 'string',
        description: 'Issue type name or ID (e.g., "Task", "Bug", "Story" or "1001")',
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
        description: 'Priority name or ID',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels to add to the issue (e.g.: ["bug", "urgent"])',
        default: [],
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: 'Component names or IDs, e.g.: ["Backend", "API"]',
        default: [],
      },
      customFields: {
        type: 'object',
        description: 'Custom field values (field ID as key)',
        additionalProperties: true,
      },
    },
    required: ['projectIdOrKey', 'issueType', 'summary'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create new JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: createIssueHandler,
};

/**
 * Handler function for creating a JIRA issue
 */
async function createIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const {
      projectIdOrKey,
      issueType,
      summary,
      description,
      assignee,
      priority,
      labels,
      components,
      customFields = {},
    } = args;
    const { httpClient, config: _cfg, logger, normalizeToArray } = context;

    logger.info('Creating JIRA issue', { projectIdOrKey, issueType, summary });

    // Validate required fields
    if (!projectIdOrKey) throw new ValidationError('Project is required');
    if (!issueType) throw new ValidationError('Issue type is required');
    if (!summary) throw new ValidationError('Summary is required');

    // Normalize labels and components
    const normalizedLabels = normalizeToArray(labels);
    const normalizedComponents = normalizeToArray(components);

    // Build the issue input
    const issueInput: any = {
      fields: {
        project: { [/^\d+$/.test(projectIdOrKey) ? 'id' : 'key']: projectIdOrKey },
        issuetype: { [/^\d+$/.test(issueType) ? 'id' : 'name']: issueType },
        summary,
        ...customFields,
      },
    };

    // Add optional fields
    if (description) issueInput.fields.description = description;
    if (assignee) issueInput.fields.assignee = { accountId: assignee };
    if (priority) issueInput.fields.priority = { name: priority };
    if (normalizedLabels.length > 0) issueInput.fields.labels = normalizedLabels;
    if (normalizedComponents.length > 0) {
      issueInput.fields.components = normalizedComponents.map((c: string) => ({ name: c }));
    }

    // Create the issue
    const response = await httpClient.post('/rest/api/2/issue', issueInput);
    const createdIssue = response.data;

    const json = {
      success: true,
      message: 'Issue created successfully',
      newIssue: {
        id: createdIssue.id,
        key: createdIssue.key,
        directLink: createdIssue.self,
        summary,
        project: {
          [/^\d+$/.test(projectIdOrKey) ? 'id' : 'key']: projectIdOrKey,
        },
      },
    };
    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: ppj(json),
        },
      ],
    };
  });
}
