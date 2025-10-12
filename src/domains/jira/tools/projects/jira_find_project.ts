import { createLogger } from '../../../../core/utils/logger.js';
import {
  initializeVectorSearch,
  searchProjects,
  isVectorSearchAvailable,
  updateProjectsIndex,
  shouldUpdateIndex,
  getTimeToNextUpdate,
} from './search-project/index.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { getJiraProjects, setUpdateProjectsIndexFunction } from './search-project/projects-cache.js';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult';

const logger = createLogger('jira:find-project');

// Initialize vector search on module load
let vectorSearchInitialized = false;

// Set the update index function to avoid circular dependencies
setUpdateProjectsIndexFunction(updateProjectsIndex);


/**
 * Tool for finding JIRA projects by name using semantic vector search
 * Supports:
 * - Exact matching
 * - Fuzzy search
 * - Transliteration (RU↔EN)
 * - Wildcard search (*)
 */
export const jira_find_project: ToolWithHandler = {
  name: 'jira_find_project',
  description: `Searches Jira projects by name or key (including typos) via semantic search. 
Returns projects with issue types
`,

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The project name (or part of it) to search for. Use "*" to get all projects.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        minimum: 1,
        maximum: 50,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },

  async handler ({ query, limit = 5 }: { query: string; limit?: number }, context: ToolContext) {
    try {
      // Initialize vector search on first use
      if (!vectorSearchInitialized) {
        await initializeVectorSearch();
        vectorSearchInitialized = true;

        // If vector search is available, update the index (force update on first init)
        if (isVectorSearchAvailable()) {
          const { result: projects } = await getJiraProjects(context.httpClient);
          if (projects && projects.length > 0) {
            // Convert to the format expected by vector search
            const projectsForIndex = projects.map(({ key, name, issueTypes }) => ({ key, name, issueTypes }));
            await updateProjectsIndex(projectsForIndex, true); // Force update on init
            logger.debug(`Initial vector index created with ${projects.length} projects`);
          }
        }
      }

      // Check if we need to refresh the index (every 10 minutes)
      if (isVectorSearchAvailable() && shouldUpdateIndex()) {
        logger.debug('Vector index needs refresh, updating...');
        const { result: projects } = await getJiraProjects(context.httpClient);
        if (projects && projects.length > 0) {
          const projectsForIndex = projects.map(({ key, name, issueTypes }) => ({ key, name, issueTypes }));
          await updateProjectsIndex(projectsForIndex);
        }
      } else if (isVectorSearchAvailable()) {
        const timeToUpdate = getTimeToNextUpdate();
        if (timeToUpdate > 0) {
          logger.debug(`Next vector index update in ${timeToUpdate} seconds`);
        }
      }

      // Check if vector search is available
      if (isVectorSearchAvailable()) {
        logger.debug(`Using vector search for query: "${query}"`);

        // Use vector search
        const results = await searchProjects(query, limit);

        if (results.length === 0) {
          const json = {
            message: `No projects found matching "${query}"`,
            matches: [],
          };

          return formatToolResult(json);
        }
        const json = {
          message: `Found ${results.length} project(s) matching "${query}"`,
          matches: results.map(({ key, name, score, issueTypes }) => ({ key, name, score, issueTypes })),
        };
        return formatToolResult(json);
      } else {
        // Fallback to simple search if vector search is not available
        logger.debug('Vector search not available, using simple search');

        const { result: projects } = await getJiraProjects(context.httpClient);

        if (!query || query === '*') {
          // Return all projects
          const sortedProjects = projects
            .sort((a, b) => a.key.localeCompare(b.key))
            .slice(0, limit);

          return formatToolResult({
            message: `Showing ${sortedProjects.length} of ${projects.length} total projects`,
            matches: sortedProjects.map(({ key, name, issueTypes }) => ({ key, name, issueTypes })),
          });
        }

        // Simple substring search
        const normalizedQuery = query.toLowerCase();
        const matches = projects.filter(project =>
          project.key.toLowerCase().includes(normalizedQuery) ||
          project.name.toLowerCase().includes(normalizedQuery),
        );

        const limitedMatches = matches.slice(0, limit);

        if (limitedMatches.length === 0) {
          return formatToolResult({
            message: `No projects found matching "${query}"`,
            matches: [],
          });
        }
        const json = {
          message: `Found ${limitedMatches.length} project(s) matching "${query}" (simple search)`,
          matches: limitedMatches.map(p => ({
            key: p.key,
            name: p.name,
            issueTypes: p.issueTypes,
          })),
        };
        return formatToolResult(json);
      }
    } catch (error) {
      logger.error('Error in jira_find_project', error as Error);
      throw error;
    }
  },
};
