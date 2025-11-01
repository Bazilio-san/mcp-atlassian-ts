// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA tool module: Get Project
 * Retrieves details of a specific JIRA project
 */

import type { ToolContext } from '../../../../types/tool-context';
import { toStr } from '../../../../core/errors/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { getProjectLabels } from './search-project/labels-cache.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { getPriorityNamesArray } from '../../shared/priority-service.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from "../../../../core/errors/withErrorHandling.js";

/**
 * Tool definition for jira_get_project
 */
export const jira_get_project: ToolWithHandler = {
  name: 'jira_get_project',
  description: `Get JIRA project by key or ID.
Returns JSON:
{
 id, key, name, description, url, projectTypeKey, archived,
 issueTypes: [{id, name, description, subtask}], // issue types available for the project
 labels: string[], // available labels
 customFieldsMetadata: [{id, name, schema, allowedValues?}], // available custom fields
 customFieldsFillingRules: string // rules for filling custom fields
}
Use before issue create/update to fetch project metadata.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'The project key or ID',
      },
      // includeCustomFieldsMetadata: {
      //   type: 'boolean',
      //   description: 'If true, the response will include the customFieldsMetadata array - information about available custom fields, their types, and filling rules',
      // },
      expand: { // VVA help LLM work with this
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand (e.g. ["description", "issueTypes", "lead", "issueTypeHierarchy" ])',
        default: [],
      },
      properties: { // VVA help LLM work with this
        type: 'array',
        items: { type: 'string' },
        description: 'Project properties to include in the response',
        default: [],
      },
    },
    required: ['projectIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Get JIRA project details',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getProjectHandler,
};


interface ICustomFieldMeta {
  fieldId: string,
  name: string,
  schema: {
    type: string,
    items?: string,
  },
  required: boolean,
  hasDefaultValue: boolean,
  allowedValues: string[],
}

interface FilteredProject {
  id?: string | number;
  key?: string | undefined;
  name?: string;
  description?: string | undefined;
  projectTypeKey?: string;
  archived?: boolean;
  url?: string;
  issueTypes?: {
    id?: string;
    name?: string;
    description?: string | undefined;
    subtask?: boolean;
  }[];
  labels: string[],
  // lead?: IJiraUserOut | undefined;
  customFieldsMetadata?: ICustomFieldMeta[] | undefined,
  customFieldsFillingRules?: string | undefined,
}

const getCustomFiedsFillMemo = (apiVersion: number) => {
  const diff = apiVersion === 2
    ? `- user → "username"
- array & items=="user" → ["username1", "username2"]
- array & items=="option" → ["Opt1", "Opt2"]
- option → { value: "OptionLabel" } or { id: "OPTION_ID" }`
    : `- user → { accountId: "USER_ID" }
- array & items=="user" → [ { accountId: "USER_ID1" }, { accountId: "USER_ID2" } ]
- array & items=="option" → [ { value: "Opt1" }, { value: "Opt2" } ]
- option → { value: "OptionLabel" } or { id: "OPTION_ID" }
`;
  const fieldValueInstruct = `When creating or updating an issue, pass an object to the customFields parameter with keys and values:
{ "customfield_xxx": <value> }
Rules for filling <value> depending on the custom field type:
- string → "text"
- number → 123
- boolean → true
- date → "YYYY-MM-DD"
- datetime → "YYYY-MM-DDTHH:MM:SSZ"
- any → /* structure as per schema */
${diff}`;
  return fieldValueInstruct;
};

/**
 * Handler function for jira_get_project
 */
async function getProjectHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, config } = context;
    const { projectIdOrKey, expand, properties } = args;

    const includeCustomFieldsMetadata = true;

    logger.info(`Fetching JIRA project '${projectIdOrKey}' details | expand: ${expand} | properties: ${properties}`);

    // Build query parameters
    const params: any = {};
    if (expand?.length) {
      params.expand = normalizeToArray(expand).join(',');
    }
    if (properties?.length) {
      params.properties = normalizeToArray(properties).join(',');
    }

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'project', {
      projectIdOrKey,
      expand: normalizeToArray(expand),
      properties: normalizeToArray(properties),
    });

    // Fetch from cache or API
    const project = await cache.getOrSet(cacheKey, async () => {
      // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#project-getProject
      // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-projects/#api-rest-api-2-project-projectidorkey-get
      // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/#api-rest-api-3-project-projectidorkey-get
      const response = await httpClient.get(`${config.restPath}/project/${projectIdOrKey}`, { params });
      return response.data;
    });

    let customFieldsMetadata: ICustomFieldMeta[] | undefined;
    let customFieldsFillingRules: string | undefined;

    if (includeCustomFieldsMetadata) {
      customFieldsFillingRules = getCustomFiedsFillMemo(config.apiVersion);

      // Generate cache key
      const cacheKey = generateCacheKey('jira', 'createmeta-custom-fields', { projectKey: project.key });

      // Fetch from cache or API
      customFieldsMetadata = await cache.getOrSet(cacheKey, async () => {
        const response = await httpClient.get(`${config.restPath}/issue/createmeta`, {
          params: {
            projectKeys: projectIdOrKey,
            expand: 'projects.issuetypes.fields',
          },
        });
        const apiData = response.data;
        // const excludedFields = [
        //   'summary', 'issuetype', 'reporter', 'components', 'description', 'fixVersions',
        //   'priority', 'labels', 'attachment', 'issuelinks', 'timetracking', 'assignee', 'project'
        // ];

        const fieldsMap: any = {};
        apiData.projects[0].issuetypes.forEach((issuetype: any) => {
          Object.values(issuetype.fields).forEach((f: any) => {
            fieldsMap[f.fieldId as string] = f;
          });
        });
        const filteredFields = Object.values(fieldsMap).filter((f: any) => f.fieldId.startsWith('customfield_'));
        const clearedFields: ICustomFieldMeta[] = filteredFields.map((f: any) => {
          const { fieldId, name, schema, required, hasDefaultValue } = f;
          const o: any = { fieldId, name, schema, required, hasDefaultValue };
          if (f.allowedValues) {
            o.allowedValues = f.allowedValues.map((av: any) => {
              return av.value || av.key || av.id;
            });
          }
          o.schema = { type: f.schema.type };
          if (f.schema.items) {
            o.schema.items = f.schema.items;
          }
          return o;
        });
        return clearedFields;
      });
    }

    const i = `project ${/^\d+$/.test(projectIdOrKey) ? 'id' : 'key'}`;
    if (!project) {
      const message = `Project ${i} not found`;
      logger.info(message);

      const json = {
        found: false,
        operation: 'get_project',
        message,
      };

      return formatToolResult(json);
    }
    let priorityNames: string[] | undefined;
    try {
      priorityNames = await getPriorityNamesArray(httpClient, config);
    } catch (error) {
      logger.warn(`Failed to retrieve priority names: error: ${toStr(error)}`);
    }

    // Get project labels using cache system
    let projectLabels: string[] = [];
    if (project.key && project.id) {
      try {
        const labelsResult = await getProjectLabels(httpClient, project.key, String(project.id), context);
        projectLabels = labelsResult.labels;
      } catch (error) {
        logger.warn(`Failed to retrieve labels for project key: ${project.key} | error: ${toStr(error)}`);
      }
    }

    // Sanitize project to include only allowed fields
    const filteredProject: FilteredProject = (() => {
      const p: any = project || {};
      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: stringOrADF2markdown(p.description),
        projectTypeKey: p.projectTypeKey,
        archived: p.archived,
        url: p.url,
        issueTypes: Array.isArray(p.issueTypes)
          ? p.issueTypes.map(({ id, name, description: d, subtask }: any) => ({
            id,
            name,
            description: stringOrADF2markdown(d),
            subtask,
          }))
          : undefined,
        labels: projectLabels,
        priorityNames,
        // lead: jiraUserObj(p.lead),
        customFieldsMetadata,
        customFieldsFillingRules,
      };
    })();

    const message = `Details retrieved for project name '${filteredProject.name}', key '(${filteredProject.key}')`;
    logger.info(message);

    const json = {
      found: true,
      operation: 'get_project',
      message,
      project: filteredProject,
    };

    const res = formatToolResult(json);
    return res;
  });
}
