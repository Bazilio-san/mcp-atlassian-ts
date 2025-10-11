/**
 * JIRA tool module: Batch Get Changelogs
 * Retrieves changelogs for multiple issues (Cloud only)
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';
import { ToolWithHandler } from '../../../../types';

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

/**
 * Handler function for batch getting JIRA changelogs
 */
async function batchGetChangelogsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKeys } = args;
    const { httpClient, cache, logger, normalizeToArray } = context;

    logger.info('Batch fetching JIRA changelogs', { count: issueKeys.length });

    // Normalize to array and generate cache key
    const normalizedKeys = normalizeToArray(issueKeys);
    const cacheKey = generateCacheKey('jira', 'batch-changelogs', { issueKeys: normalizedKeys });

    // Fetch from cache or API
    const changelogs = await cache.getOrSet(cacheKey, async () => {
      // Fetch changelogs individually for each issue (works for both Server and Cloud)
      const changelogPromises = normalizedKeys.map(async (issueKey) => {
        try {
          const response = await httpClient.get(`/rest/api/2/issue/${issueKey}/changelog`);
          return {
            key: issueKey,
            changelog: response.data,
          };
        } catch (error: any) {
          logger.warn(`Failed to fetch changelog for ${issueKey}`, { error: error.message });
          return {
            key: issueKey,
            changelog: null,
            error: error.message,
          };
        }
      });

      const results = await Promise.all(changelogPromises);
      return {
        values: results.filter(r => r.changelog !== null),
        errors: results.filter(r => r.error).map(r => ({ key: r.key, error: r.error })),
      };
    });

    if (changelogs.values.length === 0) {
      let errorText = '**No changelogs found for the specified issues**';
      if (changelogs.errors && changelogs.errors.length > 0) {
        errorText += '\n\n**Errors:**\n';
        changelogs.errors.forEach((e: any) => {
          errorText += `  • ${e.key}: ${e.error}\n`;
        });
      }
      return {
        content: [
          {
            type: 'text',
            text: errorText,
          },
        ],
      };
    }

    let resultText = `**Changelogs for ${normalizedKeys.length} Issues**\n\n`;

    changelogs.values.forEach((issueChangelog: any) => {
      const issueKey = issueChangelog.key;
      const histories = issueChangelog.changelog?.values || issueChangelog.changelog?.histories || [];

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

    // Add error information if any
    if (changelogs.errors && changelogs.errors.length > 0) {
      resultText += '**Failed to retrieve changelogs for:**\n';
      changelogs.errors.forEach((e: any) => {
        resultText += `  • ${e.key}: ${e.error}\n`;
      });
    }

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
