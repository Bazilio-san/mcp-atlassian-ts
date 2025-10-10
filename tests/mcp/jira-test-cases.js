/**
 * JIRA MCP Test Cases
 * Defines all test cases for JIRA MCP tools testing
 * Numbered format following pattern from tests/endpoints/jira-test-cases.js
 */

import { TEST_ISSUE_KEY, TEST_JIRA_PROJECT, TEST_ISSUE_TYPE_NAME, TEST_SECOND_ISSUE_KEY } from '../constants.js';
import { loadToolConfig, isToolEnabledByConfig } from '../../dist/src/core/config/tool-config.js';

/**
 * Test groups information for MCP tests
 */
export const MCP_GROUP_INFO = {
  1: { name: 'IssueManagement', description: 'Issue Management tools (9 tools)' },
  2: { name: 'ProjectManagement', description: 'Project Management tools (3 tools)' },
  3: { name: 'UserManagement', description: 'User Management tools (1 tool)' },
  4: { name: 'FieldsMetadata', description: 'Fields and Metadata tools (1 tool)' },
  5: { name: 'IssueLinks', description: 'Issue Links tools (4 tools)' },
  6: { name: 'Worklog', description: 'Worklog tools (2 tools)' },
  7: { name: 'Attachments', description: 'Attachments tools (1 tool)' },
  8: { name: 'AgileScrum', description: 'Agile/Scrum tools (6 tools)' },
  9: { name: 'BulkOperations', description: 'Bulk Operations tools (1 tool)' },
  10: { name: 'BatchOperations', description: 'Batch Operations tools (2 tools)' },
};

/**
 * JIRA MCP Test Cases
 * Each test case follows the pattern: {fullId}-{name}-{toolName}-{params}-{description}
 */
export class JiraMcpTestCases {
  constructor () {
    this.testProjectKey = TEST_JIRA_PROJECT || 'TEST';
    this.testIssueKey = TEST_ISSUE_KEY || 'TEST-1';
    this.secondTestIssueKey = TEST_SECOND_ISSUE_KEY || 'TEST-2';
    this.toolConfig = null;
    this.loadConfig();
  }

  /**
   * Load tool configuration from config.yaml
   */
  loadConfig () {
    try {
      this.toolConfig = loadToolConfig();
      if (this.toolConfig) {
        console.log('Tool configuration loaded from config.yaml');
      } else {
        console.log('Using default configuration (all tools enabled)');
      }
    } catch (error) {
      console.error('Failed to load tool configuration:', error.message);
      this.toolConfig = null;
    }
  }

  /**
   * Check if a test case should be included based on tool configuration
   */
  isTestCaseEnabled (testCase) {
    return isToolEnabledByConfig(testCase.toolName, this.toolConfig);
  }

  /**
   * Filter test cases based on tool configuration
   */
  filterTestCasesByConfig (testCases) {
    const filtered = testCases.filter(tc => this.isTestCaseEnabled(tc));

    if (filtered.length < testCases.length) {
      const excludedTools = testCases
        .filter(tc => !this.isTestCaseEnabled(tc))
        .map(tc => tc.toolName);
      console.log(`Filtered out ${testCases.length - filtered.length} disabled tools: ${excludedTools.join(', ')}`);
    }

    return filtered;
  }

