/**
 * JIRA tool module: Create Remote Issue Link
 * Creates a remote link from a JIRA issue to external URL
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for creating a JIRA remote issue link
 */
export const jira_create_remote_issue_link: ToolWithHandler = {
  name: 'jira_create_remote_issue_link',
  description: `Create a remote link from a JIRA issue to external URL`,
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: `The issue ID (e.g., 123) or key (e.g., PROJ-123)`,
      },
      url: {
        type: 'string',
        description: `External URL to link to`,
      },
      title: {
        type: 'string',
        description: `Link title`,
      },
      summary: {
        type: 'string',
        description: `Link summary`,
      },
      iconUrl: {
        type: 'string',
        description: `URL to link icon`,
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
async function createRemoteIssueLinkHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, url, title, summary, iconUrl } = args;
    const { httpClient, config, logger, invalidateIssueCache } = context;

    logger.info('Creating JIRA remote issue link', { issueIdOrKey, url, title });

    // Build link data
    const linkData: any = { url, title };
    if (summary) linkData.summary = summary;
    if (iconUrl) linkData.icon = { url16x16: iconUrl, title };

    // Create the remote link
    const response = await httpClient.post(`/rest/api/2/issue/${issueIdOrKey}/remotelink`, {
      object: linkData,
    });

    // Invalidate cache for the linked issue
    invalidateIssueCache(issueIdOrKey);

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**Remote Issue Link Created Successfully**\n\n` +
            `**Issue:** ${issueIdOrKey}\n` +
            `**Link Title:** ${title}\n` +
            `**URL:** ${url}\n` +
            `**Link ID:** ${response.data.id}\n` +
            `\n**Direct Link:** ${config.url}/browse/${issueIdOrKey}`,
        },
      ],
    };
  });
}
