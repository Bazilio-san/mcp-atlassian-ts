#!/usr/bin/env node

/**
 * Комплексный тест векторного поиска
 *
 * Проверяет:
 * 1. Поиск по 15 тестовым запросам
 * 2. Сброс БД и принудительное обновление
 * 3. Повторную инициализацию из памяти
 * 4. Повторный поиск по тем же запросам
 */

import { execSync } from 'child_process';
import {
  initializeVectorSearch,
  searchProjects,
  updateProjectsIndex,
  clearVectorIndex,
  resetVectorSearchSingleton,
} from '../../dist/src/domains/jira/tools/projects/search-project/index.js';

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

// Тестовые проекты
const TEST_PROJECTS = [
  { key: 'AITECH', name: 'AI TECH', issueTypes: ['Epic', 'Task', 'Bug'] },
  { key: 'DEMO', name: 'Demo Project', issueTypes: ['Task', 'Bug'] },
  { key: 'TEST', name: 'Test Project', issueTypes: ['Story', 'Task'] },
];

// Тестовые запросы с ожидаемыми результатами
const TEST_QUERIES = [
  { query: 'AITECH', targetProject: 'AITECH', maxScore: 0.1, description: 'Exact match uppercase' },
  { query: 'AI TECH', targetProject: 'AITECH', maxScore: 0.2, description: 'With space' },
  { query: 'AI', targetProject: 'AITECH', maxScore: 0.5, description: 'Partial match' },
  { query: 'TECH AI', targetProject: 'AITECH', maxScore: 0.7, description: 'Reversed words' },
  { query: 'AITEXMETALO', targetProject: null, maxScore: 1.0, description: 'Non-existent project' },
  { query: 'tech', targetProject: 'AITECH', maxScore: 0.3, description: 'Lowercase partial' },
  { query: 'ai tec', targetProject: 'AITECH', maxScore: 0.4, description: 'With typo' },
  { query: 'ai tech', targetProject: 'AITECH', maxScore: 0.2, description: 'Lowercase with space' },
  { query: 'aitech', targetProject: 'AITECH', maxScore: 0.1, description: 'Lowercase exact' },
  { query: 'aitex', targetProject: 'AITECH', maxScore: 0.5, description: 'Partial with typo' },
  { query: 'айтех', targetProject: 'AITECH', maxScore: 0.3, description: 'Cyrillic transliteration' },
  { query: 'ии тех', targetProject: 'AITECH', maxScore: 0.4, description: 'Cyrillic with space' },
  { query: 'аи тех', targetProject: 'AITECH', maxScore: 0.4, description: 'Cyrillic alternative' },
  { query: 'ИИ', targetProject: 'AITECH', maxScore: 0.5, description: 'Cyrillic abbreviation' },
  { query: 'demo', targetProject: 'DEMO', maxScore: 0.1, description: 'Demo project search' },
];

/**
 * Выполняет поиск по всем тестовым запросам
 */
