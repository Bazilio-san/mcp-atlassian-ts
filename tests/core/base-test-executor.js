/**
 * Base Test Executor
 * Abstract class with common test execution logic
 * All test runners should extend this class
 */

import ValidationEngine from './validation-engine.js';
import TestReporter from './test-reporter.js';

class BaseTestExecutor {
  constructor(config = {}) {
    this.config = config;
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      duration: 0,
    };
    this.resourceManager = null;
    this.testFilter = config.testFilter || null;
    this.verbose = config.verbose || false;
  }

  /**
   * Set resource manager for tracking created resources
   */
  setResourceManager(resourceManager) {
    this.resourceManager = resourceManager;
  }

  /**
   * Common execution logic for shared test cases
   */
  async runSharedTestCase(testCase) {
    const startTime = Date.now();
    let result = {
      testId: testCase.id,
      name: testCase.name,
      category: testCase.category,
      source: this.getSourceType(),
      status: 'pending',
      duration: 0,
      error: null,
      response: null,
    };

    try {
      // Check if test should be skipped based on filter
      if (!this.shouldRunTest(testCase)) {
        result.status = 'skipped';
        result.reason = 'Filtered out';
        this.stats.skipped++;
        return result;
      }

      // Execute the test case (implemented by subclasses)
      const response = await this.executeTestCase(testCase);

      // Handle skipped tests (e.g., unavailable MCP tools)
      if (response && response.skipped) {
        result.status = 'skipped';
        result.reason = response.reason || 'Tool not available';
        this.stats.skipped++;
      } else {
        // Validate the response
        const validation = ValidationEngine.validateResponse(
          response,
          testCase,
          this.getSourceType()
        );

        result.status = validation.passed ? 'passed' : 'failed';
        result.response = response;
        result.validationDetails = validation.details;

        if (validation.passed) {
          this.stats.passed++;
        } else {
          this.stats.failed++;
          result.error = validation.error;
        }
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error.message || error;
      this.stats.failed++;
    } finally {
      result.duration = Date.now() - startTime;
      this.stats.total++;
      this.results.push(result);
    }

    return result;
  }

  /**
   * Run tests by category
   */
  async runTestsByCategory(category, testCases) {
    const categoryTests = testCases.filter(test => test.category === category);

    console.log(`\n📂 Running ${category} tests (${categoryTests.length} tests)`);
    console.log('─'.repeat(50));

    for (const testCase of categoryTests) {
      if (this.verbose) {
        console.log(`  ▶ ${testCase.id}: ${testCase.name}`);
      }

      const result = await this.runSharedTestCase(testCase);

      // Print result inline
      const statusSymbol =
        result.status === 'passed' ? '✅' :
        result.status === 'failed' ? '❌' :
        '⏭️';

      if (!this.verbose) {
        process.stdout.write(statusSymbol + ' ');
      } else {
        console.log(`    ${statusSymbol} ${result.status} (${result.duration}ms)`);
        if (result.status === 'failed' && result.error) {
          console.log(`    └─ Error: ${result.error}`);
        }
        if (result.status === 'skipped' && result.reason) {
          console.log(`    └─ Reason: ${result.reason}`);
        }
      }
    }

    if (!this.verbose) {
      console.log(); // New line after status symbols
    }
  }

  /**
   * Check if test should run based on filter
   */
  shouldRunTest(testCase) {
    if (!this.testFilter) return true;

    // Support multiple filter formats
    // Format: "1-1,2-*,3-5"
    const filters = this.testFilter.split(',');

    // Use fullId or id for matching
    const testId = testCase.fullId || testCase.id;

    for (const filter of filters) {
      if (filter.includes('*')) {
        // Wildcard matching (e.g., "2-*")
        const prefix = filter.replace('*', '');
        if (testId.startsWith(prefix)) return true;
      } else {
        // Exact match
        if (testId === filter) return true;
      }
    }

    return false;
  }

  /**
   * Generate final report
   */
  generateReport() {
    this.stats.endTime = Date.now();
    if (this.stats.startTime) {
      this.stats.duration = this.stats.endTime - this.stats.startTime;
    }

    return TestReporter.generateSummary({
      results: this.results,
      stats: this.stats,
      source: this.getSourceType(),
    });
  }

  /**
   * Print detailed results for failed tests
   */
  printFailedTests() {
    const failedTests = this.results.filter(r => r.status === 'failed');

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests Details:');
      console.log('═'.repeat(50));

      failedTests.forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.testId}: ${test.name}`);
        console.log(`   Category: ${test.category}`);
        console.log(`   Error: ${test.error}`);

        if (test.validationDetails) {
          console.log(`   Validation: ${JSON.stringify(test.validationDetails, null, 2)}`);
        }
      });
    }
  }

  /**
   * Abstract method - must be implemented by subclasses
   * Execute a single test case
   */
  async executeTestCase(testCase) {
    throw new Error('executeTestCase() must be implemented by subclass');
  }

  /**
   * Abstract method - must be implemented by subclasses
   * Return source type ('mcp' or 'direct')
   */
  getSourceType() {
    throw new Error('getSourceType() must be implemented by subclass');
  }

  /**
   * Run all tests with provided test cases
   */
  async runAllTests(testCases) {
    console.log(`\n🚀 Starting ${this.getSourceType().toUpperCase()} Test Execution`);
    console.log('═'.repeat(60));

    this.stats.startTime = Date.now();

    // Get unique categories
    const categories = [...new Set(testCases.map(t => t.category))];

    // Run tests by category
    for (const category of categories) {
      await this.runTestsByCategory(category, testCases);
    }

    // Generate and print report
    const report = this.generateReport();
    console.log(report);

    // Print failed test details if any
    if (this.stats.failed > 0 && this.verbose) {
      this.printFailedTests();
    }

    // Clean up resources if resource manager is set
    if (this.resourceManager) {
      console.log('\n🧹 Cleaning up resources...');
      await this.resourceManager.cleanup();
    }

    return {
      success: this.stats.failed === 0,
      stats: this.stats,
      results: this.results,
    };
  }
}

export default BaseTestExecutor;