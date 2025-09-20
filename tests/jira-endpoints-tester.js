// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA REST API v2 Endpoints Tester
 */

// For Node.js versions without global fetch
import fetch from 'node-fetch';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils, ResourceManager } from './shared-test-cases.js';
import { TEST_ISSUE_KEY, TEST_JIRA_PROJECT } from './constants.js';

const {
  jira: {
    url,
    auth: {
      pat,
      basic: {
        username = '*',
        password = '*',
      } = {},
    } = {},
  } = {},
} = appConfig;

class JiraEndpointsTester {
  constructor () {
    this.baseUrl = url || 'http://localhost:8080';
    if (pat && pat.length > 3) {
      this.auth = { type: 'token', token: pat };
    } else {
      this.auth = { type: 'basic', username, password };
    }
    this.testResults = [];
    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testProjectId = null; // Will be obtained dynamically
    this.testIssueKey = TEST_ISSUE_KEY;
    this.failedTestIds = [];
    this.resourceManager = new ResourceManager();

    // Support for environment variable to add X-headers
    this.customHeaders = this.parseTestXHeaders();

    // Initialize shared test cases
    this.sharedTestCases = new SharedJiraTestCases();

    // Parse selective tests from command line arguments
    this.parseSelectedTests();
  }

  /**
   * Parse test numbers for selective execution
   * New format: node tests/jira-endpoints-tester.js --tests=1-1,4-*,5
   * N-M where N - group number, M - test number in group (* for entire group)
   * Also supports N (equivalent to N-*)
   */
  parseSelectedTests () {
    const args = process.argv.slice(2);
    const testsArg = args.find(arg => arg.startsWith('--tests='));

    if (!testsArg) {
      this.selectedTestsGrouped = null;
      return;
    }

    const testsString = testsArg.split('=')[1];
    if (!testsString || testsString.trim() === '') {
      this.selectedTestsGrouped = null; // Empty value = all tests
      return;
    }

    try {
      // Use new parsing method from SharedJiraTestCases
      const selection = this.sharedTestCases.parseTestSelection(testsString);

      if (selection.includeAll) {
        this.selectedTestsGrouped = null;
        console.log('🎯 Executing all tests\n');
      } else {
        this.selectedTestsGrouped = selection.selections;

        // Generate human-readable selection description
        const selectionDescriptions = selection.selections.map(sel => {
          if (sel.type === 'group') {
            const groupInfo = this.sharedTestCases.getGroupInfo(sel.groupNumber);
            return `group ${sel.groupNumber} (${groupInfo?.name || 'Unknown'})`;
          } else {
            const groupInfo = this.sharedTestCases.getGroupInfo(sel.groupNumber);
            return `test ${sel.fullId} from group "${groupInfo?.name || 'Unknown'}"`;
          }
        });

        console.log(`🎯 Selective test execution: ${selectionDescriptions.join(', ')}\n`);
      }
    } catch (error) {
      console.warn('⚠️  Error parsing --tests parameter:', error.message);
      this.selectedTestsGrouped = null;
    }
  }

  /**
   * Check if test with given fullId should be executed
   */
  shouldRunTest (fullId) {
    if (this.selectedTestsGrouped === null) {
      return true; // Execute all tests
    }

    // Work only with tests from SharedJiraTestCases with fullId
    if (typeof fullId === 'string' && fullId.includes('-')) {
      const [groupNumber, testNumber] = fullId.split('-').map(n => parseInt(n));

      return this.selectedTestsGrouped.some(sel => {
        if (sel.type === 'group' && sel.groupNumber === groupNumber) {
          return true; // Entire group selected
        }
        if (sel.type === 'test' && sel.groupNumber === groupNumber && sel.testNumber === testNumber) {
          return true; // Specific test selected
        }
        return false;
      });
    }

    return false;
  }

