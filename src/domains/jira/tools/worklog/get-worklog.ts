/**
 * JIRA tool module: Get Worklog
 * Retrieves worklog entries for a JIRA issue
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

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
async function getWorklogHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueIdOrKey, startAt = 0, maxResults = 50 } = args;
    const { httpClient, cache, logger } = context;

    logger.info('Fetching JIRA worklog entries', { issueIdOrKey });

    // Generate cache key
    const cacheKey = generateCacheKey('jira', 'worklogs', { issueIdOrKey, startAt, maxResults });

    // Fetch from cache or API
    const worklogResult = await cache.getOrSet(cacheKey, async () => {
      const response = await httpClient.get(`/rest/api/2/issue/${issueIdOrKey}/worklog`, {
        params: { startAt, maxResults },
      });
      return response.data;
    });

    if (worklogResult.worklogs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No worklog entries found for ${issueIdOrKey}**`,
          },
        ],
      };
    }

    const worklogList = worklogResult.worklogs
      .map(
        (w: any) =>
          `• **${w.author.displayName}**: ${w.timeSpent} on ${new Date(w.started).toLocaleDateString()}\n${
            w.comment ? `  Comment: ${w.comment}\n` : ''
          }`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Worklog Entries for ${issueIdOrKey}**\n\n` +
            `**Total:** ${worklogResult.total} entries (showing ${worklogResult.worklogs.length})\n\n` +
            `${worklogList}`,
        },
      ],
    };
  });
}
