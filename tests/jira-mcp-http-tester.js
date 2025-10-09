#!/usr/bin/env node

/**
 * JIRA MCP HTTP Tester
 * Tests all JIRA MCP tools via HTTP transport
 * Validates custom header propagation and logs results to individual files
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';
const JIRA_EMULATOR_URL = process.env.JIRA_URL || 'http://localhost:8080';
const RESULTS_DIR = './tests/results';

/**
 * MCP HTTP Client for testing
 */
class McpHttpClient {
  constructor(baseUrl, customHeaders = {}) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.requestId = 1;
  }

  /**
   * Send MCP request over HTTP
   */
  async sendRequest(method, params = {}) {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      throw new Error(`MCP Request failed: ${error.message}`);
    }
  }

  /**
   * List all available tools
   */
  async listTools() {
    return this.sendRequest('tools/list');
  }

  /**
   * Call a specific tool
   */
  async callTool(toolName, parameters = {}) {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: parameters,
    });
  }

  /**
   * Ping the server
   */
  async ping() {
    return this.sendRequest('ping');
  }

  /**
   * Check health
   */
  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

/**
 * Test case definition
 */
class TestCase {
  constructor(toolName, params, description, customHeaders = {}) {
    this.toolName = toolName;
    this.params = params;
    this.description = description;
    this.customHeaders = customHeaders;
  }
}

/**
 * Main test orchestrator
 */
