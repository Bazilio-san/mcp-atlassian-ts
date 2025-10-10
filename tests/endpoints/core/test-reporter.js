/**
 * Test Reporter
 * Unified report generation for test results
 */

import chalk from 'chalk';

export const eqLine = '═'.repeat(80);
export const dLine = '-'.repeat(80);

export class TestReporter {
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
      return chalk.green(bar);
    } else if (percentage >= 50) {
      return chalk.yellow(bar);
    } else {
      return chalk.red(bar);
    }
  }

  /**
   * Generate summary report
   */
  static generateSummary (data) {
    const { results, stats } = data;
    const successRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0;
    const duration = this.formatDuration(stats.duration || 0);

    const lines = [];

    // Header
    lines.push('\n' + eqLine);
    lines.push(`📊 Test Results Summary`);
    lines.push(eqLine);

    // Stats table
    lines.push('\n📈 Statistics:');
    lines.push(`  Total Tests:    ${stats.total}`);
    lines.push(`  ✅  Passed:      ${chalk.green(stats.passed)} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
    if (stats.failed) {
      lines.push(`  ❌  Failed:      ${stats.failed > 0 ? chalk.red(stats.failed) : chalk.white(stats.failed)} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
    }
    if (stats.skipped) {
      lines.push(`  ⏭️  Skipped:     ${chalk.yellow(stats.skipped)} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)`);
    }
    // Success indicator
    lines.push('\n📊 Success Rate: ' + this.getSuccessBar(successRate) + ` ${successRate}%`);

    // Timing
    lines.push(`\n⏱️  Execution Time: ${duration}`);

    // Overall status
    lines.push('\n' + dLine);
    if (stats.failed === 0 && stats.passed > 0) {
      lines.push(chalk.green('✨  All tests passed successfully!'));
    } else if (stats.failed > 0) {
      lines.push(chalk.red(`⚠️  ${stats.failed} test(s) failed. Review the details above.`));
    } else if (stats.skipped === stats.total) {
      lines.push(chalk.yellow('⚠️  All tests were skipped.'));
    }

    return lines.join('\n');
  }
}
