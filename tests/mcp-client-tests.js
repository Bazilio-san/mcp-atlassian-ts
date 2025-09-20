#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * MCP Client for testing MCP Atlassian server over network
 */

import axios from 'axios';
import chalk from 'chalk';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils, ResourceManager, CascadeExecutor } from './shared-test-cases.js';
import { apiResponseLogger } from './api-response-logger.js';

const { host = 'localhost', port = 3000 } = appConfig.server;
const DEFAULT_MCP_SERVER_URL = `http://localhost:${port}`;

/**
 * MCP Atlassian Test Client
 * JavaScript client for testing MCP Atlassian server functionality
 */
class MCPAtlassianClient {
  constructor (serverUrl, timeout = 30000) {
    this.serverUrl = serverUrl;
    this.requestId = 1;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Server health check
   */
  async healthCheck () {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get list of available tools
   */
  async listTools () {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list',
    };

    const response = await this.client.post('/mcp', request);
    return response.data;
  }

  /**
   * Call MCP tool
   */
  async callTool (name, args = {}, options = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    const response = await this.client.post('/mcp', request);
    const responseData = response.data;

    // Log MCP response if enabled and test metadata is provided
    if (options.fullId && apiResponseLogger.isEnabled()) {
      const testName = options.testName || `MCP-${name}`;
      apiResponseLogger.logMcpResponse(
        options.fullId,
        testName,
        name,
        args,
        response.status,
        responseData
      );
    }

    return responseData;
  }

  /**
   * Get tool information
   */
  async getToolInfo (name) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/info',
      params: { name },
    };

