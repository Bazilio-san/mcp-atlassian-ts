#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA REST API v2 Endpoints Tester - Refactored
 * Extends BaseTestExecutor for unified testing infrastructure
 */

import fetch from 'node-fetch';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import BaseTestExecutor from './core/base-test-executor.js';
import ResourceManager from './core/resource-manager.js';
import CascadeExecutor from './core/cascade-executor.js';
import TestValidationUtils from './core/test-validation-utils.js';
import { apiResponseLogger } from './core/api-response-logger.js';
import SharedJiraTestCases from './core/test-cases.js';
import { TEST_ISSUE_KEY, TEST_JIRA_PROJECT, TEST_ISSUE_TYPE_NAME, TEST_SECOND_ISSUE_KEY } from './constants.js';
import { isObj } from './core/utils.js';

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

/**
 * JIRA Direct API Test Executor
 * Extends BaseTestExecutor for consistent test execution
 */
class JiraDirectApiExecutor extends BaseTestExecutor {
  constructor(config = {}) {
    super(config);

    // JIRA-specific configuration
    this.baseUrl = url || 'http://localhost:8080';
    if (pat && pat.length > 3) {
      this.auth = { type: 'token', token: pat };
    } else {
      this.auth = { type: 'basic', username, password };
    }

    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testProjectId = null; // Will be obtained dynamically
    this.testIssueKey = TEST_ISSUE_KEY;

    // Custom headers support
    this.customHeaders = this.parseTestXHeaders();

    // Initialize shared test cases
    this.sharedTestCases = new SharedJiraTestCases();

    // Resource tracking
    this.resourceManager = new ResourceManager({ source: 'direct', verbose: config.verbose });
    this.setResourceManager(this.resourceManager);

    // Track created resources
    this.createdResources = {
      issues: [],
      versions: [],
      links: [],
      attachments: [],
      workflowSchemes: [],
    };
  }

  /**
   * Parse X-Headers from environment
   */
  parseTestXHeaders() {
    const headers = {};
    // Parse TEST_ADD_X_HEADER (key:value format)
    const testAddHeader = process.env.TEST_ADD_X_HEADER;
    if (testAddHeader) {
      const [key, value] = testAddHeader.split(":");
      if (key && value && key.toLowerCase().startsWith("x-")) {
        headers[key] = value;
        console.log(`📝 Added custom header: ${key}: ${value}`);
      }
    }

    if (Object.keys(headers).length > 0) {
      console.log(`🔧 Custom headers configured:`, headers);
    }

    return headers;
  }

  /**
   * Create temporary issue for testing deletion
   */
  async createTemporaryIssue() {
    const createIssueBody = {
      fields: {
        project: { key: this.testProjectKey },
        summary: `Temporary test issue for deletion ${Date.now()}`,
        description: 'This issue will be deleted by test 8-11',
        issuetype: { id: '1' }, // Try standard Task ID
        customfield_10304: 'TEST', // Environment/Contour field for Finam JIRA
      },
    };

    const url = `${this.baseUrl}/rest/api/2/issue`;
    const options = {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(createIssueBody),
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Silent parse error
        }
      }

      if (response.status === 201 && data.key) {
        // Track for cleanup
        this.createdResources.issues.push(data.key);
        this.resourceManager.trackIssue(data.key, this.testProjectKey);
        return { success: true, key: data.key };
      }

