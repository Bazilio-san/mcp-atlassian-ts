// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA MCP Test Cases
 * Defines all test cases for JIRA MCP tools testing
 * Numbered format following pattern from tests/endpoints/jira-test-cases.js
 */

import chalk from 'chalk';
import {
  TEST_ISSUE_KEY,
  TEST_JIRA_PROJECT,
  TEST_ISSUE_TYPE_NAME,
  TEST_SECOND_ISSUE_KEY,
  TEST_USERNAME,
  TEST_EPIC_ISSUE_KEY,
  JIRA_EPIC_LINK_FIELD_ID,
  TEST_ISSUE_LINK_TYPE,
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

function isToolEnabledByConfig (toolName, config) {
  if (!config) {return true;} // Default to enabled if no config

  // Determine service from tool name
  const service = toolName.startsWith('jira_') ? 'jira' :
    toolName.startsWith('confluence_') ? 'confluence' : null;

  if (!service || !config[service]) {return true;}

  const usedInstruments = config[service].usedInstruments;
  if (!usedInstruments) {return true;}

  // Check if tool is in include list
  if (usedInstruments.include === 'ALL') {
    // Check if tool is excluded
    return !usedInstruments.exclude?.includes(toolName);
  } else if (Array.isArray(usedInstruments.include)) {
    // Tool must be explicitly included
    return usedInstruments.include.includes(toolName);
  }

  return true; // Default to enabled
}

/**
 * Test groups information for MCP tests
 */
export const MCP_GROUP_INFO = {
  1: { name: 'IssueManagement', description: 'Issue Management tools (14 tools)' },
  2: { name: 'ProjectManagement', description: 'Project Management tools (7 tools)' },
  3: { name: 'UserManagement', description: 'User Management tools (1 tool)' },
  4: { name: 'FieldsMetadata', description: 'Fields and Metadata tools (1 tool)' },
  5: { name: 'IssueLinks', description: 'Issue Links tools (4 tools)' },
  6: { name: 'Worklog', description: 'Worklog tools (2 tools)' },
  7: { name: 'Attachments', description: 'Attachments tools (1 tool)' },
  8: { name: 'AgileScrum', description: 'Agile/Scrum tools (6 tools)' },
  9: { name: 'BulkOperations', description: 'Bulk Operations tools (1 tool)' },
  10: { name: 'BatchOperations', description: 'Batch Operations tools (2 tools)' },
};

const getProjectId = async (client) => {
  const { result } = await client.callTool('jira_get_project', { projectIdOrKey: TEST_JIRA_PROJECT });
  const data = getJsonFromResult(result);
  const projectId = Number(data?.project?.id);
  if (!projectId) {
    throw new Error(`⚠️  Failed to get id for project ${TEST_JIRA_PROJECT}`);
  }
  return projectId;
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
    this.testEpicIssueKey = TEST_EPIC_ISSUE_KEY || 'TEST-3';
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
        params: {
          issueIdOrKey: this.testIssueKey,
          fields: [
            'summary', 'status', 'assignee', 'reporter', 'priority',
            'issuetype', 'project', 'labels', 'description', 'customfield_10040',
          ],
        },
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
          projectIdOrKey: this.testProjectKey,
          issueType: TEST_ISSUE_TYPE_NAME,
          summary: 'MCP HTTP Test Issue',
          description: '# Test issue\n\nCreated via **MCP HTTP** tester',
        },
        description: 'Create new issue',
      },
      {
        fullId: '1-4',
        name: 'Update Existing Issue',
        toolName: 'jira_update_issue',
        params: {
          issueIdOrKey: this.testIssueKey,
          summary: `Updated via MCP HTTP test at ${new Date().toISOString()}`,
          // customFields: { 'customfield_10040': [{ 'Impediment': true }] },
        },
        description: 'Update existing issue',
      },
      {
        fullId: '1-5',
        name: 'Add Comment to Issue',
        toolName: 'jira_add_comment',
        params: {
          issueIdOrKey: this.testIssueKey,
          body: '# Test comment\n\nfrom **MCP** HTTP tester',
        },
        description: 'Add comment to issue',
      },
      {
        fullId: '1-12',
        name: 'Get All Issue Comments',
        toolName: 'jira_get_comments',
        params: {
          issueIdOrKey: this.testIssueKey,
          maxResults: 50,
          orderBy: 'created',
        },
        description: 'Get all comments for an issue',
      },
      {
        fullId: '1-13',
        name: 'Update Issue Comment',
        toolName: 'jira_update_comment',
        params: async (client) => {
          // First get all comments to find one to update
          console.log('  ℹ️  Getting existing comments to find one to update...');
          const commentsResult = await client.callTool('jira_get_comments', {
            issueIdOrKey: this.testIssueKey,
            maxResults: 50,
          });

          const commentsData = getJsonFromResult(commentsResult);
          let commentId;

          if (commentsData?.comments?.length > 0) {
            // Use the first existing comment
            commentId = commentsData.comments[0].id;
            console.log(`  ℹ️  Found ${commentsData.comments.length} existing comments, updating comment ID: ${commentId}`);
          } else {
            // Create a new comment to update
            console.log('  ℹ️  No existing comments found, creating a new comment for update test...');
            const createResult = await client.callTool('jira_add_comment', {
              issueIdOrKey: this.testIssueKey,
              body: '# Initial comment\n\nfor **update** test',
            });

            const createData = getJsonFromResult(createResult);
            commentId = createData?.comment?.id;

            if (!commentId) {
              throw new Error('  ❌  Failed to create comment for update test');
            }
            console.log(`  ℹ️  Created new comment ID: ${commentId} for update test`);
          }

          return {
            issueIdOrKey: this.testIssueKey,
            commentId,
            body: `# Updated comment body\n\n- **${new Date().toISOString()}**`,
          };
        },
        description: 'Update existing comment (creates comment first if needed)',
      },
      {
        fullId: '1-14',
        name: 'Delete Issue Comment',
        toolName: 'jira_delete_comment',
        params: async (client) => {
          // First get all comments to find one to delete
          console.log('  ℹ️  Getting existing comments to find one to delete...');
          const commentsResult = await client.callTool('jira_get_comments', {
            issueIdOrKey: this.testIssueKey,
            maxResults: 50,
            orderBy: 'created',
          });

          const commentsData = getJsonFromResult(commentsResult);
          let commentId;

          if (commentsData?.comments?.length > 1) {
            // Use the first comment (keeping the last one)
            commentId = commentsData.comments[0].id;
            console.log(`  ℹ️  Found ${commentsData.comments.length} existing comments, deleting comment ID: ${commentId}`);
          } else {
            // Create a new comment to delete
            console.log('  ℹ️  Not enough comments found, creating a new comment for deletion test...');
            const createResult = await client.callTool('jira_add_comment', {
              issueIdOrKey: this.testIssueKey,
              body: `# Temporary comment\n\nfor **deletion** test - ${Date.now()}`,
            });

            const createData = getJsonFromResult(createResult);
            commentId = createData?.comment?.id;

            if (!commentId) {
              throw new Error('  ❌  Failed to create comment for deletion test');
            }
            console.log(`  ℹ️  Created temporary comment ID: ${commentId} for deletion test`);
          }

          return {
            issueIdOrKey: this.testIssueKey,
            commentId,
          };
        },
        description: 'Delete existing comment (creates comment first if needed)',
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
          const result = await client.callTool('jira_get_transitions', {
            issueIdOrKey: this.testIssueKey,
          });

          const { transitions } = getJsonFromResult(result);
          // Проверяем, есть ли доступные переходы
          if (!transitions?.length) {
            throw new Error('  ❌  No transitions available for this issue');
          }
          // Используем случайный доступный переход
          const randomIndex = Math.floor(Math.random() * transitions.length);
          const chosenTransition = transitions[randomIndex];
          console.log(`  ℹ️  Using transition: ${chosenTransition.name} (ID: ${chosenTransition.id})`);

          return {
            issueIdOrKey: this.testIssueKey,
            transitionId: chosenTransition.id,
            comment: '# Transitioned\n\nvia **MCP** test',
          };
        },
        description: 'Transition issue status (gets valid transition first)',
      },
      {
        fullId: '1-8',
        name: 'Delete Issue',
        toolName: 'jira_delete_issue',
        params: async (client) => {
          // First create a temporary issue to delete
          console.log('  ℹ️  Creating temporary issue for deletion test...');
          const createResult = await client.callTool('jira_create_issue', {
            projectIdOrKey: TEST_JIRA_PROJECT || 'TEST',
            issueType: TEST_ISSUE_TYPE_NAME,
            summary: `Temp issue for delete test - ${Date.now()}`,
            description: '# Temp issue\n\nThis issue will be **deleted immediately**',
          });
          const json = getJsonFromResult(createResult);

          const tmpIssueKey = json?.newIssue?.key;
          if (!tmpIssueKey) {
            throw new Error('  ❌  Failed to create temporary issue for deletion test');
          }

          console.log(`  ℹ️  Delete just created issue: ${tmpIssueKey}`);

          return {
            issueIdOrKey: tmpIssueKey,
            deleteSubtasks: false,
          };
        },
        description: 'Delete issue (creates temp issue first)',
      },
      {
        fullId: '1-9',
        name: 'Batch Create Issues',
        toolName: 'jira_batch_create_issues',
        params: {
          issues: [
            {
              projectIdOrKey: this.testProjectKey,
              issueType: TEST_ISSUE_TYPE_NAME,
              summary: 'Batch issue 1',
            },
            {
              projectIdOrKey: this.testProjectKey,
              issueType: TEST_ISSUE_TYPE_NAME,
              summary: 'Batch issue 2',
            },
          ],
        },
        description: 'Batch create multiple issues',
      },
      {
        fullId: '1-10',
        name: 'Find Epics in Project',
        toolName: 'jira_get_epics_for_project',
        params: {
          projectKey: this.testProjectKey,
          includeCompleted: false,
          maxResults: 10,
        },
        description: 'Find epics in project',
      },
      {
        fullId: '1-11',
        name: 'Link Issue to Epic',
        toolName: 'jira_link_to_epic',
        params: {
          issueIdOrKey: this.testIssueKey,
          epicKey: this.testEpicIssueKey,
        },
        description: 'Link issue to epic',
        cleanup: async (client, result) => {
          // Remove issue from epic after test
          if (result && result.status === 'passed') {
            try {
              // Use update issue to remove epic link
              await client.callTool('jira_update_issue', {
                issueIdOrKey: this.testIssueKey,
                fields: {
                  // Set epic link to null to remove it
                  [JIRA_EPIC_LINK_FIELD_ID]: null,
                },
              });
              console.log(`  ℹ️  Cleanup: Removing issue ${this.testIssueKey} from epic ${this.testEpicIssueKey}`);
            } catch (cleanupError) {
              console.log(chalk.yellow(`    Cleanup warning: Could not remove issue from epic: ${cleanupError.message}`));
            }
          }
        },
      },
    ];

    return this.transformTestCases(this.filterTestCasesByConfig(testCases));
  }

  /**
   * Project Management test cases (5 tools)
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
        name: 'Get Project Details',
        toolName: 'jira_get_project',
        params: { projectIdOrKey: this.testProjectKey },
        description: 'Get specific project details',
      },
      {
        fullId: '2-3',
        name: 'Get Project Versions',
        toolName: 'jira_get_project_versions',
        params: { projectIdOrKey: this.testProjectKey },
        description: 'Get project versions',
      },
      {
        fullId: '2-4',
        name: 'Find Project by Name',
        toolName: 'jira_project_finder',
        params: { query: 'аитех', limit: 5 },
        description: 'Find project using semantic search',
      },
      {
        fullId: '2-5',
        name: 'Create Project Version',
        toolName: 'jira_create_project_version',
        params: async (client) => {
          const projectId = await getProjectId(client);
          console.log(`  ℹ️  Using project ID: ${projectId}`);
          return {
            projectId, // Используем ID проекта
            name: `MCP-Test-v${Date.now()}`,
            description: '# Test version\n\nCreated via **MCP HTTP** test',
            releaseDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // YYYY-MM-DD
          };
        },
        description: 'Create project version',
      },
      {
        fullId: '2-6',
        name: 'Delete Project Version',
        toolName: 'jira_delete_version',
        params: async (client) => {
          // First create a temporary version to delete
          console.log('  ℹ️  Creating temporary version for deletion test...');
          const projectId = await getProjectId(client);

          const createResult = await client.callTool('jira_create_project_version', {
            projectId,
            name: `DeleteTest-v${Date.now()}`,
            description: '# Temporary version\n\nfor **deletion** test',
          });

          const createData = getJsonFromResult(createResult);
          const versionId = createData?.version?.id;

          if (!versionId) {
            throw new Error('  ❌  Failed to create temporary version for deletion test');
          }

          console.log(`  ℹ️  Created temporary version ID: ${versionId} for deletion test`);

          return {
            versionId: versionId.toString(),
          };
        },
        description: 'Delete project version (creates temp version first)',
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
        params: async (client) => {
          const projectId = await getProjectId(client);
          console.log(`  ℹ️  Using project ID: ${projectId}`);
          return {
            versions: [
              {
                projectId,
                name: `Batch-v1-${Date.now()}`,
                description: '# Batch version 1\n\n**foo**',
              },
              {
                projectId,
                name: `Batch-v2-${Date.now()}`,
                description: '# Batch version 2\n\n**boo**',
              },
            ],
          };
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
        params: { login: TEST_USERNAME },
        description: 'Get user profile',
      },
    ]);
  }

  /**
   * Fields and Metadata test cases (2 tools)
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
      {
        fullId: '4-2',
        name: 'Get JIRA Priorities',
        toolName: 'jira_get_priorities',
        params: {},
        description: 'Get all available JIRA priorities',
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
          linkType: TEST_ISSUE_LINK_TYPE,
          inwardIssue: this.testIssueKey,
          outwardIssue: this.secondTestIssueKey,
          comment: `Test link ${new Date().toISOString()}`,
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
        params: async (client) => {
          console.log('  ℹ️  Checking for existing issue links...');

          // First, get the issue with links
          const issueResult = await client.callTool('jira_get_issue', {
            issueIdOrKey: this.testIssueKey,
          });

          const issueData = getJsonFromResult(issueResult);
          const existingLinks = issueData?.jiraIssue?.issueLinks || [];

          let linkId;

          if (existingLinks.length) {
            // Use the first existing link
            linkId = existingLinks[0].id;
            console.log(`  ℹ️  Found ${existingLinks.length} existing links, using link ID: ${linkId}`);
          } else {
            // Create a new link for testing
            const params = {
              linkType: TEST_ISSUE_LINK_TYPE,
              inwardIssue: this.testIssueKey,
              outwardIssue: this.secondTestIssueKey,
              comment: `Test link created for removal test - ${Date.now()}`,
            };
            console.log(`  ℹ️  Only ${existingLinks.length} links found, creating a new link ${params.linkType} between ${
              params.inwardIssue} and ${params.outwardIssue} for test...`);

            const createLinkResult = await client.callTool('jira_create_issue_link', params);

            // Extract the link ID from the response
            const data = getJsonFromResult(createLinkResult);
            linkId = data?.link?.id;
            console.log(`  ℹ️  Created test link with ID: ${linkId}`);
          }
          return { linkId };
        },
        description: 'Remove issue link (creates link first if needed)',
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
        toolName: 'jira_get_attachments_info',
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
        params: {
          maxResults: 10,
        },
        description: 'Get all agile boards',
      },
      {
        fullId: '8-2',
        name: 'Get Board Issues',
        toolName: 'jira_get_board_issues',
        params: async (client) => {
          // Сначала получаем список досок
          const boardsResult = await client.callTool('jira_get_agile_boards', {
            maxResults: 10,
            projectIdOrKey: this.testProjectKey,
          });

          // Берём первую доску из списка
          const firstBoard = getJsonFromResult(boardsResult)?.agileBoards?.[0];
          if (!firstBoard?.id) {
            throw new Error('No boards found to test board issues');
          }

          return {
            boardId: Number(firstBoard.id),
            maxResults: 10,
            // jql: `project=${this.testProjectKey}`,
          };
        },
        description: 'Get board issues for the first available board',
      },
      {
        fullId: '8-3',
        name: 'Get Board Sprints',
        toolName: 'jira_get_sprints_from_board',
        params: async (client) => {
          // Сначала получаем список досок
          const boardsResult = await client.callTool('jira_get_agile_boards', {
            maxResults: 2,
            type: 'scrum',
          });

          // Ищем доску типа scrum (данные в content[0].text)
          const boards = getJsonFromResult(boardsResult)?.agileBoards || [];
          const scrumBoard = boards.find(b => b.type === 'scrum');

          if (!scrumBoard?.id) {
            // Если не нашли scrum доску, пропускаем тест
            console.log('No scrum boards found, skipping test');
            return null;
          }

          return {
            boardId: Number(scrumBoard.id),
            maxResults: 10,
          };
        },
        description: 'Get board sprints for the first available board',
      },
      {
        fullId: '8-4',
        name: 'Get Sprint Issues',
        toolName: 'jira_get_sprint_issues',
        params: async (client) => {
          // Сначала получаем список досок
          const boardsResult = await client.callTool('jira_get_agile_boards', {
            maxResults: 50,
          });

          // Ищем доску типа scrum
          const boards = getJsonFromResult(boardsResult)?.agileBoards || [];
          const scrumBoard = boards.find(b => b.type === 'scrum');

          if (!scrumBoard?.id) {
            console.log('No scrum boards found, skipping test');
            return null;
          }

          // Получаем спринты этой доски
          const sprintsResult = await client.callTool('jira_get_sprints_from_board', {
            boardId: Number(scrumBoard.id),
            maxResults: 10,
          });

          // Берём первый спринт из списка
          const firstSprint = getJsonFromResult(sprintsResult)?.sprints?.[0];
          if (!firstSprint?.id) {
            console.log('No sprints found to test sprint issues');
            return null;
          }

          return {
            sprintId: Number(firstSprint.id),
            maxResults: 10,
          };
        },
        description: 'Get issues from first available sprint',
      },
      {
        fullId: '8-5',
        name: 'Create New Sprint',
        toolName: 'jira_create_sprint',
        params: async (client) => {
          // Сначала получаем список досок
          const boardsResult = await client.callTool('jira_get_agile_boards', {
            maxResults: 50,
          });

          // Ищем доску типа scrum
          const boards = getJsonFromResult(boardsResult)?.agileBoards || [];
          const scrumBoard = boards.find(b => b.type === 'scrum');

          if (!scrumBoard?.id) {
            console.log('No scrum boards found, skipping test');
            return null;
          }

          return {
            originBoardId: Number(scrumBoard.id),
            name: `Test ${Date.now() % 10000}`, // Shortened to fit 30 char limit
            goal: 'Test sprint creation',
            startDate: new Date().toISOString(), // 'Start date of the sprint in ISO 8601 format (e.g., 2023-01-01T00:00:00.000Z). Optional.'
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
        },
        description: 'Create new sprint for the first available board',
      },
      {
        fullId: '8-6',
        name: 'Update Sprint',
        toolName: 'jira_update_sprint',
        params: async (client) => {
          // Сначала получаем список досок
          const boardsResult = await client.callTool('jira_get_agile_boards', {
            maxResults: 50,
          });

          // Ищем доску типа scrum
          const boards = getJsonFromResult(boardsResult)?.agileBoards || [];
          const scrumBoard = boards.find(b => b.type === 'scrum');

          if (!scrumBoard?.id) {
            console.log('No scrum boards found, skipping test');
            return null;
          }

          // Создаём новый спринт для тестирования обновления
          const createResult = await client.callTool('jira_create_sprint', {
            originBoardId: Number(scrumBoard.id),
            name: `Upd ${Date.now() % 10000}`, // Shortened to fit 30 char limit
            goal: 'Test sprint for update operation',
          });

          // Получаем ID созданного спринта
          const createdSprint = getJsonFromResult(createResult)?.sprint;
          if (!createdSprint?.id) {
            console.log('Failed to create sprint for update test');
            return null;
          }

          const now = new Date();
          const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

          return {
            sprintId: Number(createdSprint.id),
            name: `Updated ${Date.now() % 10000}`, // Shortened to fit 30 char limit
            goal: 'Updated test goal',
            state: 'active', // Required by JIRA API
            startDate: now.toISOString(), // Required when changing state to active
            endDate: endDate.toISOString(),
          };
        },
        description: 'Update newly created sprint',
      },
    ]);
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
      allTestCases.find(tc => tc.fullId === id),
    ).filter(Boolean);
  }

  /**
   * Get test cases by tool names
   */
  getTestCasesByToolNames (toolNames) {
    const allTestCases = this.getAllTestCasesFlat();
    return toolNames.map(toolName =>
      allTestCases.find(tc => tc.toolName === toolName),
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
        if (testCase) {selectedTestCases.push(testCase);}
      } else if (filter.match(/^\d+\*?$/)) {
        // Single group number like "1" or "1*" - run all tests in group
        const groupNum = parseInt(filter.replace('*', ''));
        selectedTestCases.push(...this.getTestCasesByGroup(groupNum));
      } else {
        // Tool name
        const testCase = allTestCases.find(tc => tc.toolName === filter);
        if (testCase) {selectedTestCases.push(testCase);}
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
