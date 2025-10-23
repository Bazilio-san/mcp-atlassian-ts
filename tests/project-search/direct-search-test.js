// Прямой тест функции поиска проектов без HTTP интерфейса
// Тестируем текстовый поиск с реальными данными из JIRA

import {
  searchProjects,
} from '../../dist/src/domains/jira/tools/projects/search-project/index.js';
import { getProjectsCache } from '../../dist/src/domains/jira/tools/projects/search-project/projects-cache.js';
import { createAuthenticationManager } from '../../dist/src/core/auth.js';

// Тестовые поисковые запросы (основаны на реальных проектах)
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
 * Основная функция тестирования
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
      console.log('ошибка загрузки проектов');
      return;
    }

    console.log('загружено проектов:', projectsResult.result.length);
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

          // Показываем все результаты в одну строку через запятую
          const resultsLine = results.slice(0, 5).map((result) => {
            // Используем реальный score от поисковой системы (уже в формате 0.0-1.0)
            const scorePercent = Math.floor(result.score * 100);
            return `${result.key} (${scorePercent})`;
          }).join(', ');

          console.log(`   ${resultsLine}`);
        } else {
          console.log('   не найдено');
        }
      } catch (error) {
        console.log(`   ошибка: ${error.message}`);
      }

      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('');
    console.log(`успешно: ${successfulTests} из ${totalTests}`);

  } catch (error) {
    console.log('ошибка:', error.message);
  }
}

// Показываем только основные сообщения, скрывая логи инициализации
const originalLog = console.log;
console.log = (() => {
  let initializationComplete = false;

  return (...args) => {
    const message = String(args[0] || '');

    // Показываем сообщение о загрузке проектов и все последующие
    if (initializationComplete || message.includes('загружено проектов')) {
      initializationComplete = true;
      originalLog.apply(console, args);
    }
  };
})();

// Запуск тестов
runDirectSearchTests().catch((error) => {
  console.error('💥 Фатальная ошибка:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});
