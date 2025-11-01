/**
 * JIRA tool module: Get Issue
 * Retrieves detailed information about a JIRA issue by key or ID
 */

import type { ToolContext } from '../../../../types/tool-context';
import { NotFoundError } from '../../../../core/errors/errors.js';
import { IJiraIssue, ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

// Data shape returned in jiraIssue (constructed below based on fetched JIRA issue)
export interface JiraIssueStatus {
  name: string;
  description: string;
}

export interface JiraIssueProject {
  name: string;
  key: string;
}

export interface JiraIssueCommentItem {
  id: string;
  author: string;
  body: string;
  created?: string;
  url?: string;
}

export interface JiraIssueAttachmentItem {
  id: string;
  filename: string;
  author: string;
  created?: string;
  size?: number;
  mimeType?: string;
  downloadUrl?: string;
}

export interface JiraIssueSubtaskItem {
  id: string;
  key: string;
  summary: string;
  statusName?: string;
  priority: string;
  issueType?: string;
}

export interface JiraFixVersionItem {
  id: string;
  name: string;
}

export interface JiraLinkedMiniIssue {
  key: string;
  summary: string;
}

export interface JiraIssueLinkItem {
  id: string;
  type: string;
  inwardIssue?: JiraLinkedMiniIssue;
  outwardIssue?: JiraLinkedMiniIssue;
}

export interface JiraTimeTracking {
  originalEstimate: string | undefined; // Original estimate as string (e.g., "1w 2d", "3h", "45m")
  remainingEstimate: string | undefined; // Remaining estimate as string
  timeSpent: string | undefined; // Time spent as string
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: JiraIssueStatus;
  assignee: string;
  reporter: string;
  created?: string;
  updated?: string;
  priority: string;
  issueType: string;
  issueUrl: string;
  project: JiraIssueProject;
  labels: string[];
  description: string;
  // Additional fields requested by the caller (if any)
  fields?: Record<string, unknown>;

  // Optional enrichments, present only when available
  commentsCount?: number;
  lastComments?: JiraIssueCommentItem[];

  attachmentsCount?: number;
  attachments?: JiraIssueAttachmentItem[];

  subtasks?: JiraIssueSubtaskItem[];
  fixVersions?: JiraFixVersionItem[];

  // Keep as unknown to pass through whatever Jira provides
  timetracking?: JiraTimeTracking;

  issueLinks?: JiraIssueLinkItem[];
}

/**
 * Tool definition for getting a JIRA issue
 */
export const jira_get_issue: ToolWithHandler = {
  name: 'jira_get_issue',
  description: `Get detailed information about a JIRA issue by key or ID.
Returns: 
key, summary, status, assignee, reporter, timestamps, priority, issue type, issue URL, project info, labels, description, 
and when available: 
- up to 10 recent comments
- attachments
- subtasks
- fix versions
- timetracking
- issue links`,
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: `
Issue ID or key can be used to uniquely identify an existing issue.
Issue ID is a numerical identifier (e.g. 123).
Issue key is formatted as <project key>-<id> (e.g. ISSUE-123).
An example issue key is ISSUE-1.`,
      },
      expand: { // VVQ formalize?
        type: 'array',
        items: { type: 'string' },
        description: `Additional fields to expand. e.g.: ["changelog", "transitions"]
        renderedFields Returns field values rendered in HTML format.
names Returns the display name of each field.
schema Returns the schema describing a field type.
transitions Returns all possible transitions for the issue.
editmeta Returns information about how each field can be edited.
changelog Returns a list of recent updates to an issue, sorted by date, starting from the most recent.
versionedRepresentations Returns a JSON array for each version of a field's value, with the highest number representing the most recent version. Note: When included in the request, the fields parameter is ignored
        
        
        `,
        default: [],
      },
      fields: { // VVQ formalize?
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return. e.g.: ["summary", "status", "assignee"]',
        default: [],
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getIssueHandler,
};

/**
 * Handler function for getting a JIRA issue
 */
async function getIssueHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Fetching JIRA issue ${issueIdOrKey}`);

    const expandArray = args.expand && normalizeToArray(args.expand);
    const fieldsArray = args.fields && normalizeToArray(args.fields);

    // Fetch from API
    const params: any = {};
    if (expandArray?.length) {
      params.expand = expandArray.join(',');
    }

    const mandatoryFields = ['summary', 'status', 'assignee', 'reporter', 'created', 'updated', 'priority', 'issuetype', 'project', 'labels', 'description'];

    let additionalFields: string[] = [];
    if (fieldsArray?.length) {
      additionalFields = fieldsArray.filter((f: string) => !mandatoryFields.includes(f));
      params.fields = fieldsArray.join(',');
    }

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}`, { params });
    const issue = response.data as IJiraIssue;

    if (!issue) {
      throw new NotFoundError('Issue', issueIdOrKey);
    }

    const fields = issue.fields || {};
    const jiraIssue: JiraIssue = {
      key: issue.key,
      summary: fields.summary || '',
      status: {
        name: fields.status?.name || 'Unknown',
        description: stringOrADF2markdown(fields.status?.description || ''),
      },
      assignee: fields.assignee?.displayName || 'Unassigned',
      reporter: fields.reporter?.displayName || 'Unknown',
      created: convertToIsoUtc(fields.created),
      updated: convertToIsoUtc(fields.updated),
      priority: fields.priority?.name || 'None',
      issueType: fields.issuetype?.name || 'Unknown',
      issueUrl: `${config.origin}/browse/${issue.key}`,
      project: {
        name: fields.project?.name || 'Unknown',
        key: fields.project?.key || 'Unknown',
      },
      labels: fields.labels || [],
      description: stringOrADF2markdown(fields.description || ''),
      fields: additionalFields.length ? additionalFields.reduce((a, fieldName) => {
        a[fieldName] = fields[fieldName];
        return a;
      }, {} as any) : undefined,
    };
    const json = {
      success: true,
      operation: 'get_issue',
      jiraIssue,
    };

    const { comment, attachment, subtasks, fixVersions, timetracking, issuelinks } = fields;

    if (comment?.comments?.length) {
      jiraIssue.commentsCount = comment?.total || 0;
      jiraIssue.lastComments = comment.comments
        .filter(isObject)
        .sort((a: any, b: any) => {
          return new Date(b.updated).getTime() - new Date(a.updated).getTime();
        })
        .slice(0, 10)
        .map((c: any) => {
          return {
            id: c.id,
            author: c.author?.displayName || 'Unknown',
            body: stringOrADF2markdown(c.body), // VVT ADF
            created: convertToIsoUtc(c.created),
            url: c.self,
          };
        });
    }
    if (attachment?.length) {
      jiraIssue.attachmentsCount = attachment?.length || 0;
      jiraIssue.attachments = attachment
        .filter(isObject)
        .map((a: any) => {
          return {
            id: a.id,
            filename: a.filename,
            author: a.author?.displayName || 'Unknown',
            created: convertToIsoUtc(a.created),
            size: a.size,
            mimeType: a.mimeType,
            downloadUrl: a.content,
          };
        });
    }

    if (subtasks?.length) {
      jiraIssue.subtasks = subtasks
        .filter(isObject)
        .map((s: any) => {
          const f = s.fields;
          return {
            id: s.id,
            key: s.key,
            summary: f.summary,
            statusName: f.status?.name || undefined,
            priority: f.priority?.name || 'None',
            issueType: f.issuetype?.name || undefined,
          };
        });
    }

    if (fixVersions?.length) {
      jiraIssue.fixVersions = fixVersions
        .filter(isObject)
        .map(({ id, name }: any) => ({ id, name }));
    }

    if (timetracking) {
      jiraIssue.timetracking = {
        originalEstimate: timetracking.originalEstimate,
        remainingEstimate: timetracking.remainingEstimate,
        timeSpent: timetracking.timeSpent,
       };
    }

    // Add issue links if present
    if (issuelinks?.length) {
      jiraIssue.issueLinks = issuelinks
        .filter(isObject)
        .map((link: any) => {
          const { inwardIssue, outwardIssue } = link;
          return {
            id: link.id,
            type: link.type?.name || 'Unknown',
            inwardIssue: isObject(inwardIssue) ? {
              key: inwardIssue.key,
              summary: inwardIssue.fields?.summary || '',
            } : undefined,
            outwardIssue: isObject(outwardIssue) ? {
              key: outwardIssue.key,
              summary: outwardIssue.fields?.summary || '',
            } : undefined,
          };
        });
    }

    logger.info(`Return JIRA issue ${issue.key}`);

    return formatToolResult(json);
  });
}
