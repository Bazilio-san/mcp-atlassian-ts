#!/usr/bin/env node

/**
 * JIRA MCP HTTP Tester
 * Tests all JIRA MCP tools via HTTP transport
 * Validates custom header propagation and logs results to individual files
 */
import dotenv from 'dotenv';

dotenv.config();

import fetch from 'node-fetch';
import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';
import chalk from 'chalk';
import JiraMcpTestCases from './jira-test-cases.js';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const JIRA_EMULATOR_URL = process.env.JIRA_URL || 'http://localhost:8080';
const RESULTS_DIR = path.join(process.cwd(), 'tests/mcp/_logs/jira');
const TEST_USE_EMOJI = process.env.TEST_USE_EMOJI === true;

if (!fss.existsSync(RESULTS_DIR)) {
  fss.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Parse custom header from .env if provided
let DEFAULT_CUSTOM_HEADERS = {};
if (process.env.TEST_ADD_X_HEADER) {
  const [key, value] = process.env.TEST_ADD_X_HEADER.split(':');
  if (key && value) {
    DEFAULT_CUSTOM_HEADERS[key.trim()] = value.trim();
    console.log(chalk.cyan(`📋 Default custom header from .env: ${key.trim()}: ${value.trim()}`));
  }
}

/**
 * MCP HTTP Client for testing
 */
class McpHttpClient {
  constructor (baseUrl, customHeaders = {}) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.requestId = 1;
  }

  /**
   * Send MCP request over HTTP
   */
  async sendRequest (method, params = {}) {
    const requestId = this.requestId++;

    const headers = {
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };

    const body = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.requestHeaders = headers;
        throw error;
      }

      const data = await response.json();

      if (data.error) {
        const error = new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
        error.requestHeaders = headers;
        error.data = data.error.data;
        error.fullMcpResponse = data; // Save full MCP JSON-RPC response
        throw error;
      }

      // Return both result and request headers
      return {
        result: data.result,
        requestHeaders: headers,
      };
    } catch (error) {
      // Preserve headers in error for debugging
      if (!error.requestHeaders) {
        error.requestHeaders = headers;
      }
      throw error;
    }
  }

  /**
   * List all available tools
   */
  async listTools () {
    const { result } = await this.sendRequest('tools/list');
    return result;
  }

  /**
   * Call a specific tool
   */
  async callTool (toolName, parameters = {}) {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: parameters,
    });
  }

  /**
   * Ping the server
   */
  async ping () {
    return this.sendRequest('ping');
  }

  /**
   * Check health
   */
  async health () {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

/**
 * Main test orchestrator
 */
class JiraMcpHttpTester {
  constructor (testFilter = null) {
    this.client = null;
    this.testCases = [];
    this.results = [];
    this.testFilter = testFilter;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Initialize test cases using external test cases file
   */
  initializeTestCases () {
    const testCasesManager = new JiraMcpTestCases();

    // Parse filter and get matching test cases
    const selectedTestCases = testCasesManager.parseFilterAndGetTestCases(this.testFilter);

    this.testCases = selectedTestCases;

    if (this.testFilter) {
      console.log(chalk.blue(`\n📋 Filter: ${this.testFilter}`));
      console.log(chalk.blue(`📋 Selected ${this.testCases.length} test cases\n`));

      // Show selected test cases
      selectedTestCases.forEach(tc => {
        console.log(chalk.dim(`  ${tc.fullId}: ${tc.toolName} - ${tc.description}`));
      });
      console.log();
    } else {
      console.log(chalk.blue(`\n📋 Initialized ${this.testCases.length} test cases (all)\n`));
    }
  }

  /**
   * Run all tests
   */
  async runAllTests () {
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan('JIRA MCP HTTP Tester'));
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log();

    // Initialize client with default custom headers from .env
    this.client = new McpHttpClient(MCP_SERVER_URL, DEFAULT_CUSTOM_HEADERS);

    // Check server health
    console.log(chalk.yellow('🏥 Checking MCP server health...'));
    try {
      const health = await this.client.health();
      console.log(chalk.green('✓ MCP server is healthy'));
      console.log(chalk.dim(JSON.stringify(health, null, 2)));
      console.log();
    } catch (error) {
      console.log(chalk.red(`✗ MCP server health check failed: ${error.message}`));
      console.log(chalk.yellow('Make sure the MCP server is running on ' + MCP_SERVER_URL));
      process.exit(1);
    }

    // Test ping
    console.log(chalk.yellow('🏓 Testing MCP ping...'));
    try {
      const pong = await this.client.ping();
      console.log(chalk.green('✓ Ping successful'));
      console.log(chalk.dim(JSON.stringify(pong, null, 2)));
      console.log();
    } catch (error) {
      console.log(chalk.red(`✗ Ping failed: ${error.message}`));
      process.exit(1);
    }

    // List available tools
    console.log(chalk.yellow('🔧 Listing available JIRA tools...'));
    try {
      const toolsResult = await this.client.listTools();
      const jiraTools = toolsResult.tools.filter(t => t.name.startsWith('jira_'));
      console.log(chalk.green(`✓ Found ${jiraTools.length} JIRA tools`));
      console.log();
    } catch (error) {
      console.log(chalk.red(`✗ Failed to list tools: ${error.message}`));
      process.exit(1);
    }

    // Initialize test cases
    this.initializeTestCases();

    // Run each test case
    console.log(chalk.bold.yellow('🧪 Running tests...\n'));

    for (let i = 0; i < this.testCases.length; i++) {
      const testCase = this.testCases[i];
      await this.runSingleTest(testCase, i + 1);
    }

    // Generate summary
    await this.generateSummary();
  }

  /**
   * Run a single test case
   */
  async runSingleTest (testCase, index) {
    console.log(chalk.cyan(`[${testCase.fullId}] Testing: ${chalk.bgYellow(testCase.toolName)}`));
    console.log(chalk.dim(`  Description: ${testCase.description}`));

    const startTime = Date.now();

    // Create client with default custom headers from .env
    const testClient = new McpHttpClient(MCP_SERVER_URL, DEFAULT_CUSTOM_HEADERS);

    // Resolve parameters if they are a function
    let resolvedParams = testCase.params;

    // Skip test if params is null
    if (testCase.params === null) {
      console.log(chalk.yellow('  ⏭️  Skipped - test requires manual setup'));
      this.stats.skipped++;
      this.stats.total++;
      return;
    }

    if (typeof testCase.params === 'function') {
      try {
        resolvedParams = await testCase.params(testClient);
        if (resolvedParams === null) {
          // Test was skipped
          console.log(chalk.yellow('  ⏭️  Skipped - unable to resolve parameters'));
          this.stats.skipped++;
          this.stats.total++;
          return;
        }
      } catch (error) {
        console.log(chalk.red(`  ❌  Failed to resolve parameters: ${error.message}`));
        this.stats.failed++;
        this.stats.total++;
        return;
      }
    }

    const result = {
      fullId: testCase.fullId,
      toolName: testCase.toolName,
      description: testCase.description,
      parameters: resolvedParams,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'pending',
      response: null,
      error: null,
    };

    let requestHeaders = {};
    try {
      // Call the tool
      const { result: response, requestHeaders: capturedHeaders } = await testClient.callTool(testCase.toolName, resolvedParams);

      requestHeaders = capturedHeaders;
      result.duration = Date.now() - startTime;
      result.response = response;
      result.requestHeaders = requestHeaders;
      result.status = 'passed';

      console.log(chalk.green(`  ✅  Passed (${result.duration}ms)`));
      console.log(chalk.dim(`  Response: ${JSON.stringify(response).substring(0, 100)}...`));
      result.marker = '✅';

      this.stats.passed++;

      // Run cleanup if defined
      if (testCase.cleanup && typeof testCase.cleanup === 'function') {
        await testCase.cleanup(testClient, result);
      }
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = error.message;
      // Save detailed error information for debugging
      if (error.data && error.data.details) {
        result.errorDetails = error.data.details;
      }
      // Save full MCP response as seen by the agent
      if (error.fullMcpResponse) {
        result.fullMcpResponse = error.fullMcpResponse;
      }
      // Save headers even if request failed - try to get from error first, then fallback to local var
      result.requestHeaders = error.requestHeaders || requestHeaders;

      // Some tests are expected to fail (e.g., delete non-existent issue)
      if (this.isExpectedFailure(testCase.toolName, error.message)) {
        result.status = 'expected_failure';
        result.marker = '⚠';
        console.log(chalk.yellow(`  ⚠ Expected failure (${result.duration}ms)`));
        this.stats.skipped++;
      } else {
        result.status = 'failed';
        result.marker = '❌';
        console.log(chalk.red(`  ❌  Failed (${result.duration}ms)`));
        console.log(chalk.red(`  Error: ${error.message}`));
        // Display detailed error information if available
        if (error.data && error.data.details) {
          console.log(chalk.red(`  Details: ${JSON.stringify(error.data.details, null, 2)}`));
        }
        this.stats.failed++;
      }
    }

    this.results.push(result);
    this.stats.total++;

    // Log result to individual file
    await this.logResultToFile(result);

    console.log();
  }

  /**
   * Check if a failure is expected
   */
  isExpectedFailure (toolName, errorMessage) {
    const expectedFailures = {
      'jira_delete_issue': ['not found', 'does not exist'],
      'jira_remove_issue_link': ['not found', 'does not exist'],
      'jira_get_board_issues': ['not found', 'Board'],
      'jira_get_sprints_from_board': ['not found', 'Board'],
      'jira_get_sprint_issues': ['not found', 'Sprint'],
      'jira_create_sprint': ['not found', 'Board'],
      'jira_update_sprint': ['not found', 'Sprint'],
    };

    const patterns = expectedFailures[toolName];
    if (!patterns) return false;

    return patterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  /**
   * Log test result to individual file
   */
  async logResultToFile (result) {
    const m = TEST_USE_EMOJI ? `_${result.marker}` : '';
    // const filename = `${result.fullId}_${result.toolName}.md`;
    const filename = `${result.toolName}.md`;
    const filepath = path.join(RESULTS_DIR, filename);

    const content = this.formatResultAsMarkdown(result);

    try {
      await fs.writeFile(filepath, content, 'utf-8');
    } catch (error) {
      console.log(chalk.red(`  Failed to write log file: ${error.message}`));
    }
  }

  /**
   * Format test result as Markdown
   */
  formatResultAsMarkdown (result) {
    const t = '```';
    const mdText = (s) => `${t}\n${s}\n${t}`;
    const mdDescr = (s) => `${t}description\n${s}\n${t}`;
    const mdJson = (v) => `${t}json\n${v && JSON.stringify(v, null, 2)}\n${t}`;

    let resultStatus = '⚠️ RESULT STATUS UNKNOWN';
    let errorText = '';
    // md += `## Response\n\n\`\`\`json\n${JSON.stringify(result.response, null, 2)}\n\`\`\`\n\n`;

    if (result.status === 'passed') {
      resultStatus = '✅  PASSED';
    } else {
      // Show full MCP response as seen by the agent, or fallback to separate sections
      if (result.fullMcpResponse) {
        errorText = `## MCP Response (as seen by agent)\n\n${mdJson(result.fullMcpResponse)}\n\n`;
      } else {
        errorText = `## Error\n\n${mdText(result.error)}\n\n`;
        // Add detailed error information if available
        if (result.errorDetails) {
          errorText += `## Error Details\n\n${mdJson(result.errorDetails)}\n\n`;
        }
      }
      if (result.status === 'expected_failure') {
        resultStatus = '⚠️  Expected failure - test validation successful';
      } else {
        resultStatus = '❌  FAILED';
      }
    }

    let requestHeaders = '';
    if (result.requestHeaders && Object.keys(result.requestHeaders).length > 0) {
      requestHeaders = `\nHeaders:\n${Object.entries(result.requestHeaders).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
    }

    // Format response section
    let responseText = '';
    if (result.response !== null && result.response !== undefined) {
      try {
        let parsedResponse = result.response;
        let isJsonParsed = false;

        // If response is a string, try to parse as JSON first
        if (typeof result.response === 'string') {
          try {
            parsedResponse = JSON.parse(result.response);
            isJsonParsed = true;
          } catch {
            // If not valid JSON, treat as text
            responseText = `## Response\n\n${mdText(result.response)}\n\n`;
          }
        } else if (typeof result.response === 'object') {
          isJsonParsed = true;
        }

        // If we have a successfully parsed or original object
        if (isJsonParsed && typeof parsedResponse === 'object') {
          let text = parsedResponse;
          let addText = '';
          // Check if response has content[0].text structure and extract text
          if (Array.isArray(parsedResponse?.content) && parsedResponse.content[0]?.text) {
            const textContent = parsedResponse.content[0].text;
            parsedResponse.content[0].text = '📋';
            text = parsedResponse;
            addText = `## Formatted Text 📋\n${mdText(textContent)}\n\n`;
          }
          responseText = `## Response\n\n${mdJson(text)}\n\n${addText}`
        }

      } catch {
        // Fallback to text if any parsing errors
        responseText = `## Response\n\n${mdText(String(result.response))}\n\n`;
      }
    }

    return `${resultStatus} / ${result.timestamp} / ${result.duration}ms
# ${result.toolName}
${requestHeaders}
${mdDescr(result.description)}

parameters:
${mdJson(result.parameters)}

${responseText}${errorText}`;
  }

  /**
   * Generate summary report
   */
  async generateSummary () {
    console.log(chalk.bold.cyan('\n' + '='.repeat(80)));
    console.log(chalk.bold.cyan('Test Summary'));
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log();

    console.log(chalk.white(`Total Tests:     ${this.stats.total}`));
    console.log(chalk.green(`Passed:          ${this.stats.passed}`));
    console.log(chalk.red(`Failed:          ${this.stats.failed}`));
    console.log(chalk.yellow(`Expected Fails:  ${this.stats.skipped}`));
    console.log();

    const successRate = ((this.stats.passed / this.stats.total) * 100).toFixed(1);
    console.log(chalk.white(`Success Rate:    ${successRate}%`));
    console.log();

    // Write summary file
    const summaryContent = this.generateSummaryMarkdown();
    const summaryPath = path.join(RESULTS_DIR, 'test_summary.md');

    try {
      await fs.writeFile(summaryPath, summaryContent, 'utf-8');
      console.log(chalk.green(`✓ Summary written to ${summaryPath}`));
    } catch (error) {
      console.log(chalk.red(`✗ Failed to write summary: ${error.message}`));
    }

    console.log();

    if (this.stats.failed > 0) {
      console.log(chalk.red('❌  Some tests failed'));
      console.log();

      const failedTests = this.results.filter(r => r.status === 'failed');
      console.log(chalk.red(`Failed tests (${failedTests.length}):`));
      failedTests.forEach(t => {
        console.log(chalk.red(`  - ${t.toolName}: ${t.error}`));
      });
      console.log();
    } else {
      console.log(chalk.green('✅  All tests passed!'));
      console.log();
    }

    console.log(chalk.dim(`Results directory: ${RESULTS_DIR}`));
    console.log();
  }

  /**
   * Generate summary as Markdown
   */
  generateSummaryMarkdown () {
    let md = '# JIRA MCP HTTP Test Summary\n\n';
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `**MCP Server:** ${MCP_SERVER_URL}\n\n`;
    md += `**JIRA Emulator:** ${JIRA_EMULATOR_URL}\n\n`;

    md += '## Statistics\n\n';
    md += '| Metric | Count |\n';
    md += '|--------|-------|\n';
    md += `| Total Tests | ${this.stats.total} |\n`;
    md += `| Passed | ${this.stats.passed} |\n`;
    md += `| Failed | ${this.stats.failed} |\n`;
    md += `| Expected Failures | ${this.stats.skipped} |\n`;
    md += `| Success Rate | ${((this.stats.passed / this.stats.total) * 100).toFixed(1)}% |\n\n`;

    md += '## Test Results\n\n';
    md += '| # | Tool | Status | Duration |\n';
    md += '|---|------|--------|----------|\n';

    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'passed' ? '✅' :
        result.status === 'expected_failure' ? '⚠️' : '❌';
      md += `| ${index + 1} | \`${result.toolName}\` | ${statusIcon} ${result.status} | ${result.duration}ms |\n`;
    });

    md += '\n## Failed Tests\n\n';
    const failedTests = this.results.filter(r => r.status === 'failed');

    if (failedTests.length === 0) {
      md += 'No tests failed ✅\n\n';
    } else {
      failedTests.forEach(test => {
        md += `### ${test.toolName}\n\n`;
        md += `**Error:** \`${test.error}\`\n\n`;
      });
    }

    md += '## Custom Header Propagation\n\n';
    md += '## Individual Test Results\n\n';
    md += 'Detailed results for each tool are available in:\n\n';
    this.results.forEach(result => {
      md += `- [\`${result.toolName}\`](./JIRA_${result.toolName}.md)\n`;
    });
    md += '\n';

    return md;
  }
}

