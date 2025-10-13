#!/usr/bin/env node

/**
 * Прямой тест векторного поиска без MCP сервера
 * Тестирует функцию поиска напрямую
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

async function testDirectVectorSearch() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     DIRECT VECTOR SEARCH TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  try {
    // Подключаем модули напрямую
    const projectRoot = path.join(__dirname, '../../');
    const vectorSearchPath = path.join(projectRoot, 'dist/src/domains/jira/tools/projects/search-project/vector-search.js');
    const projectsCachePath = path.join(projectRoot, 'dist/src/domains/jira/tools/projects/search-project/projects-cache.js');

    console.log(`${colors.cyan}Loading modules...${colors.reset}`);
    console.log(`Vector search: ${vectorSearchPath}`);
    console.log(`Projects cache: ${projectsCachePath}`);

    const { ProjectVectorSearch } = require(vectorSearchPath);
    const { getJiraProjects } = require(projectsCachePath);

    console.log(`${colors.green}✅  Modules loaded${colors.reset}`);

    console.log(`${colors.cyan}Initializing vector search...${colors.reset}`);

    // Создаем экземпляр векторного поиска
    const vectorSearch = new ProjectVectorSearch();

    // Загружаем проекты из JIRA
    console.log(`${colors.cyan}Loading projects from JIRA...${colors.reset}`);
    const { result: projects, error } = await getJiraProjects();

    if (error) {
      throw new Error(`Failed to load projects: ${error.message || error}`);
    }

    if (!projects || projects.length === 0) {
      throw new Error('No projects loaded from JIRA');
    }

    console.log(`${colors.green}✅  Loaded ${projects.length} projects${colors.reset}`);

    // Инициализируем векторный поиск с проектами
    console.log(`${colors.cyan}Initializing vector search with projects...${colors.reset}`);
    await vectorSearch.initialize();
    await vectorSearch.updateProjects(projects, true); // Force update

    console.log(`${colors.green}✅  Vector search initialized${colors.reset}\n`);

    // Тестируем поиск AITEX с низким threshold для получения результатов
    const query = 'AITEX';
    const limit = 7;
    const threshold = 0.1; // Очень низкий threshold чтобы увидеть все результаты

    console.log(`${colors.cyan}🔍 Testing direct vector search for "${query}" (threshold: ${threshold}):${colors.reset}\n`);

    const results = await vectorSearch.searchProjects(query, limit, threshold);

    if (results.length === 0) {
      console.log(`${colors.red}❌  No results found for "${query}"${colors.reset}`);
      console.log(`${colors.gray}   This means even with threshold ${threshold}, no projects are similar enough${colors.reset}`);

      // Попробуем еще более низкий threshold
      console.log(`\n${colors.cyan}Trying with even lower threshold (0.01):${colors.reset}`);
      const resultsLower = await vectorSearch.searchProjects(query, limit, 0.01);

      if (resultsLower.length === 0) {
        console.log(`${colors.red}❌  Still no results with threshold 0.01${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Found ${resultsLower.length} results with threshold 0.01:${colors.reset}`);
        resultsLower.forEach((project, index) => {
          const score = project.score.toFixed(4);
          console.log(`🔹 ${index + 1}. ${project.key} "${project.name}" - score: ${score}`);
        });
      }
    } else {
      console.log(`${colors.green}✅  Found ${results.length} results for "${query}":${colors.reset}\n`);

      results.forEach((project, index) => {
        const score = project.score.toFixed(4);
        const icon = project.score >= 0.8 ? '🎯' : project.score >= 0.5 ? '🔶' : '🔹';
        console.log(`${icon} ${index + 1}. ${project.key} "${project.name}" - score: ${score}`);
      });
    }

    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}Direct vector search test completed${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌  Test failed:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запускаем тест
testDirectVectorSearch().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});