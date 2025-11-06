/**
 * JIRA tool module: Get Worklog
 * Retrieves worklog entries for a JIRA issue
 */

import type { ToolContext } from '../../../../types/tool-context';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for getting JIRA worklog entries
 */
export const jira_get_worklog: ToolWithHandler = {
  name: 'jira_get_worklog',
  description: 'Get worklog entries for a JIRA issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      startAt: {
        type: 'number',
        description: 'Starting index',
        default: 0,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum results to return',
        default: 50,
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue worklog entries',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: getWorklogHandler,
};

/**
 * Handler function for getting JIRA worklog entries
 */
async function getWorklogHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, startAt = 0, maxResults = 50 } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Fetching JIRA worklog entries: issueIdOrKey: ${issueIdOrKey}`);

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getWorklog
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-worklogs/#api-rest-api-2-issue-issueidorkey-worklog-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}/worklog`, {
      params: { startAt, maxResults },
    });
    const { worklogs_ = [], total = 0 } = response.data || {};
    const worklogs = worklogs_.filter(isObject);

    const showing = worklogs.length;
    const i = `issue${/^\d+$/.test(issueIdOrKey) ? 'Id' : 'Key'}`;

    const message = showing
      ? `Found ${total} worklog entries for ${i} ${issueIdOrKey} (showing ${showing})`
      : `No worklog entries found for ${i} ${issueIdOrKey}`;

    logger.info(message);

    const json = {
      success: true,
      operation: 'get_worklog',
      message,
      worklogs: worklogs.map((w: any) => {
        // VVA что есть кроме accountId?
        const { accountId, displayName, emailAddress } = w.author || {};
        const author = accountId || displayName || emailAddress ? { accountId, displayName, emailAddress } : undefined;
        return {
          id: w.id,
          timeSpent: w.timeSpent,
          timeSpentSeconds: w.timeSpentSeconds,
          comment: stringOrADF2markdown(w.comment) || undefined,
          started: convertToIsoUtc(w.started),
          created: convertToIsoUtc(w.created),
          updated: convertToIsoUtc(w.updated),
          author,
          visibility: w.visibility || undefined,
        };
      }),
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
