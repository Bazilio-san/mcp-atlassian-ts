// noinspection UnnecessaryLocalVariableJS

/**
 * Confluence MCP Test Cases
 * Defines all test cases for Confluence MCP tools testing
 * Numbered format following pattern from JIRA test cases
 */

import chalk from 'chalk';
import {
  TEST_CONFLUENCE_SPACE,
  TEST_CONFLUENCE_USERNAME,
} from '../constants.js';
import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { appConfig } from '../../dist/src/bootstrap/init-config.js';

export const getJsonFromResult = (result) => {
  if (appConfig.toolAnswerAs === 'structuredContent') {
    return result?.result?.structuredContent || result?.structuredContent;
  } else {
    const text = result?.result?.content?.[0]?.text || result?.content?.[0]?.text || '';
    try {
      return JSON.parse(text);
    } catch {
      //
    }
  }
  return undefined;
};

// Tool config functions adapted for new config structure
function loadToolConfig () {
  try {
    const configPath = path.resolve(process.cwd(), 'config.yaml');
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configFile);
    return config;
  } catch (error) {
    console.error('Failed to load config.yaml:', error);
    return null;
  }
}

function isToolEnabled (toolName) {
  const config = loadToolConfig();
  if (!config) {return true;} // Default to enabled if no config

  const confluenceConfig = config.confluence;
  if (!confluenceConfig) {return true;}

  const usedInstruments = confluenceConfig.usedInstruments;
  if (!usedInstruments) {return true;}

  // Check if tool is included
  if (usedInstruments.include && usedInstruments.include !== 'ALL') {
    return usedInstruments.include.includes(toolName);
  }

  // Check if tool is excluded
  if (usedInstruments.exclude) {
    return !usedInstruments.exclude.includes(toolName);
  }

  return true;
}

/**
 * Confluence MCP Test Cases Manager
 */
export class ConfluenceMcpTestCases {
  constructor () {
    this.testCases = this.initializeTestCases();
  }

