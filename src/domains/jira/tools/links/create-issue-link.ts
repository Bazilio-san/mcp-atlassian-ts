/**
 * JIRA tool module: Create Issue Link
 * Creates a link between two JIRA issues
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for creating a JIRA issue link
 */
export const createIssueLinkTool: Tool = {
  name: 'jira_create_issue_link',
  description: `Create a link between two JIRA issues`,
  inputSchema: {
    type: 'object',
    properties: {
      linkType: {
        type: 'string',
        description: `Link type name (e.g., "Blocks", "Relates")`,
      },
      inwardIssue: {
        type: 'string',
        description: `Key of the inward issue`,
      },
      outwardIssue: {
        type: 'string',
        description: `Key of the outward issue`,
      },
      comment: {
        type: 'string',
        description: `Optional comment for the link`,
      },
    },
    required: ['linkType', 'inwardIssue', 'outwardIssue'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Create link between two JIRA issues',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

/**
 * Handler function for creating a JIRA issue link
 */
export async function createIssueLinkHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { linkType, inwardIssue, outwardIssue, comment } = args;
    const { httpClient, cache, logger, invalidateIssueCache } = context;

    logger.info('Creating JIRA issue link', { linkType, inwardIssue, outwardIssue });

    // Build link data
    const linkData: any = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    };

    if (comment) {
      linkData.comment = { body: comment };
    }

    // Create the link
    await httpClient.post('/rest/api/2/issueLink', linkData);

    // Invalidate cache for linked issues
    invalidateIssueCache(inwardIssue);
    invalidateIssueCache(outwardIssue);

    // Clear search cache since links may affect search results
    cache.keys()
      .filter(key => key.includes('jira:search'))
      .forEach(key => cache.del(key));

    // Format response for MCP
    return {
      content: [
        {
          type: 'text',
          text:
            `**Issue Link Created Successfully**\n\n` +
            `**Link Type:** ${linkType}\n` +
            `**From:** ${inwardIssue}\n` +
            `**To:** ${outwardIssue}\n${comment ? `**Comment:** ${comment}\n` : ''}`,
        },
      ],
    };
  });
}