  /**
   * Parse X-headers from TEST_ADD_X_HEADER environment variable
   * Format: "x-header-name:value" or "x-header1:value1,x-header2:value2"
   */
  parseTestXHeaders () {
    const testHeaders = process.env.TEST_ADD_X_HEADER;
    if (!testHeaders) {
      return {};
    }

    const headers = {};
    try {
      // Support both single headers and comma-separated list
      const headerPairs = testHeaders.split(',').map(h => h.trim());

      for (const pair of headerPairs) {
        const [name, ...valueParts] = pair.split(':');
        if (name && valueParts.length > 0) {
          const value = valueParts.join(':').trim(); // In case value contains colon
          headers[name.trim()] = value;
        }
      }

      if (Object.keys(headers).length > 0) {
        console.log('🔧 Added X-headers from TEST_ADD_X_HEADER:', headers);
      }
    } catch (error) {
      console.warn('⚠️  Error parsing TEST_ADD_X_HEADER:', error.message);
    }

    return headers;
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders () {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.customHeaders, // Add X-headers from environment variable
    };

    if (this.auth.type === 'basic') {
      const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (this.auth.type === 'token') {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }

    return headers;
  }

  /**
   * Execute HTTP request
   */
  async makeRequest (method, endpoint, data = null, options = {}) {
    const url = `${this.baseUrl}/rest/api/2${endpoint}`;
    const config = {
      method,
    };

    // For FormData do not set Content-Type, browser will add multipart/form-data
    if (data instanceof FormData) {
      config.headers = {
        ...this.getAuthHeaders(),
        'X-Atlassian-Token': 'no-check', // Disable XSRF check for file uploads
        ...options.headers,
      };
      // Remove Content-Type for FormData
      delete config.headers['Content-Type'];
      config.body = data;
    } else {
      config.headers = { ...this.getAuthHeaders(), ...options.headers };
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, config);

      // Check if there is content to parse (status 204 = No Content)
      let responseData = null;
      if (response.status !== 204) {
        const contentLength = response.headers.get('content-length');
        if (contentLength !== '0') {
          responseData = response.headers.get('content-type')?.includes('json')
            ? await response.json()
            : await response.text();
        }
      }

      let errorMessage = null;
      if (!response.ok && responseData && typeof responseData === 'object') {
        if (responseData.errors && Object.keys(responseData.errors).length > 0) {
          const errorMessages = Object.entries(responseData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Validation errors: ${errorMessages}`;
        } else if (responseData.errorMessages && responseData.errorMessages.length > 0) {
          errorMessage = `Error messages: ${responseData.errorMessages.join(', ')}`;
        }
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: errorMessage || (response.ok ? null : response.statusText || 'Unknown error'),
        url,
        method,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        url,
        method,
      };
    }
  }

  /**
   * Execute HTTP request to Agile API
   */
  async makeAgileRequest (method, endpoint, data = null, options = {}) {
    const url = `${this.baseUrl}/rest${endpoint}`;
    const config = {
      method,
      headers: { ...this.getAuthHeaders(), ...options.headers },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      // Check if there is content to parse (status 204 = No Content)
      let responseData = null;
      if (response.status !== 204) {
        const contentLength = response.headers.get('content-length');
        if (contentLength !== '0') {
          responseData = response.headers.get('content-type')?.includes('json')
            ? await response.json()
            : await response.text();
        }
      }

      let errorMessage = null;
      if (!response.ok && responseData && typeof responseData === 'object') {
        if (responseData.errors && Object.keys(responseData.errors).length > 0) {
          const errorMessages = Object.entries(responseData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Validation errors: ${errorMessages}`;
        } else if (responseData.errorMessages && responseData.errorMessages.length > 0) {
          errorMessage = `Error messages: ${responseData.errorMessages.join(', ')}`;
        }
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: errorMessage || (response.ok ? null : response.statusText || 'Unknown error'),
        url,
        method,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        url,
        method,
      };
    }
  }

  /**
   * Test result logging
   */
  logTest (testName, result, expectedStatus = null, endpoint = null, fullId = null) {
    // All tests must have fullId - skip if not
    if (!fullId) {
      console.warn(`⚠️ Test "${testName}" skipped - no fullId provided`);
      return false;
    }

    // Check selective execution for grouped tests
    if (!this.shouldRunTest(fullId)) {
      return false; // Test was skipped
    }

    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const details = expectedStatus
      ? (expectedStatus === result.status ? '' : ` - Expected: ${expectedStatus}, Got: ${result.status}`)
      : ` - Status: ${result.status}`;
    const endpointInfo = endpoint ? ` [${result.method} ${endpoint}]` : '';

    // For errors add statusText and error to output
    const errorInfo = !result.success && (result.statusText || result.error)
      ? ` (${result.statusText ? result.statusText : ''}${result.statusText && result.error ? ' - ' : ''}${result.error ? result.error : ''})`
      : '';

    console.log(`${status} [${fullId}] ${testName}${endpointInfo}${details}${errorInfo}`);

    this.testResults.push({
      fullId: fullId,
      testId: fullId, // testId is now always equal to fullId
      name: testName,
      success: result.success,
      status: result.status,
      endpoint,
      method: result.method,
      details: result.statusText || result.error,
      timestamp: new Date().toISOString(),
    });

    // Save failed test IDs
    if (!result.success) {
      if (!this.failedTestIds) {
        this.failedTestIds = [];
      }
      this.failedTestIds.push(fullId);
    }

    if (!result.success && result.error) {
      console.error(`      Error: ${result.error}`);
    }

    return true; // Test was executed
  }

  /**
   * Replace placeholders in endpoint with real values
   */
  async replacePlaceholders (endpoint) {
    // Get created resources
    const createdResources = this.resourceManager.getCreatedResources();

    // Replace placeholders with real values
    let replacedEndpoint = endpoint;

    if (endpoint.includes('{versionId}')) {
      // Use created resource or fallback to most likely ID
      let versionId;
      if (createdResources.versions.length > 0) {
        versionId = createdResources.versions[0];
      } else {
        // Fallback: emulator creates versions starting from 10001
        // Use last created version (presumably)
        versionId = '10001'; // first version created by test 8-5
      }
      replacedEndpoint = replacedEndpoint.replace('{versionId}', versionId);
    }

    if (endpoint.includes('{issueKey}')) {
      // Use created resource or fallback on test tasks
      const issueKey = createdResources.issues.length > 0
        ? createdResources.issues[0]
        : this.testIssueKey; // fallback to TEST-1
      replacedEndpoint = replacedEndpoint.replace('{issueKey}', issueKey);
    }

    if (endpoint.includes('{boardId}')) {
      // Dynamically search for scrum type board
      let boardId = '1'; // fallback value

      try {
        const boardsResult = await this.makeAgileRequest('GET', '/agile/1.0/board');
        if (boardsResult.success && boardsResult.data && boardsResult.data.values) {
          // Search for first scrum type board
          const scrumBoard = boardsResult.data.values.find(board => board.type === 'scrum');
          if (scrumBoard) {
            boardId = scrumBoard.id.toString();
            console.log(`🎯 Found scrum board: ${scrumBoard.name} (ID: ${boardId})`);
          } else {
            console.log('⚠️ No scrum board found, using fallback ID: 1');
          }
        }
      } catch (error) {
        console.log(`⚠️ Error fetching boards: ${error.message}, using fallback ID: 1`);
      }

      replacedEndpoint = replacedEndpoint.replace('{boardId}', boardId);
    }

    if (endpoint.includes('{attachmentId}')) {
      // Use created attachment or fallback
      const attachmentId = createdResources.attachments && createdResources.attachments.length > 0
        ? createdResources.attachments[0]
        : '10000'; // fallback ID
      replacedEndpoint = replacedEndpoint.replace('{attachmentId}', attachmentId);
    }

    if (endpoint.includes('{workflowSchemeId}')) {
      // For workflow scheme ID use saved value from first test
      const workflowSchemeId = createdResources.workflowSchemes && createdResources.workflowSchemes.length > 0
        ? createdResources.workflowSchemes[0]
        : '1'; // fallback ID for testing
      replacedEndpoint = replacedEndpoint.replace('{workflowSchemeId}', workflowSchemeId);
    }

    // Processing {linkId} requires special logic - will be handled in runTest
    // as it requires async request to get link ID

    return replacedEndpoint;
  }

  /**
   * Execute test case from shared test cases via direct API call
   */
  async runSharedTestCase (testCase) {
    // Check selective execution using new group system
    if (testCase.fullId && !this.shouldRunTest(testCase.fullId)) {
      return null; // Skip execution test
    }

    const api = testCase.directApi;
    const originalEndpoint = api.endpoint;

    // Special handling for tests, requiring linkId
    if (originalEndpoint.includes('{linkId}')) {
      let linkReplacement = 'ISSUE_NOT_FOUND';
      try {
        // Get information about tasks and their links
        const options = { fullId: testCase.fullId + '-link-lookup' }; // This auxiliary request, therefore add suffix
        const issueResult = await this.makeRequest('GET', `/issue/${this.testIssueKey}`, null, options);
        const links = issueResult?.data?.fields?.issuelinks;
        if (issueResult.success && links?.length) {
          const linkKey = this.sharedTestCases.secondTestIssueKey;
          // Search for link with type TEST_ISSUE_LINK_TYPE and second tasks
          const targetLink = links.find(link =>
            (link.type?.name === linkKey) ||
            (link.outwardIssue?.key === linkKey) ||
            (link.inwardIssue?.key === linkKey),
          );
          linkReplacement = targetLink?.id || 'LINK_NOT_FOUND';
        }
      } catch (error) {
        linkReplacement = 'ERROR_GETTING_LINKS';
      }
      api.endpoint = originalEndpoint.replace('{linkId}', linkReplacement);
    } else if (originalEndpoint.includes('{workflowSchemeId}') && testCase.dependsOn === 'Get Project Workflow Scheme') {
      // Special handling for tests workflow scheme - use already saved ID
      let workflowSchemeId = null;
      try {
        const createdResources = this.resourceManager.getCreatedResources();

        if (createdResources.workflowSchemes?.length) {
          workflowSchemeId = createdResources.workflowSchemes[0];
        } else {
          // If ID still not received, get it from first test
          const options = { fullId: testCase.fullId + '-scheme-lookup' }; // This auxiliary request, therefore add suffix
          const schemeResult = await this.makeRequest('GET', `/project/${this.testProjectKey}/workflowscheme`, null, options);
          workflowSchemeId = schemeResult?.data?.id;
          if (schemeResult.success && workflowSchemeId) {
            this.resourceManager.addResource('workflowSchemes', workflowSchemeId);
          } else {
            workflowSchemeId = '1'; // fallback
          }
        }
        // Replace remaining placeholders
        api.endpoint = await this.replacePlaceholders(api.endpoint);
      } catch (error) {
        workflowSchemeId = 'ERROR_GETTING_SCHEME';
      }
      api.endpoint = originalEndpoint.replace('{workflowSchemeId}', workflowSchemeId);

    } else {
      // Replace placeholders in endpoint
      api.endpoint = await this.replacePlaceholders(originalEndpoint);
    }

    // Special handling for tests, requiring files
    if (testCase.requiresFile && api.method === 'POST' && api.endpoint.includes('/attachments')) {
      // Create test file for attachment
      const testFileContent = 'This is a test file for JIRA attachment testing.';
      const blob = new Blob([testFileContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('comment', 'Test upload via API');
      formData.append('file', blob, 'test-attachment.txt');
      api.data = formData;
    }

    // Determine request method
    let result;
    const options = { fullId: testCase.fullId };
    if (api.endpoint.startsWith('/agile/')) {
      result = await this.makeAgileRequest(api.method, api.endpoint, api.data, options);
    } else {
      result = await this.makeRequest(api.method, api.endpoint, api.data, options);
    }

    // Validate result ONLY if request was successful
    let validation = { success: true, message: null };
    if (result.success) {
      validation = TestValidationUtils.validateDirectApiResponse(result, testCase);

      // If validation not passed, mark test as unsuccessful
      if (!validation.success) {
        result.success = false;
        result.error = validation.message;
      }
    }

    this.logTest(testCase.name, result, testCase.expectedStatus, api.endpoint, testCase.fullId);

    // Output result validation
    if (!validation.success) {
      console.log(`❌ VALIDATION FAIL ${testCase.name} [${testCase.fullId}] - ${validation.message}`);
    } else {
      console.log(`✅ VALIDATION PASS ${testCase.name} - ${testCase.description}`);
    }

    // Execute cleanup if necessary - register created resources
    if (testCase.cleanup && result.success) {
      // Execute cleanup in specific testCase, but also register in our ResourceManager
      testCase.cleanup(result.data);

      // Additionally register in our ResourceManager for placeholders
      if (testCase.name === 'Create Version' && result.data && result.data.id) {
        this.resourceManager.addResource('versions', result.data.id);
      }
      if (testCase.name === 'Create Issue' && result.data && result.data.key) {
        this.resourceManager.addResource('issues', result.data.key);
      }
      if (testCase.name === 'Create Attachment' && result.data && Array.isArray(result.data) && result.data.length > 0 && result.data[0].id) {
        this.resourceManager.addResource('attachments', result.data[0].id);
      }
    }

    // Register important resources already without cleanup
    if (result.success) {
      if (testCase.name === 'Get Project Workflow Scheme' && result.data && result.data.id) {
        this.resourceManager.addResource('workflowSchemes', result.data.id);
        console.log(`💾 Saved workflow scheme ID: ${result.data.id} for subsequent tests`);
      }
    }

    return result;
  }

  /**
   * Execute tests of specific category
   */
  async runTestsByCategory (categoryName) {
    const testCases = this.sharedTestCases.getTestCasesByCategory(categoryName);

    // Check, is are tests for execution in this category
    if (this.selectedTestsGrouped !== null) {
      // In mode selective execution check, is are selected tests in category
      const selectedTestsInCategory = testCases.filter(tc =>
        tc.fullId && this.shouldRunTest(tc.fullId),
      );

      if (selectedTestsInCategory.length === 0) {
        // Category skipped completely
        return;
      }

      console.log(`\n=== TESTING ${categoryName.toUpperCase()} (${selectedTestsInCategory.length}/${testCases.length} tests selected) ===`);
    } else {
      // Execute all tests in category
      console.log(`\n=== TESTING ${categoryName.toUpperCase()} (${testCases.length} tests) ===`);
    }

    for (const testCase of testCases) {
      try {
        const result = await this.runSharedTestCase(testCase);
        if (result === null) {
          // Test was skipped due to selective execution
          continue;
        }
      } catch (error) {
        console.log(`❌ ERROR ${testCase.name} - ${error.message}`);
      }
    }
  }

  /**
   * Cascade tests disabled - use only legacy code
   */
  async runCascadeTests () {
    console.log('\n=== CASCADE TESTS DISABLED ===');
    console.log('Cascade tests have been removed. All operations now use individual test cases.');
  }

  /**
   * Run minimal shared test cases
   */
  async testSharedTestCases () {
    await this.runTestsByCategory('system');
  }

  /**
   * === INFORMATIONAL ENDPOINTS ===
   */


  async testIssueEndpoints () {
    await this.runTestsByCategory('informational');
    await this.runTestsByCategory('issueDetailed');
  }

  async testSearchEndpoints () {
    await this.runTestsByCategory('searchDetailed');
  }

  async testProjectEndpoints () {
    await this.runTestsByCategory('projectDetailed');
  }

  async testUserEndpoints () {
    await this.runTestsByCategory('userDetailed');
  }

  async testMetadataEndpoints () {
    await this.runTestsByCategory('metadataDetailed');
  }

  /**
   * === MODIFYING ENDPOINTS ===
   */

  async testModifyingEndpoints () {
    await this.runTestsByCategory('modifying');
  }

  /**
   * === AGILE/BOARD ENDPOINTS ===
   */

  async testAgileEndpoints () {
    await this.runTestsByCategory('agile');
  }

  /**
   * === ADD ENDPOINTS ===
   */

  async testAdditionalEndpoints () {
    await this.runTestsByCategory('system');
    await this.runTestsByCategory('additional');
  }

  /**
   * === WORKFLOW SCHEMES ENDPOINTS ===
   */

  async testWorkflowSchemesEndpoints () {
    // First get project ID for TEST_JIRA_PROJECT
    await this.getProjectId();
    await this.runTestsByCategory('workflowSchemes');
  }

  /**
   * Get ID project by key
   */
  async getProjectId () {
    if (this.testProjectId !== null) {
      return this.testProjectId; // Already received
    }

    try {
      console.log(`🔍 Searching for project ID for "${this.testProjectKey}"...`);
      const result = await this.makeRequest('GET', `/project/${this.testProjectKey}`);

      if (result.success && result.data && result.data.id) {
        this.testProjectId = result.data.id;
        this.sharedTestCases.testProjectId = result.data.id;
        console.log(`✅ Found project ID: ${this.testProjectId} for project "${this.testProjectKey}"`);
        return this.testProjectId;
      } else {
        console.log(`❌ Could not find project ID for "${this.testProjectKey}", using fallback: 10000`);
        this.testProjectId = '10000'; // fallback
        this.sharedTestCases.testProjectId = '10000';
        return this.testProjectId;
      }
    } catch (error) {
      console.log(`❌ Error getting project ID for "${this.testProjectKey}": ${error.message}, using fallback: 10000`);
      this.testProjectId = '10000'; // fallback
      this.sharedTestCases.testProjectId = '10000';
      return this.testProjectId;
    }
  }

  async cleanupTestIssue () {
    console.log('\n--- Cleaning Up Test Resources ---');

    const createdResources = this.resourceManager.getCreatedResources();

    // Delete created versions
    for (const versionId of createdResources.versions) {
      const deleteVersion = await this.makeRequest('DELETE', `/version/${versionId}`);
      // Cleanup not logged as test - this service operation
      if (deleteVersion.success) {
        console.log(`✅ Deleted Version ${versionId}`);
      } else {
        console.log(`❌ Failed to delete Version ${versionId}: ${deleteVersion.error}`);
      }
    }

    // Delete created tasks
    for (const issueKey of createdResources.issues) {
      const deleteIssue = await this.makeRequest('DELETE', `/issue/${issueKey}`);
      // Cleanup not logged as test - this service operation
      if (deleteIssue.success) {
        console.log(`✅ Deleted Issue ${issueKey}`);
      } else {
        console.log(`❌ Failed to delete Issue ${issueKey}: ${deleteIssue.error}`);
      }
    }

    console.log('✅ Cleanup completed');
    this.resourceManager.clearAll();
  }

  /**
   * === MAIN METHOD LAUNCH ALL TESTS ===
   */

  async runAllTests () {
    console.log('🚀 Starting comprehensive JIRA REST API v2 endpoint tests...');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log(`👤 Auth: ${this.auth.type} (${this.auth.username})`);
    console.log(`📋 Test Project: ${this.testProjectKey}\n`);

    const startTime = Date.now();

    try {
      // First run shared test cases for consistency with MCP tests
      await this.testSharedTestCases();

      // Test informational endpoints
      await this.testIssueEndpoints();
      await this.testSearchEndpoints();
      await this.testProjectEndpoints();
      await this.testUserEndpoints();
      await this.testMetadataEndpoints();

      // Test modifying endpoints
      await this.testModifyingEndpoints();

      // Test Agile endpoints
      await this.testAgileEndpoints();

      // Test additional endpoints
      await this.testAdditionalEndpoints();

      // Test workflow schemes endpoints
      await this.testWorkflowSchemesEndpoints();

      // Test cascade operations
      await this.runCascadeTests();

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
      await this.cleanupTestIssue();
      await this.generateReport(startTime);
    }
  }

  /**
   * Run extended tests for all endpoints emulator
   */
  async runExtendedTests () {
    console.log('🚀 Starting EXTENDED JIRA EMULATOR tests...');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log('🔍 Testing ALL implemented endpoints comprehensively...\n');

    const startTime = Date.now();

    try {
      // Run all category tests from SharedJiraTestCases
      await this.runTestsByCategory('system');
      await this.testSharedTestCases();
      await this.testIssueEndpoints();
      await this.testSearchEndpoints();
      await this.testProjectEndpoints();
      await this.testUserEndpoints();
      await this.testMetadataEndpoints();

      // Test modifying endpoints
      await this.testModifyingEndpoints();

      // Test Agile endpoints
      await this.testAgileEndpoints();

      // Test additional endpoints
      await this.testAdditionalEndpoints();

      // Test cascade operations
      await this.runCascadeTests();

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
      await this.cleanupTestIssue();
      await this.generateReport(startTime);
    }
  }

  async generateReport (startTime) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('📊 JIRA REST API v2 ENDPOINT TESTING REPORT');
    console.log('='.repeat(80));
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log('='.repeat(80));

    // Add statistics by groups if is tests with fullId
    const groupedTests = this.testResults.filter(t => t.fullId);
    if (groupedTests.length > 0) {
      console.log('\n📋 STATISTICS BY TEST GROUPS:');
      console.log('-'.repeat(60));

      // Get statistics by groups
      const groupStats = {};
      const allGroupInfo = this.sharedTestCases.getAllGroupInfo();

      groupedTests.forEach(test => {
        if (test.fullId) {
          const [groupNumber] = test.fullId.split('-').map(n => parseInt(n));
          if (!groupStats[groupNumber]) {
            groupStats[groupNumber] = {
              name: allGroupInfo[groupNumber]?.name || `Group ${groupNumber}`,
              total: 0,
              passed: 0,
              failed: 0,
              tests: [],
            };
          }
          groupStats[groupNumber].total++;
          if (test.success) {
            groupStats[groupNumber].passed++;
          } else {
            groupStats[groupNumber].failed++;
            groupStats[groupNumber].tests.push(test);
          }
        }
      });

      // Output statistics by groups
      Object.keys(groupStats)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(groupNumber => {
          const stats = groupStats[groupNumber];
          const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
          const status = stats.failed === 0 ? '✅' : '❌';
          console.log(`${status} Group ${groupNumber}: ${stats.name} - ${stats.passed}/${stats.total} (${passRate}%)`);
        });

      console.log('-'.repeat(60));
    }

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(t => !t.success)
        .forEach(test => {
          const testId = test.fullId || 'Unknown';
          console.log(`   • [${testId}] ${test.name} [${test.method} ${test.endpoint}] - ${test.status}: ${test.details}`);
        });

      // Show failed tests by groups
      const groupedFailedTests = this.testResults.filter(t => !t.success && t.fullId);
      if (groupedFailedTests.length > 0) {
        console.log('\n❌ FAILED TESTS BY GROUPS:');
        const failedByGroup = {};
        groupedFailedTests.forEach(test => {
          const [groupNumber] = test.fullId.split('-').map(n => parseInt(n));
          if (!failedByGroup[groupNumber]) {
            failedByGroup[groupNumber] = [];
          }
          failedByGroup[groupNumber].push(test);
        });

        Object.keys(failedByGroup)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .forEach(groupNumber => {
            const groupInfo = this.sharedTestCases.getGroupInfo(parseInt(groupNumber));
            console.log(`   Group ${groupNumber} (${groupInfo?.name || 'Unknown'}):`);
            failedByGroup[groupNumber].forEach(test => {
              console.log(`     • [${test.fullId}] ${test.name} - ${test.details}`);
            });
          });
      }

      if (this.failedTestIds && this.failedTestIds.length > 0) {
        console.log(`\n❌ FAILED TEST IDs: ${this.failedTestIds.join(',')}`);
      }
    }

    console.log('\n📝 Detailed results saved to testResults array');
    console.log('🎯 All JIRA REST API v2 endpoints have been tested!');

    // Return results for programmatic usage
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      duration,
      results: this.testResults,
      groupStatistics: groupedTests.length > 0 ? this.sharedTestCases.getGroupStatistics() : null,
    };
  }
}

