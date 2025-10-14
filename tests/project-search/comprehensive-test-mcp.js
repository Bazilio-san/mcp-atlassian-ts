#!/usr/bin/env node

/**
 * Комплексный тест поиска проектов через MCP сервер
 *
 * Работает как MCP клиент, обращается к реальному запущенному серверу
 * и тестирует поиск по реальным данным из JIRA.
 *
 * Тестирует как векторный поиск
 * так и fallback на простой поиск без векторов.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { rn } from '../../dist/src/core/utils/tools.js';

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

// Тестовые запросы с ожидаемыми результатами
// Эти будут адаптированы под реальные проекты после их получения
const TEST_QUERIES = [
  { query: 'CARDDEV', description: 'Exact uppercase match', expectResults: true },
  { query: 'CARDDEw', description: 'Exact uppercase match', expectResults: true },
  { query: 'AI', description: 'Partial match', expectResults: true },
  { query: 'аитех', description: 'Exact uppercase match', expectResults: true },
  { query: 'айтех', description: 'Exact uppercase match', expectResults: true },
  { query: 'AITEX', description: 'Exact uppercase match', expectResults: true },
  { query: 'NonExistentProject123456', description: 'Non-existent project', expectResults: false },
  { query: '*', description: 'Get all projects (wildcard)', expectResults: true },
];

/**
 * Создание MCP клиента (HTTP транспорт)
 */
async function createMCPClient () {
  console.log(`${colors.cyan}Creating MCP client (HTTP)...${colors.reset}`);

  // Проверяем, запущен ли сервер
  try {
    const response = await fetch('http://localhost:3000/health');
    if (!response.ok) {
      throw new Error('Server health check failed');
    }
    console.log(`${colors.green}✅  MCP server is running${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌  MCP server is not running on port 3000${colors.reset}`);
    console.log(`${colors.yellow}Please start the server first: npm start${colors.reset}`);
    process.exit(1);
  }

  // Возвращаем HTTP клиент
  return {
    client: null, // Используем прямые HTTP запросы
    serverProcess: null,
  };
}

/**
 * Вызов MCP инструмента через HTTP
 */
