/**
 * JIRA tool module: Get Issue
 * Retrieves detailed information about a JIRA issue by key or ID
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
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
    if (expandArray?.length) {params.expand = expandArray.join(',');}
    if (fieldsArray?.length) {params.fields = fieldsArray.join(',');}

    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}`, { params });
    const issue = response.data;

    if (!issue) {
      throw new NotFoundError('Issue', issueIdOrKey);
    }
    const fields = issue.fields;
    const jiraIssue: any = {
      key: issue.key,
      summary: fields.summary,
      status: {
        name: fields.status.name,
        description: fields.status.description,
      },
      assignee: fields.assignee?.displayName || 'Unassigned',
      reporter: fields.reporter.displayName,
      created: convertToIsoUtc(fields.created),
      updated: convertToIsoUtc(fields.updated),
      priority: fields.priority?.name || 'None',
      issueType: fields.issuetype.name,
      issueUrl: `${config.origin}/browse/${issue.key}`,
      project: {
        name: fields.project.name,
        key: fields.project.key,
      },
      labels: fields.labels || [],
      description: fields.description || '',
    };
    const json = {
      success: true,
      operation: 'get_issue',
      jiraIssue
    };

    if (fields.comment?.comments?.length) {
      jiraIssue.commentsCount = fields.comment?.total || 0;
      jiraIssue.lastComments = fields.comment.comments.sort((a: any, b: any) => {
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      }).slice(0, 10).map((c: any) => {
        return {
          id: c.id,
          author: c.author.displayName,
          body: c.body,
          created: convertToIsoUtc(c.created),
          url: c.self,
        };
      });
    }

    if (fields.attachment?.length) {
      jiraIssue.attachmentsCount = fields.attachment?.total || 0;
      jiraIssue.attachments = fields.attachment.map((a: any) => {
        return {
          id: a.id,
          filename: a.filename,
          author: a.author.displayName,
          created: convertToIsoUtc(a.created),
          size: a.size,
          mimeType: a.mimeType,
          downloadUrl: a.content,
        };
      });
    }

    if (fields.subtasks?.length) {
      jiraIssue.subtasks = fields.subtasks.map((s: any) => {
        const f = s.fields;
        return {
          id: s.id,
          key: s.key,
          summary: f.summary,
          statusName: f.status?.name,
          priority: f.priority?.name || 'None',
          issueType: f.issuetype?.name,
        };
      });
    }
    if (fields.fixVersions) {
      jiraIssue.fixVersions = fields.fixVersions.map((v: any) => {
        return {
          id: v.id,
          name: v.name,
        };
      });
    }
    if (fields.timetracking) {
      jiraIssue.timetracking = fields.timetracking;
    }

    // Add issue links if present
    if (fields.issuelinks?.length) {
      jiraIssue.issueLinks = fields.issuelinks.map((link: any) => {
        return {
          id: link.id,
          type: link.type?.name || 'Unknown',
          inwardIssue: link.inwardIssue ? {
            key: link.inwardIssue.key,
            summary: link.inwardIssue.fields?.summary || '',
          } : undefined,
          outwardIssue: link.outwardIssue ? {
            key: link.outwardIssue.key,
            summary: link.outwardIssue.fields?.summary || '',
          } : undefined,
        };
      });
    }

    return formatToolResult(json);
  });
}
