#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * MCP Client for testing MCP Atlassian server - Refactored
 * Extends BaseTestExecutor for unified testing infrastructure
 */

import axios from 'axios';
import chalk from 'chalk';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import BaseTestExecutor from './core/base-test-executor.js';
import ResourceManager from './core/resource-manager.js';
import { SharedJiraTestCases, TestValidationUtils, CascadeExecutor } from './shared-test-cases.js';
import { getMcpCoverageStats, getUniqueMcpTools, getMcpToolConfig } from './definitions/mcp-tool-mappings.js';
import { apiResponseLogger } from './core/api-response-logger.js';

const { host = 'localhost', port = 3000 } = appConfig.server;
const DEFAULT_MCP_SERVER_URL = `http://localhost:${port}`;

/**
 * MCP Test Executor
 * Extends BaseTestExecutor for consistent test execution
 */
class McpTestExecutor extends BaseTestExecutor {
  constructor(config = {}) {
    super(config);

    // MCP-specific configuration
    this.serverUrl = config.serverUrl || DEFAULT_MCP_SERVER_URL;
    this.requestId = 1;
    this.timeout = config.timeout || 30000;

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize shared test cases
    this.sharedTestCases = new SharedJiraTestCases();

    // Resource tracking
    this.resourceManager = new ResourceManager({ source: 'mcp', verbose: config.verbose });
    this.setResourceManager(this.resourceManager);

    // Available tools cache
    this.availableTools = new Set();
    this.toolsLoaded = false;

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
   * Load available tools from MCP server
   */
  async loadAvailableTools() {
    if (this.toolsLoaded) return;

    try {
      const response = await this.listTools();
      if (response.result && response.result.tools) {
        response.result.tools.forEach(tool => {
          this.availableTools.add(tool.name);
        });
        this.toolsLoaded = true;
        console.log(`📦 Loaded ${this.availableTools.size} MCP tools`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load MCP tools:', error.message);
    }
  }

  /**
   * Server health check
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get list of available tools
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
  async callTool(name, args = {}, options = {}) {
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

    // Log MCP response if enabled
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
   * Execute a test case (implementation of abstract method)
   */
  async executeTestCase(testCase) {
    // Get MCP tool configuration from mappings
    const mcpConfig = getMcpToolConfig(testCase.fullId || testCase.id);

    // If no mapping in new system, fallback to testCase.mcpTool
    const mcpTool = mcpConfig?.tool || testCase.mcpTool;
    const mcpArgs = mcpConfig ? mcpConfig.args(testCase) : (testCase.mcpArgs || {});

    // Check if MCP tool is available for this test
    if (!mcpTool) {
      return {
        skipped: true,
        reason: 'No MCP tool mapped for this test',
      };
    }

    // Check if tool is available on the server
    if (!this.availableTools.has(mcpTool)) {
      return {
        skipped: true,
        reason: `MCP tool '${mcpTool}' not available`,
      };
    }

    try {
      // Call the MCP tool
      const response = await this.callTool(
        mcpTool,
        mcpArgs,
        {
          fullId: testCase.fullId || testCase.id,
          testName: testCase.name,
        }
      );

      // Handle MCP error responses
      if (response.error) {
        throw new Error(`MCP error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      // Track created resources
      this.trackCreatedResource(testCase, response.result);

      // Return normalized response
      return {
        result: response.result,
        status: 200, // MCP doesn't return HTTP status codes
      };
    } catch (error) {
      // Check if it's a network error (server not running)
      if (error.code === 'ECONNREFUSED') {
        throw new Error('MCP server is not running. Please start it first.');
      }
      throw error;
    }
  }

  /**
   * Track created resources for cleanup
   */
  trackCreatedResource(testCase, result) {
    if (!result || !testCase.fullId) return;

    // Track based on test case and MCP tool
    if (testCase.mcpTool === 'jira_create_issue' && result.key) {
      this.createdResources.issues.push(result.key);
      this.resourceManager.trackIssue(result.key, result.fields?.project?.key);
    } else if (testCase.mcpTool === 'jira_create_version' && result.id) {
      this.createdResources.versions.push(result.id);
      this.resourceManager.trackVersion(result.id, result.projectId);
    } else if (testCase.mcpTool === 'jira_link_issues' && result.id) {
      this.createdResources.links.push(result.id);
      this.resourceManager.trackLink(result.id);
    }
  }

  /**
   * Get source type (implementation of abstract method)
   */
  getSourceType() {
    return 'mcp';
  }

  /**
   * Check server connectivity
   */
  async checkServerConnection() {
    try {
      const health = await this.healthCheck();
      console.log('✅ MCP server is running');
      console.log(`   Version: ${health.version || 'unknown'}`);
      console.log(`   Status: ${health.status}`);
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Cannot connect to MCP server at ${this.serverUrl}`);
        console.error('   Please ensure the MCP server is running:');
        console.error('   npm start');
        return false;
      }
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log(`\n🔗 MCP Server URL: ${this.serverUrl}`);

    // Check server connection
    if (!await this.checkServerConnection()) {
      process.exit(1);
    }

    // Load available tools
    await this.loadAvailableTools();

    // Get all test cases and add categories
    const allTestCases = [
      ...this.sharedTestCases.getSystemTestCases().map(t => ({...t, category: t.category || 'System'})),
      ...this.sharedTestCases.getInformationalTestCases().map(t => ({...t, category: t.category || 'Informational'})),
      ...this.sharedTestCases.getIssueDetailedTestCases().map(t => ({...t, category: t.category || 'IssueDetailed'})),
      ...this.sharedTestCases.getSearchDetailedTestCases().map(t => ({...t, category: t.category || 'SearchDetailed'})),
      ...this.sharedTestCases.getProjectDetailedTestCases().map(t => ({...t, category: t.category || 'ProjectDetailed'})),
      ...this.sharedTestCases.getUserDetailedTestCases().map(t => ({...t, category: t.category || 'UserDetailed'})),
      ...this.sharedTestCases.getMetadataDetailedTestCases().map(t => ({...t, category: t.category || 'MetadataDetailed'})),
      ...this.sharedTestCases.getModifyingTestCases().map(t => ({...t, category: t.category || 'Modifying'})),
      ...this.sharedTestCases.getAgileTestCases().map(t => ({...t, category: t.category || 'Agile'})),
      ...this.sharedTestCases.getAdditionalTestCases().map(t => ({...t, category: t.category || 'Additional'})),
      ...this.sharedTestCases.getWorkflowSchemesTestCases().map(t => ({...t, category: t.category || 'WorkflowSchemes'})),
      ...this.sharedTestCases.getExtendedTestCases().map(t => ({...t, category: t.category || 'Extended'})),
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

    // Show MCP coverage statistics
    this.displayMcpCoverage();

    // Additional cleanup for MCP-specific resources
    if (this.createdResources.issues.length > 0) {
      console.log(`\n📝 Created issues during tests: ${this.createdResources.issues.join(', ')}`);
    }

    return result;
  }

  /**
   * Display MCP tool coverage statistics
   */
  displayMcpCoverage() {
    const stats = getMcpCoverageStats();
    const tools = getUniqueMcpTools();

    console.log('\n📊 MCP Tool Coverage Statistics:');
    console.log('═'.repeat(50));
    console.log(`Total test cases: ${stats.total}`);
    console.log(`Tests with MCP tools: ${stats.withTools} (${stats.coverage})`);
    console.log(`Tests without MCP tools: ${stats.withoutTools}`);
    console.log(`Unique MCP tools used: ${tools.length}`);

    if (this.verbose && tools.length > 0) {
      console.log('\n🛠️  MCP Tools in use:');
      tools.forEach(tool => {
        const available = this.availableTools.has(tool);
        const symbol = available ? '✅' : '❌';
        console.log(`  ${symbol} ${tool}`);
      });
    }
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
   * Run cascade tests (special MCP workflow tests)
   */
  async runCascadeTests() {
    console.log('\n🔄 Running MCP Cascade Tests');
    console.log('─'.repeat(50));

    const cascadeExecutor = new CascadeExecutor(
      this.sharedTestCases,
      async (testCase) => await this.executeTestCase(testCase),
      this.resourceManager
    );

    const cascadeResults = await cascadeExecutor.runCascade();

    // Add cascade results to our results
    cascadeResults.results.forEach(result => {
      this.results.push({
        ...result,
        category: 'Cascade',
        source: 'mcp',
      });

      this.stats.total++;
      if (result.status === 'passed') this.stats.passed++;
      else if (result.status === 'failed') this.stats.failed++;
      else if (result.status === 'skipped') this.stats.skipped++;
    });

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

  // Parse server URL
  const urlArg = args.find(arg => arg.startsWith('--url='));
  if (urlArg) {
    config.serverUrl = urlArg.split('=')[1];
  }

  // Parse test filter
  const testsArg = args.find(arg => arg.startsWith('--tests='));
  if (testsArg) {
    config.testFilter = testsArg.split('=')[1];
  }

  // Parse timeout
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) {
    config.timeout = parseInt(timeoutArg.split('=')[1]);
  }

  // Enable API response logging
  const logArg = args.find(arg => arg.startsWith('--log='));
  if (logArg) {
    const logFile = logArg.split('=')[1];
    apiResponseLogger.enable(logFile);
  }

  try {
    const executor = new McpTestExecutor(config);

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

export default McpTestExecutor;
