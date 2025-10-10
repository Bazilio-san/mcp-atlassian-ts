/**
 * JIRA tool module: Create Issue
 * Creates a new JIRA issue with specified fields
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError } from '../../../../core/errors/index.js';

/**
 * Tool definition for creating a JIRA issue
 */
export const createIssueTool: Tool = {
  name: 'jira_create_issue',
  description: `Create a new JIRA issue`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: `Project key or ID`,
      },
      issueType: {
        type: 'string',
        description: `Issue type name or ID (e.g., "Task", "Bug", "Story")`,
      },
      summary: {
        type: 'string',
        description: `Issue summary/title`,
      },
      description: {
        type: 'string',
        description: `Issue description`,
      },
      assignee: {
        type: 'string',
        description: `Assignee account ID or email`,
      },
      priority: {
        type: 'string',
        description: `Priority name or ID`,
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: `Labels to add to the issue (e.g.: ["bug", "urgent"])`,
        default: [],
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: `Component names or IDs, e.g.: ["Backend", "API"]`,
        default: [],
      },
      customFields: {
        type: 'object',
        description: `Custom field values (field ID as key)`,
        additionalProperties: true,
      },
    },
    required: ['project', 'issueType', 'summary'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create new JIRA issue',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

/**
 * Handler function for creating a JIRA issue
 */
export async function createIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const {
      project,
      issueType,
      summary,
      description,
      assignee,
      priority,
      labels,
      components,
      customFields = {},
    } = args;
    const { httpClient, config, logger, normalizeToArray, invalidateIssueCache } = context;

    logger.info('Creating JIRA issue', { project, issueType, summary });

    // Validate required fields
    if (!project) throw new ValidationError('Project is required');
    if (!issueType) throw new ValidationError('Issue type is required');
    if (!summary) throw new ValidationError('Summary is required');

    // Normalize labels and components
    const normalizedLabels = normalizeToArray(labels);
    const normalizedComponents = normalizeToArray(components);

    // Build the issue input
    const issueInput: any = {
      fields: {
        project: { key: project },
        issuetype: { name: issueType },
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

    // Invalidate search cache since we have a new issue
    invalidateIssueCache(createdIssue.key);

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Created Successfully**\n\n` +
            `**Key:** ${createdIssue.key}\n` +
            `**Summary:** ${summary}\n` +
            `**Project:** ${project}\n` +
            `**Issue Type:** ${issueType}\n` +
            `\n**Direct Link:** ${config.url}/browse/${createdIssue.key}`,
        },
      ],
    };
  });
}