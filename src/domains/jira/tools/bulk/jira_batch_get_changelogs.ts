// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA tool module: Batch Get Changelogs
 * Retrieves changelogs for multiple issues (Cloud only)
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc } from '../../../../core/utils/tools.js';
import { normalizeToArray } from '../../../../core/utils/tools.js';
import { jiraUserObj } from '../../shared/utils.js';

/**
 * Tool definition for batch getting JIRA changelogs
 */
export const jira_batch_get_changelogs: ToolWithHandler = {
  name: 'jira_batch_get_changelogs',
  description: 'Get changelogs for multiple issues (Cloud only)',
  inputSchema: {
    type: 'object',
    properties: {
      issueKeys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of issue keys',
      },
    },
    required: ['issueKeys'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve changelogs for multiple issues',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: batchGetChangelogsHandler,
};

interface JiraChangelogItem {
  field: string;
  fieldtype: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

interface JiraHistory {
  id: string;
  author: {
    name: string;
    key: string;
    displayName: string;
    active: boolean;
    emailAddress?: string;
  };
  created: string; // ISO (UTC)
  items: JiraChangelogItem[];
}

interface JiraIssueWithChangelog {
  issueId: string;
  issueKey: string;
  changelog: {
    startAt: number;
    maxResults: number;
    total: number;
    histories: JiraHistory[];
  };
}

interface JiraIssueWithError {
  issueKey: string;
  changelog: null;
  error: string,
}

/**
 * Handler function for batch getting JIRA changelogs
 */
async function batchGetChangelogsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKeys } = args;
    const { httpClient, logger, config } = context;

    logger.info(`Batch fetching JIRA changelogs: count: ${issueKeys.length}`);

    // Normalize to array
    const normalizedKeys = normalizeToArray(issueKeys);

    const fn = async (issueKey: string): Promise<JiraIssueWithChangelog | JiraIssueWithError> => {
      try {
        logger.debug(`Direct changelog endpoint not supported for ${issueKey}, trying fallback`);
        // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
        // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
        const { data } = await httpClient.get(`${config.restPath}/issue/${issueKey}?expand=changelog`) || {};
        const { changelog } = data || {};
        const { startAt, maxResults, total, histories = [] } = changelog || {};
        const issueWithChangelog: JiraIssueWithChangelog = {
          issueId: data.id,
          issueKey,
          changelog: {
            startAt,
            maxResults,
            total,
            histories: histories.map((h: any) => {
              const { id, created, items = [] } = h;
              return {
                id,
                created: convertToIsoUtc(created),
                author: jiraUserObj(h.author),
                items,
              };
            }),
          },
        };
        return issueWithChangelog;
      } catch (err: any) {
        logger.warn(`Failed to fetch changelog for ${issueKey} using fallback: error: ${err.message}`);
        return {
          issueKey,
          changelog: null,
          error: err.message,
        };
      }
    };

    const changelogPromises = normalizedKeys.map(fn);

    const results = await Promise.all(changelogPromises);
    const changelogs = results.filter(r => r.changelog !== null);
    const errors = results.filter(r => r.changelog === null);
    const total = normalizedKeys.length;

    const message = changelogs.length
      ? `Retrieved changelogs for ${changelogs.length} of ${total} issue(s)`
      : 'No changelogs found for the specified issues';
    logger.info(message);

    // Build structured JSON
    const json = {
      success: true,
      operation: 'batch_get_changelogs',
      message,
      issueKeys: normalizedKeys,
      total,
      changelogs,
      errors: errors.length ? errors : undefined,
    };

    return formatToolResult(json);
  });
}
