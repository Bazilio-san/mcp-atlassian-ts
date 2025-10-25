import type { ToolContext } from '../../../../types/tool-context';
import { ToolWithHandler } from '../../../../types';
import { formatToolResult } from '../../../../core/utils/formatToolResult.js';
import { searchProjects } from './search-project/text-search.js';
import { withErrorHandling } from '../../../../core/errors.js';

const removeScore = ({ name, key }: any) => ({ name, key });

/**
 * Tool for finding JIRA projects by name using semantic projects search
 * Supports:
 * - Exact matching
 * - Fuzzy search
 * - Transliteration (RU↔EN)
 * - Wildcard search (*)
 */
export const jira_project_finder: ToolWithHandler = {
  name: 'jira_project_finder',
  description: `Searches Jira projects by fuzzy search.
Returns exact projects names and keys similar to search.
Use this tool to verify the correct project key when working with AI Agent tools that require the project key as a parameter.`,
  annotations: {
    title: 'Find JIRA project by name',
  },
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
  handler: findProjectHandler,
};

async function findProjectHandler (args: any, context: ToolContext) {
  const { limit = 50 } = args as { query: string; limit?: number };
  const { httpClient, config, logger } = context;
  const { restPath } = config;
  const query = args.query || '*';
  return withErrorHandling(async () => {
    const matches = await searchProjects(query, limit, httpClient, restPath);
    const projects = matches.map(removeScore);

    const count = projects.length;
    const message = count
      ? `Found ${count} project(s) matching "${query}"`
      : `No projects found matching "${query}")`;
    logger.info(message);

    const json = {
      found: !!count,
      operation: 'find_project',
      message,
      projects,
    };

    return formatToolResult(json);
  });
}