// ES Modules export
export default JiraEndpointsTester;

// Auto-run if file run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    const tester = new JiraEndpointsTester();

    // Check arguments command line
    const args = process.argv.slice(2);
    const isExtended = args.includes('--extended') || args.includes('-e');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
      console.log('🚀 JIRA REST API v2 Endpoints Tester\n');
      console.log('Usage: node tests/jira-endpoints-tester.js [options]\n');
      console.log('Options:');
      console.log('  --extended, -e     Run extended test suite');
      console.log('  --tests=1-1,5-*,10  Run only specific tests (group-test format)');
      console.log('  --help, -h         Show this help message\n');
      console.log('Examples:');
      console.log('  node tests/jira-endpoints-tester.js --tests=1-1,5-*');
      console.log('  node tests/jira-endpoints-tester.js --tests=2,4-*');
      console.log('  node tests/jira-endpoints-tester.js --extended\n');
      return;
    }

    if (isExtended) {
      console.log('📋 Running EXTENDED test suite...\n');
      await tester.runExtendedTests();
    } else {
      console.log('📋 Running standard test suite...');
      if (tester.selectedTestsGrouped) {
        console.log(`🎯 Selected tests: ${tester.selectedTestsGrouped.length} selection(s)`);
      } else {
        console.log('💡 Tip: Use --extended or -e flag for comprehensive testing');
        console.log('💡 Tip: Use --tests=1-1,5-*,10 for selective test execution');
      }
      console.log('');
      await tester.runAllTests();
    }
  })();
}