/**
 * Main entry point
 */
async function main () {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let testFilter = null;

  // Parse test filter
  const testsArg = args.find(arg => arg.startsWith('--tests='));
  if (testsArg) {
    testFilter = testsArg.split('=')[1];
  }

  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.cyan('JIRA MCP HTTP Tester'));
    console.log(chalk.white('\nUsage: node tests/mcp/jira.js [options]\n'));
    console.log(chalk.white('Options:'));
    console.log(chalk.white('  --tests=<filter>    Run specific tests (comma-separated)'));
    console.log(chalk.white('                      Examples:'));
    console.log(chalk.white('                        --tests=1           # All group 1 tests'));
    console.log(chalk.white('                        --tests=1-1,1-2     # Specific tests'));
    console.log(chalk.white('                        --tests=8           # All Agile tests'));
    console.log(chalk.white('                        --tests=jira_get_issue # Specific tool'));
    console.log(chalk.white('  --help, -h          Show this help\n'));
    console.log(chalk.white('Test Groups:'));
    console.log(chalk.white('  1: IssueManagement   (9 tools)'));
    console.log(chalk.white('  2: ProjectManagement (3 tools)'));
    console.log(chalk.white('  3: UserManagement    (1 tool)'));
    console.log(chalk.white('  4: FieldsMetadata    (1 tool)'));
    console.log(chalk.white('  5: IssueLinks        (5 tools)'));
    console.log(chalk.white('  6: Worklog           (2 tools)'));
    console.log(chalk.white('  7: Attachments       (1 tool)'));
    console.log(chalk.white('  8: AgileScrum        (6 tools)'));
    console.log(chalk.white('  9: BulkOperations    (1 tool)'));
    console.log(chalk.white('  10: BatchOperations  (2 tools)'));
    process.exit(0);
  }

  const tester = new JiraMcpHttpTester(testFilter);

  try {
    await tester.runAllTests();
    process.exit(tester.stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\n❌  Fatal error:'), error);
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

export { McpHttpClient, JiraMcpHttpTester };
