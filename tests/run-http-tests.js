#!/usr/bin/env node
/**
 * Simple test runner
 */

import { JiraMcpHttpTester } from './jira-mcp-http-tester.js';

const tester = new JiraMcpHttpTester();

try {
  console.log('Starting JIRA MCP HTTP tests...');
  await tester.runAllTests();
  process.exit(tester.stats.failed > 0 ? 1 : 0);
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