      const errorMsg = data.errorMessages ? data.errorMessages.join(', ') :
                       (data.errors ? JSON.stringify(data.errors) :
                       (typeof data === 'string' ? data : 'Unknown error'));
      return { success: false, error: errorMsg };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create test attachment for issue
   */
  async createTestAttachment(issueKey) {
    // Create multipart form data with boundary
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(7);

    // Build multipart body
    const body = [
      `------${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.txt"',
      'Content-Type: text/plain',
      '',
      'This is a test file content for JIRA attachment testing',
      `------${boundary}--`
    ].join('\r\n');

    const url = `${this.baseUrl}/rest/api/2/issue/${issueKey}/attachments`;
    const headers = {
      ...this.getHeaders(),
      'Content-Type': `multipart/form-data; boundary=----${boundary}`,
      'X-Atlassian-Token': 'no-check'
    };

    // Remove the default Content-Type header that was set to application/json
    delete headers['Accept'];
    headers['Accept'] = '*/*';

    const options = {
      method: 'POST',
      headers,
      body
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Silent parse error
        }
      }

      if (response.status === 200 && data && data.length > 0) {
        // Track for cleanup
        const attachmentId = data[0].id;
        this.createdResources.attachments = this.createdResources.attachments || [];
        this.createdResources.attachments.push(attachmentId);
        return { success: true, attachmentId, data };
      }

      return {
        success: false,
        status: response.status,
        error: data?.errorMessages?.join(', ') || `Status ${response.status}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get remote links for issue and return first link ID
   */
  async getRemoteLinkId(issueKey) {
    const url = `${this.baseUrl}/rest/api/2/issue/${issueKey}/remotelink`;
    const headers = this.getHeaders();

    const options = {
      method: 'GET',
      headers
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Silent parse error
        }
      }

      if (response.status === 200 && Array.isArray(data) && data.length > 0) {
        // Return the ID of the first remote link
        return data[0].id;
      }

      return null;
    } catch (error) {
      console.error('Failed to get remote links:', error.message);
      return null;
    }
  }

  /**
   * Clean up remote links for test issue, keeping only one
   */
  async cleanupRemoteLinks() {
    try {
      // Get all remote links for the test issue
      const url = `${this.baseUrl}/rest/api/2/issue/${this.testIssueKey}/remotelink`;
      const headers = this.getHeaders();

      const getOptions = {
        method: 'GET',
        headers
      };

      const response = await fetch(url, getOptions);
      const text = await response.text();
      let remoteLinks = null;

      if (text) {
        try {
          remoteLinks = JSON.parse(text);
        } catch (e) {
          // Silent parse error
        }
      }

      if (response.status === 200 && Array.isArray(remoteLinks) && remoteLinks.length > 1) {
        console.log(`\n🔗 Cleaning up remote links for ${this.testIssueKey} (found ${remoteLinks.length}, keeping 1)`);

        // Delete all remote links except the first one
        const linksToDelete = remoteLinks.slice(1); // Keep the first one, delete the rest
        let deletedCount = 0;

        for (const link of linksToDelete) {
          try {
            const deleteUrl = `${this.baseUrl}/rest/api/2/issue/${this.testIssueKey}/remotelink/${link.id}`;
            const deleteOptions = {
              method: 'DELETE',
              headers
            };

            const deleteResponse = await fetch(deleteUrl, deleteOptions);
            if (deleteResponse.status === 204 || deleteResponse.status === 200) {
              deletedCount++;
            } else {
              console.error(`  ❌ Failed to delete remote link ${link.id}: Status ${deleteResponse.status}`);
            }
          } catch (err) {
            console.error(`  ❌ Error deleting remote link ${link.id}:`, err.message);
          }
        }

        if (deletedCount > 0) {
          console.log(`  ✅ Deleted ${deletedCount} remote links, kept 1`);
        }
        return deletedCount;
      } else if (remoteLinks && remoteLinks.length === 1) {
        console.log(`  ℹ️  Only one remote link found, keeping it`);
        return 0;
      } else if (remoteLinks && remoteLinks.length === 0) {
        console.log(`  ℹ️  No remote links found to clean up`);
        return 0;
      }

      return 0;
    } catch (error) {
      console.error('❌ Failed to cleanup remote links:', error.message);
      return 0;
    }
  }

  /**
   * Get Scrum board ID from available boards
   */
  async getScrumBoardId() {
    const url = `${this.baseUrl}/rest/agile/1.0/board`;
    const headers = this.getHeaders();

    const options = {
      method: 'GET',
      headers
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Silent parse error
        }
      }

      if (response.status === 200 && data?.values) {
        // Find first Scrum board
        const scrumBoard = data.values.find(board => board.type === 'scrum');
        if (scrumBoard) {
          return scrumBoard.id;
        }
        // If no Scrum board found, try to find any board
        if (data.values.length > 0) {
          return data.values[0].id;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get Scrum board:', error.message);
      return null;
    }
  }

