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
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';

const logger = createLogger('jira:find-project');

// Initialize vector search on module load
let vectorSearchInitialized = false;

// Set the update index function to avoid circular dependencies
setUpdateProjectsIndexFunction(updateProjectsIndex);

const removeScore = ({ name, key }: any) => ({ name, key });

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
Returns exact projects names and keys similar to search.
Use this tool to verify the correct project key when working with AI Agent tools that require the project key as a parameter.`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The project name (or part of it) to search for. Use "*" to get all projects.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
        minimum: 1,
        maximum: 500,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },

  async handler ({ query, limit = 50 }: { query: string; limit?: number }, _context: ToolContext) {
    const json = await handler({ query, limit });
    json.matches = json.matches.map(removeScore);
    return formatToolResult(json);
  },
};

async function handler ({ query, limit = 50 }: { query: string; limit?: number }) {
  try {
    // Initialize vector search on first use
    if (!vectorSearchInitialized) {
      await initializeVectorSearch();
      vectorSearchInitialized = true;

      // ВСЕГДА загружаем свежие данные из JIRA API для корректного поиска
      const { result: projects } = await getJiraProjects();
      if (projects?.length) {
        if (isVectorSearchAvailable()) {
          // Если векторный поиск доступен - обновляем полный индекс
          await updateProjectsIndex(projects, true); // Force update on init
          logger.debug(`Initial vector index created with ${projects.length} projects`);
        } else {
          // Если векторный поиск НЕ доступен - все равно загружаем данные для точного поиска
          const { updateProjectsCacheForFallback } = await import('./search-project/index.js');
          await updateProjectsCacheForFallback(projects);
          logger.debug(`Fallback project cache created with ${projects.length} projects`);
        }
      }
    }

    // Check if we need to refresh the data (every 10 minutes)
    if (shouldUpdateIndex()) {
      logger.debug('Project data needs refresh, updating...');
      const { result: projects } = await getJiraProjects();
      if (projects?.length) {
        if (isVectorSearchAvailable()) {
          // Обновляем векторный индекс
          await updateProjectsIndex(projects);
        } else {
          // Обновляем fallback кеш
          const { updateProjectsCacheForFallback } = await import('./search-project/index.js');
          await updateProjectsCacheForFallback(projects);
        }
      }
    } else {
      const timeToUpdate = getTimeToNextUpdate();
      if (timeToUpdate > 0) {
        logger.debug(`Next project data update in ${timeToUpdate} seconds`);
      }
    }

    // Check if vector search is available
    if (isVectorSearchAvailable()) {
      logger.debug(`Using vector search for query: "${query}"`);

      // Use vector search
      const results = await searchProjects(query, limit);

      return {
        message: results.length
          ? `Found ${results.length} project(s) matching "${query}"`
          : `No projects found matching "${query}"`,
        matches: results,
      };

    } else {
      // Fallback to simple search if vector search is not available
      logger.debug('Vector search not available, using fallback search');

      // Проверяем актуальность кеша для fallback поиска
      const { searchProjects: fallbackSearch } = await import('./search-project/index.js');

      try {
        // Пытаемся использовать кешированные данные для fallback поиска
        const cachedResults = await fallbackSearch(query, limit);
        if (cachedResults.length > 0) {
          logger.debug(`Using cached project data for fallback search (${cachedResults.length} results)`);

          return {
            message: `Found ${cachedResults.length} project(s) matching "${query}"`,
            matches: cachedResults,
          };
        } else {
          logger.debug('No cached results, fetching fresh data from JIRA API');
        }
      } catch {
        logger.debug('Fallback search failed, falling back to JIRA API direct search');
      }

      // Если кеш пуст или поиск не удался, загружаем данные напрямую из JIRA API
      logger.debug('Loading fresh project data from JIRA API for fallback search');
      const { result: projects } = await getJiraProjects();

      if (!projects?.length) {
        logger.warn('No projects received from JIRA API');
        return {
          message: 'No projects available in JIRA or failed to fetch',
          matches: [],
        };
      }

      logger.debug(`Loaded ${projects.length} projects from JIRA API for direct search`);

      if (!query || query === '*') {
        // Return all projects
        const sortedProjects = projects
          .sort((a, b) => a.key.localeCompare(b.key))
          .slice(0, limit);

        return {
          message: `Showing ${sortedProjects.length} of ${projects.length} total projects`,
          matches: sortedProjects,
        };
      }

      // Simple substring search
      const normalizedQuery = query.toLowerCase();
      const matches = projects.filter(project =>
        project.key.toLowerCase().includes(normalizedQuery) ||
        project.name.toLowerCase().includes(normalizedQuery),
      ).slice(0, limit);

      return {
        message: matches.length
          ? `Found ${matches.length} project(s) matching "${query}"`
          : `No projects found matching "${query}" (searched ${projects.length} projects)`,
        matches,
      };
    }
  } catch (error) {
    logger.error('Error in jira_find_project', error as Error);
    throw error;
  }
}
