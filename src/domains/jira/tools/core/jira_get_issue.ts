/**
 * JIRA tool module: Get Issue
 * Retrieves detailed information about a JIRA issue by key or ID
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';

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
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand. e.g.: ["changelog", "transitions"]',
        default: [],
      },
      fields: {
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
    logger.info('Fetching JIRA issue', { issueIdOrKey });

    const expandArray = args.expand && normalizeToArray(args.expand);
    const fieldsArray = args.fields && normalizeToArray(args.fields);

    // Fetch from API
    const params: any = {};
    if (expandArray?.length) {
      params.expand = expandArray.join(',');
    }
    if (fieldsArray?.length) {
      params.fields = fieldsArray.join(',');
    }

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}`, { params });
    const issue = response.data;

    if (!issue) {
      throw new NotFoundError('Issue', issueIdOrKey);
    }
    const fields = issue.fields || {};
    const jiraIssue: any = {
      key: issue.key,
      summary: fields.summary || '',
      status: {
        name: fields.status?.name || 'Unknown',
        description: fields.status?.description || '',
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
      description: fields.description || '',
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
            body: c.body,
            created: convertToIsoUtc(c.created),
            url: c.self,
          };
        });
    }
    if (attachment?.length) {
      jiraIssue.attachmentsCount = attachment?.total || 0;
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
      jiraIssue.timetracking = timetracking;
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

    return formatToolResult(json);
  });
}
