/**
 * JIRA tool module: Batch Get Changelogs
 * Retrieves changelogs for multiple issues (Cloud only)
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for batch getting JIRA changelogs
 */
export const batchGetChangelogsTool: Tool = {
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
};

/**
 * Handler function for batch getting JIRA changelogs
 */
export async function batchGetChangelogsHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKeys } = args;
    const { httpClient, cache, logger, normalizeToArray } = context;

    logger.info('Batch fetching JIRA changelogs', { count: issueKeys.length });

    // Normalize to array and generate cache key
    const normalizedKeys = normalizeToArray(issueKeys);
    const cacheKey = generateCacheKey('jira', 'batch-changelogs', { issueKeys: normalizedKeys });

    // Fetch from cache or API
    const changelogs = await cache.getOrSet(cacheKey, async () => {
      // For Cloud instances, use the bulk API
      const response = await httpClient.post('/rest/api/2/issue/changelog/list', {
        issueIds: normalizedKeys,
      });
      return response.data;
    });

    if (changelogs.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No changelogs found for the specified issues**`,
          },
        ],
      };
    }

    let resultText = `**Changelogs for ${normalizedKeys.length} Issues**\n\n`;

    changelogs.values.forEach((issueChangelog: any) => {
      const issueKey = issueChangelog.key;
      const histories = issueChangelog.changelog?.histories || [];

      resultText += `**${issueKey}** (${histories.length} changes)\n`;

      if (histories.length > 0) {
        const recentChanges = histories.slice(0, 3); // Show only recent changes
        recentChanges.forEach((history: any) => {
          const author = history.author?.displayName || 'Unknown';
          const date = new Date(history.created).toLocaleDateString();
          resultText += `  • ${date} by ${author}\n`;

          history.items?.forEach((item: any) => {
            resultText += `    - ${item.field}: ${item.fromString || 'None'} → ${item.toString || 'None'}\n`;
          });
        });
      }

      resultText += '\n';
    });

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  });
}