async function runSearchTests (testRun) {
  console.log(`\n${colors.cyan}=== ${testRun} ====${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of TEST_QUERIES) {
    try {
      const results = await searchProjects(test.query);

      const topResult = results[0];
      const success =
        (test.targetProject === null && (!topResult || results.length === 0)) ||
        (topResult && topResult.key === test.targetProject && topResult.score <= test.maxScore);

      if (success) {
        console.log(`${colors.green}✅${colors.reset} "${test.query}" → ${
          topResult ? `${topResult.key} (${topResult.score.toFixed(3)})` : 'no results'
        } ${colors.gray}// ${test.description}${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}❌${colors.reset} "${test.query}" → ${
          topResult ? `${topResult.key} (${topResult.score.toFixed(3)})` : 'no results'
        } ${colors.gray}// Expected: ${test.targetProject || 'no results'}${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}❌${colors.reset} "${test.query}" - Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${colors.blue}Results: ${colors.green}${passed} passed${colors.reset}, ${
    failed > 0 ? colors.red : colors.gray}${failed} failed${colors.reset}`);

  return { passed, failed };
}

/**
 * Основной тест
 */
async function runComprehensiveTest () {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     COMPREHENSIVE VECTOR SEARCH TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  try {
    // Сначала компилируем проект
    console.log(`\n${colors.cyan}Building project...${colors.reset}`);
    execSync('npm run build', { stdio: 'inherit' });

    // ========== ФАЗА 1: Первичная инициализация и поиск ==========
    console.log(`\n${colors.yellow}📋 PHASE 1: Initial search with existing data${colors.reset}`);

    // Инициализация векторного поиска
    console.log(`${colors.gray}Initializing vector search...${colors.reset}`);
    let vectorSearch = await initializeVectorSearch();

    if (!vectorSearch) {
      console.error(`${colors.red}❌ Failed to initialize vector search${colors.reset}`);
      process.exit(1);
    }

    // Запускаем первый тест поиска
    const phase1Results = await runSearchTests('Phase 1: Search with existing data');

    // ========== ФАЗА 2: Сброс БД и обновление ==========
    console.log(`\n${colors.yellow}🔄 PHASE 2: Reset DB and force update${colors.reset}`);

    // Сбрасываем векторный индекс
    console.log(`${colors.gray}Clearing vector index...${colors.reset}`);
    await clearVectorIndex();

    // Принудительное обновление с новыми проектами
    console.log(`${colors.gray}Updating vector index with test projects...${colors.reset}`);
    console.log(`${colors.gray}Watch for embedding progress below:${colors.reset}\n`);

    await updateProjectsIndex(TEST_PROJECTS);

    console.log(`\n${colors.green}✅ Vector index updated${colors.reset}`);

    // ========== ФАЗА 3: Повторная инициализация из памяти ==========
    console.log(`\n${colors.yellow}💾 PHASE 3: Re-initialize from persisted data${colors.reset}`);

    // Принудительно переинициализируем (должно загрузить с диска)
    console.log(`${colors.gray}Re-initializing vector search (should load from disk)...${colors.reset}`);

    // Сбрасываем синглтон для переинициализации
    resetVectorSearchSingleton();
    vectorSearch = await initializeVectorSearch();

    if (!vectorSearch) {
      console.error(`${colors.red}❌ Failed to re-initialize vector search${colors.reset}`);
      process.exit(1);
    }

    // ========== ФАЗА 4: Повторный поиск ==========
    console.log(`\n${colors.yellow}🔍 PHASE 4: Search after re-initialization${colors.reset}`);

    const phase4Results = await runSearchTests('Phase 4: Search after re-init');

    // ========== ИТОГОВЫЕ РЕЗУЛЬТАТЫ ==========
    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.yellow}                    FINAL RESULTS${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

    const totalPassed = phase1Results.passed + phase4Results.passed;
    const totalFailed = phase1Results.failed + phase4Results.failed;
    const totalTests = TEST_QUERIES.length * 2; // 2 фазы тестирования

    console.log(`${colors.cyan}Phase 1:${colors.reset} ${colors.green}${phase1Results.passed}/${TEST_QUERIES.length} passed${colors.reset}`);
    console.log(`${colors.cyan}Phase 4:${colors.reset} ${colors.green}${phase4Results.passed}/${TEST_QUERIES.length} passed${colors.reset}`);
    console.log();
    console.log(`${colors.cyan}Total:${colors.reset} ${colors.green}${totalPassed}/${totalTests} tests passed${colors.reset}`);

    if (totalFailed === 0) {
      console.log(`\n${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
      console.log(`${colors.gray}Vector search with in-memory store and persistence works correctly.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ SOME TESTS FAILED${colors.reset}`);
      console.log(`${colors.gray}Please check the implementation.${colors.reset}`);
    }

    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

    process.exit(totalFailed === 0 ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed with error:${colors.reset}`, error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск теста
runComprehensiveTest().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
