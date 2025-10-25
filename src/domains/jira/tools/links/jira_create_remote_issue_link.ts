/**
 * JIRA tool module: Create Remote Issue Link
 * Creates a remote link from a JIRA issue to external URL
 */

import type { ToolContext } from '../../../../types/tool-context';
import { withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { trim } from '../../../../core/utils/text.js';

/**
 * Tool definition for creating a JIRA remote issue link
 */
export const jira_create_remote_issue_link: ToolWithHandler = {
  name: 'jira_create_remote_issue_link',
  description: 'Create a remote link from a JIRA issue to external URL',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
      url: {
        type: 'string',
        description: 'External URL to link to',
        format: 'url',
      },
      title: {
        type: 'string',
        description: 'Link title',
      },
      summary: {
        type: 'string',
        description: 'Link summary',
      },
      iconUrl: {
        type: 'string',
        description: 'URL to link icon',
        format: 'url',
      },
    },
    required: ['issueIdOrKey', 'url', 'title'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create remote link to external URL',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: createRemoteIssueLinkHandler,
};

/**
 * Handler function for creating a JIRA remote issue link
 */
async function createRemoteIssueLinkHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, url, summary, iconUrl } = args;
    const { httpClient, config, logger } = context;

    const title = trim(args.title).substring(0, 400);
    logger.info(`Creating JIRA remote issue link: issueIdOrKey: ${issueIdOrKey} | url: ${url} | title: ${title}`);

    // Build link data
    const linkData: any = { url, title };
    if (summary) {
      linkData.summary = trim(summary).substring(0, 400);
    }
    if (iconUrl) {
      linkData.icon = { url16x16: iconUrl, title };
    }

    // Create the remote link
    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-createOrUpdateRemoteIssueLink
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-remote-links/#api-rest-api-2-issue-issueidorkey-remotelink-post
    const response = await httpClient.post(`${config.restPath}/issue/${issueIdOrKey}/remotelink`, {
      object: linkData,
    });

    const message = `Remote link "${title}" created successfully for issue ${issueIdOrKey} (ID: ${response.data.id})`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'create_remote_issue_link',
      message,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      linkId: response.data.id,
      linkTitle: title,
      url: url,
      summary: summary || null,
      iconUrl: iconUrl || null,
      issueUrl: `${config.origin}/browse/${issueIdOrKey}`,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