  /**
   * Initialize all test cases organized by groups
   */
  initializeTestCases () {
    const testCases = [];

    // Group 1: Content Management (6 tools)
    testCases.push(
      {
        id: '1-1',
        toolName: 'confluence_get_page',
        description: 'Get page by ID',
        enabled: isToolEnabled('confluence_get_page'),
        params: null, // Requires actual page ID
      },
      {
        id: '1-2',
        toolName: 'confluence_search',
        description: 'Search content using CQL',
        enabled: isToolEnabled('confluence_search'),
        params: {
          cql: `space = "${TEST_CONFLUENCE_SPACE}" AND type = page`,
          limit: 10,
        },
      },
      {
        id: '1-3',
        toolName: 'confluence_create_page',
        description: 'Create new page',
        enabled: isToolEnabled('confluence_create_page'),
        params: async (client) => {
          try {
            // Get space info first to ensure it exists
            const { result } = await client.callTool('confluence_get_spaces', {
              type: 'global',
              status: 'current',
              limit: 1,
            });

            const spacesData = getJsonFromResult(result);
            if (!spacesData?.results?.length) {
              console.log(chalk.yellow('No spaces found for page creation test'));
              return null;
            }

            return {
              spaceKey: TEST_CONFLUENCE_SPACE,
              title: `MCP Test Page ${Date.now()}`,
              body: `<h1>Test Page Content</h1><p>This is a test page created by MCP Confluence tester at ${new Date().toISOString()}</p>`,
              labels: ['mcp-test', 'automated-test'],
            };
          } catch (error) {
            console.log(chalk.yellow(`Could not prepare page creation test: ${error.message}`));
            return null;
          }
        },
        cleanup: async (client, result) => {
          // Extract page ID from result for cleanup
          const responseData = getJsonFromResult(result.response);
          if (responseData?.pageId) {
            try {
              await client.callTool('confluence_delete_page', {
                pageId: responseData.pageId,
              });
            } catch (error) {
              console.log(chalk.yellow(`Cleanup failed: ${error.message}`));
            }
          }
        },
      },
      {
        id: '1-4',
        toolName: 'confluence_update_page',
        description: 'Update existing page',
        enabled: isToolEnabled('confluence_update_page'),
        params: null, // Requires actual page ID and version
      },
      {
        id: '1-5',
        toolName: 'confluence_get_page_by_title',
        description: 'Get page by title',
        enabled: isToolEnabled('confluence_get_page_by_title'),
        params: {
          spaceKey: TEST_CONFLUENCE_SPACE,
          title: 'Home',
        },
      },
      {
        id: '1-6',
        toolName: 'confluence_delete_page',
        description: 'Delete page',
        enabled: isToolEnabled('confluence_delete_page'),
        params: null, // Requires actual page ID
      }
    );

    // Group 2: Space Management (3 tools)
    testCases.push(
      {
        id: '2-1',
        toolName: 'confluence_get_spaces',
        description: 'Get all spaces',
        enabled: isToolEnabled('confluence_get_spaces'),
        params: {
          type: 'global',
          status: 'current',
          limit: 25,
        },
      },
      {
        id: '2-2',
        toolName: 'confluence_get_space',
        description: 'Get specific space details',
        enabled: isToolEnabled('confluence_get_space'),
        params: {
          spaceKey: TEST_CONFLUENCE_SPACE,
          expand: ['description', 'homepage'],
        },
      },
      {
        id: '2-3',
        toolName: 'confluence_get_space_content',
        description: 'Get content from space',
        enabled: isToolEnabled('confluence_get_space_content'),
        params: {
          spaceKey: TEST_CONFLUENCE_SPACE,
          type: 'page',
          status: 'current',
          limit: 10,
        },
      }
    );

    // Group 3: Comments (2 tools)
    testCases.push(
      {
        id: '3-1',
        toolName: 'confluence_add_comment',
        description: 'Add comment to page',
        enabled: isToolEnabled('confluence_add_comment'),
        params: null, // Requires actual page ID
      },
      {
        id: '3-2',
        toolName: 'confluence_get_comments',
        description: 'Get page comments',
        enabled: isToolEnabled('confluence_get_comments'),
        params: {
          pageId: 1, // Will likely fail unless page exists, but tests the API structure
          location: 'footer',
          limit: 10,
        },
      }
    );

    // Group 4: Labels (3 tools)
    testCases.push(
      {
        id: '4-1',
        toolName: 'confluence_add_label',
        description: 'Add label to page',
        enabled: isToolEnabled('confluence_add_label'),
        params: null, // Requires actual page ID
      },
      {
        id: '4-2',
        toolName: 'confluence_get_labels',
        description: 'Get page labels',
        enabled: isToolEnabled('confluence_get_labels'),
        params: {
          pageId: 1, // Will likely fail unless page exists, but tests the API structure
          prefix: 'global',
          limit: 25,
        },
      },
      {
        id: '4-3',
        toolName: 'confluence_get_pages_by_label',
        description: 'Find pages by label',
        enabled: isToolEnabled('confluence_get_pages_by_label'),
        params: {
          label: 'documentation',
          spaceKey: TEST_CONFLUENCE_SPACE,
          limit: 10,
        },
      }
    );

    // Group 5: Hierarchy (1 tool)
    testCases.push(
      {
        id: '5-1',
        toolName: 'confluence_get_page_children',
        description: 'Get child pages',
        enabled: isToolEnabled('confluence_get_page_children'),
        params: {
          pageId: 1, // Will likely fail unless page exists, but tests the API structure
          expand: ['version'],
          limit: 25,
        },
      }
    );

    // Group 6: History (1 tool)
    testCases.push(
      {
        id: '6-1',
        toolName: 'confluence_get_page_history',
        description: 'Get page version history',
        enabled: isToolEnabled('confluence_get_page_history'),
        params: {
          pageId: 1, // Will likely fail unless page exists, but tests the API structure
          expand: ['lastUpdated', 'previousVersion'],
        },
      }
    );

    // Group 7: Users (1 tool)
    testCases.push(
      {
        id: '7-1',
        toolName: 'confluence_search_user',
        description: 'Search for users',
        enabled: isToolEnabled('confluence_search_user'),
        params: {
          query: TEST_CONFLUENCE_USERNAME || 'admin',
          maxResults: 10,
        },
      }
    );

    return testCases;
  }