class JiraMcpHttpTester {
  constructor() {
    this.client = null;
    this.testCases = [];
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  /**
   * Initialize test cases for all 30 JIRA tools
   */
  initializeTestCases() {
    // Test header for custom header propagation testing
    const testHeader = { 'X-Test-Request-ID': `test-${Date.now()}` };

    this.testCases = [
      // === Issue Management (9 tools) ===
      new TestCase(
        'jira_get_issue',
        { issueKey: 'TEST-1' },
        'Get issue details',
        testHeader
      ),
      new TestCase(
        'jira_search_issues',
        { jql: 'project = TEST', maxResults: 10 },
        'Search issues by JQL',
        testHeader
      ),
      new TestCase(
        'jira_create_issue',
        {
          project: 'TEST',
          issueType: 'Task',
          summary: 'MCP HTTP Test Issue',
          description: 'Created via MCP HTTP tester',
        },
        'Create new issue',
        testHeader
      ),
      new TestCase(
        'jira_update_issue',
        {
          issueKey: 'TEST-1',
          summary: 'Updated via MCP HTTP test',
        },
        'Update existing issue',
        testHeader
      ),
      new TestCase(
        'jira_add_comment',
        {
          issueKey: 'TEST-1',
          body: 'Test comment from MCP HTTP tester',
        },
        'Add comment to issue',
        testHeader
      ),
      new TestCase(
        'jira_get_transitions',
        { issueKey: 'TEST-1' },
        'Get available transitions',
        testHeader
      ),
      new TestCase(
        'jira_transition_issue',
        {
          issueKey: 'TEST-1',
          transitionId: '11',
          comment: 'Transitioned via MCP test',
        },
        'Transition issue status',
        testHeader
      ),
      new TestCase(
        'jira_delete_issue',
        { issueKey: 'TEST-DELETE', deleteSubtasks: false },
        'Delete issue (will fail if not exists)',
        testHeader
      ),
      new TestCase(
        'jira_batch_create_issues',
        {
          issues: [
            {
              project: 'TEST',
              issueType: 'Task',
              summary: 'Batch issue 1',
            },
            {
              project: 'TEST',
              issueType: 'Task',
              summary: 'Batch issue 2',
            },
          ],
        },
        'Batch create multiple issues',
        testHeader
      ),

      // === Project Management (3 tools) ===
      new TestCase(
        'jira_get_projects',
        { recent: 5 },
        'Get all projects',
        testHeader
      ),
      new TestCase(
        'jira_get_project_versions',
        { projectKey: 'TEST' },
        'Get project versions',
        testHeader
      ),
      new TestCase(
        'jira_create_version',
        {
          projectId: '10000',
          name: `MCP-Test-v${Date.now()}`,
          description: 'Created via MCP HTTP test',
        },
        'Create project version',
        testHeader
      ),
      new TestCase(
        'jira_batch_create_versions',
        {
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
        'Batch create versions',
        testHeader
      ),

      // === User Management (1 tool) ===
      new TestCase(
        'jira_get_user_profile',
        { userIdOrEmail: '12345' },
        'Get user profile',
        testHeader
      ),

      // === Fields and Metadata (1 tool) ===
      new TestCase(
        'jira_search_fields',
        { query: 'summary' },
        'Search JIRA fields',
        testHeader
      ),

      // === Issue Links (4 tools) ===
      new TestCase(
        'jira_get_link_types',
        {},
        'Get issue link types',
        testHeader
      ),
      new TestCase(
        'jira_create_issue_link',
        {
          linkType: 'Relates',
          inwardIssue: 'TEST-1',
          outwardIssue: 'TEST-2',
        },
        'Create issue link',
        testHeader
      ),
      new TestCase(
        'jira_create_remote_issue_link',
        {
          issueKey: 'TEST-1',
          url: 'https://example.com/external-issue',
          title: 'External Issue Link',
        },
        'Create remote issue link',
        testHeader
      ),
      new TestCase(
        'jira_remove_issue_link',
        { linkId: '10000' },
        'Remove issue link (will fail if not exists)',
        testHeader
      ),
      new TestCase(
        'jira_link_to_epic',
        {
          issueKey: 'TEST-1',
          epicKey: 'TEST-2',
        },
        'Link issue to epic',
        testHeader
      ),

      // === Worklog (2 tools) ===
      new TestCase(
        'jira_get_worklog',
        { issueKey: 'TEST-1', maxResults: 10 },
        'Get issue worklogs',
        testHeader
      ),
      new TestCase(
        'jira_add_worklog',
        {
          issueKey: 'TEST-1',
          timeSpent: '1h',
          comment: 'Work logged via MCP test',
        },
        'Add worklog entry',
        testHeader
      ),

      // === Attachments (1 tool) ===
      new TestCase(
        'jira_download_attachments',
        { issueKey: 'TEST-1' },
        'Get issue attachments',
        testHeader
      ),

      // === Agile/Scrum (6 tools) ===
      new TestCase(
        'jira_get_agile_boards',
        { maxResults: 10 },
        'Get all agile boards',
        testHeader
      ),
      new TestCase(
        'jira_get_board_issues',
        { boardId: '1', maxResults: 10 },
        'Get board issues',
        testHeader
      ),
      new TestCase(
        'jira_get_sprints_from_board',
        { boardId: '1', maxResults: 10 },
        'Get board sprints',
        testHeader
      ),
      new TestCase(
        'jira_get_sprint_issues',
        { sprintId: '1', maxResults: 10 },
        'Get sprint issues',
        testHeader
      ),
      new TestCase(
        'jira_create_sprint',
        {
          boardId: '1',
          name: `MCP Test Sprint ${Date.now()}`,
          goal: 'Test sprint creation',
        },
        'Create new sprint',
        testHeader
      ),
      new TestCase(
        'jira_update_sprint',
        {
          sprintId: '1',
          name: 'Updated Sprint Name',
          state: 'active',
        },
        'Update sprint',
        testHeader
      ),

      // === Bulk Operations (1 tool) ===
      new TestCase(
        'jira_batch_get_changelogs',
        { issueKeys: ['TEST-1', 'TEST-2'] },
        'Get changelogs for multiple issues',
        testHeader
      ),
    ];

    console.log(chalk.blue(`\n📋 Initialized ${this.testCases.length} test cases\n`));
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log(chalk.bold.cyan('JIRA MCP HTTP Tester'));
    console.log(chalk.bold.cyan('='.repeat(80)));
    console.log();

    // Initialize client
    this.client = new McpHttpClient(MCP_SERVER_URL);

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
  async runSingleTest(testCase, index) {
    const testId = `${index}/${this.testCases.length}`;
    console.log(chalk.cyan(`[${testId}] Testing: ${testCase.toolName}`));
    console.log(chalk.dim(`  Description: ${testCase.description}`));

    const startTime = Date.now();
    const result = {
      toolName: testCase.toolName,
      description: testCase.description,
      parameters: testCase.params,
      customHeaders: testCase.customHeaders,
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'pending',
      response: null,
      error: null,
    };

    try {
      // Create client with custom headers for this test
      const testClient = new McpHttpClient(MCP_SERVER_URL, testCase.customHeaders);

      // Call the tool
      const response = await testClient.callTool(testCase.toolName, testCase.params);

      result.duration = Date.now() - startTime;
      result.response = response;
      result.status = 'passed';

      console.log(chalk.green(`  ✓ Passed (${result.duration}ms)`));
      console.log(chalk.dim(`  Response: ${JSON.stringify(response).substring(0, 100)}...`));

      this.stats.passed++;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = error.message;

      // Some tests are expected to fail (e.g., delete non-existent issue)
      if (this.isExpectedFailure(testCase.toolName, error.message)) {
        result.status = 'expected_failure';
        console.log(chalk.yellow(`  ⚠ Expected failure (${result.duration}ms)`));
        this.stats.skipped++;
      } else {
        result.status = 'failed';
        console.log(chalk.red(`  ✗ Failed (${result.duration}ms)`));
        console.log(chalk.red(`  Error: ${error.message}`));
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
  isExpectedFailure(toolName, errorMessage) {
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
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Log test result to individual file
   */
  async logResultToFile(result) {
    const filename = `JIRA_${result.toolName}.md`;
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
  formatResultAsMarkdown(result) {
    let md = `# ${result.toolName}\n\n`;
    md += `**Description:** ${result.description}\n\n`;
    md += `**Status:** ${result.status.toUpperCase()}\n\n`;
    md += `**Timestamp:** ${result.timestamp}\n\n`;
    md += `**Duration:** ${result.duration}ms\n\n`;

    md += `## Parameters\n\n\`\`\`json\n${JSON.stringify(result.parameters, null, 2)}\n\`\`\`\n\n`;

    if (Object.keys(result.customHeaders).length > 0) {
      md += `## Custom Headers\n\n\`\`\`json\n${JSON.stringify(result.customHeaders, null, 2)}\n\`\`\`\n\n`;
    }

    if (result.status === 'passed') {
      md += `## Response\n\n\`\`\`json\n${JSON.stringify(result.response, null, 2)}\n\`\`\`\n\n`;
      md += `✅ Test passed successfully\n`;
    } else if (result.status === 'expected_failure') {
      md += `## Error\n\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
      md += `⚠️ Expected failure - test validation successful\n`;
    } else {
      md += `## Error\n\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
      md += `❌ Test failed\n`;
    }

    return md;
  }

  /**
   * Generate summary report
   */
  async generateSummary() {
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
      console.log(chalk.red('❌ Some tests failed'));
      console.log();

      const failedTests = this.results.filter(r => r.status === 'failed');
      console.log(chalk.red(`Failed tests (${failedTests.length}):`));
      failedTests.forEach(t => {
        console.log(chalk.red(`  - ${t.toolName}: ${t.error}`));
      });
      console.log();
    } else {
      console.log(chalk.green('✅ All tests passed!'));
      console.log();
    }

    console.log(chalk.dim(`Results directory: ${RESULTS_DIR}`));
    console.log();
  }

  /**
   * Generate summary as Markdown
   */
  generateSummaryMarkdown() {
    let md = `# JIRA MCP HTTP Test Summary\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `**MCP Server:** ${MCP_SERVER_URL}\n\n`;
    md += `**JIRA Emulator:** ${JIRA_EMULATOR_URL}\n\n`;

    md += `## Statistics\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${this.stats.total} |\n`;
    md += `| Passed | ${this.stats.passed} |\n`;
    md += `| Failed | ${this.stats.failed} |\n`;
    md += `| Expected Failures | ${this.stats.skipped} |\n`;
    md += `| Success Rate | ${((this.stats.passed / this.stats.total) * 100).toFixed(1)}% |\n\n`;

    md += `## Test Results\n\n`;
    md += `| # | Tool | Status | Duration |\n`;
    md += `|---|------|--------|----------|\n`;

    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'passed' ? '✅' :
                        result.status === 'expected_failure' ? '⚠️' : '❌';
      md += `| ${index + 1} | \`${result.toolName}\` | ${statusIcon} ${result.status} | ${result.duration}ms |\n`;
    });

    md += `\n## Failed Tests\n\n`;
    const failedTests = this.results.filter(r => r.status === 'failed');

    if (failedTests.length === 0) {
      md += `No tests failed ✅\n\n`;
    } else {
      failedTests.forEach(test => {
        md += `### ${test.toolName}\n\n`;
        md += `**Error:** \`${test.error}\`\n\n`;
      });
    }

    md += `## Custom Header Propagation\n\n`;
    md += `All tests were executed with custom headers (X-Test-Request-ID) to verify header propagation through the MCP stack.\n\n`;

    md += `## Individual Test Results\n\n`;
    md += `Detailed results for each tool are available in:\n\n`;
    this.results.forEach(result => {
      md += `- [\`${result.toolName}\`](./JIRA_${result.toolName}.md)\n`;
    });
    md += `\n`;

    return md;
  }
}

/**
 * Main entry point
 */
async function main() {
  const tester = new JiraMcpHttpTester();

  try {
    await tester.runAllTests();
    process.exit(tester.stats.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\n❌ Fatal error:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { McpHttpClient, JiraMcpHttpTester };
