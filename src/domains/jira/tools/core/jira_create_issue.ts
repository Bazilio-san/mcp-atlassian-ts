// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA tool module: Create Issue with pluggable user resolution
 * Creates a new JIRA issue with specified fields
 * Supports fuzzy user search when microservice is configured
 */

import type { ToolContext } from '../../../../types/tool-context';
import { toStr } from '../../../../core/errors/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult, getJsonFromResult } from '../../../../core/utils/formatToolResult.js';
import { jira_get_project } from '../projects/jira_get_project.js';
import { normalizeToArray, parseAndNormalizeTimeSpent } from '../../../../core/utils/tools.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { inJiraDuration } from '../../../../core/constants.js';
import { trim } from '../../../../core/utils/text.js';
import { getPriorityNamesArray } from '../../shared/priority-service.js';
import { ValidationError } from '../../../../core/errors/ValidationError.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Проверяет включен ли user lookup
 */
function isUserLookupEnabled (context: ToolContext): boolean {
  return !!(context.config.userLookup?.enabled && context.config.userLookup.serviceUrl);
}

/**
 * Модифицирует tool в зависимости от конфигурации user lookup
 */
export function modifyToolForUserLookup (tool: ToolWithHandler, context: ToolContext): void {
  if (isUserLookupEnabled(context)) {
    tool.description = `Create a new issue (task, bug, story, etc.) in JIRA with advanced user lookup.

# WORKFLOW

Always follow these steps when creating a task:

1) Collect or receive: projectIdOrKey, issueType, summary.
2) If project is not specified, ask the user for clarification.
3) Use the 'jira_project_finder' tool to obtain the exact project key.
4) With project key, USE 'jira_get_project' tool to list available issue types, priorities, labels, custom fields.
5) For assignee/reporter fields, you can use fuzzy search - specify names, emails, or partial matches. The system will automatically resolve them to exact JIRA usernames.
6) If issue is under an Epic, use 'jira_get_epics_for_project' to pick epic's issue key (epicKey).
7) IMPORTANT! DISPLAY ALL COLLECTED PARAMETERS FOR USER CONFIRMATION BEFORE CREATION.
8) Upon user confirmation, call 'jira_create_issue' with the final parameters.

Non-interactive mode:
If called by another agent (without user input), skip clarification and confirmation steps. Use available data only.`;

    // Обновляем описания полей assignee и reporter
    // @ts-ignore
    tool.inputSchema.properties.assignee.description = 'Optional. User to assign the issue to. Supports fuzzy search: exact username (vpupkun), display name ("Василий Пупкин"), or email (vpupkun@company.com)';
    // @ts-ignore
    tool.inputSchema.properties.reporter.description = 'Optional. Issue reporter. Supports fuzzy search: exact username (joe_smith), display name ("Joe Smith"), or email (joe.smith@company.com)';
  }
}

