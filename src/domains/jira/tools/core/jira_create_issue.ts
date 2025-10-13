/**
 * JIRA tool module: Create Issue
 * Creates a new JIRA issue with specified fields
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
// import { findIssueTypeName } from "../projects/lib/find-similar";

// Common JIRA priority values
const priorityEnum = [
  'Highest',
  'High',
  'Medium',
  'Low',
  'Lowest',
  'Critical',
  'Major',
  'Minor',
  'Trivial',
  'Blocker',
];

/**
 * Tool definition for creating a JIRA issue
 */
export const jira_create_issue: ToolWithHandler = {
  name: 'jira_create_issue', // VVA jira_find_project
  description: `Create a new issue (e.g., a task, bug, or story) in JIRA
before creating issue:
1) collect minimum required information 
  - projectIdOrKey 
  - issueType
  - summary 
2) if projectIdOrKey is not provided, ask user to clarify. Validate projectKey with jira_find_project tool.
   And OBTAIN issuesTypes for selected project.
4) For bug reports, ENCOURAGE detailed reproduction steps in description.
5) If the assignee or the reporter is not specified, leave it blank.
   Otherwise, if an agent/tool for fuzzy search of a person’s login/email is available, use it and select a suitable person. 
   In case of discrepancies, you can request clarification from the user but no more than 3 times
6) Show all the parameters that are indicated and found to create a task in order to confirm the user or adjust.
7) After confirming the parameters, use jira_create_issue.

All jira_create_issue parameters except projectKey, issueType, summary are optional with sensible defaults.
  `,
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'Project key (e.g., \'AITECH\' or \'REQ\') or ID (e.g.,1003)',
      },
      issueType: {
        type: 'string',
        description: `Issue type name or ID.
When searching for a project by jira_find_project tool will return a list of available issue types. 
Among them you need to choose the right one.`,
      },
      summary: {
        type: 'string',
        description: `A short, descriptive title for the issue. 
If not indicated explicitly, form a short title according to the description`,
      },
      description: {
        type: 'string',
        description: 'Detailed description of the issue. For bugs, this should include steps to reproduce.',
        nullable: true,
      },
      assignee: { // VVQ username/login or email
        type: 'string',
        description: 'Optional. The Jira username/login or email of the person to assign the issue to.',
        nullable: true,
      },
      reporter: {
        type: 'string', // VVQ username/login or email
        description: 'Optional. The Jira username/login or email of the author of issue.',
        nullable: true,
      },
      priority: {  // VVQ ENUM
        type: 'string',
        description: 'Optional. The priority level of the issue (e.g., Highest, High, Medium, Low, Lowest). If the user indicated priority, find the most suitable from the list. And if no one suits, choose null',
        enum: priorityEnum,
        nullable: true,
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional. Array of Labels for the issue (e.g.: ["bug", "urgent"])',
        default: [],
        nullable: true,
      },
      epicKey: {
        type: 'string',
        description: `Epic issue key to link this issue
When searching for a project by jira_find_project tool will return a list of available epics.
Among them you need to choose the right one`,
      },
      components: {
        type: 'array',
        items: { type: 'string' },
        description: 'Component names or IDs, e.g.: ["Backend", "API"]',
        default: [],
        nullable: true,
      },
      originalEstimate: {
        type: 'string',
        description: 'Optional. Original time estimate (Jira duration format: Xd, Xh, Xm, Xw), e.g. 1.5d, 2h, 30m; convert natural language inputs into this format',
      },
      remainingEstimate: {
        type: 'string',
        description: 'Optional. Remaining time estimate (Jira duration format: Xd, Xh, Xm, Xw), e.g. 3d, 4h; convert natural language inputs into this format',
      },
      customFields: {
        type: 'object',
        description: 'Custom field values (field ID as key)',
        additionalProperties: true,
      },
    },
    required: [
      'projectKey', 'issueType', 'summary',
      'description', 'assignee', 'reporter', 'priority',
      'labels', 'epicKey', 'components', 'originalEstimate', 'remainingEstimate',
    ],
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
      reporter,
      priority,
      labels,
      components,
      epicKey,
      originalEstimate,
      remainingEstimate,
      customFields = {},
    } = args;
    const { httpClient, config, logger, normalizeToArray } = context;

    logger.info('Creating JIRA issue', { projectIdOrKey, issueType, summary });

    // Validate required fields
    if (!projectIdOrKey) {
      throw new ValidationError('Project is required');
    }
    if (!issueType) {
      throw new ValidationError('Issue type is required');
    }
    if (!summary) {
      throw new ValidationError('Summary is required');
    }

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
    if (description) {
      issueInput.fields.description = description;
    }
    if (assignee) {
      issueInput.fields.assignee = { name: assignee };
    }
    if (reporter) {
      issueInput.fields.reporter = { name: reporter };
    }
    if (priority) {
      issueInput.fields.priority = { name: priority };
    }
    if (normalizedLabels.length > 0) {
      issueInput.fields.labels = normalizedLabels;
    }
    if (normalizedComponents.length > 0) {
      issueInput.fields.components = normalizedComponents.map((c: string) => ({ name: c }));
    }

    // Add epic link if provided (using configured epic link field)
    if (epicKey) {
      const epicLinkFieldId = (config as any).customFields?.epicLink || config.epicLinkFieldId || 'customfield_10014';
      issueInput.fields[epicLinkFieldId] = epicKey;
    }

    // Add time tracking if provided
    if (originalEstimate || remainingEstimate) {
      issueInput.fields.timetracking = {};
      if (originalEstimate) {
        issueInput.fields.timetracking.originalEstimate = originalEstimate;
      }
      if (remainingEstimate) {
        issueInput.fields.timetracking.remainingEstimate = remainingEstimate;
      }
    }

    // Create the issue
    const response = await httpClient.post('/rest/api/2/issue', issueInput);
    const createdIssue = response.data;

    const json = {
      success: true,
      operation: 'create_issue',
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
    return formatToolResult(json);
  });
}