async function callTool (client, toolName, args = {}) {
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
          name: toolName,
          arguments: args,
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
    console.error(`${colors.red}Error calling tool ${toolName}:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Получение списка доступных инструментов через HTTP
 */
async function getAvailableTools (client) {
  try {
    const response = await fetch('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Failed to get tools');
    }

    return data.result?.tools || [];
  } catch (error) {
    console.error(`${colors.red}Error getting tools:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Тест поиска проектов
 */
async function testProjectSearch (client, query, description) {
  try {
    const result = await callTool(client, 'jira_find_project', {
      query: query,
    });

    // Проверяем результат - правильная структура: result.matches
    let projects = [];
    if (typeof result === 'string') {
      // Если результат - строка, пытаемся найти JSON внутри
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

    // Выводим первые 5 кандидатов по убыванию score для отладки
    let top5 = '';
    if (projects.length > 0) {
      top5 = projects
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map(p => `${p.key}(${rn(p.score, 2) || 0})`)
        .join(', ');
    }

    return {
      success: true,
      projects: projects,
      count: projects.length,
      top5,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      count: 0,
    };
  }
}

/**
 * Выполнение тестов поиска
 */
async function runSearchTests (client, realProjects, testPhase) {
  console.log(`\n${colors.cyan}=== ${testPhase} ====${colors.reset}\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  // Сначала тестируем базовые запросы
  for (const test of TEST_QUERIES) {
    const result = await testProjectSearch(client, test.query, test.description);

    const success = test.expectResults ? result.count > 0 : result.count === 0;

    if (success) {
      console.log(`✅  "${test.query}" → ${result.top5}`);
      passed++;
    } else {
      console.log(`❌  "${test.query}" → ${result.top5}`);
      failed++;
    }

    results.push({ ...test, ...result });
  }

  // Тестируем поиск по реальным проектам (если они есть)
  if (realProjects && realProjects.length > 0) {
    console.log(`\n${colors.blue}Testing with real projects:${colors.reset}`);

    for (const project of realProjects.slice(0, 3)) { // Тестируем первые 3 проекта
      // Тест точного совпадения по ключу
      const keyResult = await testProjectSearch(client, project.key, `Exact key: ${project.key}`);
      if (keyResult.count > 0 && keyResult.projects[0].key === project.key) {
        console.log(`✅  "${project.key}" → ${keyResult.top5}`);
        passed++;
      } else {
        console.log(`❌  "${project.key}" → ${keyResult.top5}`);
        failed++;
      }

      // Тест по имени проекта (если отличается от ключа)
      if (project.name && project.name !== project.key) {
        const nameResult = await testProjectSearch(client, project.name, `By name: ${project.name}`);
        if (nameResult.count > 0) {
          console.log(`✅  "${project.name}" → ${nameResult.top5}`);
          passed++;
        } else {
          console.log(`❌  "${project.name}" → ${nameResult.top5}`);
          failed++;
        }
      }

      // Тест частичного совпадения
      if (project.key.length > 2) {
        const partial = project.key.substring(0, Math.ceil(project.key.length / 2));
        const partialResult = await testProjectSearch(client, partial, `Partial: ${partial}`);
        if (partialResult.count > 0) {
          console.log(`✅  "${partial}" → ${partialResult.top5}`);
          passed++;
        } else {
          console.log(`⚠️  "${partial}" → ${partialResult.top5}`);
          // Не считаем как ошибку, так как частичное совпадение не гарантировано
        }
      }
    }
  }

  console.log(`\n${colors.blue}Results: ${colors.green}${passed} passed${colors.reset}, ${
    failed > 0 ? colors.red : colors.gray}${failed} failed${colors.reset}`);

  return { passed, failed, results };
}

/**
 * Основной тест
 */
async function runComprehensiveTest () {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}     MCP VECTOR SEARCH COMPREHENSIVE TEST${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  let client;
  let serverProcess;

  try {
    // Создаем MCP клиента
    const connection = await createMCPClient();
    client = connection.client;
    serverProcess = connection.serverProcess;

    // Получаем список инструментов
    console.log(`\n${colors.cyan}Checking available tools...${colors.reset}`);
    const tools = await getAvailableTools(client);
    const hasSearchTool = tools.some(t => t.name === 'jira_find_project');

    if (!hasSearchTool) {
      console.error(`${colors.red}❌  Tool 'jira_find_project' not found!${colors.reset}`);
      console.log('Available tools:', tools.map(t => t.name).join(', '));
      process.exit(1);
    }

    console.log(`${colors.green}✅  Found jira_find_project tool${colors.reset}`);

    // ========== ФАЗА 1: Получение реальных проектов ==========
    console.log(`\n${colors.yellow}📋 PHASE 1: Get real projects from JIRA${colors.reset}`);

    let realProjects = [];
    try {
      // Получаем все проекты через wildcard
      const allProjectsResult = await testProjectSearch(client, '*', 'Get all projects');
      if (allProjectsResult.success && allProjectsResult.count > 0) {
        realProjects = allProjectsResult.projects;
        console.log(`${colors.green}✅  Found ${realProjects.length} real projects${colors.reset}`);

        // Показываем первые несколько проектов
        console.log(`${colors.gray}Sample projects:${colors.reset}`);
        realProjects.slice(0, 5).forEach(p => {
          console.log(`  - ${p.key}: ${p.name || p.key}`);
        });
        if (realProjects.length > 5) {
          console.log(`  ... and ${realProjects.length - 5} more`);
        }
      } else {
        console.log(`${colors.yellow}⚠️ No projects found, will test with defaults${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not get real projects: ${error.message}${colors.reset}`);
    }

    // ========== ФАЗА 2: Тест поиска с текущими данными ==========
    console.log(`\n${colors.yellow}🔍 PHASE 2: Search tests with current data${colors.reset}`);

    const phase2Results = await runSearchTests(
      client,
      realProjects,
      'Phase 2: Initial search tests',
    );

    // ========== ФАЗА 3: Принудительное обновление индекса ==========
    console.log(`\n${colors.yellow}🔄 PHASE 3: Force vector index update${colors.reset}`);

    try {
      // Вызываем обновление индекса через jira_get_all_projects с forceUpdate
      console.log(`${colors.gray}Forcing vector index update...${colors.reset}`);

      const updateResult = await callTool(client, 'jira_force_update_projects_index', {
        clearCache: true,
        clearVectorIndex: false,
      });

      console.log(`${colors.green}✅  Vector index update triggered${colors.reset}`);

      // Ждем немного, чтобы индекс обновился
      console.log(`${colors.gray}Waiting for index to update...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.log(`${colors.yellow}⚠️ Could not force update: ${error.message}${colors.reset}`);
    }

    // ========== ФАЗА 4: Повторный тест после обновления ==========
    console.log(`\n${colors.yellow}🔍 PHASE 4: Search tests after index update${colors.reset}`);

    const phase4Results = await runSearchTests(
      client,
      realProjects,
      'Phase 4: Search after update',
    );

    // ========== ИТОГОВЫЕ РЕЗУЛЬТАТЫ ==========
    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.yellow}                    FINAL RESULTS${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

    const totalPassed = phase2Results.passed + phase4Results.passed;
    const totalFailed = phase2Results.failed + phase4Results.failed;

    console.log(`${colors.cyan}Phase 2:${colors.reset} ${colors.green}${phase2Results.passed} passed${colors.reset}, ${colors.red}${phase2Results.failed} failed${colors.reset}`);
    console.log(`${colors.cyan}Phase 4:${colors.reset} ${colors.green}${phase4Results.passed} passed${colors.reset}, ${colors.red}${phase4Results.failed} failed${colors.reset}`);
    console.log();
    console.log(`${colors.cyan}Total:${colors.reset} ${colors.green}${totalPassed} tests passed${colors.reset}, ${colors.red}${totalFailed} tests failed${colors.reset}`);

    if (totalFailed === 0) {
      console.log(`\n${colors.green}✅  ALL TESTS PASSED!${colors.reset}`);
      console.log(`${colors.gray}MCP vector search is working correctly with real JIRA data.${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️ SOME TESTS FAILED${colors.reset}`);
      console.log(`${colors.gray}This may be expected if some projects don't exist in your JIRA.${colors.reset}`);
    }

    // Показываем статистику по реальным проектам
    if (realProjects.length > 0) {
      console.log(`\n${colors.cyan}Project Statistics:${colors.reset}`);
      console.log(`  Total projects in JIRA: ${realProjects.length}`);
      console.log(`  Projects tested: ${Math.min(3, realProjects.length)}`);

      // Анализируем типы проектов
      const projectTypes = {};
      realProjects.forEach(p => {
        if (p.projectTypeKey) {
          projectTypes[p.projectTypeKey] = (projectTypes[p.projectTypeKey] || 0) + 1;
        }
      });

      if (Object.keys(projectTypes).length > 0) {
        console.log('  Project types:');
        Object.entries(projectTypes).forEach(([type, count]) => {
          console.log(`    - ${type}: ${count}`);
        });
      }
    }

    console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

    // Нет необходимости закрывать HTTP соединение
    // Сервер остается запущенным для других тестов

    process.exit(totalFailed === 0 ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}❌  Test failed with error:${colors.reset}`, error);
    console.error(error.stack);

    // Нет необходимости закрывать HTTP соединение

    process.exit(1);
  }
}

// Запуск теста
runComprehensiveTest().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
