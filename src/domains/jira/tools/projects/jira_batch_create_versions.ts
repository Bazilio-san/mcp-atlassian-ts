/**
 * JIRA tool module: Batch Create Versions
 * Creates multiple versions in JIRA projects in batch
 */

import type { ToolContext } from '../../../../types/tool-context';
import { eh, withErrorHandling } from '../../../../core/errors.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { stringOrADF2markdown } from '../../shared/utils.js';
import { getVersionData } from './_validate-version-params.js';

/**
 * Tool definition for jira_batch_create_versions
 */
export const jira_batch_create_versions: ToolWithHandler = {
  name: 'jira_batch_create_versions',
  description: 'Create multiple versions in JIRA projects in batch',
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
            projectId: { // VVA не задействовано
              type: 'number',
              description: 'Project ID where the version will be created',
            },
            description: { // VVA не задействовано
              type: 'string',
              description: 'Optional description for the version',
            },
            releaseDate: { // VVA не задействовано
              type: 'string',
              description: 'Optional release date in YYYY-MM-DD format',
              format: 'date',
            },
            startDate: { // VVA не задействовано
              type: 'string',
              description: 'Optional start date in YYYY-MM-DD format',
              format: 'date',
            },
            archived: { // VVA не задействовано
              type: 'boolean',
              description: 'Whether the version should be archived',
              default: false,
            },
            released: { // VVA не задействовано
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
async function batchCreateVersionsHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, config } = context;
    const { versions } = args;

    logger.info(`Batch creating ${versions.length} JIRA versions`);
    const results: any[] = [];

    // Process each version sequentially to handle dependencies and errors properly
    for (const versionData of versions) {
      const version = getVersionData(versionData);
      const { name } = version;
      try {
        // https://docs.atlassian.com/software/jira/docs/api/REST/8.13.20/#version-createVersion
        // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-project-versions/#api-rest-api-2-version-post
        const response = await httpClient.post(`${config.restPath}/version`, version);
        results.push(response.data);
        logger.debug(`Successfully created version: name: ${name} | id: ${response.data.id}`);
      } catch (err) {
        const error = eh(err);
        logger.warn(`Failed to create version: version: ${name} | error: ${error.message}`);
        results.push({ error: error.message, version: name });
      }
    }

    // Invalidate all project versions cache
    cache.keys().filter(key => key.includes('versions')).forEach(key => cache.del(key));

    const successResults = results.filter(r => !r.error);
    const errorResults = results.filter(r => r.error);

    const message = `Batch created ${successResults.length}/${versions.length
    } versions${errorResults.length > 0 ? ` (${errorResults.length} errors)` : ''}`;

    logger.info(message);

    const json = {
      operation: 'batch_create_versions',
      message,
      total: versions.length,
      successful: successResults.length,
      errors: errorResults.length,
      createdVersions: successResults.map((version: any) => ({
        id: version.id,
        name: version.name,
        projectId: version.projectId,
        description: stringOrADF2markdown(version.description) || null,
        archived: version.archived || false,
        released: version.released || false,
      })),
      failedVersions: errorResults.map((error: any) => ({
        name: error.version,
        error: error.error,
      })),
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
