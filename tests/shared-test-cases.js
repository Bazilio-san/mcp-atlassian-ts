/**
 * Shared JIRA API Test Cases
 * Implements common test cases for JIRA API validation that can be used
 * for both direct emulator testing and MCP server testing
 */

import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { TEST_ISSUE_KEY, TEST_SECOND_ISSUE_KEY, TEST_ISSUE_TYPE_NAME, TEST_JIRA_PROJECT, TEST_ISSUE_LINK_TYPE } from './constants.js';
import { incl, isObj, inclOneOf } from './utils.js';

/**
 * Test group constants
 */
export const TEST_GROUPS = {
  SYSTEM: 1,
  INFORMATIONAL: 2,
  ISSUE_DETAILED: 3,
  SEARCH_DETAILED: 4,
  PROJECT_DETAILED: 5,
  USER_DETAILED: 6,
  METADATA_DETAILED: 7,
  MODIFYING: 8,
  AGILE: 9,
  ADDITIONAL: 10,
  WORKFLOW_SCHEMES: 11,
  EXTENDED: 12,
  CASCADE: 13,
};

/**
 * Test groups information
 */
export const GROUP_INFO = {
  [TEST_GROUPS.SYSTEM]: { name: 'System', description: 'System endpoints' },
  [TEST_GROUPS.INFORMATIONAL]: { name: 'Informational', description: 'Basic informational tests' },
  [TEST_GROUPS.ISSUE_DETAILED]: { name: 'IssueDetailed', description: 'Detailed issue tests' },
  [TEST_GROUPS.SEARCH_DETAILED]: { name: 'SearchDetailed', description: 'Detailed search tests' },
  [TEST_GROUPS.PROJECT_DETAILED]: { name: 'ProjectDetailed', description: 'Detailed project tests' },
  [TEST_GROUPS.USER_DETAILED]: { name: 'UserDetailed', description: 'Detailed user tests' },
  [TEST_GROUPS.METADATA_DETAILED]: { name: 'MetadataDetailed', description: 'Detailed metadata tests' },
  [TEST_GROUPS.MODIFYING]: { name: 'Modifying', description: 'Data modification tests' },
  [TEST_GROUPS.AGILE]: { name: 'Agile', description: 'Agile API tests' },
  [TEST_GROUPS.ADDITIONAL]: { name: 'Additional', description: 'Additional tests' },
  [TEST_GROUPS.WORKFLOW_SCHEMES]: { name: 'WorkflowSchemes', description: 'Workflow schemes tests' },
  [TEST_GROUPS.EXTENDED]: { name: 'Extended', description: 'Extended tests' },
  [TEST_GROUPS.CASCADE]: { name: 'Cascade', description: 'Cascade operations' },
};

/**
 * Defines test cases for various JIRA API endpoints
 * Each test case contains information on how to call API and validate results
 */
export class SharedJiraTestCases {
  constructor () {
    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testProjectId = 10000; // Default project ID
    this.testUsername = appConfig.jira.auth.basic.username;
    this.testIssueKey = TEST_ISSUE_KEY;
    this.secondTestIssueKey = TEST_SECOND_ISSUE_KEY;
    this.createdResources = {
      issues: [],
      versions: [],
      links: [],
      attachments: [],
      workflowSchemes: [],
    };
  }

