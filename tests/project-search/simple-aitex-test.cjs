#!/usr/bin/env node

/**
 * Простой тест для AITEX - использует готовую функцию поиска
 */

const path = require('path');

// Цветной вывод
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

async function testAitexSearch() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     SIMPLE AITEX VECTOR SEARCH TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  try {
    // Подключаем модуль поиска
    const projectRoot = path.join(__dirname, '../../');
    const searchIndexPath = path.join(projectRoot, 'dist/src/domains/jira/tools/projects/search-project/index.js');

    console.log(`${colors.cyan}Loading search module: ${searchIndexPath}${colors.reset}`);

    const { searchProjects, initializeVectorSearch, isVectorSearchAvailable } = require(searchIndexPath);

    // Инициализируем векторный поиск
    console.log(`${colors.cyan}Initializing vector search...${colors.reset}`);
    await initializeVectorSearch();

    const isAvailable = isVectorSearchAvailable();
    console.log(`${colors.cyan}Vector search available: ${isAvailable}${colors.reset}`);

    if (!isAvailable) {
      console.log(`${colors.red}❌  Vector search is not available${colors.reset}`);
      process.exit(1);
    }

    // Тестируем поиск AITEX
    const query = 'AITEX';
    const limit = 7;

    console.log(`\n${colors.cyan}🔍 Searching for "${query}" (limit: ${limit}):${colors.reset}\n`);

    const results = await searchProjects(query, limit);

    if (results.length === 0) {
      console.log(`${colors.red}❌  No results found for "${query}"${colors.reset}`);
      console.log(`${colors.gray}   This means the vector search didn't find any similar projects${colors.reset}`);

      // Попробуем с другими поисками для проверки что система работает
      console.log(`\n${colors.cyan}Testing with "AI" to verify system works:${colors.reset}`);
      const aiResults = await searchProjects('AI', 3);
      console.log(`${colors.cyan}AI results: ${aiResults.length}${colors.reset}`);

      if (aiResults.length > 0) {
        console.log(`${colors.green}✅  Vector search system is working - found results for "AI"${colors.reset}`);
        aiResults.forEach((project, index) => {
          const score = project.score ? project.score.toFixed(4) : 'N/A';
          console.log(`   ${index + 1}. ${project.key} "${project.name}" - score: ${score}`);
        });
      }

    } else {
      console.log(`${colors.green}✅  Found ${results.length} results for "${query}":${colors.reset}\n`);

      results.forEach((project, index) => {
        const score = project.score ? project.score.toFixed(4) : 'N/A';
        const icon = project.score >= 0.8 ? '🎯' : project.score >= 0.5 ? '🔶' : '🔹';
        console.log(`${icon} ${index + 1}. ${project.key} "${project.name}" - score: ${score}`);
      });
    }

    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}AITEX search test completed${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌  Test failed:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем тест
testAitexSearch().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});