  /**
   * Get headers for API request
   */
  getHeaders() {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };

    if (this.auth.type === 'token') {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    } else {
      const token = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
    }

    return headers;
  }

  /**
   * Execute a test case (implementation of abstract method)
   */
  async executeTestCase(testCase) {
    // Skip tests without direct API configuration
    if (!testCase.directApi) {
      return {
        skipped: true,
        reason: 'No direct API configuration',
      };
    }

    // Handle tests that require setup (like Delete Issue)
    let tempIssueKey = null;
    if (testCase.requiresSetup && testCase.fullId === '8-12') {
      // If we have any created issues from previous tests, use the last one
      if (this.createdResources.issues.length > 0) {
        tempIssueKey = this.createdResources.issues[this.createdResources.issues.length - 1];
        // Remove from array as we're going to delete it
        this.createdResources.issues.pop();
      } else {
        // Try to create a temporary issue for deletion test (silently)
        const createResult = await this.createTemporaryIssue();
        if (!createResult.success) {
          // Return as failed test, not skipped
          return {
            status: 400,
            data: { errorMessages: [createResult.error || 'Failed to create temporary issue for delete test'] },
          };
        }
        tempIssueKey = createResult.key;
      }
      // Continue to delete the created issue
    }

    const { method, endpoint, data: body, headers: additionalHeaders = {} } = testCase.directApi;

    // Special handling for attachment creation test with requiresFile flag
    if (testCase.requiresFile && testCase.fullId === '10-1') {
      // Set URL and HTTP method for diagnostics
      testCase.url = `${this.baseUrl}/rest/api/2/issue/${this.testIssueKey}/attachments`;
      testCase.httpMethod = 'POST';

      const result = await this.createTestAttachment(this.testIssueKey);
      if (result.success) {
        // Track the created attachment
        if (result.data && result.data.length > 0) {
          this.trackCreatedResource(testCase, result.data[0]);
        }
        return {
          status: 200,
          data: result.data,
          headers: {},
        };
      } else {
        return {
          status: result.status || 415,
          data: { errorMessages: [result.error || 'Failed to create attachment'] },
          headers: {},
        };
      }
    }

    // Handle tests that require version ID (Update Version, Get Version, Delete Version)
    let versionId = null;
    if (endpoint && endpoint.includes('{versionId}')) {
      // Use the last created version ID if available
      if (this.createdResources.versions.length > 0) {
        versionId = this.createdResources.versions[this.createdResources.versions.length - 1];
        // If this is a delete operation, remove from tracking
        if (testCase.fullId === '8-13' && testCase.directApi.method === 'DELETE') {
          this.createdResources.versions.pop();
        }
      } else {
        // Return as failed test if no version available
        return {
          status: 400,
          data: { errorMessages: [`No version available for ${testCase.name || 'version'} test. Run test 8-5 (Create Version) first.`] },
        };
      }
    }

    // Handle tests that require link ID (Delete Issue Link)
    let linkId = null;
    if (endpoint && endpoint.includes('{linkId}')) {
      // For link deletion, we need to fetch the actual link ID
      // Since JIRA doesn't return link ID on creation, we need to query for it
      if (testCase.fullId === '8-14') {
        // Try to get issue links and find the one we created
        try {
          const getLinksUrl = `${this.baseUrl}/rest/api/2/issue/${this.testIssueKey}?fields=issuelinks`;
          const getLinksOptions = {
            method: 'GET',
            headers: this.getHeaders(),
          };
          const linksResponse = await fetch(getLinksUrl, getLinksOptions);
          if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            if (linksData.fields && linksData.fields.issuelinks && linksData.fields.issuelinks.length > 0) {
              // Use the first link found
              linkId = linksData.fields.issuelinks[0].id;
            }
          }
        } catch (err) {
          // Silent error - will fail with no link available message
        }
      }

      if (!linkId) {
        // Return as failed test if no link available
        return {
          status: 400,
          data: { errorMessages: [`No issue link available for ${testCase.name || 'link'} test. Could not find any links for issue ${this.testIssueKey}.`] },
        };
      }
    }

    // Handle tests that require remote link ID (Delete Remote Link)
    let remoteLinkId = null;
    if (endpoint && endpoint.includes('{remoteLinkId}')) {
      // For test 8-11, get remote link ID
      if (testCase.fullId === '8-11') {
        remoteLinkId = await this.getRemoteLinkId(this.testIssueKey);
        if (!remoteLinkId) {
          // Return as failed test if no remote link available
          return {
            status: 400,
            data: { errorMessages: [`No remote link available for deletion. Run test 8-9 (Create Remote Link) first.`] },
          };
        }
      }
    }

    // Handle tests that require attachment ID
    let attachmentId = null;
    if (endpoint && endpoint.includes('{attachmentId}')) {
      // Use the last created attachment ID if available
      if (this.createdResources.attachments.length > 0) {
        attachmentId = this.createdResources.attachments[this.createdResources.attachments.length - 1];
        // If this is a delete operation, remove from tracking
        if (testCase.fullId === '10-3' && testCase.directApi.method === 'DELETE') {
          this.createdResources.attachments.pop();
        }
      } else {
        // Return as failed test if no attachment available
        return {
          status: 400,
          data: { errorMessages: [`No attachment available for ${testCase.name || 'attachment'} test. Run test 10-1 (Create Attachment) first.`] },
        };
      }
    }

    // Handle tests that require workflow scheme ID
    let workflowSchemeId = null;
    if (endpoint && endpoint.includes('{workflowSchemeId}')) {
      // Use the last created workflow scheme ID if available
      if (this.createdResources.workflowSchemes.length > 0) {
        const lastScheme = this.createdResources.workflowSchemes[this.createdResources.workflowSchemes.length - 1];
        workflowSchemeId = typeof lastScheme === 'object' ? lastScheme.id : lastScheme;
      } else {
        // Try to get from project
        // For now, just return error
        return {
          status: 400,
          data: { errorMessages: [`No workflow scheme available for ${testCase.name || 'workflow scheme'} test.`] },
        };
      }
    }

    // Handle tests that require board ID for Agile
    let boardId = null;
    if (endpoint && endpoint.includes('{boardId}')) {
      // Initialize board ID for all Agile tests
      if (!this.cachedBoardId) {
        // Cache the board ID to avoid repeated fetches
        this.cachedBoardId = '1'; // Default fallback
      }

      // For test 9-2 (Get Board Sprints), fetch a Scrum board ID
      if (testCase.fullId === '9-2') {
        const scrumBoardId = await this.getScrumBoardId();
        if (scrumBoardId) {
          boardId = scrumBoardId.toString();
          this.cachedBoardId = boardId; // Cache for future use
        } else {
          // Return early if no Scrum board found
          return {
            status: 400,
            data: { errorMessages: ['No Scrum board found in the system'] },
          };
        }
      } else if (testCase.fullId === '9-3') {
        // For Get Board Issues, use the cached board ID from 9-1 or 9-2
        boardId = this.cachedBoardId || '1';
      } else {
        // For other tests (9-1), the board ID will be determined from the Get Boards response
        boardId = '1'; // This will be replaced if Get Boards succeeds
      }
    }

    // Replace placeholders in endpoint
    let finalEndpoint = endpoint
      .replace('{projectKey}', this.testProjectKey)
      .replace('{issueKey}', this.testIssueKey)
      .replace('{tempIssueKey}', tempIssueKey || this.testIssueKey)
      .replace('{projectId}', this.testProjectId || '10000')
      .replace('{username}', this.sharedTestCases.testUsername)
      .replace('{versionId}', versionId || '')
      .replace('{linkId}', linkId || '')
      .replace('{remoteLinkId}', remoteLinkId || '')
      .replace('{attachmentId}', attachmentId || '')
      .replace('{workflowSchemeId}', workflowSchemeId || '')
      .replace('{boardId}', boardId || '');

    // Special handling for Agile API endpoints
    let url;
    if (finalEndpoint.startsWith('/rest/agile/')) {
      // For Agile API, use the path as-is without adding /rest/api/2
      url = `${this.baseUrl}${finalEndpoint}`;
    } else {
      // For regular JIRA API endpoints, add /rest/api/2
      url = `${this.baseUrl}/rest/api/2${finalEndpoint}`;
    }
    testCase.url = url;
    testCase.httpMethod = method;
    const finalHeaders = {
      ...this.getHeaders(),
      ...additionalHeaders,
    };

    const options = {
      method,
      headers: finalHeaders,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';

      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.text();
        if (data) {
          try {
            data = JSON.parse(data);
          } catch (err) {
            //
          }
        }
      }

      // Log response if enabled
      if (apiResponseLogger.isEnabled()) {
        apiResponseLogger.logDirectApiResponse(
          testCase.fullId || testCase.id,
          testCase.name,
          method,
          finalEndpoint,
          response.status,
          data,
          finalHeaders
        );
      }

      // Track created resources
      this.trackCreatedResource(testCase, data);

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  /**
   * Track created resources for cleanup
   */
  trackCreatedResource(testCase, responseData) {
    if (!isObj(responseData) || !testCase.fullId) {
      return;
    }

    // Track based on test case
    if (testCase.fullId === '8-1' && responseData.key) {
      // Created issue
      this.createdResources.issues.push(responseData.key);
      this.resourceManager.trackIssue(responseData.key, this.testProjectKey);
    } else if (testCase.fullId === '8-5' && responseData.id) {
      // Created version
      this.createdResources.versions.push(responseData.id);
      this.resourceManager.trackVersion(responseData.id, this.testProjectKey);
    } else if (testCase.fullId === '8-8') {
      // Created issue link - for 8-8 the response is typically empty (201 with no body)
      // We need to extract the link ID from the Location header or use a placeholder
      // For now, use a placeholder since JIRA doesn't return the link ID directly
      this.createdResources.links.push('created-link-id');
      this.resourceManager.trackLink('created-link-id');
    } else if (testCase.fullId === '8-9' && responseData.id) {
      // Created remote link
      this.createdResources.links.push(responseData.id);
      this.resourceManager.trackLink(responseData.id);
    } else if (testCase.fullId === '10-1') {
      // Created attachment - response is array
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].id) {
        this.createdResources.attachments.push(responseData[0].id);
        this.resourceManager.trackAttachment(responseData[0].id);
      }
    } else if (testCase.fullId === '11-1' && responseData.id) {
      // Created workflow scheme
      this.createdResources.workflowSchemes.push({
        id: responseData.id,
        name: responseData.name
      });
      this.resourceManager.trackWorkflowScheme(responseData.id, responseData.name);
    }
  }

  /**
   * Get source type (implementation of abstract method)
   */
  getSourceType() {
    return 'direct';
  }

  /**
   * Run single test case (for cascade executor)
   */
  async runTestCase(testCase) {
    const result = await this.executeTestCase(testCase);

    // Convert to format expected by cascade executor
    return {
      success: !result.skipped && (result.status === 200 || result.status === 201 || result.status === 204),
      data: result.data,
      status: result.status,
      error: result.error || result.reason
    };
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log(`\n🔗 JIRA API URL: ${this.baseUrl}`);
    console.log(`📦 Authentication: ${this.auth.type}`);
    console.log(`📦 Test Project Key: ${this.testProjectKey}`);
    console.log(`📦 Test Issue Key: ${this.testIssueKey}`);
    console.log(`📦 Test Second Issue Key: ${TEST_SECOND_ISSUE_KEY}`);

    // Get all test cases
    const o = this.sharedTestCases;
    const allTestCases = [
      ...o.getSystemTestCases(),
      ...o.getInformationalTestCases(),
      ...o.getIssueDetailedTestCases(),
      ...o.getSearchDetailedTestCases(),
      ...o.getProjectDetailedTestCases(),
      ...o.getUserDetailedTestCases(),
      ...o.getMetadataDetailedTestCases(),
      ...o.getModifyingTestCases(),
      ...o.getAgileTestCases(),
      ...o.getAdditionalTestCases(),
      ...o.getWorkflowSchemesTestCases(),
      ...o.getExtendedTestCases(),
    ];

    // Apply test filter if specified
    let testCases = allTestCases;
    if (this.testFilter) {
      const selectedTests = this.parseTestFilter(this.testFilter);
      testCases = allTestCases.filter(tc =>
        selectedTests.some(sel => this.matchesSelection(tc, sel))
      );
      console.log(`🎯 Running ${testCases.length} of ${allTestCases.length} tests based on filter: ${this.testFilter}\n`);
    }

    // Run tests using base executor
    const result = await this.runAllTests(testCases);

    // Cleanup remote links for the test issue (keep only one)
    await this.cleanupRemoteLinks();

    // Additional cleanup for JIRA-specific resources
    if (this.createdResources.issues.length > 0) {
      console.log(`\n📝 Created issues during tests: ${this.createdResources.issues.join(', ')}`);
    }

    return result;
  }

  /**
   * Parse test filter string
   */
  parseTestFilter(filterString) {
    const selections = [];
    const parts = filterString.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === '*') {
        return [{ type: 'all' }];
      }

      if (trimmed.includes('-')) {
        const [group, test] = trimmed.split('-');
        if (test === '*') {
          selections.push({ type: 'group', groupNumber: parseInt(group) });
        } else {
          selections.push({
            type: 'test',
            groupNumber: parseInt(group),
            testNumber: parseInt(test),
            fullId: trimmed
          });
        }
      } else {
        // Single number = entire group
        selections.push({ type: 'group', groupNumber: parseInt(trimmed) });
      }
    }

    return selections;
  }

  /**
   * Check if test case matches selection
   */
  matchesSelection(testCase, selection) {
    if (selection.type === 'all') return true;
    if (selection.type === 'group') {
      return testCase.groupNumber === selection.groupNumber;
    }
    if (selection.type === 'test') {
      return testCase.fullId === selection.fullId;
    }
    return false;
  }

  /**
   * Override shouldRunTest to disable base class filtering
   * (we handle filtering in runTests method)
   */
  shouldRunTest(testCase) {
    // Always return true - we handle filtering at a higher level
    return true;
  }

  /**
   * Run cascade tests (special JIRA workflow tests)
   */
  async runCascadeTests() {
    console.log('\n🔄 Running Cascade Tests');
    console.log('─'.repeat(50));

    const cascadeExecutor = new CascadeExecutor(this.resourceManager);

    // Get cascade test case from shared test cases
    const cascadeTestCase = this.sharedTestCases.getCascadeTestCases()[0];

    const cascadeResults = await cascadeExecutor.executeCascade(
      cascadeTestCase,
      this
    );

    // Add cascade results to our results
    // Add cascade results to our results
    if (cascadeResults && cascadeResults.steps) {
      cascadeResults.steps.forEach(step => {
        this.results.push({
          testId: `cascade-${step.testCase}`,
          name: `${step.step}: ${step.testCase}`,
          category: "Cascade",
          source: "direct",
          status: step.success ? "passed" : "failed",
          error: step.error || null,
          response: step.result || null,
          duration: 0,
        });

        this.stats.total++;
        if (step.success) this.stats.passed++;
        else this.stats.failed++;
      });
    }

    return cascadeResults;
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    testFilter: null,
  };

  // Parse test filter
  const testsArg = args.find(arg => arg.startsWith('--tests='));
  if (testsArg) {
    config.testFilter = testsArg.split('=')[1];
  }

  // Enable API response logging
  const logArg = args.find(arg => arg.startsWith('--log='));
  if (logArg) {
    const logFile = logArg.split('=')[1];
    apiResponseLogger.enable(logFile);
  }

  try {
    const executor = new JiraDirectApiExecutor(config);

    // Run main tests
    const result = await executor.runTests();

    // Run cascade tests if not filtered out
    if (!config.testFilter || config.testFilter.includes('13')) {
      await executor.runCascadeTests();
    }

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = process.argv[1] && (
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`
);

if (isMainModule) {
  main();
}

export default JiraDirectApiExecutor;