  /**
   * Transform test case to add getters for groupNumber and testNumber
   */
  transformTestCase (testCase) {
    const transformed = Object.create(null);

    Object.keys(testCase).forEach(key => {
      if (key !== 'groupNumber' && key !== 'testNumber') {
        transformed[key] = testCase[key];
      }
    });

    Object.defineProperty(transformed, 'groupNumber', {
      get () {
        return this.fullId ? parseInt(this.fullId.split('-')[0], 10) : undefined;
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(transformed, 'testNumber', {
      get () {
        return this.fullId ? parseInt(this.fullId.split('-')[1], 10) : undefined;
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(transformed, 'category', {
      get () {
        return MCP_GROUP_INFO[this.groupNumber]?.name;
      },
      enumerable: true,
      configurable: true,
    });

    return transformed;
  }

  /**
   * Transform an array of test cases
   */
  transformTestCases (testCases) {
    return testCases.map(tc => this.transformTestCase(tc));
  }

  /**
   * Issue Management test cases (9 tools)
   */
  getIssueManagementTestCases () {
    const testCases = [
      {
        fullId: '1-1',
        name: 'Get Issue Details',
        toolName: 'jira_get_issue',
        params: { issueIdOrKey: this.testIssueKey },
        description: 'Get issue details',
      },
      {
        fullId: '1-2',
        name: 'Search Issues by JQL',
        toolName: 'jira_search_issues',
        params: { jql: `project = ${this.testProjectKey}`, maxResults: 10 },
        description: 'Search issues by JQL',
      },
      {
        fullId: '1-3',
        name: 'Create New Issue',
        toolName: 'jira_create_issue',
        params: {
          project: this.testProjectKey,
          issueType: TEST_ISSUE_TYPE_NAME,
          summary: 'MCP HTTP Test Issue',
          description: 'Created via MCP HTTP tester',
        },
        description: 'Create new issue',
      },
      {
        fullId: '1-4',
        name: 'Update Existing Issue',
        toolName: 'jira_update_issue',
        params: {
          issueIdOrKey: this.testIssueKey,
          summary: 'Updated via MCP HTTP test',
        },
        description: 'Update existing issue',
      },
      {
        fullId: '1-5',
        name: 'Add Comment to Issue',
        toolName: 'jira_add_comment',
        params: {
          issueIdOrKey: this.testIssueKey,
          body: 'Test comment from MCP HTTP tester',
        },
        description: 'Add comment to issue',
      },
      {
        fullId: '1-6',
        name: 'Get Available Transitions',
        toolName: 'jira_get_transitions',
        params: { issueIdOrKey: this.testIssueKey },
        description: 'Get available transitions',
      },
      {
        fullId: '1-7',
        name: 'Transition Issue Status',
        toolName: 'jira_transition_issue',
        params: async (client) => {
          // Сначала получаем доступные переходы для задачи
          try {
            const { result: transitionsResult } = await client.callTool('jira_get_transitions', {
              issueIdOrKey: this.testIssueKey,
            });

            // Проверяем, есть ли доступные переходы
            if (!transitionsResult || !transitionsResult.transitions || transitionsResult.transitions.length === 0) {
              console.log('  ℹ️  No transitions available for this issue');
              return null; // Пропускаем тест
            }

            // Используем первый доступный переход
            const firstTransition = transitionsResult.transitions[0];
            console.log(`  ℹ️  Using transition: ${firstTransition.name} (ID: ${firstTransition.id})`);

            return {
              issueIdOrKey: this.testIssueKey,
              transitionId: firstTransition.id,
              comment: 'Transitioned via MCP test',
            };
          } catch (error) {
            console.log(`  ⚠️  Failed to get transitions: ${error.message}`);
            return null; // Пропускаем тест
          }
        },
        description: 'Transition issue status (gets valid transition first)',
      },
      {
        fullId: '1-8',
        name: 'Delete Issue',
        toolName: 'jira_delete_issue',
        params: { issueIdOrKey: 'TEST-DELETE', deleteSubtasks: false },
        description: 'Delete issue (will fail if not exists)',
      },
      {
        fullId: '1-9',
        name: 'Batch Create Issues',
        toolName: 'jira_batch_create_issues',
        params: {
          issues: [
            {
              project: this.testProjectKey,
              issueType: TEST_ISSUE_TYPE_NAME,
              summary: 'Batch issue 1',
            },
            {
              project: this.testProjectKey,
              issueType: TEST_ISSUE_TYPE_NAME,
              summary: 'Batch issue 2',
            },
          ],
        },
        description: 'Batch create multiple issues',
      },
    ];

    return this.transformTestCases(this.filterTestCasesByConfig(testCases));
  }

  /**
   * Project Management test cases (3 tools)
   */
  getProjectManagementTestCases () {
    const testCases = [
      {
        fullId: '2-1',
        name: 'Get All Projects',
        toolName: 'jira_get_projects',
        params: { recent: 5 },
        description: 'Get all projects',
      },
      {
        fullId: '2-2',
        name: 'Get Project Versions',
        toolName: 'jira_get_project_versions',
        params: { projectKey: this.testProjectKey },
        description: 'Get project versions',
      },
      {
        fullId: '2-3',
        name: 'Create Project Version',
        toolName: 'jira_create_version',
        params: {
          projectId: '10000',
          name: `MCP-Test-v${Date.now()}`,
          description: 'Created via MCP HTTP test',
        },
        description: 'Create project version',
      },
    ];

    return this.transformTestCases(this.filterTestCasesByConfig(testCases));
  }

  /**
   * Batch Operations test cases (2 tools)
   */
  getBatchOperationsTestCases () {


    return this.transformTestCases([
      {
        fullId: '10-1',
        name: 'Batch Create Versions',
        toolName: 'jira_batch_create_versions',
        params: {
          versions: [
            {
              projectId: '10000',
              name: `Batch-v1-${Date.now()}`,
              description: 'Batch version 1',
            },
            {
              projectId: '10000',
              name: `Batch-v2-${Date.now()}`,
              description: 'Batch version 2',
            },
          ],
        },
        description: 'Batch create versions',
      },
      {
        fullId: '10-2',
        name: 'Batch Get Changelogs',
        toolName: 'jira_batch_get_changelogs',
        params: { issueKeys: [this.testIssueKey, this.secondTestIssueKey] },
        description: 'Get changelogs for multiple issues',
      },
    ]);
  }

  /**
   * User Management test cases (1 tool)
   */
  getUserManagementTestCases () {


    return this.transformTestCases([
      {
        fullId: '3-1',
        name: 'Get User Profile',
        toolName: 'jira_get_user_profile',
        params: { userIdOrEmail: '12345' },
        description: 'Get user profile',
      },
    ]);
  }

  /**
   * Fields and Metadata test cases (1 tool)
   */
  getFieldsMetadataTestCases () {


    return this.transformTestCases([
      {
        fullId: '4-1',
        name: 'Search JIRA Fields',
        toolName: 'jira_search_fields',
        params: { query: 'summary' },
        description: 'Search JIRA fields',
      },
    ]);
  }

  /**
   * Issue Links test cases (4 tools)
   */
  getIssueLinksTestCases () {


    return this.transformTestCases([
      {
        fullId: '5-1',
        name: 'Get Issue Link Types',
        toolName: 'jira_get_link_types',
        params: {},
        description: 'Get issue link types',
      },
      {
        fullId: '5-2',
        name: 'Create Issue Link',
        toolName: 'jira_create_issue_link',
        params: {
          linkType: 'Relationship',
          inwardIssue: this.testIssueKey,
          outwardIssue: this.secondTestIssueKey,
        },
        description: 'Create issue link',
      },
      {
        fullId: '5-3',
        name: 'Create Remote Issue Link',
        toolName: 'jira_create_remote_issue_link',
        params: {
          issueIdOrKey: this.testIssueKey,
          url: 'https://example.com/external-issue',
          title: 'External Issue Link',
        },
        description: 'Create remote issue link',
      },
      {
        fullId: '5-4',
        name: 'Remove Issue Link',
        toolName: 'jira_remove_issue_link',
        params: { linkId: '10000' },
        description: 'Remove issue link (will fail if not exists)',
      },
      {
        fullId: '5-5',
        name: 'Link Issue to Epic',
        toolName: 'jira_link_to_epic',
        params: {
          issueIdOrKey: this.testIssueKey,
          epicKey: this.secondTestIssueKey,
        },
        description: 'Link issue to epic',
      },
    ]);
  }

  /**
   * Worklog test cases (2 tools)
   */
  getWorklogTestCases () {


    return this.transformTestCases([
      {
        fullId: '6-1',
        name: 'Get Issue Worklogs',
        toolName: 'jira_get_worklog',
        params: { issueIdOrKey: this.testIssueKey, maxResults: 10 },
        description: 'Get issue worklogs',
      },
      {
        fullId: '6-2',
        name: 'Add Worklog Entry',
        toolName: 'jira_add_worklog',
        params: {
          issueIdOrKey: this.testIssueKey,
          timeSpent: '1h',
          comment: 'Work logged via MCP test',
        },
        description: 'Add worklog entry',
      },
    ]);
  }

  /**
   * Attachments test cases (1 tool)
   */
  getAttachmentsTestCases () {


    return this.transformTestCases([
      {
        fullId: '7-1',
        name: 'Get Issue Attachments',
        toolName: 'jira_download_attachments',
        params: { issueIdOrKey: this.testIssueKey },
        description: 'Get issue attachments',
      },
    ]);
  }

  /**
   * Agile/Scrum test cases (6 tools)
   */
  getAgileTestCases () {


    return this.transformTestCases([
      {
        fullId: '8-1',
        name: 'Get All Agile Boards',
        toolName: 'jira_get_agile_boards',
        params: { maxResults: 10 },
        description: 'Get all agile boards',
      },
      {
        fullId: '8-2',
        name: 'Get Board Issues',
        toolName: 'jira_get_board_issues',
        params: { boardId: '1', maxResults: 10 },
        description: 'Get board issues',
      },
      {
        fullId: '8-3',
        name: 'Get Board Sprints',
        toolName: 'jira_get_sprints_from_board',
        params: { boardId: '1', maxResults: 10 },
        description: 'Get board sprints',
      },
      {
        fullId: '8-4',
        name: 'Get Sprint Issues',
        toolName: 'jira_get_sprint_issues',
        params: { sprintId: '1', maxResults: 10 },
        description: 'Get sprint issues',
      },
      {
        fullId: '8-5',
        name: 'Create New Sprint',
        toolName: 'jira_create_sprint',
        params: {
          boardId: '1',
          name: `MCP Test Sprint ${Date.now()}`,
          goal: 'Test sprint creation',
        },
        description: 'Create new sprint',
      },
      {
        fullId: '8-6',
        name: 'Update Sprint',
        toolName: 'jira_update_sprint',
        params: {
          sprintId: '1',
          name: 'Updated Sprint Name',
          state: 'active',
        },
        description: 'Update sprint',
      },
    ]);
  }

  /**
   * Bulk Operations test cases (1 tool)
   */
  getBulkOperationsTestCases () {
    const testCases = [
      {
        fullId: '9-1',
        name: 'Batch Get Changelogs',
        toolName: 'jira_batch_get_changelogs',
        params: { issueKeys: [this.testIssueKey, this.secondTestIssueKey] },
        description: 'Get changelogs for multiple issues',
      },
    ];

    return this.transformTestCases(this.filterTestCasesByConfig(testCases));
  }

  /**
   * Get all test cases in a flat list
   */
  getAllTestCasesFlat () {
    return [
      ...this.getIssueManagementTestCases(),
      ...this.getProjectManagementTestCases(),
      ...this.getUserManagementTestCases(),
      ...this.getFieldsMetadataTestCases(),
      ...this.getIssueLinksTestCases(),
      ...this.getWorklogTestCases(),
      ...this.getAttachmentsTestCases(),
      ...this.getAgileTestCases(),
      ...this.getBulkOperationsTestCases(),
      ...this.getBatchOperationsTestCases(),
    ];
  }

  /**
   * Get test cases by group
   */
  getTestCasesByGroup (groupNumber) {
    const groupMethods = {
      1: () => this.getIssueManagementTestCases(),
      2: () => this.getProjectManagementTestCases(),
      3: () => this.getUserManagementTestCases(),
      4: () => this.getFieldsMetadataTestCases(),
      5: () => this.getIssueLinksTestCases(),
      6: () => this.getWorklogTestCases(),
      7: () => this.getAttachmentsTestCases(),
      8: () => this.getAgileTestCases(),
      9: () => this.getBulkOperationsTestCases(),
      10: () => this.getBatchOperationsTestCases(),
    };

    return groupMethods[groupNumber] ? groupMethods[groupNumber]() : [];
  }

  /**
   * Get test cases by full IDs
   */
  getTestCasesByIds (ids) {
    const allTestCases = this.getAllTestCasesFlat();
    return ids.map(id =>
      allTestCases.find(tc => tc.fullId === id)
    ).filter(Boolean);
  }

  /**
   * Get test cases by tool names
   */
  getTestCasesByToolNames (toolNames) {
    const allTestCases = this.getAllTestCasesFlat();
    return toolNames.map(toolName =>
      allTestCases.find(tc => tc.toolName === toolName)
    ).filter(Boolean);
  }

  /**
   * Parse filter string and return matching test cases
   * Respects tool configuration from config.yaml
   */
  parseFilterAndGetTestCases (filterString) {
    if (!filterString) {
      // Return all enabled test cases when no filter
      const allCases = this.getAllTestCasesFlat();
      const enabledCases = this.filterTestCasesByConfig(allCases);
      if (enabledCases.length < allCases.length) {
        console.log(`\nFiltered to ${enabledCases.length} enabled tools out of ${allCases.length} total`);
      }
      return enabledCases;
    }

    const allTestCases = this.getAllTestCasesFlat();
    const filters = filterString.split(',').map(f => f.trim());
    const selectedTestCases = [];

    filters.forEach(filter => {
      if (filter.includes('-')) {
        // Specific test ID like "1-3" or "8-1"
        const testCase = allTestCases.find(tc => tc.fullId === filter);
        if (testCase) selectedTestCases.push(testCase);
      } else if (filter.match(/^\d+\*?$/)) {
        // Single group number like "1" or "1*" - run all tests in group
        const groupNum = parseInt(filter.replace('*', ''));
        selectedTestCases.push(...this.getTestCasesByGroup(groupNum));
      } else {
        // Tool name
        const testCase = allTestCases.find(tc => tc.toolName === filter);
        if (testCase) selectedTestCases.push(testCase);
      }
    });

    // Apply config filter to selected test cases
    const enabledTestCases = this.filterTestCasesByConfig(selectedTestCases);

    if (enabledTestCases.length < selectedTestCases.length) {
      console.log(`\nFiltered ${selectedTestCases.length} selected tests to ${enabledTestCases.length} enabled tests`);
    }

    return enabledTestCases.length > 0 ? enabledTestCases : this.filterTestCasesByConfig(allTestCases);
  }
}

export default JiraMcpTestCases;
