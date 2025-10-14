/**
 * JIRA tool module: Force Update Projects Index
 * Forces vector index update with fresh data from JIRA API
 */

import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { getJiraProjects, clearProjectsCache } from './search-project/projects-cache.js';
import { updateProjectsIndex, clearVectorIndex } from './search-project/index.js';

/**
 * Tool definition for jira_force_update_projects_index
 */
export const jira_force_update_projects_index: ToolWithHandler = {
  name: 'jira_force_update_projects_index',
  description: 'Force vector index update with fresh JIRA projects data. Clears cache and rebuilds search index.',
  inputSchema: {
    type: 'object',
    properties: {
      clearCache: {
        type: 'boolean',
        description: 'Clear projects cache before update (default: true)',
        default: true,
      },
      clearVectorIndex: {
        type: 'boolean',
        description: 'Clear vector index before rebuild (default: false)',
        default: false,
      },
    },
    required: [],
    additionalProperties: false,
  },
  annotations: {
    title: 'Force update JIRA projects search index',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: forceUpdateProjectsIndexHandler,
};

/**
 * Handler function for jira_force_update_projects_index
 */
async function forceUpdateProjectsIndexHandler (args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { clearCache = true, clearVectorIndex: clearVector = false } = args;
    const { logger } = context;

    logger.info('Force updating projects index', { clearCache, clearVector });

    const results = {
      operation: 'force_update_projects_index',
      steps: [] as string[],
      projectsCount: 0,
      success: true,
    };

    try {
      // Step 1: Clear caches if requested
      if (clearCache) {
        clearProjectsCache();
        results.steps.push('✅  Cleared projects cache');
        logger.debug('Projects cache cleared');
      }

      if (clearVector) {
        await clearVectorIndex();
        results.steps.push('✅  Cleared vector index');
        logger.debug('Vector index cleared');
      }

      // Step 2: Fetch fresh projects data
      results.steps.push('🔄  Fetching fresh projects from JIRA API...');
      const { result: projects, error } = await getJiraProjects();

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message || error}`);
      }

      if (!projects || projects.length === 0) {
        results.steps.push('⚠️  No projects found in JIRA');
        results.projectsCount = 0;

        return formatToolResult({
          ...results,
          message: 'No projects found to index',
          warning: 'JIRA returned no projects - check permissions or data',
        });
      }

      results.projectsCount = projects.length;
      results.steps.push(`✅  Fetched ${projects.length} projects from JIRA`);

      // Step 3: Force update vector index
      results.steps.push('🔄  Force updating vector index...');
      await updateProjectsIndex(projects, true); // forceUpdate = true
      results.steps.push('✅  Vector index updated successfully');

      logger.info(`Force update completed: ${projects.length} projects indexed`);

      const json = {
        ...results,
        message: `Successfully force-updated projects index with ${projects.length} projects`,
        timestamp: new Date().toISOString(),
      };

      return formatToolResult(json);

    } catch (error: any) {
      logger.error('Force update failed', error);

      results.success = false;
      results.steps.push(`❌  Error: ${error.message || error}`);

      const json = {
        ...results,
        message: `Force update failed: ${error.message || error}`,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      };

      return formatToolResult(json);
    }
  });
}
