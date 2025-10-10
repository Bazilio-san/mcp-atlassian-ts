/**
 * JIRA tool module: Batch Create Versions
 * Creates multiple versions in JIRA projects in batch
 */

import type { ToolWithHandler } from '../../types/tool-with-handler.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';

/**
 * Tool definition for jira_batch_create_versions
 */
export const jira_batch_create_versions: ToolWithHandler = {
  name: 'jira_batch_create_versions',
  description: `Create multiple versions in JIRA projects in batch`,
  inputSchema: {
    type: 'object',
    properties: {
      versions: {
        type: 'array',
        description: 'Array of version objects to create',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the version to create',
            },
            projectId: {
              type: 'string',
              description: 'Project ID or key where the version will be created',
            },
            description: {
              type: 'string',
              description: 'Optional description for the version',
            },
            releaseDate: {
              type: 'string',
              description: 'Optional release date in YYYY-MM-DD format',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            },
            startDate: {
              type: 'string',
              description: 'Optional start date in YYYY-MM-DD format',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            },
            archived: {
              type: 'boolean',
              description: 'Whether the version should be archived',
              default: false,
            },
            released: {
              type: 'boolean',
              description: 'Whether the version should be marked as released',
              default: false,
            },
          },
          required: ['name', 'projectId'],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ['versions'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Batch create project versions',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: batchCreateVersionsHandler,
};

/**
 * Handler function for jira_batch_create_versions
 */
async function batchCreateVersionsHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;
    const { versions } = args;

    logger.info('Batch creating JIRA versions', { count: versions.length });

    const results: any[] = [];

    // Process each version sequentially to handle dependencies and errors properly
    for (const version of versions) {
      try {
        const response = await httpClient.post('/rest/api/2/version', version);
        results.push(response.data);
        logger.debug('Successfully created version', { name: version.name, id: response.data.id });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn('Failed to create version', { version: version.name, error: err.message });
        results.push({ error: err.message, version: version.name });
      }
    }

    // Invalidate all project versions cache
    cache.keys().filter(key => key.includes('versions')).forEach(key => cache.del(key));

    const successResults = results.filter(r => !r.error);
    const errorResults = results.filter(r => r.error);

    let resultText =
      `**Batch Version Creation Results**\n\n` +
      `**Total Versions:** ${versions.length}\n` +
      `**Successfully Created:** ${successResults.length}\n` +
      `**Errors:** ${errorResults.length}\n\n`;

    if (successResults.length > 0) {
      resultText += `**Created Versions:**\n`;
      successResults.forEach((version: any) => {
        resultText += `• **${version.name}** (ID: ${version.id})\n`;
      });
    }

    if (errorResults.length > 0) {
      resultText += `\n**Errors:**\n`;
      errorResults.forEach((error: any) => {
        resultText += `• **${error.version}**: ${error.error}\n`;
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
