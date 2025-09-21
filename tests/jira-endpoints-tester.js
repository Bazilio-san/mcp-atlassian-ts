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
import { SharedJiraTestCases, TestValidationUtils, CascadeExecutor } from './shared-test-cases.js';
import { TEST_ISSUE_KEY, TEST_JIRA_PROJECT } from './constants.js';
import { apiResponseLogger } from './core/api-response-logger.js';
import { isObj } from './utils.js';

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

    const { method, endpoint, body, headers: additionalHeaders = {} } = testCase.directApi;

    // Replace placeholders in endpoint
    let finalEndpoint = endpoint
      .replace('{projectKey}', this.testProjectKey)
      .replace('{issueKey}', this.testIssueKey)
      .replace('{projectId}', this.testProjectId || '10000')
      .replace('{username}', this.sharedTestCases.testUsername);

    const url = `${this.baseUrl}/rest/api/2${finalEndpoint}`;

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

    // Debug: Log headers being sent (excluding Authorization)
    if (this.verbose && Object.keys(this.customHeaders).length > 0) {
      const debugHeaders = { ...finalHeaders };
      if (debugHeaders.Authorization) {
        debugHeaders.Authorization = '[REDACTED]';
      }
      console.log(`  🔍 Sending headers:`, debugHeaders);
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
    } else if (testCase.fullId === '8-9' && responseData.id) {
      // Created issue link
      this.createdResources.links.push(responseData.id);
      this.resourceManager.trackLink(responseData.id);
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
   * Run all tests
   */
  async runTests() {
    console.log(`\n🔗 JIRA API URL: ${this.baseUrl}`);
    console.log(`📦 Authentication: ${this.auth.type}`);

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
      this.sharedTestCases
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
