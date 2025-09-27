// noinspection UnnecessaryLocalVariableJS

/**
 * Shared JIRA API Test Cases
 * Implements common test cases for JIRA API validation that can be used
 * for both direct emulator testing and MCP server testing
 */

import { appConfig } from '../../dist/src/bootstrap/init-config.js';
import { TEST_ISSUE_KEY, TEST_SECOND_ISSUE_KEY, TEST_ISSUE_TYPE_NAME, TEST_JIRA_PROJECT, TEST_ISSUE_LINK_TYPE } from '../constants.js';
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
        name: 'Delete Remote Link',
        directApi: {
          method: 'DELETE',
          endpoint: `/issue/${this.testIssueKey}/remotelink/{remoteLinkId}`, // will be replaced at runtime
        },
        expectedStatus: 204,
        validation: {
          checkContent: (content) => true, // DELETE may return empty response
          checkResult: (result) => true, // For DELETE operations status 204 is considered successful
          expectedProps: [],
        },
        dependsOn: 'Get Remote Links', // depends on getting remote links first
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 12,
        fullId: '8-12',
        name: 'Delete Issue',
        requiresSetup: true, // ВАЖНО: Требует создания временной задачи!
        setupNote: 'This test requires creating a temporary issue first',
        directApi: {
          method: 'DELETE',
          endpoint: '/issue/{tempIssueKey}', // will be replaced with created issue key
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
        name: 'Delete Version',
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
        testNumber: 14,
        fullId: '8-14',
        name: 'Delete Issue Link',
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
        directApi: {
          method: 'GET',
          endpoint: '/rest/agile/1.0/board',
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
        directApi: {
          method: 'GET',
          endpoint: '/rest/agile/1.0/board/{boardId}/sprint', // will be replaced at runtime
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
        directApi: {
          method: 'GET',
          endpoint: '/rest/agile/1.0/board/{boardId}/issue', // will be replaced at runtime
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
        directApi: {
          method: 'GET',
          endpoint: '/dashboard',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'dashboard', 'dashboards', 'total'),
          checkResult: (result) => Array.isArray(result) || (result && typeof result === 'object'),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 5,
        fullId: '10-5',
        name: 'Get Favourite Filters',
        directApi: {
          method: 'GET',
          endpoint: '/filter/favourite',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'filter', 'filters', 'favourite'),
          checkResult: (result) => Array.isArray(result) || (result && typeof result === 'object'),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 6,
        fullId: '10-6',
        name: 'Get Groups Picker',
        directApi: {
          method: 'GET',
          endpoint: '/groups/picker',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'groups', 'group', 'total'),
          checkResult: (result) => result && (result.groups || result.total !== undefined || typeof result === 'object'),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 7,
        fullId: '10-7',
        name: 'Get Notification Schemes',
        directApi: {
          method: 'GET',
          endpoint: '/notificationscheme',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'scheme', 'schemes', 'notification', 'values'),
          checkResult: (result) => Array.isArray(result) || (result && result.values) || (result && typeof result === 'object'),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 8,
        fullId: '10-8',
        name: 'Get Permission Schemes',
        directApi: {
          method: 'GET',
          endpoint: '/permissionscheme',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'scheme', 'schemes', 'notification', 'values'),
          checkResult: (result) => Array.isArray(result) || (result && result.values) || (result && typeof result === 'object'),
          expectedProps: [],
        },
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 9,
        fullId: '10-9',
        name: 'Get Workflows',
        directApi: {
          method: 'GET',
          endpoint: '/workflow',
        },
        expectedStatus: 200,
        validation: {
          checkContent: (c) => inclOneOf(c, 'workflow', 'workflows', 'values'),
          checkResult: (result) => Array.isArray(result) || (result && typeof result === 'object'),
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
   * Get flat list of all test cases
   */
  getAllTestCasesFlat () {
    return [
      ...this.getSystemTestCases(),
      ...this.getInformationalTestCases(),
      ...this.getIssueDetailedTestCases(),
      ...this.getSearchDetailedTestCases(),
      ...this.getProjectDetailedTestCases(),
      ...this.getUserDetailedTestCases(),
      ...this.getMetadataDetailedTestCases(),
      ...this.getModifyingTestCases(),
      ...this.getAgileTestCases(),
      ...this.getAdditionalTestCases(),
      ...this.getWorkflowSchemesTestCases(),
      // cascade tests are handled separately
      ...this.getExtendedTestCases(),
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
}

export default SharedJiraTestCases;
