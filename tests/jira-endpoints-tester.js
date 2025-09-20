// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA REST API v2 Endpoints Tester
 */

// Для Node.js версий без глобального fetch
import fetch from 'node-fetch';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils, ResourceManager } from './shared-test-cases.js';
import { TEST_ISSUE_KEY, TEST_JIRA_PROJECT } from './constants.js';

const {
  jira: {
    url,
    auth: {
      pat,
      basic: {
        username = '*',
        password = '*',
      } = {},
    } = {},
  } = {},
} = appConfig;

class JiraEndpointsTester {
  constructor () {
    this.baseUrl = url || 'http://localhost:8080';
    if (pat && pat.length > 3) {
      this.auth = { type: 'token', token: pat };
    } else {
      this.auth = { type: 'basic', username, password };
    }
    this.testResults = [];
    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testProjectId = null; // Будет получен динамически
    this.testIssueKey = TEST_ISSUE_KEY;
    this.failedTestIds = [];
    this.resourceManager = new ResourceManager();

    // Поддержка переменной окружения для добавления X-заголовков
    this.customHeaders = this.parseTestXHeaders();

    // Инициализируем shared test cases
    this.sharedTestCases = new SharedJiraTestCases();

    // Парсим селективные тесты из аргументов командной строки
    this.parseSelectedTests();
  }

  /**
   * Парсинг номеров тестов для селективного выполнения
   * Новый формат: node tests/jira-endpoints-tester.js --tests=1-1,4-*,5
   * N-M где N - номер группы, M - номер теста в группе (* для всей группы)
   * Также поддерживается N (эквивалентно N-*)
   */
  parseSelectedTests () {
    const args = process.argv.slice(2);
    const testsArg = args.find(arg => arg.startsWith('--tests='));

    if (!testsArg) {
      this.selectedTestsGrouped = null;
      return;
    }

    const testsString = testsArg.split('=')[1];
    if (!testsString || testsString.trim() === '') {
      this.selectedTestsGrouped = null; // Пустое значение = все тесты
      return;
    }

    try {
      // Используем новый метод парсинга из SharedJiraTestCases
      const selection = this.sharedTestCases.parseTestSelection(testsString);

      if (selection.includeAll) {
        this.selectedTestsGrouped = null;
        console.log('🎯 Выполнение всех тестов\n');
      } else {
        this.selectedTestsGrouped = selection.selections;

        // Формируем человекочитаемое описание выбора
        const selectionDescriptions = selection.selections.map(sel => {
          if (sel.type === 'group') {
            const groupInfo = this.sharedTestCases.getGroupInfo(sel.groupNumber);
            return `группа ${sel.groupNumber} (${groupInfo?.name || 'Unknown'})`;
          } else {
            const groupInfo = this.sharedTestCases.getGroupInfo(sel.groupNumber);
            return `тест ${sel.fullId} из группы "${groupInfo?.name || 'Unknown'}"`;
          }
        });

        console.log(`🎯 Селективное выполнение тестов: ${selectionDescriptions.join(', ')}\n`);
      }
    } catch (error) {
      console.warn('⚠️  Ошибка при парсинге --tests параметра:', error.message);
      this.selectedTestsGrouped = null;
    }
  }

  /**
   * Проверить, нужно ли выполнять тест с данным fullId
   */
  shouldRunTest (fullId) {
    if (this.selectedTestsGrouped === null) {
      return true; // Выполнять все тесты
    }

    // Работаем только с тестами из SharedJiraTestCases с fullId
    if (typeof fullId === 'string' && fullId.includes('-')) {
      const [groupNumber, testNumber] = fullId.split('-').map(n => parseInt(n));

      return this.selectedTestsGrouped.some(sel => {
        if (sel.type === 'group' && sel.groupNumber === groupNumber) {
          return true; // Вся группа выбрана
        }
        if (sel.type === 'test' && sel.groupNumber === groupNumber && sel.testNumber === testNumber) {
          return true; // Конкретный тест выбран
        }
        return false;
      });
    }

    return false;
  }