export async function createJiraCreateIssueTool (priorityNamesArray?: string[]): Promise<ToolWithHandler> {
  const result: ToolWithHandler = {
    name: 'jira_create_issue',
    description: `Create a new issue (task, bug, story, etc.) in JIRA.

# WORKFLOW

Always follow these steps when creating a task:

1) Collect or receive: projectIdOrKey, issueType, summary.
2) If project is not specified, ask the user for clarification.
3) Use the 'jira_project_finder' tool to obtain the exact project key.
4) With project key, USE 'jira_get_project' tool to list available issue types, priorities, labels, custom fields.
5) If a fuzzy search tool for users exists, use it to obtain user login; clarify at most 3 times.
6) If issue is under an Epic, use 'jira_get_epics_for_project' to pick epic's issue key (epicKey).
7) IMPORTANT! DISPLAY ALL COLLECTED PARAMETERS FOR USER CONFIRMATION BEFORE CREATION.
8) Upon user confirmation, call 'jira_create_issue' with the final parameters.

Non-interactive mode:
If called by another agent (without user input), skip clarification and confirmation steps. Use available data only.`,
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
After clarifying the project key, use 'jira_get_project' tool which returns available issue types for project`,
        },
        summary: {
          type: 'string',
          description: `A short, descriptive title for the issue.
If not indicated explicitly, form a short title according to the description`,
        },
        description: {
          type: 'string', // markdown
          description: 'Detailed description of the issue. In markdown format. For bugs, this should include steps to reproduce.',
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
          description: `Optional. Array of Labels for the issue (e.g.: ["bug", "urgent"])
The response of the 'jira_get_project' tool will contain available labels`,
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
          description: `Optional. Original time estimate ${inJiraDuration}`,
        },
        remainingEstimate: {
          type: 'string',
          description: `Optional. Remaining time estimate ${inJiraDuration}`,
        },
        customFields: {
          type: 'object',
          description: `Custom field values as key-value pairs (fieldId as key).
The response of the 'jira_get_project' tool will contain information about filling in the available custom fields`,
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

  if (priorityNamesArray?.length) {
    // @ts-ignore
    result.inputSchema.properties.priority.enum = priorityNamesArray;
  }

  return result;
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
      message: `Failed to validate project '${projectIdOrKey}'. ERROR: ${toStr(error)}`,
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
          description: stringOrADF2markdown(it.description),
          subtask: it.subtask,
        })),
      },
    };
  }

  return { valid: true };
}

/**
 * Простой поиск пользователей через микросервис
 */

async function resolveUsersSimple (
  assignee: string | undefined,
  reporter: string | undefined,
  context: ToolContext,
): Promise<{ assignee?: string; reporter?: string; warnings?: string[] }> {
  const { config, httpClient, logger } = context;

  // Если микросервис не настроен - используем прямое назначение
  if (!isUserLookupEnabled(context)) {
    const result: { assignee?: string; reporter?: string; warnings: string[] } = { warnings: [] };
    if (assignee !== undefined) {result.assignee = assignee;}
    if (reporter !== undefined) {result.reporter = reporter;}
    return result;
  }

  const warnings: string[] = [];
  const usersToResolve = [];

  if (assignee) {
    usersToResolve.push({ field: 'assignee', value: assignee });
  }
  if (reporter) {
    usersToResolve.push({ field: 'reporter', value: reporter });
  }

  if (usersToResolve.length === 0) {
    const result: { assignee?: string; reporter?: string; warnings: string[] } = { warnings };
    if (assignee !== undefined) {result.assignee = assignee;}
    if (reporter !== undefined) {result.reporter = reporter;}
    return result;
  }

  // Делаем один запрос к микросервису для всех пользователей
  const resolvedUsers: Record<string, string> = {};

  for (const user of usersToResolve) {
    try {
      logger.debug(`Resolving ${user.field}: "${user.value}"`);

      const response = await httpClient.post(
        config.userLookup!.serviceUrl,
        {
          query: user.value,
          limit: 15,
        },
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const employees = response.data || [];

      if (employees.length === 0) {
        throw new ValidationError(`Сотрудник "${user.value}" не найден в системе`);
      }

      // Исключаем уволенных
      const activeEmployees = employees.filter((emp: any) => !emp.is_fired);

      if (activeEmployees.length === 0) {
        throw new ValidationError(`Найденные сотрудники по запросу "${user.value}" уволены`);
      }

      // Ищем точное совпадение (similarity = 2)
      const exactMatches = activeEmployees.filter((emp: any) => emp.similarity === 2);
      if (exactMatches.length === 1) {
        const emp = exactMatches[0];
        resolvedUsers[user.field] = emp.username;
        if (emp.username !== user.value) {
          warnings.push(`${user.field} "${user.value}" разрешен как "${emp.username}" (${emp.person_full_name})`);
        }
        continue;
      }

      // Ищем практически точные совпадения (similarity = 1)
      const goodMatches = activeEmployees.filter((emp: any) => emp.similarity >= 1);

      if (goodMatches.length === 1) {
        const emp = goodMatches[0];
        resolvedUsers[user.field] = emp.username;
        if (emp.username !== user.value) {
          warnings.push(`${user.field} "${user.value}" разрешен как "${emp.username}" (${emp.person_full_name})`);
        }
        continue;
      }

      // Множественные результаты - ошибка выбора
      const candidates = goodMatches.length > 0 ? goodMatches : activeEmployees.slice(0, 5);

      throw new ValidationError(
        `Найдено несколько сотрудников для "${user.value}". Выберите точный вариант:`,
        {
          candidates: candidates.map((emp: any) => ({
            username: emp.username,
            displayName: emp.person_full_name,
            email: emp.email,
            department: emp.department_name,
            position: emp.position_name,
            score: emp.similarity,
            suggestion: `Используйте "${emp.username}" для точного указания`,
          })),
        },
      );

    } catch (error) {
      logger.error(`User lookup failed for ${user.field} "${user.value}": ${error}`);
      throw error instanceof ValidationError
        ? error
        : new ValidationError(`Сервис поиска пользователей недоступен: ${error}`);
    }
  }

  const result: { assignee?: string; reporter?: string; warnings: string[] } = { warnings };
  const finalAssignee = resolvedUsers.assignee || assignee;
  const finalReporter = resolvedUsers.reporter || reporter;
  if (finalAssignee !== undefined) {result.assignee = finalAssignee;}
  if (finalReporter !== undefined) {result.reporter = finalReporter;}
  return result;
}

/**
 * Handler function for creating a JIRA issue
 */
async function createIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const {
      projectIdOrKey,
      issueType,
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
    const { httpClient, config, logger, mdToADF } = context;

    logger.info(`Creating JIRA issue in project: ${projectIdOrKey} | issueType: ${issueType} | summary: ${args.summary}`);

    // Validate required fields
    if (!projectIdOrKey) {
      throw new ValidationError('Project is required');
    }
    if (!issueType) {
      throw new ValidationError('Issue type is required');
    }
    if (!args.summary) {
      throw new ValidationError('Summary is required');
    }
    const summary = trim(args.summary).substring(0, 400);

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

    // Разрешение пользователей
    let resolvedUsers: { assignee?: string; reporter?: string; warnings?: string[] };
    try {
      resolvedUsers = await resolveUsersSimple(assignee, reporter, context);
    } catch (error) {
      if (error instanceof ValidationError && error.data?.candidates) {
        // Специальная обработка неоднозначности
        const json = {
          success: false,
          operation: 'create_issue',
          error: 'USER_RESOLUTION_AMBIGUOUS',
          message: error.message,
          data: {
            availableUsers: error.data.candidates,
          },
        };
        return formatToolResult(json);
      }
      throw error; // Прочие ошибки пробрасываем дальше
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
      issueInput.fields.description = mdToADF(description);
    }
    if (resolvedUsers.assignee) {
      issueInput.fields.assignee = { name: resolvedUsers.assignee };
    }
    if (resolvedUsers.reporter) {
      issueInput.fields.reporter = { name: resolvedUsers.reporter };
    }
    if (priority) {
      const priorityNamesArray = await getPriorityNamesArray(httpClient, config);
      if (priorityNamesArray.length && !priorityNamesArray.includes(priority)) {
        throw new ValidationError(`Priority name '${priority
        }' does not match any valid priority name: ${JSON.stringify(priorityNamesArray)}.`);
      }
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
        const { normalized } = parseAndNormalizeTimeSpent(originalEstimate, 'originalEstimate');
        issueInput.fields.timetracking.originalEstimate = normalized;
      }
      if (remainingEstimate) {
        const { normalized } = parseAndNormalizeTimeSpent(remainingEstimate, 'remainingEstimate');
        issueInput.fields.timetracking.remainingEstimate = normalized;
      }
    }

    // Create the issue
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-post
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post
    const response = await httpClient.post(`${config.restPath}/issue`, issueInput);
    const createdIssue = response.data;

    const i = `project${/^\d+$/.test(projectIdOrKey) ? 'Id' : 'Key'}`;
    let message = `Issue ${createdIssue.key} created successfully in the ${i} ${projectIdOrKey}`;

    // Добавляем предупреждения о разрешении пользователей
    if (resolvedUsers.warnings?.length) {
      message += '\n\nПользователи разрешены:\n' + resolvedUsers.warnings.join('\n');
    }

    logger.info(message);

    const json = {
      success: true,
      operation: 'create_issue',
      message,
      userResolutionWarnings: resolvedUsers.warnings,
      newIssue: {
        id: createdIssue.id,
        key: createdIssue.key,
        issueUrl: `${config.origin}/browse/${createdIssue.key}`,
        summary,
        [i]: projectIdOrKey,
        created: new Date().toISOString(),
      },
    };

    return formatToolResult(json);
  });
}
