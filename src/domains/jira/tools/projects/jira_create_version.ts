/**
 * JIRA tool module: Create Version
 * Creates a new version in a JIRA project
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';

/**
 * Tool definition for jira_create_version
 */
export const jira_create_version: ToolWithHandler = {
  name: 'jira_create_version',
  description: 'Create a new version in a JIRA project',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the version to create',
      },
      projectId: {
        type: 'number',
        description: 'Project ID where the version will be created',
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
  annotations: {
    title: 'Create project version',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: createVersionHandler,
};

/**
 * Handler function for jira_create_version
 */
async function createVersionHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger } = context;
    const versionData = args;

    logger.info('Creating JIRA version', { name: versionData.name, projectId: versionData.projectId });

    // Create the version
    const response = await httpClient.post('/rest/api/2/version', versionData);
    const version = response.data;

    // Invalidate project versions cache
    cache.keys().filter(key => key.includes('versions')).forEach(key => cache.del(key));

    const json = {
      success: true,
      operation: 'create_version',
      message: `Version "${version.name}" created successfully (ID: ${version.id})`,
      version: {
        id: version.id,
        name: version.name,
        projectId: versionData.projectId,
        description: versionData.description || null,
        releaseDate: versionData.releaseDate || null,
        startDate: versionData.startDate || null,
        archived: versionData.archived || false,
        released: versionData.released || false,
      },
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
