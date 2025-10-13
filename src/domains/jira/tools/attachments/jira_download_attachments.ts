/**
 * JIRA tool module: Download Attachments
 * Retrieves metadata and download links for JIRA issue attachments
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for downloading JIRA attachments
 */
export const jira_download_attachments: ToolWithHandler = {
  name: 'jira_download_attachments',
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
    const { httpClient, logger } = context;

    logger.info('Fetching JIRA attachments', { issueIdOrKey });

    // Generate cache key

    const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}`, {
      params: { expand: 'attachment' },
    });
    const attachments = response.data.fields.attachment || [];

    if (attachments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No attachments found for issue ${issueIdOrKey}`,
          },
        ],
      };
    }

    const json = {
      success: true,
      operation: 'batch_get_changelogs',
      message: `Found ${attachments.length} attachment(s) for ${issueIdOrKey}`,
      [/^\d+$/.test(issueIdOrKey) ? 'issueId' : 'issueKey']: issueIdOrKey,
      total: attachments.length,
      attachments: attachments.map((a: any) => ({
        id: a.id,
        filename: a.filename,
        size: a.size,
        sizeKB: Math.round(a.size / 1024),
        mimeType: a.mimeType,
        created: a.created,
        downloadUrl: a.content,
        author: {
          key: a.author.key,
          name: a.author.name,
          displayName: a.author.displayName,
          emailAddress: a.author.emailAddress,
        },
      })),
    };

    return formatToolResult(json);
  });
}
