/**
 * Test Reporter
 * Unified report generation for test results
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class TestReporter {
  /**
   * Generate summary report
   */
  static generateSummary(data) {
    const { results, stats, source } = data;
    const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;
    const duration = this.formatDuration(stats.duration || 0);

    const lines = [];

    // Header
    lines.push('\n' + '═'.repeat(60));
    lines.push(`📊 ${source.toUpperCase()} Test Results Summary`);
    lines.push('═'.repeat(60));

    // Stats table
    lines.push('\n📈 Statistics:');
    lines.push(`  Total Tests:    ${stats.total}`);
    lines.push(`  ✅ Passed:      ${this.colorize(stats.passed, 'green')} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
    lines.push(`  ❌ Failed:      ${this.colorize(stats.failed, stats.failed > 0 ? 'red' : 'white')} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    lines.push(`  ⏭️  Skipped:     ${this.colorize(stats.skipped, 'yellow')} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)`);

    // Success indicator
    lines.push('\n📊 Success Rate: ' + this.getSuccessBar(successRate) + ` ${successRate}%`);

    // Timing
    lines.push(`\n⏱️  Execution Time: ${duration}`);

    // Overall status
    lines.push('\n' + '─'.repeat(60));
    if (stats.failed === 0 && stats.passed > 0) {
      lines.push(this.colorize('✨ All tests passed successfully!', 'green'));
    } else if (stats.failed > 0) {
      lines.push(this.colorize(`⚠️  ${stats.failed} test(s) failed. Review the details above.`, 'red'));
    } else if (stats.skipped === stats.total) {
      lines.push(this.colorize('⚠️  All tests were skipped.', 'yellow'));
    }

    return lines.join('\n');
  }

  /**
   * Print detailed results
   */
  static printDetailedResults(results) {
    const lines = [];

    lines.push('\n' + '═'.repeat(60));
    lines.push('📋 Detailed Test Results');
    lines.push('═'.repeat(60));

    // Group by category
    const groupedResults = this.groupByCategory(results);

    for (const [category, tests] of Object.entries(groupedResults)) {
      lines.push(`\n📂 ${category}`);
      lines.push('─'.repeat(40));

      for (const test of tests) {
        const statusIcon =
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          '⏭️';

        const statusColor =
          test.status === 'passed' ? 'green' :
          test.status === 'failed' ? 'red' :
          'yellow';

        lines.push(`  ${statusIcon} ${test.testId}: ${test.name}`);
        lines.push(`     Status: ${this.colorize(test.status.toUpperCase(), statusColor)}`);
        lines.push(`     Duration: ${test.duration}ms`);

        if (test.status === 'failed' && test.error) {
          lines.push(`     Error: ${this.colorize(test.error, 'red')}`);
          if (test.validationDetails) {
            lines.push(`     Details: ${JSON.stringify(test.validationDetails, null, 2).split('\n').join('\n              ')}`);
          }
        }

        if (test.status === 'skipped' && test.reason) {
          lines.push(`     Reason: ${this.colorize(test.reason, 'yellow')}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON report
   */
  static generateJsonReport(data) {
    const { results, stats, source } = data;

    return {
      source,
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        successRate: stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0,
      },
      categoryBreakdown: this.getCategoryStats(results),
      results: results.map(r => ({
        ...r,
        response: undefined, // Remove large response data from report
      })),
    };
  }

  /**
   * Generate CSV report
   */
  static generateCsvReport(results) {
    const lines = [];

    // Header
    lines.push('Test ID,Name,Category,Status,Duration (ms),Error');

    // Data rows
    for (const test of results) {
      const error = test.error ? `"${test.error.replace(/"/g, '""')}"` : '';
      lines.push(`${test.testId},"${test.name}",${test.category},${test.status},${test.duration},${error}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  static generateHtmlReport(data) {
    const { results, stats, source } = data;
    const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${source.toUpperCase()} Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .passed { color: green; font-weight: bold; }
        .failed { color: red; font-weight: bold; }
        .skipped { color: orange; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        tr.passed { background: #e8f5e9; }
        tr.failed { background: #ffebee; }
        tr.skipped { background: #fff3e0; }
        .progress-bar { width: 200px; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: ${stats.failed === 0 ? '#4caf50' : '#f44336'}; }
    </style>
</head>
<body>
    <h1>${source.toUpperCase()} Test Report</h1>
    <div class="stats">
        <h2>Statistics</h2>
        <p>Total Tests: ${stats.total}</p>
        <p class="passed">Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(1)}%)</p>
        <p class="failed">Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)</p>
        <p class="skipped">Skipped: ${stats.skipped} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)</p>
        <p>Success Rate: ${successRate}%</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${successRate}%"></div>
        </div>
    </div>
    <h2>Test Results</h2>
    <table>
        <thead>
            <tr>
                <th>Test ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Duration (ms)</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(test => `
                <tr class="${test.status}">
                    <td>${test.testId}</td>
                    <td>${test.name}</td>
                    <td>${test.category}</td>
                    <td>${test.status.toUpperCase()}</td>
                    <td>${test.duration}</td>
                    <td>${test.error || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <p><small>Generated: ${new Date().toISOString()}</small></p>
</body>
</html>`;
  }

  /**
   * Helper: Format duration
   */
  static formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Helper: Get success bar visualization
   */
  static getSuccessBar(percentage) {
    const filled = Math.round(percentage / 5); // 20 segments total
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    if (percentage >= 80) {
      return this.colorize(bar, 'green');
    } else if (percentage >= 50) {
      return this.colorize(bar, 'yellow');
    } else {
      return this.colorize(bar, 'red');
    }
  }

  /**
   * Helper: Colorize text
   */
  static colorize(text, color) {
    const colorCode = colors[color] || '';
    return colorCode + text + colors.reset;
  }

  /**
   * Helper: Get category statistics
   */
  static getCategoryStats(results) {
    const stats = {};

    for (const test of results) {
      if (!stats[test.category]) {
        stats[test.category] = {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        };
      }

      stats[test.category].total++;
      stats[test.category][test.status]++;
    }

    return stats;
  }

  /**
   * Helper: Group results by category
   */
  static groupByCategory(results) {
    const grouped = {};

    for (const test of results) {
      if (!grouped[test.category]) {
        grouped[test.category] = [];
      }
      grouped[test.category].push(test);
    }

    return grouped;
  }
}

export default TestReporter;
