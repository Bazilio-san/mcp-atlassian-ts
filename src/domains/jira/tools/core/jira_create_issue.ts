/**
 * JIRA tool module: Create Issue
 * Creates a new JIRA issue with specified fields
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult, getJsonFromResult } from '../../../../core/utils/formatToolResult.js';
import { jira_get_project } from '../projects/jira_get_project.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';

export async function createJiraCreateIssueTool (): Promise<ToolWithHandler> {
  return {
    name: 'jira_create_issue',
    description: `Create a new issue (task, bug, story, etc.) in JIRA.

Workflow:
1) Collect or receive: projectIdOrKey, issueType, summary.
2) If project is not specified, ask the user for clarification.
3) Use the 'jira_project_finder' tool to obtain the exact project key.
4) With this project key, USE 'jira_get_project' tool to list available: 
   - issue types
   - priorities
   - labels.
5) For bug reports, encourage user to provide detailed reproduction steps in the description.
6) If assignee or reporter are not specified - leave blank. If a fuzzy search tool for users exists, use it to obtain user login; clarify at most 3 times.
7) Display all collected parameters for confirmation before creation.
8) If issue is under an Epic, use 'jira_get_epics_for_project' to pick epic’s issue key and pass it as epicKey.
9) Upon user confirmation, call jira_create_issue with the final parameters.

Non-interactive mode:
If called by another agent (without user input), skip clarification and confirmation steps. Use available data only.`
    ,
    inputSchema: {
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
After clarifying the project key, use 'jira_get_project' tool which returns  available issue types for project`,
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
        assignee: {
          type: 'string',
          description: 'Optional. The Jira username/login of the person to assign the issue to. E.g.: vpupkun',
        },
        reporter: {
          type: 'string',
          description: 'Optional. The Jira username/login of the issue reporter. E.g.: joe_smith',
        },
        priority: {
          type: 'string',
          description: 'Optional. The priority level of the issue',
          nullable: true,
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional. Array of Labels for the issue (e.g.: ["bug", "urgent"])',
          default: [],
        },
        epicKey: {
          type: 'string',
          description: `Epic issue key to link this issue
If user ask to link new issue to epik, after clarifying the project key, 
use 'jira_get_epics_for_project' tool to clarify epic key`,
        },
        components: {
          type: 'array',
          items: { type: 'string' },
          description: 'Component names or IDs, e.g.: ["Backend", "API"]',
          default: [],
        },
        originalEstimate: {
          type: 'string',
          description: `Optional. Original time estimate (Jira duration format: Xd, Xh, Xm, Xw), e.g. 1.5d, 2h, 30m;
Convert natural language inputs into this format`,
        },
        remainingEstimate: {
          type: 'string',
          description: `Optional. Remaining time estimate (Jira duration format: Xd, Xh, Xm, Xw), e.g. 3d, 4h;
Convert natural language inputs into this format`,
        },
        customFields: { // VVQ из сведений о проекте брать схему и правила заполнения кастомных полей
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
}

/**
 * Validate project exists and issueType is correct
 */
async function validateProjectAndIssueType (
  projectIdOrKey: string,
  issueType: string,
  context: ToolContext,
): Promise<{ valid?: true; error?: string, message?: string, data?: any }> {
  let projectResult: any;
  try {
    // Get project details with issueTypes expanded
    projectResult = await jira_get_project.handler({ projectIdOrKey, expand: ['issueTypes'] }, context);
  } catch (error) {
    return {
      error: 'VALIDATION_ERROR',
      message: `Failed to validate project '${projectIdOrKey}'. ERROR: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const json = getJsonFromResult(projectResult);
  // Check if project was found
  if (!json.found) {
    return {
      error: 'PROJECT_NOT_FOUND',
      message: `Project '${projectIdOrKey}' not found. Please verify the project key or ID.`,
    };
  }

  const project = json.project;
  const issueTypes = project.issueTypes || [];

  // Check if issueType is valid (by name or id)
  const validIssueType = issueTypes.find((it: any) =>
    it.name === issueType || it.id === issueType,
  );

  if (!validIssueType) {
    return {
      error: 'INVALID_ISSUE_TYPE',
      message: `Issue type '${issueType}' is not valid for project '${project.key}' (${project.name}).`,
      data: {
        invalidIssueType: issueType,
        availableIssueTypes: issueTypes.map((it: any) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          subtask: it.subtask,
        })),
      },
    };
  }

  return { valid: true };
}

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
    const { httpClient, config, logger } = context;

    logger.info(`Creating JIRA issue in project: ${projectIdOrKey} | issueType: ${issueType} | summary: ${summary}`);

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

    // Validate project exists and issueType is correct
    const projectValidation = await validateProjectAndIssueType(projectIdOrKey, issueType, context);
    if (!projectValidation.valid) {
      const json = {
        success: false,
        operation: 'create_issue',
        ...projectValidation,
      };
      return formatToolResult(json);
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
      issueInput.fields[config.fieldId!.epicLink] = epicKey;
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
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-post
    const response = await httpClient.post(`${config.restPath}/issue`, issueInput);
    const createdIssue = response.data;

    const message = `Issue ${createdIssue.key} created successfully in project ${projectIdOrKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'create_issue',
      message,
      newIssue: {
        id: createdIssue.id,
        key: createdIssue.key,
        issueUrl: `${config.origin}/browse/${createdIssue.key}`,
        summary,
        [/^\d+$/.test(projectIdOrKey) ? 'projectId' : 'projectKey']: projectIdOrKey,
        created: new Date().toISOString(),
      },
    };

    return formatToolResult(json);
  });
}