    const response = await this.client.post('/mcp', request);
    return response.data;
  }

  /**
   * Check server connection
   */
  async ping () {
    try {
      const health = await this.healthCheck();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics (if available)
   */
  async getCacheStats () {
    try {
      const response = await this.client.get('/cache/stats');
      return response.data;
    } catch (error) {
      // Ignore errors - endpoint may be unavailable
      return null;
    }
  }
}

/**
 * JIRA-specific methods
 */
class JiraTestClient extends MCPAtlassianClient {
  /**
   * Get JIRA issue
   */
  async getIssue (issueKey, options = {}) {
    return this.callTool('jira_get_issue', {
      issueKey,
      ...options,
    });
  }

  /**
   * Search JIRA issues
   */
  async searchIssues (jql, options = {}) {
    return this.callTool('jira_search_issues', {
      jql,
      startAt: options.startAt || 0,
      maxResults: options.maxResults || 50,
      fields: options.fields,
    });
  }

  /**
   * Create JIRA issue
   */
  async createIssue (params) {
    return this.callTool('jira_create_issue', params);
  }

  /**
   * Get projects
   */
  async getProjects () {
    return this.callTool('jira_get_projects', {});
  }

  /**
   * Add comment to issue
   */
  async addComment (issueKey, body) {
    return this.callTool('jira_add_comment', {
      issueKey,
      body,
    });
  }

  /**
   * Get status transitions for issue
   */
  async getTransitions (issueKey) {
    return this.callTool('jira_get_transitions', {
      issueKey,
    });
  }
}

/**
 * Test Runner for MCP Atlassian server integration testing
 */
class MCPTestRunner {
  constructor (client) {
    this.client = client;
    this.results = [];
    this.testCases = new SharedJiraTestCases();
    this.resourceManager = new ResourceManager();
    this.cascadeExecutor = new CascadeExecutor(this.resourceManager);
  }

  /**
   * Execute specific test
   */
  async runTest (name, testFn) {
    const startTime = Date.now();

    try {
      console.log(chalk.blue(`🧪 Running test: ${name}`));
      const data = await testFn();
      const duration = Date.now() - startTime;

      console.log(chalk.green(`✅ Test passed: ${name} (${duration}ms)`));

      return {
        name,
        success: true,
        duration,
        data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.log(chalk.red(`❌ Test failed: ${name} (${duration}ms)`));
      console.log(chalk.red(`   Error: ${errorMessage}`));

      return {
        name,
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * MCP server connection test
   */
  async testConnection () {
    const result = await this.runTest('MCP Server Connection', async () => {
      const isConnected = await this.client.ping();
      if (!isConnected) {
        throw new Error('Cannot connect to MCP server');
      }

      const health = await this.client.healthCheck();
      return health;
    });

    this.results.push(result);
  }

  /**
   * Available tools list test
   */
  async testListTools () {
    const result = await this.runTest('List Available Tools', async () => {
      const response = await this.client.listTools();

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const tools = response.result?.tools || [];
      if (tools.length === 0) {
        throw new Error('No tools available');
      }

      console.log(chalk.gray(`   Found ${tools.length} tools`));
      return tools;
    });

    this.results.push(result);
  }

  /**
   * Execute test case from shared test cases
   */
  async runSharedTestCase(testCase) {
    // Skip tests without MCP tool
    if (!testCase.mcpTool) {
      console.log(chalk.yellow(`⏭️  Skipping ${testCase.name} - no MCP tool available`));
      return { name: testCase.name, success: true, skipped: true };
    }

    const result = await this.runTest(testCase.name, async () => {
      // Execute MCP call with logging metadata
      const response = await this.client.callTool(testCase.mcpTool, testCase.mcpArgs, {
        fullId: testCase.fullId,
        testName: testCase.description || testCase.name
      });

      // Validate MCP response
      const validation = TestValidationUtils.validateMcpResponse(response, testCase);
      if (!validation.success) {
        throw new Error(validation.message);
      }

      // Execute additional validation if needed
      if (testCase.cleanup) {
        testCase.cleanup(response.result);
      }

      console.log(chalk.gray(`   ${testCase.description} - completed successfully`));
      return response.result;
    });

    this.results.push(result);
    return result;
  }

  /**
   * Execute tests of specific category
   */
  async runTestsByCategory(categoryName) {
    const testCases = this.testCases.getTestCasesByCategory(categoryName);

    if (testCases.length === 0) {
      console.log(chalk.yellow(`⏭️  No tests found for category: ${categoryName}`));
      return;
    }

    console.log(chalk.blue(`\n📋 Running ${categoryName} tests (${testCases.length} tests)...\n`));

    for (const testCase of testCases) {
      try {
        await this.runSharedTestCase(testCase);
      } catch (error) {
        console.log(chalk.red(`❌ Test case failed: ${testCase.name}`));
        console.log(chalk.red(`   Error: ${error.message}`));
      }
    }
  }

  /**
   * Execute cascade tests (if supported in MCP)
   */
  async runCascadeTests() {
    console.log(chalk.blue('\n🔄 Testing CASCADE operations...\n'));

    // Currently cascade operations work only with direct API calls
    // Future support for cascades through MCP can be added
    console.log(chalk.yellow('⏭️  Cascade operations are not yet supported via MCP'));
  }

  /**
   * Run all tests
   */
  async runAllTests () {
    console.log(chalk.yellow('🚀 Starting MCP Atlassian integration tests...\n'));

    // Basic connection tests
    await this.testConnection();
    await this.testListTools();

    // Get minimal test case set for quick testing
    const testCases = this.testCases.getMinimalTestCases();

    console.log(chalk.blue(`\n📋 Running ${testCases.length} shared test cases...\n`));

    // Execute test cases
    for (const testCase of testCases) {
      try {
        await this.runSharedTestCase(testCase);
      } catch (error) {
        console.log(chalk.red(`❌ Test case failed: ${testCase.name}`));
        console.log(chalk.red(`   Error: ${error.message}`));
      }
    }

    return this.results;
  }

  /**
   * Run extended tests
   */
  async runExtendedTests() {
    console.log(chalk.yellow('🚀 Starting EXTENDED MCP Atlassian integration tests...\n'));

    // Basic connection tests
    await this.testConnection();
    await this.testListTools();

    // Get all available test categories
    const allTestCases = this.testCases.getAllTestCasesByCategory();

    // Count total tests with MCP tools
    const allTestCasesList = this.testCases.getAllTestCasesFlat();
    const mcpTestCases = allTestCasesList.filter(tc => tc.mcpTool);

    console.log(chalk.blue(`\n📋 Running ${mcpTestCases.length} comprehensive test cases from all categories...\n`));

    // Execute tests by categories
    const categories = [
      'system',
      'informational',
      'issueDetailed',
      'searchDetailed',
      'projectDetailed',
      'userDetailed',
      'metadataDetailed',
      'modifying',
      'agile',
      'additional',
      'extended'
    ];

    for (const category of categories) {
      await this.runTestsByCategory(category);
    }

    // Attempt to run cascade tests
    await this.runCascadeTests();

    return this.results;
  }

  /**
   * Show summary report
   */
  printSummary () {
    console.log('\n' + chalk.yellow('📊 Test Summary:'));
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.blue(`⏱️  Total time: ${totalTime}ms`));

    if (failed > 0) {
      console.log(chalk.red('\n🔍 Failed tests:'));
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(chalk.red(`  • ${r.name}: ${r.error}`));
        });
    }

    console.log('\n' + chalk.yellow('✨ Test execution completed!'));
    console.log('='.repeat(50));
  }

  /**
   * Get test results
   */
  getResults () {
    return this.results;
  }
}

async function main () {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  const isExtended = args.includes('--extended') || args.includes('-e');

  switch (command) {
    case 'test':
      await runTests(isExtended);
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

async function runTests (isExtended = false) {
  const testType = isExtended ? 'EXTENDED MCP client tests' : 'MCP client tests';
  console.log(`🧪 Running ${testType} against running MCP server...`);
  console.log('📍 MCP Server URL:', DEFAULT_MCP_SERVER_URL);
  console.log('⚠️  Make sure MCP server is running and JIRA emulator is available\n');

  const client = new JiraTestClient(DEFAULT_MCP_SERVER_URL);
  const runner = new MCPTestRunner(client);

  try {
    if (isExtended) {
      await runner.runExtendedTests();
    } else {
      await runner.runAllTests();
    }

    runner.printSummary();

    const results = runner.getResults();
    const failed = results.filter(r => !r.success).length;

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

function showHelp () {
  console.log(`
MCP Atlassian Network Test Client

Usage:
  node tests/mcp-client-tests.js [command] [options]

Commands:
  test        Run MCP client tests against running MCP server (default)
  help        Show this help

Options:
  --extended, -e    Run extended comprehensive test suite

Examples:
  node tests/mcp-client-tests.js                 # Run standard tests
  node tests/mcp-client-tests.js --extended      # Run extended tests
  node tests/mcp-client-tests.js test -e         # Run extended tests

Prerequisites:
  1. Start JIRA emulator:
     node tests/jira-emulator.js
  
  2. Start MCP server with:
     ATLASSIAN_URL=http://localhost:8080 TRANSPORT_TYPE=http npm start

Notes:
  - This client tests a running MCP server over HTTP
  - MCP server should be running on port 3000 (or configured port)
  - JIRA emulator should be running on port 8080
  - Uses shared test cases from tests/shared-test-cases.js
`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