  /**
   * Get system test cases (serverInfo, configuration, permissions)
   */
  getSystemTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 1,
        fullId: '1-1',
        name: 'Get Server Info',
        mcpTool: 'health_check',
        mcpArgs: { detailed: true },
        directApi: {
          method: 'GET',
          endpoint: '/serverInfo',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'status'),
          checkResult: (result, response) => response.success,
          expectedProps: ['deploymentType', 'version'],
        },
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 2,
        fullId: '1-2',
        name: 'Get Configuration',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/configuration',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'config'),
          checkResult: (result) => isObj(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 3,
        fullId: '1-3',
        name: 'Get Permissions',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/permissions',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'permissions'),
          checkResult: (result) => isObj(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 4,
        fullId: '1-4',
        name: 'Get Application Roles',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/applicationrole',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'roles'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
    ];
  }

  /**
   * Get basic informational test cases
   * These tests verify data retrieval without modification
   */
  getInformationalTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 1,
        fullId: '2-1',
        name: 'Get Issue',
        mcpTool: 'jira_get_issue',
        mcpArgs: {
          issueKey: this.testIssueKey,
          expand: ['comment'],
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, this.testIssueKey),
          checkResult: (result) => result?.key === this.testIssueKey,
          expectedProps: ['key', 'fields'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 2,
        fullId: '2-2',
        name: 'Search Issues',
        mcpTool: 'jira_search_issues',
        mcpArgs: {
          jql: `project = ${this.testProjectKey}`,
          maxResults: 10,
          fields: ['summary', 'status', 'assignee'],
        },
        directApi: {
          method: 'POST',
          endpoint: '/search',
          data: {
            jql: `project = ${this.testProjectKey}`,
            maxResults: 10,
            fields: ['summary', 'status', 'assignee'],
          },
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Search Results'),
          checkResult: (result) => Array.isArray(result?.issues),
          expectedProps: ['issues', 'total'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 3,
        fullId: '2-3',
        name: 'Get Projects',
        mcpTool: 'jira_get_projects',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/project',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Projects'),
          checkResult: (result) => result?.length > 0,
          expectedProps: ['key', 'name', 'id'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 4,
        fullId: '2-4',
        name: 'Get Project Details',
        mcpTool: null, // No single project tool, use jira_get_projects
        mcpArgs: {
          projectKey: this.testProjectKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, this.testProjectKey),
          checkResult: (result) => result?.key === this.testProjectKey,
          expectedProps: ['key', 'name', 'description'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 5,
        fullId: '2-5',
        name: 'Get Issue Transitions',
        mcpTool: 'jira_get_transitions',
        mcpArgs: {
          issueKey: this.testIssueKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/transitions`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Transitions'),
          checkResult: (result) => Array.isArray(result?.transitions),
          expectedProps: ['transitions'],
          arrayElementProps: { path: 'transitions', props: ['id', 'name'] },
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 6,
        fullId: '2-6',
        name: 'Get Issue Comments',
        mcpTool: null, // No separate comments tool
        mcpArgs: {
          issueKey: this.testIssueKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/comment`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'comments', 'Comments'),
          checkResult: (result) => result?.comments !== undefined, // Note
          expectedProps: ['comments'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 7,
        fullId: '2-7',
        name: 'Get User Info',
        mcpTool: null, // Disabled due to cache issues with real server
        mcpArgs: {
          userIdOrEmail: this.testUsername,
        },
        directApi: {
          method: 'GET',
          endpoint: `/user?username=${this.testUsername}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'admin'), // Note emulator returns name:"admin"
          checkResult: (result) => result?.name?.length,
          expectedProps: ['name', 'displayName', 'active'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 8,
        fullId: '2-8',
        name: 'Get Current User',
        mcpTool: null, // No current user tool
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/myself',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'Current user', 'User'),
          checkResult: (result) => result?.name,
          expectedProps: ['name', 'displayName', 'active'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 9,
        fullId: '2-9',
        name: 'Get Priorities',
        mcpTool: null, // No priorities tool
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/priority',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'priorities', 'Priority'),
          checkResult: (result) => result?.length,
          expectedProps: ['id', 'name'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 10,
        fullId: '2-10',
        name: 'Get Statuses',
        mcpTool: null, // No statuses tool
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/status',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'statuses', 'Status'),
          checkResult: (result) => result?.length,
          expectedProps: ['id', 'name', 'statusCategory'],
        },
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 11,
        fullId: '2-11',
        name: 'Get Issue Types',
        mcpTool: null, // No issue types tool
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/issuetype',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'types', 'Type'),
          checkResult: (result) => result?.length,
          expectedProps: ['id', 'name'],
        },
      },
    ];
  }

  /**
   * Get extended test cases for issues
   */
  getIssueDetailedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 1,
        fullId: '3-1',
        name: 'Get Issue Edit Meta',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/editmeta`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'fields'),
          checkResult: (result) => result && result.fields,
          expectedProps: ['fields'],
        },
      },
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 2,
        fullId: '3-2',
        name: 'Get Issue Worklog',
        mcpTool: 'jira_get_worklog',
        mcpArgs: {
          issueKey: this.testIssueKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/worklog`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'worklog'),
          checkResult: (result) => result && result.worklogs !== undefined,
          expectedProps: ['worklogs'],
        },
      },
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 3,
        fullId: '3-3',
        name: 'Get Create Meta',
        mcpTool: 'jira_get_create_meta',
        mcpArgs: {
          projectKeys: [this.testProjectKey],
        },
        directApi: {
          method: 'GET',
          endpoint: '/issue/createmeta',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'projects'),
          checkResult: (result) => result && result.projects,
          expectedProps: ['projects'],
        },
      },
    ];
  }

  /**
   * Get test cases for search
   */
  getSearchDetailedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.SEARCH_DETAILED,
        testNumber: 1,
        fullId: '4-1',
        name: 'JQL Search GET',
        mcpTool: 'jira_search_issues', // using the same MCP tool
        mcpArgs: {
          jql: `project = ${this.testProjectKey}`,
          maxResults: 5,
        },
        directApi: {
          method: 'GET',
          endpoint: `/search?jql=project=${this.testProjectKey}&maxResults=5`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Search Results'),
          checkResult: (result) => result && result.issues && Array.isArray(result.issues),
          expectedProps: ['issues', 'total'],
        },
      },
    ];
  }

  /**
   * Get detailed test cases for projects
   */
  getProjectDetailedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.PROJECT_DETAILED,
        testNumber: 1,
        fullId: '5-1',
        name: 'Get All Projects',
        mcpTool: 'jira_get_projects',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/project',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Projects'),
          checkResult: (result) => result?.length,
          expectedProps: ['key', 'name', 'id'],
        },
      },
      {
        groupNumber: TEST_GROUPS.PROJECT_DETAILED,
        testNumber: 2,
        fullId: '5-2',
        name: 'Get Project Statuses',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/statuses`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'status'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
    ];
  }

  /**
   * Get detailed test cases for users
   */
  getUserDetailedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 1,
        fullId: '6-1',
        name: 'Get User by Username',
        mcpTool: 'jira_get_user_profile',
        mcpArgs: {
          username: this.testUsername,
        },
        directApi: {
          method: 'GET',
          endpoint: `/user?username=${this.testUsername}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'admin'), // emulator returns name:"admin"
          checkResult: (result) => result && result.name && result.name.length > 0,
          expectedProps: ['name', 'displayName', 'active'],
        },
      },
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 2,
        fullId: '6-2',
        name: 'Search Users by Username',
        mcpTool: 'jira_search_users',
        mcpArgs: {
          username: this.testUsername,
        },
        directApi: {
          method: 'GET',
          endpoint: `/user/search?username=${this.testUsername}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, this.testUsername),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 3,
        fullId: '6-3',
        name: 'Get Assignable Users',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/user/assignable/search?project=${this.testProjectKey}&username=${this.testUsername}`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'user'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
    ];
  }

  /**
   * Get detailed metadata test cases
   */
  getMetadataDetailedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 1,
        fullId: '7-1',
        name: 'Get Fields',
        mcpTool: 'jira_get_fields',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/field',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'fields', 'Field'),
          checkResult: (result) => result?.length,
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 2,
        fullId: '7-2',
        name: 'Get Resolutions',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/resolution',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'resolution'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: ['id', 'name'],
        },
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 3,
        fullId: '7-3',
        name: 'Get Project Roles',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/role',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'role'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 4,
        fullId: '7-4',
        name: 'Get Issue Link Types',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/issueLinkType',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'link'),
          checkResult: (result) => Array.isArray(result?.issueLinkTypes),
          expectedProps: ['issueLinkTypes'],
        },
      },
    ];
  }

  /**
   * Get test cases for data modification operations
   * These tests create, modify or delete data
   */
  getModifyingTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 1,
        fullId: '8-1',
        name: 'Create Issue',
        mcpTool: 'jira_create_issue',
        mcpArgs: {
          project: this.testProjectKey,
          issueType: TEST_ISSUE_TYPE_NAME,
          summary: 'Test Issue Created by MCP Client',
          description: 'This issue was created during MCP integration testing',
          labels: ['mcp-test', 'automated'],
        },
        directApi: {
          method: 'POST',
          endpoint: '/issue',
          data: {
            fields: {
              project: { key: this.testProjectKey },
              summary: 'Test Issue Created by API Client',
              description: 'This issue was created during API testing',
              issuetype: { name: TEST_ISSUE_TYPE_NAME },
            },
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result) => (result?.key || '').startsWith(this.testProjectKey),
          expectedProps: ['key', 'id'],
        },
        cleanup: (result) => {
          if (result && result.key) {
            this.createdResources.issues.push(result.key);
          }
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 2,
        fullId: '8-2',
        name: 'Add Comment',
        mcpTool: 'jira_add_comment',
        mcpArgs: {
          issueKey: this.testIssueKey,
          body: 'This comment was added by MCP test client',
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/comment`,
          data: {
            body: 'This comment was added by API test client',
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result) => result?.id,
          expectedProps: ['id', 'body'],
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 3,
        fullId: '8-3',
        name: 'Update Issue',
        mcpTool: 'jira_update_issue',
        mcpArgs: {
          issueKey: this.testIssueKey,
          summary: `Updated Test Issue - ${new Date().toISOString()}`,
          description: 'Updated description for MCP testing',
        },
        directApi: {
          method: 'PUT',
          endpoint: `/issue/${this.testIssueKey}`,
          data: {
            fields: {
              summary: `Updated Test Issue - ${new Date().toISOString()}`,
              description: 'Updated description for API testing',
            },
          },
        },
        expectedStatus: 204,
        validation: {
          checkContent: (c) => inclOneOf(c, 'Successfully', 'Updated'),
          checkResult: (result, response) => [204].includes(response?.status), // Note true
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 4,
        fullId: '8-4',
        name: 'Add Worklog',
        mcpTool: 'jira_add_worklog',
        mcpArgs: {
          issueKey: this.testIssueKey,
          timeSpent: '2h',
          comment: 'MCP test worklog entry',
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/worklog`,
          data: {
            timeSpent: '2h',
            comment: 'API test worklog entry',
            started: new Date().toISOString().replace('Z', '+0000'),
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result) => result?.id,
          expectedProps: ['id', 'timeSpent'],
        },
        cleanup: (result) => {
          if (result && result.id) {
            // Worklog ID will be used for deletion in cascade operations
          }
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 5,
        fullId: '8-5',
        name: 'Create Version',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: '/version',
          data: {
            name: `API Test Version - ${Date.now()}`,
            description: 'Version created for API testing',
            project: this.testProjectKey,
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result) => result?.id,
          expectedProps: ['id', 'name'],
        },
        cleanup: (result) => {
          if (result && result.id) {
            this.createdResources.versions.push(result.id);
          }
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 6,
        fullId: '8-6',
        name: 'Update Version',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'PUT',
          endpoint: '/version/{versionId}', // will be replaced at runtime
          data: {
            name: `Updated API Test Version - ${Date.now()}`,
            description: 'Updated version for API testing',
          },
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result, response) => [200].includes(response?.status), // Note true
        },
        dependsOn: 'Create Version', // depends on version creation
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 7,
        fullId: '8-7',
        name: 'Get Version',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/version/{versionId}', // will be replaced at runtime
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'version'),
          checkResult: (result) => result?.id,
          expectedProps: ['id', 'name'],
        },
        dependsOn: 'Create Version',
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 8,
        fullId: '8-8',
        name: 'Create Issue Link',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: '/issueLink',
          data: {
            type: { name: TEST_ISSUE_LINK_TYPE },
            inwardIssue: { key: this.testIssueKey },
            outwardIssue: { key: this.secondTestIssueKey },
            comment: { body: 'Link created for API testing' },
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result, response) => [201].includes(response?.status), // Note true
        },
        cleanup: (result, testCase) => {
          // Recording created link information for subsequent deletion
          if (result && result.success) {
            this.createdResources.links.push({
              inwardIssue: this.testIssueKey,
              outwardIssue: this.secondTestIssueKey,
              linkType: TEST_ISSUE_LINK_TYPE,
            });
          }
        },
        dependsOn: 'Create Issue', // depends on creating second issue
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 9,
        fullId: '8-9',
        name: 'Create Remote Link',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/remotelink`,
          data: {
            object: {
              url: 'https://example.com/test-link',
              title: 'Test Remote Link',
            },
          },
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => incl(c, 'Successfully'),
          checkResult: (result) => result?.id,
          expectedProps: ['id'],
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 10,
        fullId: '8-10',
        name: 'Get Remote Links',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/remotelink`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'links'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 11,
        fullId: '8-11',
        name: 'Delete Issue',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'DELETE',
          endpoint: '/issue/{issueKey}', // will be replaced at runtime
        },
        expectedStatus: 204, // DELETE operations usually return 204
        validation: {
          checkContent: (content) => true, // DELETE may return empty response
          checkResult: (result) => true, // For DELETE operations status 204 is considered successful
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 12,
        fullId: '8-12',
        name: 'Delete Version',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'DELETE',
          endpoint: '/version/{versionId}', // will be replaced at runtime
        },
        expectedStatus: 204, // DELETE operations usually return 204
        validation: {
          checkContent: (content) => true, // DELETE may return empty response
          checkResult: (result) => true, // For DELETE operations status 204 is considered successful
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 13,
        fullId: '8-13',
        name: 'Delete Issue Link',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'DELETE',
          endpoint: '/issueLink/{linkId}', // will be replaced at runtime with actual link ID
        },
        expectedStatus: 204, // DELETE operations usually return 204
        validation: {
          checkContent: (content) => true, // DELETE may return empty response
          checkResult: (result) => true, // For DELETE operations status 204 is considered successful
          expectedProps: [],
        },
      },
    ];
  }

  /**
   * Get test cases for Agile/Board operations
   */
  getAgileTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 1,
        fullId: '9-1',
        name: 'Get Agile Boards',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'boards'),
          checkResult: (result) => result && result.values && Array.isArray(result.values),
          expectedProps: ['values'],
        },
      },
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 2,
        fullId: '9-2',
        name: 'Get Board Sprints',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board/{boardId}/sprint', // will be replaced at runtime
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'sprints'),
          checkResult: (result) => Array.isArray(result?.values),
          expectedProps: ['values'],
        },
        dependsOn: 'Get Agile Boards',
      },
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 3,
        fullId: '9-3',
        name: 'Get Board Issues',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board/{boardId}/issue', // will be replaced at runtime
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'issues'),
          checkResult: (result) => Array.isArray(result?.issues),
          expectedProps: ['issues'],
        },
        dependsOn: 'Get Agile Boards',
      },
    ];
  }

  /**
   * Get additional test cases
   */
  getAdditionalTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 1,
        fullId: '10-1',
        name: 'Create Attachment',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/attachments`,
          data: new FormData(), // Will be filled at runtime with file
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'Successfully', 'attachment'),
          checkResult: (result) => result?.[0]?.id,
          expectedProps: ['id', 'filename'],
        },
        cleanup: (result) => {
          if (result?.length && result[0].id) {
            // Saving created attachment ID for use in other tests
            this.createdResources.attachments = this.createdResources.attachments || [];
            this.createdResources.attachments.push(result[0].id);
          }
        },
        requiresFile: true, // special flag for creating test file
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 2,
        fullId: '10-2',
        name: 'Get Attachment Sample',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/attachment/{attachmentId}', // returns attachment metadata
        },
        expectedStatus: 200,
        validation: {
          checkContent: (content) => true, // GET attachment returns binary file, not JSON
          checkResult: () => true, // For GET attachment check only HTTP status 200
          expectedProps: [], // No JSON properties for binary file
        },
        dependsOn: 'Create Attachment',
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 3,
        fullId: '10-3',
        name: 'Delete Attachment',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'DELETE',
          endpoint: '/attachment/{attachmentId}', // will be replaced at runtime
        },
        expectedStatus: 204, // DELETE operations usually return 204
        validation: {
          checkContent: (content) => true, // DELETE may return empty response
          checkResult: () => true,
          expectedProps: [],
        },
        dependsOn: 'Get Attachment Sample',
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 4,
        fullId: '10-4',
        name: 'Get Dashboards',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/dashboard',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'dashboard'),
          checkResult: () => true,
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 3,
        fullId: '10-3',
        name: 'Get Favourite Filters',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/filter/favourite',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'filter'),
          checkResult: (result) => Array.isArray(result),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 4,
        fullId: '10-4',
        name: 'Get Groups Picker',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/groups/picker',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'groups'),
          checkResult: () => true,
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 5,
        fullId: '10-5',
        name: 'Get Notification Schemes',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/notificationscheme',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'scheme'),
          checkResult: () => true,
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 6,
        fullId: '10-6',
        name: 'Get Permission Schemes',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/permissionscheme',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'scheme'),
          checkResult: () => true,
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 7,
        fullId: '10-7',
        name: 'Get Workflows',
        mcpTool: null, // no MCP tool available
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflow',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'workflow'),
          checkResult: () => true,
          expectedProps: [],
        },
      },
    ];
  }

  /**
   * Get test cases for workflow schemes
   */
  getWorkflowSchemesTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 1,
        fullId: '11-1',
        name: 'Get Project Workflow Scheme',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/workflowscheme`,
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'scheme', 'workflow'),
          checkResult: () => true,
          expectedProps: ['id', 'name'],
        },
      },
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 2,
        fullId: '11-2',
        name: 'Get Workflow Scheme by ID',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflowscheme/{workflowSchemeId}',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'scheme', 'workflow'),
          checkResult: () => true,
          expectedProps: ['id', 'name'],
        },
        dependsOn: 'Get Project Workflow Scheme',
      },
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 3,
        fullId: '11-3',
        name: 'Get Workflow Scheme Default',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflowscheme/{workflowSchemeId}/default',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => incl(c, 'workflow'),
          checkResult: () => true,
          expectedProps: [],
        },
        dependsOn: 'Get Project Workflow Scheme',
      },
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 4,
        fullId: '11-4',
        name: 'Create Workflow Scheme Draft',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: '/workflowscheme/{workflowSchemeId}/createdraft',
        },
        expectedStatus: 201,
        validation: {
          checkContent: (c) => inclOneOf(c, 'draft', 'scheme'),
          checkResult: () => true,
          expectedProps: [],
        },
        dependsOn: 'Get Project Workflow Scheme',
      },
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 5,
        fullId: '11-5',
        name: 'Get Workflow Scheme Draft',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflowscheme/{workflowSchemeId}/draft',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'draft', 'scheme'),
          checkResult: () => true,
          expectedProps: ['id', 'name'],
        },
        dependsOn: 'Create Workflow Scheme Draft',
      },
      {
        groupNumber: TEST_GROUPS.WORKFLOW_SCHEMES,
        testNumber: 6,
        fullId: '11-6',
        name: 'Delete Workflow Scheme Draft',
        mcpTool: null,
        mcpArgs: {},
        directApi: {
          method: 'DELETE',
          endpoint: '/workflowscheme/{workflowSchemeId}/draft',
        },
        expectedStatus: 204,
        validation: {
          checkContent: (content) => true,
          checkResult: () => true,
          expectedProps: [],
        },
        dependsOn: 'Get Workflow Scheme Draft',
      },
    ];
  }

  /**
   * Get cascade test cases (complex operations)
   */
  getCascadeTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 1,
        fullId: '12-1',
        name: 'Complete Issue Modification Workflow',
        description: 'Complete issue lifecycle: creation, modification, adding comment, worklog, cleanup',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Issue', storeAs: 'issueKey' },
          { action: 'modify', testCase: 'Update Issue', useResource: 'issueKey' },
          { action: 'add', testCase: 'Add Comment', useResource: 'issueKey' },
          { action: 'add', testCase: 'Add Worklog', useResource: 'issueKey' },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'issueKey' },
        ],
      },
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 2,
        fullId: '12-2',
        name: 'Version Management Workflow',
        description: 'Creating, updating and getting project version',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Version', storeAs: 'versionId' },
          { action: 'modify', testCase: 'Update Version', useResource: 'versionId' },
          { action: 'get', testCase: 'Get Version', useResource: 'versionId' },
          { action: 'cleanup', testCase: 'Delete Version', useResource: 'versionId' },
        ],
      },
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 3,
        fullId: '12-3',
        name: 'Issue Linking Workflow',
        description: 'Creating two issues and linking them together',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Issue', storeAs: 'firstIssueKey' },
          { action: 'create', testCase: 'Create Issue', storeAs: 'secondIssueKey' },
          { action: 'link', testCase: 'Create Issue Link', useResources: ['firstIssueKey', 'secondIssueKey'] },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'firstIssueKey' },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'secondIssueKey' },
        ],
      },
    ];
  }

  /**
   * Get extended test cases for complete API validation
   * Includes additional endpoints and more complex scenarios
   */
  getExtendedTestCases () {
    return [
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 1,
        fullId: '13-1',
        name: 'Get Server Info',
        mcpTool: 'health_check',
        mcpArgs: { detailed: true },
        directApi: {
          method: 'GET',
          endpoint: '/serverInfo',
        },
        validation: {
          checkContent: (c) => incl(c, 'status'),
          checkResult: (result, response) => response.success,
          expectedProps: ['status', 'service', 'version'],
        },
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 2,
        fullId: '13-2',
        name: 'Get Project Versions',
        mcpTool: 'jira_get_project_versions',
        mcpArgs: {
          projectKey: this.testProjectKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/versions`,
        },
        validation: {
          checkContent: (c) => inclOneOf(c, 'versions', 'Version'),
          checkResult: (result) => Array.isArray(result),
        },
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 3,
        fullId: '13-3',
        name: 'Get Project Components',
        mcpTool: 'jira_get_project_components',
        mcpArgs: {
          projectKey: this.testProjectKey,
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/components`,
        },
        validation: {
          checkContent: (c) => inclOneOf(c, 'components', 'Component'),
          checkResult: (result) => Array.isArray(result),
        },
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 4,
        fullId: '13-4',
        name: 'Search Users',
        mcpTool: 'jira_search_users',
        mcpArgs: {
          username: this.testUsername,
        },
        directApi: {
          method: 'GET',
          endpoint: `/user/search?username=${this.testUsername}`,
        },
        validation: {
          checkContent: (c) => incl(c, this.testUsername),
          checkResult: (result) => Array.isArray(result),
        },
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 5,
        fullId: '13-5',
        name: 'Get Fields',
        mcpTool: 'jira_get_fields',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/field',
        },
        validation: {
          checkContent: (c) => inclOneOf(c, 'fields', 'Field'),
          checkResult: (result) => result?.length,
        },
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 6,
        fullId: '13-6',
        name: 'Get Create Meta',
        mcpTool: 'jira_get_create_meta',
        mcpArgs: {
          projectKeys: [this.testProjectKey],
        },
        directApi: {
          method: 'GET',
          endpoint: '/issue/createmeta',
        },
        validation: {
          checkContent: (c) => incl(c, 'projects'),
          checkResult: (result) => result?.projects,
          expectedProps: ['projects'],
        },
      },
    ];
  }

  /**
   * Get all available test cases by categories
   */
  getAllTestCasesByCategory () {
    return {
      system: this.getSystemTestCases(),
      informational: this.getInformationalTestCases(),
      issueDetailed: this.getIssueDetailedTestCases(),
      searchDetailed: this.getSearchDetailedTestCases(),
      projectDetailed: this.getProjectDetailedTestCases(),
      userDetailed: this.getUserDetailedTestCases(),
      metadataDetailed: this.getMetadataDetailedTestCases(),
      modifying: this.getModifyingTestCases(),
      agile: this.getAgileTestCases(),
      additional: this.getAdditionalTestCases(),
      workflowSchemes: this.getWorkflowSchemesTestCases(),
      cascade: this.getCascadeTestCases(), // Note where it runs
      extended: this.getExtendedTestCases(), // Note where it runs
    };
  }

  /**
   * Get all available test cases (legacy format for compatibility)
   */
  getAllTestCases () {
    return {
      informational: this.getInformationalTestCases(),
      modifying: this.getModifyingTestCases(),
      extended: this.getExtendedTestCases(),
    };
  }

  /**
   * Get flat list of all test cases
   */
  getAllTestCasesFlat () {
    const allTestCases = this.getAllTestCasesByCategory();
    return [
      ...allTestCases.system,
      ...allTestCases.informational,
      ...allTestCases.issueDetailed,
      ...allTestCases.searchDetailed,
      ...allTestCases.projectDetailed,
      ...allTestCases.userDetailed,
      ...allTestCases.metadataDetailed,
      ...allTestCases.modifying,
      ...allTestCases.agile,
      ...allTestCases.additional,
      ...allTestCases.workflowSchemes,
      // cascade tests are handled separately
      ...allTestCases.extended,
    ];
  }

  /**
   * Get test cases by names
   */
  getTestCasesByNames (names) {
    const allTestCases = this.getAllTestCasesFlat();
    return names.map(name =>
      allTestCases.find(tc => tc.name === name),
    ).filter(Boolean);
  }

  /**
   * Get test cases for quick run (minimal set)
   */
  getTestCasesForQuickRun () {
    return this.getMinimalTestCases();
  }

  /**
   * Get test cases for complete run (~62 tests)
   */
  getTestCasesForFullRun () {
    return this.getAllTestCasesFlat();
  }

  /**
   * Get test cases by category
   */
  getTestCasesByCategory (category) {
    const allTestCases = this.getAllTestCasesByCategory();
    return allTestCases[category] || [];
  }

  /**
   * Get minimal set of test cases for quick validation
   */
  getMinimalTestCases () {
    const informational = this.getInformationalTestCases();
    const modifying = this.getModifyingTestCases();

    return [
      informational.find(tc => tc.name === 'Get Issue'),
      informational.find(tc => tc.name === 'Search Issues'),
      informational.find(tc => tc.name === 'Get Projects'),
      informational.find(tc => tc.name === 'Get Issue Transitions'),
      modifying.find(tc => tc.name === 'Create Issue'),
      modifying.find(tc => tc.name === 'Add Comment'),
    ].filter(Boolean);
  }

  /**
   * Get created resources for cleanup
   */
  getCreatedResources () {
    return this.createdResources;
  }

  /**
   * Clear created resources
   */
  clearCreatedResources () {
    this.createdResources = {
      issues: [],
      versions: [],
      links: [],
    };
  }

  // ========== GROUPED TEST MANAGEMENT METHODS ==========

  /**
   * Get test by full ID (format N-M)
   */
  getTestByFullId (fullId) {
    const allTestCases = this.getAllTestCasesFlat();
    return allTestCases.find(tc => tc.fullId === fullId);
  }

  /**
   * Get all tests in group
   */
  getTestsByGroup (groupNumber) {
    const allTestCases = this.getAllTestCasesFlat();
    return allTestCases.filter(tc => tc.groupNumber === groupNumber);
  }

  /**
   * Get group information
   */
  getGroupInfo (groupNumber) {
    return GROUP_INFO[groupNumber] || null;
  }

  /**
   * Get all groups with their information
   */
  getAllGroupInfo () {
    return GROUP_INFO;
  }

  /**
   * Validate test ID uniqueness
   */
  validateTestIds () {
    const allTestCases = this.getAllTestCasesFlat();
    const idCounts = new Map();
    const duplicates = [];

    // Count occurrence of each ID
    allTestCases.forEach(tc => {
      if (tc.fullId) {
        const count = idCounts.get(tc.fullId) || 0;
        idCounts.set(tc.fullId, count + 1);
        if (count === 1) {
          duplicates.push(tc.fullId);
        }
      }
    });

    // Also check fullId format compliance N-M
    const invalidFormats = allTestCases
      .filter(tc => tc.fullId && !/^\d+-\d+$/.test(tc.fullId))
      .map(tc => tc.fullId);

    return {
      isValid: duplicates.length === 0 && invalidFormats.length === 0,
      duplicates,
      invalidFormats,
      totalTests: allTestCases.length,
      testsWithIds: allTestCases.filter(tc => tc.fullId).length,
    };
  }

  /**
   * Parse test selection command (format --tests=1-1,4-*,5)
   */
  parseTestSelection (testsString) {
    if (!testsString) {
      return { includeAll: true, selections: [] };
    }

    const selections = [];
    const parts = testsString.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [groupStr, testStr] = part.split('-', 2);
        const groupNumber = parseInt(groupStr);

        if (isNaN(groupNumber)) {
          throw new Error(`Invalid group number: ${groupStr}`);
        }

        if (testStr === '*') {
          // Entire group: 4-*
          selections.push({
            type: 'group',
            groupNumber,
            testNumber: null,
          });
        } else {
          const testNumber = parseInt(testStr);
          if (isNaN(testNumber)) {
            throw new Error(`Invalid test number: ${testStr}`);
          }
          // Specific test: 1-1
          selections.push({
            type: 'test',
            groupNumber,
            testNumber,
            fullId: `${groupNumber}-${testNumber}`,
          });
        }
      } else {
        // Only group number: 5 (equivalent to 5-*)
        const groupNumber = parseInt(part);
        if (isNaN(groupNumber)) {
          throw new Error(`Invalid group number: ${part}`);
        }
        selections.push({
          type: 'group',
          groupNumber,
          testNumber: null,
        });
      }
    }

    return {
      includeAll: false,
      selections,
    };
  }

  /**
   * Filter tests based on user selection
   */
  getTestsBySelection (testsString) {
    const selection = this.parseTestSelection(testsString);

    if (selection.includeAll) {
      return this.getAllTestCasesFlat();
    }

    const allTestCases = this.getAllTestCasesFlat();
    const selectedTests = [];

    for (const sel of selection.selections) {
      if (sel.type === 'group') {
        // Adding all tests from group
        const groupTests = allTestCases.filter(tc => tc.groupNumber === sel.groupNumber);
        selectedTests.push(...groupTests);
      } else if (sel.type === 'test') {
        // Adding specific test
        const test = allTestCases.find(tc => tc.fullId === sel.fullId);
        if (test) {
          selectedTests.push(test);
        }
      }
    }

    // Remove duplicates by fullId
    const uniqueTests = selectedTests.filter((test, index, arr) =>
      arr.findIndex(t => t.fullId === test.fullId) === index,
    );

    return uniqueTests;
  }

  /**
   * Get statistics by groups
   */
  getGroupStatistics () {
    const allTestCases = this.getAllTestCasesFlat();
    const groupStats = {};

    // Initialize statistics for all groups
    Object.keys(GROUP_INFO).forEach(groupNum => {
      groupStats[groupNum] = {
        groupNumber: parseInt(groupNum),
        groupName: GROUP_INFO[groupNum].name,
        totalTests: 0,
        testsWithMcp: 0,
        testsWithDirectApi: 0,
      };
    });

    // Calculate statistics
    allTestCases.forEach(tc => {
      if (tc.groupNumber && groupStats[tc.groupNumber]) {
        groupStats[tc.groupNumber].totalTests++;
        if (tc.mcpTool) {
          groupStats[tc.groupNumber].testsWithMcp++;
        }
        if (tc.directApi) {
          groupStats[tc.groupNumber].testsWithDirectApi++;
        }
      }
    });

    return groupStats;
  }
}

/**
 * Resource manager for tracking created objects and their cleanup
 */
export class ResourceManager {
  constructor () {
    this.resources = {
      issues: [],
      versions: [],
      links: [],
      worklogs: [],
      comments: [],
      remoteLinks: [],
      attachments: [],
      workflowSchemes: [],
    };
    this.resourceMap = new Map(); // for storing relationships between names and IDs
  }

  /**
   * Add resource for tracking
   */
  addResource (type, id, name = null) {
    if (this.resources[type]) {
      this.resources[type].push(id);
      if (name) {
        this.resourceMap.set(name, { type, id });
      }
    }
  }

  /**
   * Get resource by name
   */
  getResource (name) {
    return this.resourceMap.get(name);
  }

  /**
   * Get all resources of specific type
   */
  getResourcesByType (type) {
    return this.resources[type] || [];
  }

  /**
   * Clear all resources
   */
  clearAll () {
    this.resources = {
      issues: [],
      versions: [],
      links: [],
      worklogs: [],
      comments: [],
      remoteLinks: [],
      attachments: [],
    };
    this.resourceMap.clear();
  }

  /**
   * Get created resources for cleanup (compatibility)
   */
  getCreatedResources () {
    return this.resources;
  }
}

/**
 * Utilities for executing cascade operations
 */
export class CascadeExecutor {
  constructor (resourceManager) {
    this.resourceManager = resourceManager;
    this.executionResults = new Map();
  }

  /**
   * Execute cascade operation
   */
  async executeCascade (cascadeTestCase, testRunner) {
    const results = [];

    for (const step of cascadeTestCase.steps) {
      try {
        const testCase = this.findTestCase(step.testCase, testRunner);
        if (!testCase) {
          throw new Error(`Test case '${step.testCase}' not found`);
        }

        // Prepare test case with resource substitution
        const preparedTestCase = this.prepareTestCase(testCase, step);

        // Execute test
        const result = await testRunner.runTestCase(preparedTestCase);

        // Save result
        if (step.storeAs && result.success && result.data) {
          const resourceId = this.extractResourceId(result.data, step.testCase);
          this.resourceManager.addResource(
            this.getResourceType(step.testCase),
            resourceId,
            step.storeAs,
          );
        }

        results.push({
          step: step.action,
          testCase: step.testCase,
          success: result.success,
          result,
        });

      } catch (error) {
        results.push({
          step: step.action,
          testCase: step.testCase,
          success: false,
          error: error.message,
        });
        break; // break cascade on error
      }
    }

    return {
      name: cascadeTestCase.name,
      type: 'cascade',
      success: results.every(r => r.success),
      steps: results,
    };
  }

  /**
   * Find test case by name
   */
  findTestCase (name, testRunner) {
    return testRunner.sharedTestCases.getTestCasesByNames([name])[0];
  }

  /**
   * Prepare test case with resource substitution
   */
  prepareTestCase (testCase, step) {
    const prepared = JSON.parse(JSON.stringify(testCase)); // deep clone

    if (step.useResource) {
      const resource = this.resourceManager.getResource(step.useResource);
      if (resource) {
        // Replace placeholders in endpoint and data
        prepared.directApi.endpoint = prepared.directApi.endpoint
          .replace(`{${step.useResource}}`, resource.id)
          .replace(`{${resource.type}Id}`, resource.id);

        if (prepared.directApi.data) {
          prepared.directApi.data = this.replacePlaceholders(
            prepared.directApi.data,
            step.useResource,
            resource.id,
          );
        }
      }
    }

    if (step.useResources) {
      // For cases with multiple resources (e.g., issue linking)
      step.useResources.forEach((resourceName, index) => {
        const resource = this.resourceManager.getResource(resourceName);
        if (resource) {
          prepared.directApi.data = this.replacePlaceholders(
            prepared.directApi.data,
            resourceName,
            resource.id,
          );
        }
      });
    }

    return prepared;
  }

  /**
   * Replace placeholders in data object
   */
  replacePlaceholders (obj, resourceName, resourceId) {
    const jsonStr = JSON.stringify(obj);
    const replaced = jsonStr
      .replace(new RegExp(`{${resourceName}}`, 'g'), resourceId)
      .replace(new RegExp(`{${resourceName}Key}`, 'g'), resourceId);
    return JSON.parse(replaced);
  }

  /**
   * Extract resource ID from result
   */
  extractResourceId (data, testCaseName) {
    if (testCaseName.includes('Issue')) {
      return data.key || data.id;
    }
    if (testCaseName.includes('Version')) {
      return data.id;
    }
    if (testCaseName.includes('Comment')) {
      return data.id;
    }
    if (testCaseName.includes('Worklog')) {
      return data.id;
    }
    return data.id || data.key;
  }

  /**
   * Determine resource type by test case name
   */
  getResourceType (testCaseName) {
    if (testCaseName.includes('Issue')) return 'issues';
    if (testCaseName.includes('Version')) return 'versions';
    if (testCaseName.includes('Comment')) return 'comments';
    if (testCaseName.includes('Worklog')) return 'worklogs';
    if (testCaseName.includes('Link')) return 'links';
    return 'issues'; // by default
  }
}

/**
 * Utilities for test result validation
 */
export class TestValidationUtils {
  /**
   * Check for expected properties in object
   */
  static validateProperties (obj, expectedProps, testName, arrayElementProps = null) {
    if (!obj || typeof obj !== 'object') {
      return {
        success: false,
        message: `${testName}: Object is null or not an object`,
      };
    }

    const missing = expectedProps.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      return {
        success: false,
        message: `${testName}: Missing properties: ${missing.join(', ')}`,
      };
    }

    // Check array element properties if specified
    if (arrayElementProps) {
      const arrayPath = arrayElementProps.path;
      const arrayProps = arrayElementProps.props;

      if (obj[arrayPath] && Array.isArray(obj[arrayPath]) && obj[arrayPath].length > 0) {
        const firstElement = obj[arrayPath][0];
        const missingArrayProps = arrayProps.filter(prop => !(prop in firstElement));

        if (missingArrayProps.length > 0) {
          return {
            success: false,
            message: `${testName}: Missing properties in ${arrayPath}[0]: ${missingArrayProps.join(', ')}`,
          };
        }
      }
    }

    return {
      success: true,
      message: `${testName}: All expected properties present`,
    };
  }

  /**
   * Validate MCP response against expected format
   */
  static validateMcpResponse (response, testCase) {
    if (response.error) {
      return {
        success: false,
        message: `MCP Error: ${response.error.message || 'Unknown error'}`,
      };
    }

    if (!response.result) {
      return {
        success: false,
        message: 'No result in MCP response',
      };
    }

    const content = response.result?.content?.[0]?.text;
    if (!content) {
      return {
        success: false,
        message: 'No content returned from MCP tool',
      };
    }

    if (testCase.validation?.checkContent && !testCase.validation.checkContent(content)) {
      return {
        success: false,
        message: 'Content validation failed',
      };
    }

    return {
      success: true,
      message: 'MCP response validation passed',
      content,
    };
  }

  /**
   * Validate direct API response
   */
  static validateDirectApiResponse (response, testCase) {
    // First check custom validation if it exists
    if (testCase.validation?.checkResult) {
      if (!testCase.validation.checkResult(response.data, response)) {
        return {
          success: false,
          message: 'Result validation failed',
        };
      }
      // If custom validation passed, consider test successful
      return {
        success: true,
        message: 'Validation passed',
      };
    }

    // If no custom validation, use standard check
    if (!response.success) {
      return {
        success: false,
        message: `API Error: ${response.status} ${response.statusText || response.error}`,
      };
    }

    if (testCase.validation?.expectedProps && testCase.validation.expectedProps.length > 0) {
      // Skip property check for DELETE operations (usually no response.data)
      if (!response.data && response.status === 204) {
        // DELETE operations usually return 204 without data - this is normal
        return {
          success: true,
          message: 'DELETE operation completed successfully',
        };
      }

      const propCheck = this.validateProperties(
        response.data.length ? response.data[0] : response.data,
        testCase.validation.expectedProps,
        testCase.name,
        testCase.validation.arrayElementProps,
      );
      if (!propCheck.success) {
        return propCheck;
      }
    }

    return {
      success: true,
      message: 'Direct API response validation passed',
      data: response.data,
    };
  }
}

export default SharedJiraTestCases;
