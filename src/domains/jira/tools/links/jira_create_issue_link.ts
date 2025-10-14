/**
 * JIRA tool module: Create Issue Link
 * Creates a link between two JIRA issues
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

/**
 * Tool definition for creating a JIRA issue link
 */
export const jira_create_issue_link: ToolWithHandler = {
  name: 'jira_create_issue_link',
  description: 'Create a link between two JIRA issues',
  inputSchema: {
    type: 'object',
    properties: {
      linkType: {
        type: 'string',
        description: 'Link type name (e.g., "Blocks", "Relates")',
      },
      inwardIssue: {
        type: 'string',
        description: 'ID or key of the inward issue',
      },
      outwardIssue: {
        type: 'string',
        description: 'ID or key of the outward issue',
      },
      comment: {
        type: 'string',
        description: 'Optional comment for the link',
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
  handler: createIssueLinkHandler,
};

/**
 * Handler function for creating a JIRA issue link
 */
async function createIssueLinkHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { linkType, inwardIssue, outwardIssue, comment } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Creating JIRA issue link', { linkType, inwardIssue, outwardIssue });

    // Build link data
    const linkData: any = {
      type: { name: linkType },
      inwardIssue: {
        [/^\d+$/.test(inwardIssue) ? 'id' : 'key']: inwardIssue,
      },
      outwardIssue: {
        [/^\d+$/.test(outwardIssue) ? 'id' : 'key']: outwardIssue,
      },
    };

    if (comment) {
      linkData.comment = { body: comment };
    }

    // Create the link
    await httpClient.post('/rest/api/2/issueLink', linkData);

    // Getting the newly created link from the task data
    const response = await httpClient.get(`/rest/api/2/issue/${inwardIssue}`);

    let newLink: any;
    const issuelinks = response.data.fields.issuelinks || [];
    if (issuelinks.length) {
      newLink = issuelinks.filter((link: any) => {
        return link.type?.name === linkType && link.outwardIssue?.key === outwardIssue;
      });
    }
    // Clear search cache since links may affect search results
    cache.keys()
      .filter(key => key.includes('jira:search'))
      .forEach(key => cache.del(key));

    const json = {
      success: true,
      operation: 'create_issue_link',
      message: 'Issue Link Created Successfully',
      link: {
        id: newLink[0]?.id,
        ...linkData,
        type: { name: linkType },
      },
    };

    return formatToolResult(json);
  });
}
