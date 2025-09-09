#!/usr/bin/env node
// noinspection UnnecessaryLocalVariableJS

/**
 * MCP Client for testing MCP Atlassian server over network
 */

import axios from 'axios';
import chalk from 'chalk';
import { appConfig } from '../dist/src/bootstrap/init-config.js';

const { host = 'localhost', port = 3000 } = appConfig.server;
const DEFAULT_MCP_SERVER_URL = `http://localhost:${port}`;

/**
 * MCP Atlassian Test Client
 * JavaScript client for testing MCP Atlassian server functionality
 */
class MCPAtlassianClient {
  constructor (serverUrl, timeout = 30000) {
    this.serverUrl = serverUrl;
    this.requestId = 1;
    this.client = axios.create({
      baseURL: serverUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Проверка здоровья сервера
   */
  async healthCheck () {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Получить список доступных инструментов
   */
  async listTools () {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list',
    };

    const response = await this.client.post('/mcp', request);
    return response.data;
  }

  /**
   * Вызвать MCP инструмент
   */
  async callTool (name, args = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    const response = await this.client.post('/mcp', request);
    return response.data;
  }

  /**
   * Получить информацию об инструменте
   */
  async getToolInfo (name) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/info',
      params: { name },
    };

    const response = await this.client.post('/mcp', request);
    return response.data;
  }

  /**
   * Проверить соединение с сервером
   */
  async ping () {
    try {
      const health = await this.healthCheck();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Получить статистику кеша (если доступна)
   */
  async getCacheStats () {
    try {
      const response = await this.client.get('/cache/stats');
      return response.data;
    } catch (error) {
      // Игнорируем ошибки - эндпоинт может быть недоступен
      return null;
    }
  }
}

/**
 * JIRA-специфичные методы
 */
class JiraTestClient extends MCPAtlassianClient {
  /**
   * Получить задачу JIRA
   */
  async getIssue (issueKey, options = {}) {
    return this.callTool('jira_get_issue', {
      issueKey,
      ...options,
    });
  }

  /**
   * Поиск задач JIRA
   */
  async searchIssues (jql, options = {}) {
    return this.callTool('jira_search_issues', {
      jql,
      startAt: options.startAt || 0,
      maxResults: options.maxResults || 50,
      fields: options.fields,
    });
  }

  /**
   * Создать задачу JIRA
   */
  async createIssue (params) {
    return this.callTool('jira_create_issue', params);
  }

  /**
   * Получить проекты
   */
  async getProjects () {
    return this.callTool('jira_get_projects', {});
  }

  /**
   * Добавить комментарий к задаче
   */
  async addComment (issueKey, body) {
    return this.callTool('jira_add_comment', {
      issueKey,
      body,
    });
  }

  /**
   * Получить переходы статусов для задачи
   */
  async getTransitions (issueKey) {
    return this.callTool('jira_get_transitions', {
      issueKey,
    });
  }
}

/**
 * Test Runner для проверки интеграции MCP Atlassian сервера
 */
class MCPTestRunner {
  constructor (client) {
    this.client = client;
    this.results = [];
  }

  /**
   * Выполнить конкретный тест
   */
  async runTest (name, testFn) {
    const startTime = Date.now();

    try {
      console.log(chalk.blue(`🧪 Running test: ${name}`));
      const data = await testFn();
      const duration = Date.now() - startTime;

      console.log(chalk.green(`✅ Test passed: ${name} (${duration}ms)`));

      return {
        name,
        success: true,
        duration,
        data,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.log(chalk.red(`❌ Test failed: ${name} (${duration}ms)`));
      console.log(chalk.red(`   Error: ${errorMessage}`));

      return {
        name,
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Тест проверки подключения к MCP серверу
   */
  async testConnection () {
    const result = await this.runTest('MCP Server Connection', async () => {
      const isConnected = await this.client.ping();
      if (!isConnected) {
        throw new Error('Cannot connect to MCP server');
      }

      const health = await this.client.healthCheck();
      return health;
    });

    this.results.push(result);
  }

  /**
   * Тест получения списка доступных инструментов
   */
  async testListTools () {
    const result = await this.runTest('List Available Tools', async () => {
      const response = await this.client.listTools();

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const tools = response.result?.tools || [];
      if (tools.length === 0) {
        throw new Error('No tools available');
      }

      console.log(chalk.gray(`   Found ${tools.length} tools`));
      return tools;
    });

    this.results.push(result);
  }

  /**
   * Тест получения задачи JIRA
   */
  async testGetIssue () {
    const result = await this.runTest('Get JIRA Issue', async () => {
      const response = await this.client.getIssue('TEST-1', {
        expand: ['comment'],
      });

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from MCP tool');
      }

      if (!content.includes('TEST-1')) {
        throw new Error('Response does not contain expected issue key');
      }

      console.log(chalk.gray(`   Issue retrieved successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Тест поиска задач JIRA
   */
  async testSearchIssues () {
    const result = await this.runTest('Search JIRA Issues', async () => {
      const response = await this.client.searchIssues('project = TEST', {
        maxResults: 10,
      });

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from search');
      }

      if (!content.includes('Search Results')) {
        throw new Error('Response does not contain expected search results');
      }

      console.log(chalk.gray(`   Search completed successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Тест получения проектов
   */
  async testGetProjects () {
    const result = await this.runTest('Get JIRA Projects', async () => {
      const response = await this.client.getProjects();

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from get projects');
      }

      if (!content.includes('Projects')) {
        throw new Error('Response does not contain expected projects data');
      }

      console.log(chalk.gray(`   Projects retrieved successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Тест создания задачи
   */
  async testCreateIssue () {
    const result = await this.runTest('Create JIRA Issue', async () => {
      const response = await this.client.createIssue({
        project: 'TEST',
        issueType: 'Task',
        summary: 'Test Issue Created by MCP Client',
        description: 'This issue was created during MCP integration testing',
        labels: ['mcp-test', 'automated'],
      });

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from create issue');
      }

      if (!content.includes('Successfully')) {
        throw new Error('Response does not indicate successful creation');
      }

      console.log(chalk.gray(`   Issue created successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Тест добавления комментария
   */
  async testAddComment () {
    const result = await this.runTest('Add Comment to Issue', async () => {
      const response = await this.client.addComment(
        'TEST-1',
        'This comment was added by MCP test client',
      );

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from add comment');
      }

      if (!content.includes('Successfully')) {
        throw new Error('Response does not indicate successful comment addition');
      }

      console.log(chalk.gray(`   Comment added successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Тест получения переходов статуса
   */
  async testGetTransitions () {
    const result = await this.runTest('Get Issue Transitions', async () => {
      const response = await this.client.getTransitions('TEST-1');

      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      const content = response.result?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content returned from get transitions');
      }

      console.log(chalk.gray(`   Transitions retrieved successfully`));
      return response.result;
    });

    this.results.push(result);
  }

  /**
   * Запустить все тесты
   */
  async runAllTests () {
    console.log(chalk.yellow('🚀 Starting MCP Atlassian integration tests...\n'));

    // Базовые тесты соединения
    await this.testConnection();
    await this.testListTools();

    // Тесты функциональности JIRA
    await this.testGetIssue();
    await this.testSearchIssues();
    await this.testGetProjects();
    await this.testCreateIssue();
    await this.testAddComment();
    await this.testGetTransitions();

    return this.results;
  }

  /**
   * Показать итоговый отчет
   */
  printSummary () {
    console.log('\n' + chalk.yellow('📊 Test Summary:'));
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.blue(`⏱️  Total time: ${totalTime}ms`));

    if (failed > 0) {
      console.log(chalk.red('\n🔍 Failed tests:'));
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(chalk.red(`  • ${r.name}: ${r.error}`));
        });
    }

    console.log('\n' + chalk.yellow('✨ Test execution completed!'));
    console.log('='.repeat(50));
  }

  /**
   * Получить результаты тестов
   */
  getResults () {
    return this.results;
  }
}

async function main () {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  switch (command) {
    case 'test':
      await runTests();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

async function runTests () {
  console.log('🧪 Running MCP client tests against running MCP server...');
  console.log('📍 MCP Server URL:', DEFAULT_MCP_SERVER_URL);
  console.log('⚠️  Make sure MCP server is running and JIRA emulator is available\n');

  const client = new JiraTestClient(DEFAULT_MCP_SERVER_URL);
  const runner = new MCPTestRunner(client);

  try {
    await runner.runAllTests();
    runner.printSummary();

    const results = runner.getResults();
    const failed = results.filter(r => !r.success).length;

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

function showHelp () {
  console.log(`
MCP Atlassian Network Test Client

Usage:
  node tests/mcp-client-tests.js [command]

Commands:
  test        Run MCP client tests against running MCP server (default)
  help        Show this help

Examples:
  node tests/mcp-client-tests.js        # Test MCP server at http://localhost:3001

Prerequisites:
  1. Start JIRA emulator:
     node tests/jira-emulator.js
  
  2. Start MCP server with:
     ATLASSIAN_URL=http://localhost:8080 TRANSPORT_TYPE=http node src/index.js

Notes:
  - This client tests a running MCP server over HTTP
  - MCP server should be running on port 3001
  - JIRA emulator should be running on port 8080
`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
