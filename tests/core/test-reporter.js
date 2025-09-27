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
  static generateSummary (data) {
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
    lines.push(`  ✅  Passed:      ${this.colorize(stats.passed, 'green')} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
    if (stats.failed) {
      lines.push(`  ❌  Failed:      ${this.colorize(stats.failed, stats.failed > 0 ? 'red' : 'white')} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    }
    if (stats.skipped) {
      lines.push(`  ⏭️  Skipped:     ${this.colorize(stats.skipped, 'yellow')} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)`);
    }
    // Success indicator
    lines.push('\n📊 Success Rate: ' + this.getSuccessBar(successRate) + ` ${successRate}%`);

    // Timing
    lines.push(`\n⏱️  Execution Time: ${duration}`);

    // Overall status
    lines.push('\n' + '─'.repeat(60));
    if (stats.failed === 0 && stats.passed > 0) {
      lines.push(this.colorize('✨  All tests passed successfully!', 'green'));
    } else if (stats.failed > 0) {
      lines.push(this.colorize(`⚠️  ${stats.failed} test(s) failed. Review the details above.`, 'red'));
    } else if (stats.skipped === stats.total) {
      lines.push(this.colorize('⚠️  All tests were skipped.', 'yellow'));
    }

    return lines.join('\n');
  }

  /**
   * Helper: Format duration
   */
  static formatDuration (ms) {
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
  static getSuccessBar (percentage) {
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
  static colorize (text, color) {
    const colorCode = colors[color] || '';
    return colorCode + text + colors.reset;
  }
}

export default TestReporter;