  /**
   * Парсинг X-заголовков из переменной окружения TEST_ADD_X_HEADER
   * Формат: "x-header-name:value" или "x-header1:value1,x-header2:value2"
   */
  parseTestXHeaders () {
    const testHeaders = process.env.TEST_ADD_X_HEADER;
    if (!testHeaders) {
      return {};
    }

    const headers = {};
    try {
      // Поддерживаем как одиночные заголовки, так и список через запятую
      const headerPairs = testHeaders.split(',').map(h => h.trim());

      for (const pair of headerPairs) {
        const [name, ...valueParts] = pair.split(':');
        if (name && valueParts.length > 0) {
          const value = valueParts.join(':').trim(); // На случай если в значении есть двоеточие
          headers[name.trim()] = value;
        }
      }

      if (Object.keys(headers).length > 0) {
        console.log('🔧 Добавляемые X-заголовки из TEST_ADD_X_HEADER:', headers);
      }
    } catch (error) {
      console.warn('⚠️  Ошибка при парсинге TEST_ADD_X_HEADER:', error.message);
    }

    return headers;
  }

  /**
   * Получить заголовки авторизации
   */
  getAuthHeaders () {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.customHeaders, // Добавляем X-заголовки из переменной окружения
    };

    if (this.auth.type === 'basic') {
      const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (this.auth.type === 'token') {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }

    return headers;
  }