  /**
   * Parse filter and get matching test cases
   */
  parseFilterAndGetTestCases (filter) {
    if (!filter) {
      return this.testCases.filter(testCase => testCase.enabled);
    }

    // Handle different filter formats
    if (filter.includes('-')) {
      // Specific test: "1-1" or "1-1,1-2,2-1"
      const specificTests = filter.split(',').map(f => f.trim());
      return this.testCases.filter(testCase =>
        testCase.enabled && specificTests.includes(testCase.id)
      );
    } else if (/^\d+$/.test(filter)) {
      // Group: "1" or "3"
      const group = filter;
      return this.testCases.filter(testCase =>
        testCase.enabled && testCase.id.startsWith(`${group}-`)
      );
    } else {
      // Tool name: "confluence_get_page"
      return this.testCases.filter(testCase =>
        testCase.enabled && testCase.toolName === filter
      );
    }
  }

  /**
   * Get test statistics
   */
  getTestStats () {
    const enabledTests = this.testCases.filter(testCase => testCase.enabled);
    const disabledTests = this.testCases.filter(testCase => !testCase.enabled);

    const groups = {};
    this.testCases.forEach(testCase => {
      const group = testCase.id.split('-')[0];
      if (!groups[group]) {
        groups[group] = { total: 0, enabled: 0, disabled: 0 };
      }
      groups[group].total++;
      if (testCase.enabled) {
        groups[group].enabled++;
      } else {
        groups[group].disabled++;
      }
    });

    return {
      total: this.testCases.length,
      enabled: enabledTests.length,
      disabled: disabledTests.length,
      groups,
    };
  }

  /**
   * List all available tools
   */
  listAvailableTools () {
    const tools = [...new Set(this.testCases.map(testCase => testCase.toolName))];
    return tools.sort();
  }

  /**
   * Print test statistics
   */
  printTestStats () {
    const stats = this.getTestStats();

    console.log(chalk.bold.cyan('Confluence MCP Test Cases Statistics'));
    console.log(chalk.cyan(`Total test cases: ${stats.total}`));
    console.log(chalk.green(`Enabled: ${stats.enabled}`));
    console.log(chalk.red(`Disabled: ${stats.disabled}`));
    console.log();

    console.log(chalk.bold.yellow('Test Groups:'));
    Object.entries(stats.groups).forEach(([group, counts]) => {
      const groupName = this.getGroupName(group);
      console.log(chalk.white(`  ${group}: ${groupName}`));
      console.log(chalk.dim(`    Total: ${counts.total}, Enabled: ${chalk.green(counts.enabled)}, Disabled: ${chalk.red(counts.disabled)}`));
    });
    console.log();

    console.log(chalk.bold.yellow('Available Tools:'));
    this.listAvailableTools().forEach(tool => {
      const enabled = isToolEnabled(tool);
      console.log(`${enabled ? chalk.green('✓') : chalk.red('✗')} ${tool}`);
    });
  }

  /**
   * Get group name by ID
   */
  getGroupName (groupId) {
    const groupNames = {
      '1': 'Content Management',
      '2': 'Space Management',
      '3': 'Comments',
      '4': 'Labels',
      '5': 'Hierarchy',
      '6': 'History',
      '7': 'Users',
    };
    return groupNames[groupId] || `Group ${groupId}`;
  }
}

// Export utilities
export { isToolEnabled, loadToolConfig };