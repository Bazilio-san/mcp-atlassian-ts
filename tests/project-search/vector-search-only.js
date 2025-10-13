#!/usr/bin/env node

/**
 * Тест только векторного поиска
 * Проверяет scores и качество поиска без fallback логики
 */

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

// Тестовые запросы
const TEST_QUERIES = [
  { query: '*', description: 'Get all projects (wildcard)' },
  { query: 'CARDDEV', description: 'Exact project key match' },
  { query: 'CARDDEw', description: 'Typo in project key' },
  { query: 'AI', description: 'Short exact match' },
  { query: 'аитех', description: 'Russian transliteration' },
  { query: 'айтех', description: 'Russian alternative spelling' },
  { query: 'AITEX', description: 'English equivalent' },
  { query: 'NonExistentProject123456', description: 'Non-existent project' },
];

/**
 * Вызов MCP инструмента через HTTP
 */
async function callVectorSearch (query) {
  try {
    const response = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'jira_find_project',
          arguments: { query: query, limit: 5 }, // Ограничиваем до 5 результатов
        },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Tool call failed');
    }

    if (data.result && data.result.content && data.result.content.length > 0) {
      const content = data.result.content[0];
      if (content.type === 'text') {
        try {
          return JSON.parse(content.text);
        } catch {
          return content.text;
        }
      }
    }
    return data.result;
  } catch (error) {
    console.error(`${colors.red}Error calling vector search:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Форматирование результата поиска
 */
function formatSearchResult (query, result, description) {
  let projects = [];

  // Парсим результат
  if (typeof result === 'string') {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      projects = JSON.parse(jsonMatch[0]);
    }
  } else if (Array.isArray(result)) {
    projects = result;
  } else if (result && result.matches) {
    projects = result.matches;
  } else if (result && result.projects) {
    projects = result.projects;
  }

  const count = projects.length;
  const icon = count > 0 ? `${colors.green}✅` : `${colors.red}❌`;

  let output = `${icon}  "${query}" → ${count} results`;

  if (count === 0) {
    output += `${colors.reset}`;
  } else if (count === 1) {
    const project = projects[0];
    const score = project.score ? ` / score ${project.score.toFixed(2)}` : '';
    output += `${score}${colors.reset}`;
  } else {
    // Для множественных результатов показываем топ с scores
    const topResults = projects
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(p => `${p.key} (${(p.score || 0).toFixed(2)})`)
      .join(', ');
    output += ` / ${topResults}${colors.reset}`;
  }

  output += `${colors.gray} :: ${description}${colors.reset}`;

  return output;
}

/**
 * Главная функция теста
 */
async function runVectorSearchTest () {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     VECTOR SEARCH ONLY TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  // Проверяем доступность сервера
  try {
    const response = await fetch('http://localhost:3000/health');
    if (!response.ok) {
      throw new Error('Server health check failed');
    }
    console.log(`${colors.green}✅  MCP server is running${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌  MCP server is not running on port 3000${colors.reset}`);
    console.log(`${colors.yellow}Please start the server first: npm start${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.cyan}Testing vector search with various queries:${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of TEST_QUERIES) {
    try {
      const result = await callVectorSearch(test.query);
      const output = formatSearchResult(test.query, result, test.description);
      console.log(output);

      // Простая логика успеха - если запрос не вызвал ошибку
      passed++;
    } catch (error) {
      console.log(`${colors.red}❌  "${test.query}" → ERROR: ${error.message}${colors.reset}`);
      failed++;
    }
  }

  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  // Специальный тест для AITEX с детальным анализом
  console.log(`${colors.cyan}🔍 Detailed analysis for "AITEX":${colors.reset}`);
  try {
    const aitexResult = await callVectorSearch('AITEX');
    let projects = [];

    if (aitexResult && aitexResult.matches) {
      projects = aitexResult.matches;
    }

    if (projects.length === 0) {
      console.log(`${colors.red}❌  No results found for "AITEX"${colors.reset}`);
      console.log(`${colors.gray}   This suggests the threshold (0.8) is too strict for this query${colors.reset}`);
    } else {
      console.log(`${colors.green}✅  Found ${projects.length} results for "AITEX":${colors.reset}`);
      projects
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .forEach((project, index) => {
          const score = (project.score || 0).toFixed(4);
          console.log(`   ${index + 1}. ${project.key} "${project.name}" - score: ${score}`);
        });
    }
  } catch (error) {
    console.log(`${colors.red}❌  Error testing AITEX: ${error.message}${colors.reset}`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Запуск теста
runVectorSearchTest().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});