#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * Comprehensive MCP Client Tester
 * Implements comprehensive testing similar to jira-endpoints-tester.js but via MCP protocol
 */

import axios from 'axios';
import chalk from 'chalk';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils, ResourceManager, CascadeExecutor } from './shared-test-cases.js';

const { host = 'localhost', port = 3000 } = appConfig.server;
const DEFAULT_MCP_SERVER_URL = `http://localhost:${port}`;

/**
 * Comprehensive MCP Atlassian Test Runner
 * Tests all available MCP tools with extensive coverage
 */
class ComprehensiveMCPTester {
  constructor(serverUrl, timeout = 60000) {
    this.serverUrl = serverUrl;
    this.requestId = 1;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.results = [];
    this.testCases = new SharedJiraTestCases();
    this.resourceManager = new ResourceManager();
    this.cascadeExecutor = new CascadeExecutor(this.resourceManager);

    // Parse command line arguments
    this.parseArguments();
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);

    this.isExtended = args.includes('--extended') || args.includes('-e');
    this.showHelp = args.includes('--help') || args.includes('-h');

    // Parse selective tests
    const testsArg = args.find(arg => arg.startsWith('--tests='));
    if (testsArg) {
      const testsString = testsArg.split('=')[1];
      try {
        const selection = this.testCases.parseTestSelection(testsString);
        this.selectedTests = selection.includeAll ? null : selection.selections;

        if (!selection.includeAll) {
          const descriptions = selection.selections.map(sel => {
            if (sel.type === 'group') {
              const groupInfo = this.testCases.getGroupInfo(sel.groupNumber);
              return `group ${sel.groupNumber} (${groupInfo?.name || 'Unknown'})`;
            } else {
              const groupInfo = this.testCases.getGroupInfo(sel.groupNumber);
              return `test ${sel.fullId} from group "${groupInfo?.name || 'Unknown'}"`;
            }
          });
          console.log(chalk.blue(`🎯 Selective test execution: ${descriptions.join(', ')}\n`));
        }
      } catch (error) {
        console.warn(chalk.yellow('⚠️  Error parsing --tests parameter:', error.message));
        this.selectedTests = null;
      }
    } else {
      this.selectedTests = null;
    }
  }

  /**
   * Check if test should be executed based on selection
   */
  shouldExecuteTest(groupNumber, testNumber) {
    if (!this.selectedTests) return true;

    return this.selectedTests.some(sel => {
      if (sel.type === 'group' && sel.groupNumber === groupNumber) {
        return true;
      }
      if (sel.type === 'test' && sel.groupNumber === groupNumber && sel.testNumber === testNumber) {
        return true;
      }
      return false;
    });
  }

  /**
   * Health check for MCP server
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * List available MCP tools
   */
  async listTools() {
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
  async callTool(name, args = {}) {
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
    return response.data;
  }

  /**
   * Check MCP server connection
   */
  async ping() {
    try {
      const health = await this.healthCheck();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Execute individual test
   */
  async runTest(name, testFn) {
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
   * Execute shared test case
   */
  async runSharedTestCase(testCase) {
    // Skip tests without MCP tool
    if (!testCase.mcpTool) {
      console.log(chalk.yellow(`⏭️  Skipping ${testCase.name} - no MCP tool available`));
      return { name: testCase.name, success: true, skipped: true };
    }

    // Check if test should be executed
    if (!this.shouldExecuteTest(testCase.groupNumber, testCase.testNumber)) {
      console.log(chalk.gray(`⏭️  Skipping ${testCase.name} - not in selection`));
      return { name: testCase.name, success: true, skipped: true };
    }

    const result = await this.runTest(testCase.name, async () => {
      // Execute MCP call
      const response = await this.callTool(testCase.mcpTool, testCase.mcpArgs);

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
   * Run tests by category
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
   * Run basic connection tests
   */
  async runBasicTests() {
    console.log(chalk.blue('\n🔧 Basic connectivity tests...\n'));

    // Test MCP server connection
    const connectionResult = await this.runTest('MCP Server Connection', async () => {
      const isConnected = await this.ping();
      if (!isConnected) {
        throw new Error('Cannot connect to MCP server');
      }

      const health = await this.healthCheck();
      return health;
    });
    this.results.push(connectionResult);

    // Test tool listing
    const toolsResult = await this.runTest('List Available Tools', async () => {
      const response = await this.listTools();

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
    this.results.push(toolsResult);
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests() {
    console.log(chalk.yellow('🚀 Starting COMPREHENSIVE MCP Atlassian integration tests...\n'));
    console.log(chalk.cyan(`📍 MCP Server URL: ${this.serverUrl}`));
    console.log(chalk.cyan(`🎯 Test Mode: ${this.isExtended ? 'Extended' : 'Standard'}\n`));

    // Basic connectivity tests
    await this.runBasicTests();

    // Get all test categories
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
      'workflowSchemes',
      'extended'
    ];

    // Filter categories for extended mode
    const testCategories = this.isExtended ? categories : [
      'system',
      'informational',
      'modifying'
    ];

    // Run tests by category
    for (const category of testCategories) {
      await this.runTestsByCategory(category);
    }

    // Run cascade tests if extended
    if (this.isExtended) {
      console.log(chalk.blue('\n🔄 Testing CASCADE operations...\n'));
      console.log(chalk.yellow('⏭️  Cascade operations are not yet supported via MCP'));
    }

    return this.results;
  }

  /**
   * Run minimal test suite (for quick validation)
   */
  async runMinimalTests() {
    console.log(chalk.yellow('🚀 Starting MINIMAL MCP Atlassian integration tests...\n'));

    // Basic connectivity tests
    await this.runBasicTests();

    // Get minimal test cases
    const testCases = this.testCases.getMinimalTestCases();
    console.log(chalk.blue(`\n📋 Running ${testCases.length} minimal test cases...\n`));

    // Execute minimal test cases
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
   * Print test summary
   */
  printSummary() {
    console.log('\n' + chalk.yellow('📊 Test Summary:'));
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.success && !r.skipped).length;
    const failed = this.results.filter(r => !r.success && !r.skipped).length;
    const skipped = this.results.filter(r => r.skipped).length;
    const totalTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.gray(`⏭️  Skipped: ${skipped}`));
    console.log(chalk.blue(`⏱️  Total time: ${totalTime}ms`));

    // Success rate
    const successRate = passed + failed > 0 ? ((passed / (passed + failed)) * 100).toFixed(1) : '0.0';
    console.log(chalk.cyan(`📈 Success Rate: ${successRate}%`));

    if (failed > 0) {
      console.log(chalk.red('\n🔍 Failed tests:'));
      this.results
        .filter(r => !r.success && !r.skipped)
        .forEach(r => {
          console.log(chalk.red(`  • ${r.name}: ${r.error}`));
        });
    }

    console.log('\n' + chalk.yellow('✨ Test execution completed!'));
    console.log('='.repeat(60));

    // Return summary stats
    return {
      passed,
      failed,
      skipped,
      totalTime,
      successRate: parseFloat(successRate)
    };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${chalk.yellow('🚀 Comprehensive MCP Atlassian Tester')}

${chalk.cyan('Usage:')}
  node tests/mcp-comprehensive-tester.js [command] [options]

${chalk.cyan('Commands:')}
  test        Run comprehensive MCP tests against running MCP server (default)
  minimal     Run minimal test suite for quick validation
  help        Show this help

${chalk.cyan('Options:')}
  --extended, -e          Run extended comprehensive test suite (all categories)
  --tests=1-1,5-*,10      Run only specific tests (group-test format)

${chalk.cyan('Examples:')}
  node tests/mcp-comprehensive-tester.js                    # Run standard tests
  node tests/mcp-comprehensive-tester.js --extended         # Run extended tests
  node tests/mcp-comprehensive-tester.js minimal            # Run minimal tests
  node tests/mcp-comprehensive-tester.js --tests=2-*,8-1    # Run specific tests

${chalk.cyan('Prerequisites:')}
  1. Start MCP server with:
     ${chalk.gray('npm start')}

  2. Ensure JIRA server configuration in .env

${chalk.cyan('Notes:')}
  - This client tests a running MCP server over HTTP
  - MCP server should be running on port 3000 (or configured port)
  - Uses real JIRA API (no emulator needed)
  - Uses shared test cases from tests/shared-test-cases.js
`);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  if (args.includes('--help') || args.includes('-h') || command === 'help') {
    showHelp();
    return;
  }

  const client = new ComprehensiveMCPTester(DEFAULT_MCP_SERVER_URL);

  try {
    let results;

    switch (command) {
      case 'minimal':
        results = await client.runMinimalTests();
        break;
      case 'test':
      default:
        results = await client.runComprehensiveTests();
        break;
    }

    const summary = client.printSummary();

    // Exit with error code if tests failed
    process.exit(summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(chalk.red('❌ Test execution failed:', error.message));
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error(chalk.red('❌ Error:', error.message));
  process.exit(1);
});