// Direct test of project search function without HTTP interface
// Testing text search with real JIRA data

import {
  searchProjects,
} from '../../dist/src/domains/jira/tools/projects/search-project/index.js';
import { getProjectsCache } from '../../dist/src/domains/jira/tools/projects/search-project/projects-cache.js';
import { createAuthenticationManager } from '../../dist/src/core/auth.js';

// Test search queries (based on real projects)
const testQueries = [
  'антифрод',
  'антифрауд',
  'AITECH',
  'AI-TECH',
  'AI_TECH',
  'AITEX',
  'AI-TEX',
  'AI_TEX',
  'аитеч',
  'аитех',
  'аи тех',
  'айтех',
  'айтэк',
  'айтек',

  'FINOFFICE',
  'финофис',
  'fin office',
];

/**
 * Main testing function
 */
async function runDirectSearchTests () {
  try {
    // Initialize HTTP client and projects cache first
    // Use local emulator for testing
    const jiraUrl = process.env.JIRA_URL || 'http://localhost:8080';
    const jiraUsername = process.env.JIRA_USERNAME || 'admin';
    const jiraPassword = process.env.JIRA_PASSWORD || 'admin';

    const authConfig = {
      type: 'basic',
      username: jiraUsername,
      password: jiraPassword,
    };

    const authManager = createAuthenticationManager(authConfig, jiraUrl);

    const projectsResult = await getProjectsCache(); // VVA
    if (projectsResult.error || projectsResult.result.length === 0) {
      console.log('error loading projects');
      return;
    }

    console.log('loaded projects:', projectsResult.result.length);
    console.log('');

    let totalTests = 0;
    let successfulTests = 0;

    for (const query of testQueries) {
      totalTests++;
      console.log(`${query} -`);

      try {
        const results = await searchProjects(query, 5);

        if (results.length > 0) {
          successfulTests++;

          // Show all results in one line separated by commas
          const resultsLine = results.slice(0, 5).map((result) => {
            // Use real score from search engine (already in 0.0-1.0 format)
            const scorePercent = Math.floor(result.score * 100);
            return `${result.key} (${scorePercent})`;
          }).join(', ');

          console.log(`   ${resultsLine}`);
        } else {
          console.log('   not found');
        }
      } catch (error) {
        console.log(`   error: ${error.message}`);
      }

      // Small pause between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('');
    console.log(`successful: ${successfulTests} of ${totalTests}`);

  } catch (error) {
    console.log('error:', error.message);
  }
}

// Show only main messages, hiding initialization logs
const originalLog = console.log;
console.log = (() => {
  let initializationComplete = false;

  return (...args) => {
    const message = String(args[0] || '');

    // Show project loading message and all subsequent messages
    if (initializationComplete || message.includes('loaded projects')) {
      initializationComplete = true;
      originalLog.apply(console, args);
    }
  };
})();

// Run tests
runDirectSearchTests().catch((error) => {
  console.error('💥 Fatal error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});