  /**
   * Выполнить HTTP запрос
   */
  async makeRequest (method, endpoint, data = null, options = {}) {
    const url = `${this.baseUrl}/rest/api/2${endpoint}`;
    const config = {
      method,
    };

    // Для FormData не устанавливаем Content-Type, браузер сам добавит multipart/form-data
    if (data instanceof FormData) {
      config.headers = {
        ...this.getAuthHeaders(),
        'X-Atlassian-Token': 'no-check', // Отключаем XSRF проверку для загрузки файлов
        ...options.headers,
      };
      // Удаляем Content-Type для FormData
      delete config.headers['Content-Type'];
      config.body = data;
    } else {
      config.headers = { ...this.getAuthHeaders(), ...options.headers };
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(url, config);

      // Проверяем, есть ли содержимое для парсинга (status 204 = No Content)
      let responseData = null;
      if (response.status !== 204) {
        const contentLength = response.headers.get('content-length');
        if (contentLength !== '0') {
          responseData = response.headers.get('content-type')?.includes('json')
            ? await response.json()
            : await response.text();
        }
      }

      let errorMessage = null;
      if (!response.ok && responseData && typeof responseData === 'object') {
        if (responseData.errors && Object.keys(responseData.errors).length > 0) {
          const errorMessages = Object.entries(responseData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Validation errors: ${errorMessages}`;
        } else if (responseData.errorMessages && responseData.errorMessages.length > 0) {
          errorMessage = `Error messages: ${responseData.errorMessages.join(', ')}`;
        }
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: errorMessage || (response.ok ? null : response.statusText || 'Unknown error'),
        url,
        method,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        url,
        method,
      };
    }
  }

  /**
   * Выполнить HTTP запрос к Agile API
   */
  async makeAgileRequest (method, endpoint, data = null, options = {}) {
    const url = `${this.baseUrl}/rest${endpoint}`;
    const config = {
      method,
      headers: { ...this.getAuthHeaders(), ...options.headers },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      // Проверяем, есть ли содержимое для парсинга (status 204 = No Content)
      let responseData = null;
      if (response.status !== 204) {
        const contentLength = response.headers.get('content-length');
        if (contentLength !== '0') {
          responseData = response.headers.get('content-type')?.includes('json')
            ? await response.json()
            : await response.text();
        }
      }

      let errorMessage = null;
      if (!response.ok && responseData && typeof responseData === 'object') {
        if (responseData.errors && Object.keys(responseData.errors).length > 0) {
          const errorMessages = Object.entries(responseData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ');
          errorMessage = `Validation errors: ${errorMessages}`;
        } else if (responseData.errorMessages && responseData.errorMessages.length > 0) {
          errorMessage = `Error messages: ${responseData.errorMessages.join(', ')}`;
        }
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        error: errorMessage || (response.ok ? null : response.statusText || 'Unknown error'),
        url,
        method,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        url,
        method,
      };
    }
  }

  /**
   * Логирование результатов тестов
   */
  logTest (testName, result, expectedStatus = null, endpoint = null, fullId = null) {
    // Все тесты должны иметь fullId - если нет, пропускаем
    if (!fullId) {
      console.warn(`⚠️ Test "${testName}" skipped - no fullId provided`);
      return false;
    }

    // Проверяем селективное выполнение для групповых тестов
    if (!this.shouldRunTest(fullId)) {
      return false; // Тест был пропущен
    }

    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const details = expectedStatus
      ? (expectedStatus === result.status ? '' : ` - Expected: ${expectedStatus}, Got: ${result.status}`)
      : ` - Status: ${result.status}`;
    const endpointInfo = endpoint ? ` [${result.method} ${endpoint}]` : '';

    // Для ошибок добавляем statusText и error в вывод
    const errorInfo = !result.success && (result.statusText || result.error)
      ? ` (${result.statusText ? result.statusText : ''}${result.statusText && result.error ? ' - ' : ''}${result.error ? result.error : ''})`
      : '';

    console.log(`${status} [${fullId}] ${testName}${endpointInfo}${details}${errorInfo}`);

    this.testResults.push({
      fullId: fullId,
      testId: fullId, // testId теперь всегда равен fullId
      name: testName,
      success: result.success,
      status: result.status,
      endpoint,
      method: result.method,
      details: result.statusText || result.error,
      timestamp: new Date().toISOString(),
    });

    // Сохраняем ID неудачных тестов
    if (!result.success) {
      if (!this.failedTestIds) {
        this.failedTestIds = [];
      }
      this.failedTestIds.push(fullId);
    }

    if (!result.success && result.error) {
      console.error(`      Error: ${result.error}`);
    }

    return true; // Тест был выполнен
  }

  /**
   * Заменить плейсхолдеры в endpoint на реальные значения
   */
  async replacePlaceholders (endpoint) {
    // Получаем созданные ресурсы
    const createdResources = this.resourceManager.getCreatedResources();

    // Заменяем плейсхолдеры на реальные значения
    let replacedEndpoint = endpoint;

    if (endpoint.includes('{versionId}')) {
      // Используем созданный ресурс или fallback на наиболее вероятный ID
      let versionId;
      if (createdResources.versions.length > 0) {
        versionId = createdResources.versions[0];
      } else {
        // Fallback: эмулятор создает версии начиная с 10001
        // Используем последнюю созданную версию (предположительно)
        versionId = '10001'; // первая версия создается тестом 8-5
      }
      replacedEndpoint = replacedEndpoint.replace('{versionId}', versionId);
    }

    if (endpoint.includes('{issueKey}')) {
      // Используем созданный ресурс или fallback на тестовую задачу
      const issueKey = createdResources.issues.length > 0
        ? createdResources.issues[0]
        : this.testIssueKey; // fallback на TEST-1
      replacedEndpoint = replacedEndpoint.replace('{issueKey}', issueKey);
    }

    if (endpoint.includes('{boardId}')) {
      // Динамически ищем доску типа scrum
      let boardId = '1'; // fallback значение

      try {
        const boardsResult = await this.makeAgileRequest('GET', '/agile/1.0/board');
        if (boardsResult.success && boardsResult.data && boardsResult.data.values) {
          // Ищем первую доску типа scrum
          const scrumBoard = boardsResult.data.values.find(board => board.type === 'scrum');
          if (scrumBoard) {
            boardId = scrumBoard.id.toString();
            console.log(`🎯 Found scrum board: ${scrumBoard.name} (ID: ${boardId})`);
          } else {
            console.log('⚠️ No scrum board found, using fallback ID: 1');
          }
        }
      } catch (error) {
        console.log(`⚠️ Error fetching boards: ${error.message}, using fallback ID: 1`);
      }

      replacedEndpoint = replacedEndpoint.replace('{boardId}', boardId);
    }

    if (endpoint.includes('{attachmentId}')) {
      // Используем созданный attachment или fallback
      const attachmentId = createdResources.attachments && createdResources.attachments.length > 0
        ? createdResources.attachments[0]
        : '10000'; // fallback ID
      replacedEndpoint = replacedEndpoint.replace('{attachmentId}', attachmentId);
    }

    if (endpoint.includes('{workflowSchemeId}')) {
      // Для workflow scheme ID используем сохраненное значение из первого теста
      const workflowSchemeId = createdResources.workflowSchemes && createdResources.workflowSchemes.length > 0
        ? createdResources.workflowSchemes[0]
        : '1'; // fallback ID для тестирования
      replacedEndpoint = replacedEndpoint.replace('{workflowSchemeId}', workflowSchemeId);
    }

    // Обработка {linkId} требует специальной логики - будет обработана в runTest
    // так как требует асинхронного запроса для получения ID связи

    return replacedEndpoint;
  }

  /**
   * Выполнить тест-кейс из shared test cases через прямой API вызов
   */
  async runSharedTestCase (testCase) {
    // Проверяем селективное выполнение используя новую групповую систему
    if (testCase.fullId && !this.shouldRunTest(testCase.fullId)) {
      return null; // Пропускаем выполнение теста
    }

    const api = testCase.directApi;
    const originalEndpoint = api.endpoint;

    // Специальная обработка для тестов, требующих linkId
    if (originalEndpoint.includes('{linkId}')) {
      let linkReplacement = 'ISSUE_NOT_FOUND';
      try {
        // Получаем информацию о задаче и её связях
        const options = { fullId: testCase.fullId + '-link-lookup' }; // Это вспомогательный запрос, поэтому добавляем суяяикс
        const issueResult = await this.makeRequest('GET', `/issue/${this.testIssueKey}`, null, options);
        const links = issueResult?.data?.fields?.issuelinks;
        if (issueResult.success && links?.length) {
          const linkKey = this.sharedTestCases.secondTestIssueKey;
          // Ищем связь с типом TEST_ISSUE_LINK_TYPE и второй задачей
          const targetLink = links.find(link =>
            (link.type?.name === linkKey) ||
            (link.outwardIssue?.key === linkKey) ||
            (link.inwardIssue?.key === linkKey),
          );
          linkReplacement = targetLink?.id || 'LINK_NOT_FOUND';
        }
      } catch (error) {
        linkReplacement = 'ERROR_GETTING_LINKS';
      }
      api.endpoint = originalEndpoint.replace('{linkId}', linkReplacement);
    } else if (originalEndpoint.includes('{workflowSchemeId}') && testCase.dependsOn === 'Get Project Workflow Scheme') {
      // Специальная обработка для тестов workflow scheme - используем уже сохраненный ID
      let workflowSchemeId = null;
      try {
        const createdResources = this.resourceManager.getCreatedResources();

        if (createdResources.workflowSchemes?.length) {
          workflowSchemeId = createdResources.workflowSchemes[0];
        } else {
          // Если ID еще не получен, получаем его из первого теста
          const options = { fullId: testCase.fullId + '-scheme-lookup' }; // Это вспомогательный запрос, поэтому добавляем суяяикс
          const schemeResult = await this.makeRequest('GET', `/project/${this.testProjectKey}/workflowscheme`, null, options);
          workflowSchemeId = schemeResult?.data?.id;
          if (schemeResult.success && workflowSchemeId) {
            this.resourceManager.addResource('workflowSchemes', workflowSchemeId);
          } else {
            workflowSchemeId = '1'; // fallback
          }
        }
        // Заменяем остальные плейсхолдеры
        api.endpoint = await this.replacePlaceholders(api.endpoint);
      } catch (error) {
        workflowSchemeId = 'ERROR_GETTING_SCHEME';
      }
      api.endpoint = originalEndpoint.replace('{workflowSchemeId}', workflowSchemeId);

    } else {
      // Заменяем плейсхолдеры в endpoint
      api.endpoint = await this.replacePlaceholders(originalEndpoint);
    }

    // Специальная обработка для тестов, требующих файлы
    if (testCase.requiresFile && api.method === 'POST' && api.endpoint.includes('/attachments')) {
      // Создаем тестовый файл для attachment
      const testFileContent = 'This is a test file for JIRA attachment testing.';
      const blob = new Blob([testFileContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('comment', 'Test upload via API');
      formData.append('file', blob, 'test-attachment.txt');
      api.data = formData;
    }

    // Определяем метод запроса
    let result;
    const options = { fullId: testCase.fullId };
    if (api.endpoint.startsWith('/agile/')) {
      result = await this.makeAgileRequest(api.method, api.endpoint, api.data, options);
    } else {
      result = await this.makeRequest(api.method, api.endpoint, api.data, options);
    }

    // Валидируем результат ТОЛЬКО если запрос был успешным
    let validation = { success: true, message: null };
    if (result.success) {
      validation = TestValidationUtils.validateDirectApiResponse(result, testCase);

      // Если валидация не прошла, помечаем тест как неуспешный
      if (!validation.success) {
        result.success = false;
        result.error = validation.message;
      }
    }

    this.logTest(testCase.name, result, testCase.expectedStatus, api.endpoint, testCase.fullId);

    // Выводим результат валидации
    if (!validation.success) {
      console.log(`❌ VALIDATION FAIL ${testCase.name} [${testCase.fullId}] - ${validation.message}`);
    } else {
      console.log(`✅ VALIDATION PASS ${testCase.name} - ${testCase.description}`);
    }

    // Выполняем cleanup если необходимо - регистрируем созданные ресурсы
    if (testCase.cleanup && result.success) {
      // Выполняем cleanup в контексте testCase, но также регистрируем в нашем ResourceManager
      testCase.cleanup(result.data);

      // Дополнительно регистрируем в нашем ResourceManager для плейсхолдеров
      if (testCase.name === 'Create Version' && result.data && result.data.id) {
        this.resourceManager.addResource('versions', result.data.id);
      }
      if (testCase.name === 'Create Issue' && result.data && result.data.key) {
        this.resourceManager.addResource('issues', result.data.key);
      }
      if (testCase.name === 'Create Attachment' && result.data && Array.isArray(result.data) && result.data.length > 0 && result.data[0].id) {
        this.resourceManager.addResource('attachments', result.data[0].id);
      }
    }

    // Регистрируем важные ресурсы даже без cleanup
    if (result.success) {
      if (testCase.name === 'Get Project Workflow Scheme' && result.data && result.data.id) {
        this.resourceManager.addResource('workflowSchemes', result.data.id);
        console.log(`💾 Saved workflow scheme ID: ${result.data.id} for subsequent tests`);
      }
    }

    return result;
  }

  /**
   * Выполнить тесты определенной категории
   */
  async runTestsByCategory (categoryName) {
    const testCases = this.sharedTestCases.getTestCasesByCategory(categoryName);

    // Проверяем, есть ли тесты для выполнения в этой категории
    if (this.selectedTestsGrouped !== null) {
      // В режиме селективного выполнения проверяем, есть ли выбранные тесты в категории
      const selectedTestsInCategory = testCases.filter(tc =>
        tc.fullId && this.shouldRunTest(tc.fullId),
      );

      if (selectedTestsInCategory.length === 0) {
        // Категория пропускается полностью
        return;
      }

      console.log(`\n=== TESTING ${categoryName.toUpperCase()} (${selectedTestsInCategory.length}/${testCases.length} tests selected) ===`);
    } else {
      // Выполняем все тесты в категории
      console.log(`\n=== TESTING ${categoryName.toUpperCase()} (${testCases.length} tests) ===`);
    }

    for (const testCase of testCases) {
      try {
        const result = await this.runSharedTestCase(testCase);
        if (result === null) {
          // Тест был пропущен из-за селективного выполнения
          continue;
        }
      } catch (error) {
        console.log(`❌ ERROR ${testCase.name} - ${error.message}`);
      }
    }
  }

  /**
   * Каскадные тесты отключены - использовались только legacy код
   */
  async runCascadeTests () {
    console.log('\n=== CASCADE TESTS DISABLED ===');
    console.log('Cascade tests have been removed. All operations now use individual test cases.');
  }

  /**
   * Запустить минимальные shared test cases
   */
  async testSharedTestCases () {
    await this.runTestsByCategory('system');
  }

  /**
   * === ИНФОРМАЦИОННЫЕ ЭНДПОИНТЫ ===
   */


  async testIssueEndpoints () {
    await this.runTestsByCategory('informational');
    await this.runTestsByCategory('issueDetailed');
  }

  async testSearchEndpoints () {
    await this.runTestsByCategory('searchDetailed');
  }

  async testProjectEndpoints () {
    await this.runTestsByCategory('projectDetailed');
  }

  async testUserEndpoints () {
    await this.runTestsByCategory('userDetailed');
  }

  async testMetadataEndpoints () {
    await this.runTestsByCategory('metadataDetailed');
  }

  /**
   * === ИЗМЕНЯЮЩИЕ ЭНДПОИНТЫ ===
   */

  async testModifyingEndpoints () {
    await this.runTestsByCategory('modifying');
  }

  /**
   * === AGILE/BOARD ENDPOINTS ===
   */

  async testAgileEndpoints () {
    await this.runTestsByCategory('agile');
  }

  /**
   * === ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ===
   */

  async testAdditionalEndpoints () {
    await this.runTestsByCategory('system');
    await this.runTestsByCategory('additional');
  }

  /**
   * === WORKFLOW SCHEMES ENDPOINTS ===
   */

  async testWorkflowSchemesEndpoints () {
    // Сначала получаем project ID для TEST_JIRA_PROJECT
    await this.getProjectId();
    await this.runTestsByCategory('workflowSchemes');
  }

  /**
   * Получить ID проекта по ключу
   */
  async getProjectId () {
    if (this.testProjectId !== null) {
      return this.testProjectId; // Уже получен
    }

    try {
      console.log(`🔍 Searching for project ID for "${this.testProjectKey}"...`);
      const result = await this.makeRequest('GET', `/project/${this.testProjectKey}`);

      if (result.success && result.data && result.data.id) {
        this.testProjectId = result.data.id;
        this.sharedTestCases.testProjectId = result.data.id;
        console.log(`✅ Found project ID: ${this.testProjectId} for project "${this.testProjectKey}"`);
        return this.testProjectId;
      } else {
        console.log(`❌ Could not find project ID for "${this.testProjectKey}", using fallback: 10000`);
        this.testProjectId = '10000'; // fallback
        this.sharedTestCases.testProjectId = '10000';
        return this.testProjectId;
      }
    } catch (error) {
      console.log(`❌ Error getting project ID for "${this.testProjectKey}": ${error.message}, using fallback: 10000`);
      this.testProjectId = '10000'; // fallback
      this.sharedTestCases.testProjectId = '10000';
      return this.testProjectId;
    }
  }

  async cleanupTestIssue () {
    console.log('\n--- Cleaning Up Test Resources ---');

    const createdResources = this.resourceManager.getCreatedResources();

    // Удаляем созданные версии
    for (const versionId of createdResources.versions) {
      const deleteVersion = await this.makeRequest('DELETE', `/version/${versionId}`);
      // Cleanup не логируется как тест - это служебная операция
      if (deleteVersion.success) {
        console.log(`✅ Deleted Version ${versionId}`);
      } else {
        console.log(`❌ Failed to delete Version ${versionId}: ${deleteVersion.error}`);
      }
    }

    // Удаляем созданные задачи
    for (const issueKey of createdResources.issues) {
      const deleteIssue = await this.makeRequest('DELETE', `/issue/${issueKey}`);
      // Cleanup не логируется как тест - это служебная операция
      if (deleteIssue.success) {
        console.log(`✅ Deleted Issue ${issueKey}`);
      } else {
        console.log(`❌ Failed to delete Issue ${issueKey}: ${deleteIssue.error}`);
      }
    }

    console.log('✅ Cleanup completed');
    this.resourceManager.clearAll();
  }

  /**
   * === ОСНОВНОЙ МЕТОД ЗАПУСКА ВСЕХ ТЕСТОВ ===
   */

  async runAllTests () {
    console.log('🚀 Starting comprehensive JIRA REST API v2 endpoint tests...');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log(`👤 Auth: ${this.auth.type} (${this.auth.username})`);
    console.log(`📋 Test Project: ${this.testProjectKey}\n`);

    const startTime = Date.now();

    try {
      // Сначала запускаем shared test cases для согласованности с MCP тестами
      await this.testSharedTestCases();

      // Тестируем информационные эндпоинты
      await this.testIssueEndpoints();
      await this.testSearchEndpoints();
      await this.testProjectEndpoints();
      await this.testUserEndpoints();
      await this.testMetadataEndpoints();

      // Тестируем изменяющие эндпоинты
      await this.testModifyingEndpoints();

      // Тестируем Agile эндпоинты
      await this.testAgileEndpoints();

      // Тестируем дополнительные эндпоинты
      await this.testAdditionalEndpoints();

      // Тестируем workflow schemes эндпоинты
      await this.testWorkflowSchemesEndpoints();

      // Тестируем каскадные операции
      await this.runCascadeTests();

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
      await this.cleanupTestIssue();
      await this.generateReport(startTime);
    }
  }

  /**
   * Запустить расширенные тесты для всех эндпоинтов эмулятора
   */
  async runExtendedTests () {
    console.log('🚀 Starting EXTENDED JIRA EMULATOR tests...');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log('🔍 Testing ALL implemented endpoints comprehensively...\n');

    const startTime = Date.now();

    try {
      // Запускаем все категории тестов из SharedJiraTestCases
      await this.runTestsByCategory('system');
      await this.testSharedTestCases();
      await this.testIssueEndpoints();
      await this.testSearchEndpoints();
      await this.testProjectEndpoints();
      await this.testUserEndpoints();
      await this.testMetadataEndpoints();

      // Тестируем изменяющие эндпоинты
      await this.testModifyingEndpoints();

      // Тестируем Agile эндпоинты
      await this.testAgileEndpoints();

      // Тестируем дополнительные эндпоинты
      await this.testAdditionalEndpoints();

      // Тестируем каскадные операции
      await this.runCascadeTests();

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
      await this.cleanupTestIssue();
      await this.generateReport(startTime);
    }
  }

  async generateReport (startTime) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.success).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('📊 JIRA REST API v2 ENDPOINT TESTING REPORT');
    console.log('='.repeat(80));
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log('='.repeat(80));

    // Добавляем статистику по группам если есть тесты с fullId
    const groupedTests = this.testResults.filter(t => t.fullId);
    if (groupedTests.length > 0) {
      console.log('\n📋 STATISTICS BY TEST GROUPS:');
      console.log('-'.repeat(60));

      // Получаем статистику по группам
      const groupStats = {};
      const allGroupInfo = this.sharedTestCases.getAllGroupInfo();

      groupedTests.forEach(test => {
        if (test.fullId) {
          const [groupNumber] = test.fullId.split('-').map(n => parseInt(n));
          if (!groupStats[groupNumber]) {
            groupStats[groupNumber] = {
              name: allGroupInfo[groupNumber]?.name || `Group ${groupNumber}`,
              total: 0,
              passed: 0,
              failed: 0,
              tests: [],
            };
          }
          groupStats[groupNumber].total++;
          if (test.success) {
            groupStats[groupNumber].passed++;
          } else {
            groupStats[groupNumber].failed++;
            groupStats[groupNumber].tests.push(test);
          }
        }
      });

      // Выводим статистику по группам
      Object.keys(groupStats)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(groupNumber => {
          const stats = groupStats[groupNumber];
          const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
          const status = stats.failed === 0 ? '✅' : '❌';
          console.log(`${status} Group ${groupNumber}: ${stats.name} - ${stats.passed}/${stats.total} (${passRate}%)`);
        });

      console.log('-'.repeat(60));
    }

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(t => !t.success)
        .forEach(test => {
          const testId = test.fullId || 'Unknown';
          console.log(`   • [${testId}] ${test.name} [${test.method} ${test.endpoint}] - ${test.status}: ${test.details}`);
        });

      // Показываем неудачные тесты по группам
      const groupedFailedTests = this.testResults.filter(t => !t.success && t.fullId);
      if (groupedFailedTests.length > 0) {
        console.log('\n❌ FAILED TESTS BY GROUPS:');
        const failedByGroup = {};
        groupedFailedTests.forEach(test => {
          const [groupNumber] = test.fullId.split('-').map(n => parseInt(n));
          if (!failedByGroup[groupNumber]) {
            failedByGroup[groupNumber] = [];
          }
          failedByGroup[groupNumber].push(test);
        });

        Object.keys(failedByGroup)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .forEach(groupNumber => {
            const groupInfo = this.sharedTestCases.getGroupInfo(parseInt(groupNumber));
            console.log(`   Group ${groupNumber} (${groupInfo?.name || 'Unknown'}):`);
            failedByGroup[groupNumber].forEach(test => {
              console.log(`     • [${test.fullId}] ${test.name} - ${test.details}`);
            });
          });
      }

      if (this.failedTestIds && this.failedTestIds.length > 0) {
        console.log(`\n❌ FAILED TEST IDs: ${this.failedTestIds.join(',')}`);
      }
    }

    console.log('\n📝 Detailed results saved to testResults array');
    console.log('🎯 All JIRA REST API v2 endpoints have been tested!');

    // Возвращаем результаты для программного использования
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      duration,
      results: this.testResults,
      groupStatistics: groupedTests.length > 0 ? this.sharedTestCases.getGroupStatistics() : null,
    };
  }
}

// ES Modules экспорт
export default JiraEndpointsTester;

// Автозапуск если файл запущен напрямую
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    const tester = new JiraEndpointsTester();

    // Проверяем аргументы командной строки
    const args = process.argv.slice(2);
    const isExtended = args.includes('--extended') || args.includes('-e');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
      console.log('🚀 JIRA REST API v2 Endpoints Tester\n');
      console.log('Usage: node tests/jira-endpoints-tester.js [options]\n');
      console.log('Options:');
      console.log('  --extended, -e     Run extended test suite');
      console.log('  --tests=1-1,5-*,10  Run only specific tests (group-test format)');
      console.log('  --help, -h         Show this help message\n');
      console.log('Examples:');
      console.log('  node tests/jira-endpoints-tester.js --tests=1-1,5-*');
      console.log('  node tests/jira-endpoints-tester.js --tests=2,4-*');
      console.log('  node tests/jira-endpoints-tester.js --extended\n');
      return;
    }

    if (isExtended) {
      console.log('📋 Running EXTENDED test suite...\n');
      await tester.runExtendedTests();
    } else {
      console.log('📋 Running standard test suite...');
      if (tester.selectedTestsGrouped) {
        console.log(`🎯 Selected tests: ${tester.selectedTestsGrouped.length} selection(s)`);
      } else {
        console.log('💡 Tip: Use --extended or -e flag for comprehensive testing');
        console.log('💡 Tip: Use --tests=1-1,5-*,10 for selective test execution');
      }
      console.log('');
      await tester.runAllTests();
    }
  })();
}
