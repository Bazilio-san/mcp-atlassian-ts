/**
 * JIRA tool module: Batch Get Changelogs
 * Retrieves changelogs for multiple issues (Cloud only)
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { generateCacheKey } from '../../../../core/cache.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

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

    // Build structured JSON
    const json = {
      success: true,
      operation: 'batch_get_changelogs',
      message: changelogs.values.length
        ? `Retrieved changelogs for ${changelogs.values.length} of ${normalizedKeys.length} issue(s)`
        : 'No changelogs found for the specified issues',
      issueKeys: normalizedKeys,
      total: changelogs.values.length,
      changelogs: changelogs.values.map((issueChangelog: any) => {
        const histories = issueChangelog.changelog?.values || issueChangelog.changelog?.histories || [];
        return {
          issueKey: issueChangelog.key,
          totalChanges: histories.length,
          histories: histories.map(({ id, created, author, items }: any) => {
            return {
              id,
              created, // VVQ  convertToIsoUtc
              author: {
                key: author?.key,
                name: author?.name,
                displayName: author?.displayName,
                emailAddress: author?.emailAddress,
              },
              items: items?.map(({ field, fieldtype, from, fromString, to, toString }: any) => ({ field, fieldtype, from, fromString, to, toString })) || [],
            };
          }),
        };
      }),
      errors: changelogs.errors || [],
    };

    return formatToolResult(json);
  });
}
