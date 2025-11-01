/**
 * JIRA tool module: Delete Version
 * Deletes a version from a JIRA project using removeAndSwap API
 */

import type { ToolContext } from '../../../../types/tool-context';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { ToolWithHandler } from '../../../../types';
import { withErrorHandling } from '../../../../core/errors/withErrorHandling.js';

/**
 * Tool definition for jira_delete_version
 */
export const jira_delete_version: ToolWithHandler = {
  name: 'jira_delete_version',
  description: 'Delete a version from a JIRA project. Issues assigned to this version can be moved to another version or unassigned.',
  inputSchema: {
    type: 'object',
    properties: {
      versionId: {
        type: 'string',
        description: 'The ID of the version to delete',
      },
      moveFixIssuesTo: {
        type: 'string',
        description: 'The ID of the version to move issues with fix version set to the deleted version. If not specified, issues will be unassigned.',
      },
      moveAffectedIssuesTo: {
        type: 'string',
        description: 'The ID of the version to move issues with affected version set to the deleted version. If not specified, issues will be unassigned.',
      },
    },
    required: ['versionId'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Delete project version',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: deleteVersionHandler,
};

/**
 * Handler function for jira_delete_version
 */
async function deleteVersionHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, logger, config } = context;
    const { versionId, moveFixIssuesTo, moveAffectedIssuesTo } = args;

    logger.info(`Deleting JIRA version id: ${versionId} | moveFixIssuesTo: ${moveFixIssuesTo} | moveAffectedIssuesTo: ${moveAffectedIssuesTo}`);

    // Build the request body for removeAndSwap
    const requestBody: any = {};

    if (moveFixIssuesTo) {
      requestBody.moveFixIssuesTo = moveFixIssuesTo;
    }

    if (moveAffectedIssuesTo) {
      requestBody.moveAffectedIssuesTo = moveAffectedIssuesTo;
    }

    // Delete the version using removeAndSwap API
    const response = await httpClient.post(`${config.restPath}/version/${versionId}/removeAndSwap`, requestBody);

    // Invalidate project versions cache
    cache.keys().filter(key => key.includes('versions')).forEach(key => cache.del(key));

    const message = `Version ${versionId} deleted successfully`;
    logger.info(message);

    const json = {
      success: true,
      operation: 'delete_version',
      message,
      versionId,
      moveFixIssuesTo: moveFixIssuesTo || null,
      moveAffectedIssuesTo: moveAffectedIssuesTo || null,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
    };

    return formatToolResult(json);
  });
}
