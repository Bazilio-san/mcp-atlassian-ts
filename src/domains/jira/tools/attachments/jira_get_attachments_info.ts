/**
 * JIRA tool module: Download Attachments
 * Retrieves metadata and download links for JIRA issue attachments
 */

import type { ToolContext } from '../../../../types/tool-context';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { convertToIsoUtc, isObject } from '../../../../core/utils/tools.js';
import { jiraUserObj } from '../../shared/utils.js';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for downloading JIRA attachments
 */
export const jira_get_attachments_info: ToolWithHandler = {
  name: 'jira_get_attachments_info',
  description: 'Get metadata and download links for JIRA issue attachments',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'The issue ID (e.g., 123) or key (e.g., PROJ-123)',
      },
    },
    required: ['issueIdOrKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue attachments metadata',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: downloadAttachmentsHandler,
};

/**
 * Handler function for downloading JIRA attachments
 */
async function downloadAttachmentsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey } = args;
    const { httpClient, config, logger } = context;

    logger.info(`Fetching JIRA attachments: issueIdOrKey: ${issueIdOrKey}`);

    // Generate cache key

    // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#issue-getIssue
    // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get
    const response = await httpClient.get(`${config.restPath}/issue/${issueIdOrKey}`, {
      params: { expand: 'attachment' },
    });
    const attachments = response.data.fields.attachment || [];
    const count = attachments.length;

    const message = count
      ? `Found ${attachments.length} attachment(s) for ${issueIdOrKey}`
      : `No attachments found for ${issueIdOrKey}`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'jira_get_attachments_info',
      message,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      total: attachments.length,
      attachments: attachments.map((a: any) => {
        return isObject(a) ? {
          id: a.id,
          filename: a.filename,
          size: a.size,
          sizeKB: Math.round(a.size / 1024),
          mimeType: a.mimeType,
          created: convertToIsoUtc(a.created),
          downloadUrl: a.content,
          author: jiraUserObj(a.author),
        } : undefined;
      }).filter(Boolean),
    };

    return formatToolResult(json);
  });
}
