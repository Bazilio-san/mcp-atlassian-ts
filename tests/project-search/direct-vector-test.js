#!/usr/bin/env node

/**
 * Прямой тест векторного поиска без MCP сервера
 * Тестирует функцию поиска напрямую
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Подключаем модули напрямую
const projectRoot = join(__dirname, '../../');
const vectorSearchPath = join(projectRoot, 'dist/src/domains/jira/tools/projects/search-project/vector-search.js');
const projectsCachePath = join(projectRoot, 'dist/src/domains/jira/tools/projects/search-project/projects-cache.js');

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

async function testDirectVectorSearch () {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     DIRECT VECTOR SEARCH TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  try {
    // Импортируем модули
    const { ProjectVectorSearch } = await import(vectorSearchPath);
    const { getJiraProjects } = await import(projectsCachePath);

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