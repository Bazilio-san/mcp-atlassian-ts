// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA REST API v2 Endpoints Tester
 */

// Для Node.js версий без глобального fetch
import fetch from 'node-fetch';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils } from './shared-test-cases.js';
import { TEST_ISSUE_KEY, TEST_ISSUE_TYPE_NAME, TEST_JIRA_PROJECT } from './constants.js';

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
    this.testIssueKey = null;
    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testIssueKey = TEST_ISSUE_KEY;
    this.testCounter = 0;
    this.failedTestNumbers = [];
    this.createdResources = {
      issues: [],
      sprints: [],
      versions: [],
      links: [],
    };

    // Поддержка переменной окружения для добавления X-заголовков
    this.customHeaders = this.parseTestXHeaders();

    // Инициализируем shared test cases
    this.sharedTestCases = new SharedJiraTestCases();

    // Парсим селективные тесты из аргументов командной строки
    this.parseSelectedTests();
  }

  /**
   * Парсинг номеров тестов для селективного выполнения
   * Формат: node tests/jira-endpoints-tester.js --tests=1,5,10-15,20
   */
  parseSelectedTests() {
    const args = process.argv.slice(2);
    const testsArg = args.find(arg => arg.startsWith('--tests='));

    if (!testsArg) {
      this.selectedTests = null;
      return;
    }

    const testsString = testsArg.split('=')[1];
    if (!testsString || testsString.trim() === '') {
      this.selectedTests = null; // Пустое значение = все тесты
      return;
    }

    try {
      const selectedSet = new Set();
      const parts = testsString.split(',');

      for (const part of parts) {
        if (part.includes('-')) {
          // Обработка диапазонов типа "10-15"
          const [start, end] = part.split('-').map(n => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) {
              selectedSet.add(i);
            }
          }
        } else {
          // Обработка одиночных номеров
          const num = parseInt(part.trim());
          if (!isNaN(num)) {
            selectedSet.add(num);
          }
        }
      }

      this.selectedTests = Array.from(selectedSet).sort((a, b) => a - b);
      console.log(`🎯 Селективное выполнение тестов: [${this.selectedTests.join(', ')}]\n`);
    } catch (error) {
      console.warn('⚠️  Ошибка при парсинге --tests параметра:', error.message);
      this.selectedTests = null;
    }
  }

  /**
   * Проверить, нужно ли выполнять тест с данным номером
   */
  shouldRunTest(testNumber) {
    if (this.selectedTests === null) {
      return true; // Выполнять все тесты
    }
    return this.selectedTests.includes(testNumber);
  }

  /**
   * Проверить, есть ли в диапазоне номеров выбранные тесты
   */
  hasSelectedTestsInRange(startNumber, estimatedCount) {
    if (this.selectedTests === null) {
      return true; // Выполнять все тесты
    }

    for (let i = startNumber; i < startNumber + estimatedCount; i++) {
      if (this.selectedTests.includes(i)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Выполнить тест с проверкой селективности
   */
  async executeTest(testName, testFunction, expected = null, endpoint = null) {
    // Увеличиваем счетчик для всех тестов (не здесь, а в logTest)
    const nextTestNumber = this.testCounter + 1;

    // Если тест не должен выполняться, пропускаем его полностью
    if (!this.shouldRunTest(nextTestNumber)) {
      this.testCounter++; // Увеличиваем счетчик но пропускаем выполнение
      return null; // Пропускаем выполнение теста
    }

    // Выполняем тест
    const result = await testFunction();

    // Логируем результат (logTest увеличит счетчик)
    this.logTest(testName, result, expected, endpoint);

    return result;
  }

  /**
   * Тестовый запрос с автоматической проверкой селективности
   */
  async testRequest(testName, method, endpoint, data = null, expected = 200) {
    const nextTestNumber = this.testCounter + 1;

    // Если тест не должен выполняться, пропускаем его полностью
    if (!this.shouldRunTest(nextTestNumber)) {
      this.testCounter++; // Увеличиваем счетчик но пропускаем выполнение
      return null; // Пропускаем выполнение теста
    }

    // Выполняем запрос
    const result = await this.makeRequest(method, endpoint, data);

    // Логируем результат (logTest увеличит счетчик)
    this.logTest(testName, result, expected, endpoint);

    return result;
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
      headers: { ...this.getAuthHeaders(), ...options.headers },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      const responseData = response.headers.get('content-type')?.includes('json')
        ? await response.json()
        : await response.text();

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
      const responseData = response.headers.get('content-type')?.includes('json')
        ? await response.json()
        : await response.text();

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
   * Логирование результатов тестов с нумерацией (НЕ увеличивает счетчик)
   */
  logTest (testName, result, expected = null, endpoint = null) {
    // Ensure testCounter is properly initialized
    if (typeof this.testCounter !== 'number' || isNaN(this.testCounter)) {
      this.testCounter = 0;
    }

    this.testCounter++; // Увеличиваем счетчик для всех тестов

    // Если тест не должен выполняться/логироваться при селективном выполнении
    if (!this.shouldRunTest(this.testCounter)) {
      return false; // Тест был пропущен
    }

    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const details = expected ? `Expected: ${expected}, Got: ${result.status}` : `Status: ${result.status}`;
    const endpointInfo = endpoint ? ` [${result.method} ${endpoint}]` : '';

    console.log(`${status} [${this.testCounter}] ${testName}${endpointInfo} - ${details}`);

    this.testResults.push({
      number: this.testCounter,
      name: testName,
      success: result.success,
      status: result.status,
      endpoint,
      method: result.method,
      details: result.statusText || result.error,
      timestamp: new Date().toISOString(),
    });

    // Сохраняем номера неудачных тестов
    if (!result.success) {
      if (!this.failedTestNumbers) {
        this.failedTestNumbers = [];
      }
      this.failedTestNumbers.push(this.testCounter);
    }

    if (!result.success && result.error) {
      console.error(`      Error: ${result.error}`);
    }

    return true; // Тест был выполнен
  }

  /**
   * Проверить наличие ожидаемых свойств в объекте
   */
  validateProperties (obj, expectedProps, testName) {
    // Ensure testCounter is properly initialized
    if (typeof this.testCounter !== 'number' || isNaN(this.testCounter)) {
      this.testCounter = 0;
    }

    this.testCounter++;

    // Проверяем, нужно ли выполнять этот тест
    if (!this.shouldRunTest(this.testCounter)) {
      return true; // Пропускаем тест полностью, считаем успешным
    }

    const missing = expectedProps.filter(prop => !(prop in obj));
    const success = missing.length === 0;

    if (!success) {
      console.log(`❌ FAIL [${this.testCounter}] ${testName} - Missing properties: ${missing.join(', ')}`);
      if (!this.failedTestNumbers) {
        this.failedTestNumbers = [];
      }
      this.failedTestNumbers.push(this.testCounter);
    } else {
      console.log(`✅ PASS [${this.testCounter}] ${testName} - All expected properties present`);
    }

    this.testResults.push({
      number: this.testCounter,
      name: testName,
      success: success,
      status: success ? 200 : 400,
      endpoint: null,
      method: 'VALIDATE',
      details: success ? 'Properties validated' : `Missing: ${missing.join(', ')}`,
      timestamp: new Date().toISOString(),
    });

    return success;
  }

  /**
   * Выполнить тест-кейс из shared test cases через прямой API вызов
   */
  async runSharedTestCase (testCase) {
    // Проверяем селективное выполнение ПЕРЕД выполнением запроса
    const nextTestNumber = this.testCounter + 1;

    if (!this.shouldRunTest(nextTestNumber)) {
      this.testCounter++; // Увеличиваем счетчик но пропускаем выполнение
      return null; // Пропускаем выполнение теста
    }

    const api = testCase.directApi;

    // Определяем метод запроса
    let result;
    if (api.endpoint.startsWith('/agile/')) {
      result = await this.makeAgileRequest(api.method, api.endpoint, api.data);
    } else {
      result = await this.makeRequest(api.method, api.endpoint, api.data);
    }

    // Валидируем результат ПЕРЕД логированием
    const validation = TestValidationUtils.validateDirectApiResponse(result, testCase);

    // Если валидация не прошла, помечаем тест как неуспешный
    if (!validation.success) {
      result.success = false;
      result.error = validation.message;
    }

    this.logTest(testCase.name, result, 200, api.endpoint);

    // Выводим результат валидации
    if (!validation.success) {
      console.log(`❌ VALIDATION FAIL ${testCase.name} [${this.testCounter}] - ${validation.message}`);
    } else {
      console.log(`✅ VALIDATION PASS ${testCase.name} - ${testCase.description}`);
    }

    // Выполняем cleanup если необходимо
    if (testCase.cleanup && result.success) {
      testCase.cleanup(result.data);
    }

    return result;
  }

  /**
   * Запустить shared test cases
   */
  async testSharedTestCases () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 6 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 6)) {
      // Блок пропускается без сообщения
      this.testCounter += 6; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING SHARED TEST CASES ===');

    const testCases = this.sharedTestCases.getMinimalTestCases();

    for (const testCase of testCases) {
      try {
        await this.runSharedTestCase(testCase);
      } catch (error) {
        console.log(`❌ ERROR ${testCase.name} - ${error.message}`);
      }
    }
  }

  /**
   * === ИНФОРМАЦИОННЫЕ ЭНДПОИНТЫ ===
   */

  async testIssueEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 8 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 8)) {
      // Блок пропускается без сообщения
      this.testCounter += 8; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING ISSUE ENDPOINTS ===');

    // GET /issue/{issueIdOrKey} - получить задачу
    const getIssue = await this.executeTest(
      'Get Issue',
      () => this.makeRequest('GET', `/issue/${this.testIssueKey}`),
      200,
      `/issue/${this.testIssueKey}`
    );

    if (getIssue && getIssue.success) {
      this.validateProperties(getIssue.data, ['key', 'fields'], 'Issue Properties');
      this.validateProperties(getIssue.data.fields, ['summary', 'status', 'issuetype'], 'Issue Fields');
    }

    // GET /issue/{issueIdOrKey}/editmeta - метаданные для редактирования
    const editMeta = await this.testRequest('Get Issue Edit Meta', 'GET', `/issue/${this.testIssueKey}/editmeta`, null, 200);

    if (editMeta && editMeta.success) {
      this.validateProperties(editMeta.data, ['fields'], 'Edit Meta Properties');
    }

    // GET /issue/{issueIdOrKey}/transitions - доступные переходы
    const transitions = await this.testRequest('Get Issue Transitions', 'GET', `/issue/${this.testIssueKey}/transitions`, null, 200);

    if (transitions && transitions.success && transitions.data.transitions) {
      this.validateProperties(transitions.data.transitions[0] || {}, ['id', 'name'], 'Transition Properties');
    }

    // GET /issue/{issueIdOrKey}/comment - комментарии
    const comments = await this.testRequest('Get Issue Comments', 'GET', `/issue/${this.testIssueKey}/comment`, null, 200);

    // GET /issue/{issueIdOrKey}/worklog - рабочие логи
    const worklog = await this.testRequest('Get Issue Worklog', 'GET', `/issue/${this.testIssueKey}/worklog`, null, 200);

    // GET /issue/createmeta - метаданные для создания
    const createMeta = await this.testRequest('Get Create Meta', 'GET', '/issue/createmeta', null, 200);

    if (createMeta && createMeta.success) {
      this.validateProperties(createMeta.data, ['projects'], 'Create Meta Properties');
    }
  }

  async testSearchEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 3 теста)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 3)) {
      // Блок пропускается без сообщения
      this.testCounter += 3; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING SEARCH ENDPOINTS ===');

    // POST /search - поиск JQL
    const searchData = {
      jql: `project = ${this.testProjectKey}`,
      maxResults: 10,
      fields: ['summary', 'status', 'assignee'],
    };
    const search = await this.testRequest('JQL Search', 'POST', '/search', searchData, 200);

    if (search && search.success) {
      this.validateProperties(search.data, ['issues', 'total'], 'Search Results Properties');
    }

    // GET /search - поиск GET параметрами
    const searchGet = await this.testRequest('JQL Search GET', 'GET', `/search?jql=project=${this.testProjectKey}&maxResults=5`, null, 200);
  }

  async testProjectEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 7 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 7)) {
      // Блок пропускается без сообщения
      this.testCounter += 7; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING PROJECT ENDPOINTS ===');

    // GET /project - все проекты
    const projects = await this.makeRequest('GET', '/project');
    this.logTest('Get All Projects', projects, 200, '/project');

    if (projects.success && projects.data.length > 0) {
      this.validateProperties(projects.data[0], ['key', 'name', 'id'], 'Project Properties');
    }

    // GET /project/{projectIdOrKey} - конкретный проект
    const project = await this.makeRequest('GET', `/project/${this.testProjectKey}`);
    this.logTest('Get Specific Project', project, 200, `/project/${this.testProjectKey}`);

    if (project.success) {
      this.validateProperties(project.data, ['key', 'name', 'description'], 'Single Project Properties');
    }

    // GET /project/{projectIdOrKey}/statuses - статусы проекта
    const projectStatuses = await this.makeRequest('GET', `/project/${this.testProjectKey}/statuses`);
    this.logTest('Get Project Statuses', projectStatuses, 200, `/project/${this.testProjectKey}/statuses`);

    // GET /project/{projectIdOrKey}/versions - версии проекта
    const versions = await this.makeRequest('GET', `/project/${this.testProjectKey}/versions`);
    this.logTest('Get Project Versions', versions, 200, `/project/${this.testProjectKey}/versions`);

    // GET /project/{projectIdOrKey}/components - компоненты проекта
    const components = await this.makeRequest('GET', `/project/${this.testProjectKey}/components`);
    this.logTest('Get Project Components', components, 200, `/project/${this.testProjectKey}/components`);
  }

  async testUserEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 6 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 6)) {
      // Блок пропускается без сообщения
      this.testCounter += 6; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING USER ENDPOINTS ===');

    // GET /user - получить пользователя
    const user = await this.makeRequest('GET', `/user?username=${this.auth.username}`);
    this.logTest('Get User', user, 200, '/user');

    if (user.success) {
      this.validateProperties(user.data, ['name', 'displayName', 'active'], 'User Properties');
    }

    // GET /user/search - поиск пользователей
    const userSearch = await this.makeRequest('GET', `/user/search?username=${this.auth.username}`);
    this.logTest('Search Users', userSearch, 200, '/user/search');

    // GET /user/assignable/search - назначаемые пользователи
    const assignableUsers = await this.makeRequest('GET', `/user/assignable/search?project=${this.testProjectKey}&username=${this.auth.username}`);
    this.logTest('Get Assignable Users', assignableUsers, 200, '/user/assignable/search');

    // GET /myself - текущий пользователь
    const myself = await this.makeRequest('GET', '/myself');
    this.logTest('Get Current User', myself, 200, '/myself');
  }

  async testMetadataEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 10 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 10)) {
      // Блок пропускается без сообщения
      this.testCounter += 10; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING METADATA ENDPOINTS ===');

    // GET /priority - приоритеты
    const priorities = await this.makeRequest('GET', '/priority');
    this.logTest('Get Priorities', priorities, 200, '/priority');

    if (priorities.success && priorities.data.length > 0) {
      this.validateProperties(priorities.data[0], ['id', 'name'], 'Priority Properties');
    }

    // GET /status - статусы
    const statuses = await this.makeRequest('GET', '/status');
    this.logTest('Get Statuses', statuses, 200, '/status');

    if (statuses.success && statuses.data.length > 0) {
      this.validateProperties(statuses.data[0], ['id', 'name', 'statusCategory'], 'Status Properties');
    }

    // GET /issuetype - типы задач
    const issueTypes = await this.makeRequest('GET', '/issuetype');
    this.logTest('Get Issue Types', issueTypes, 200, '/issuetype');

    // GET /field - поля
    const fields = await this.makeRequest('GET', '/field');
    this.logTest('Get Fields', fields, 200, '/field');

    // GET /resolution - резолюции
    const resolutions = await this.makeRequest('GET', '/resolution');
    this.logTest('Get Resolutions', resolutions, 200, '/resolution');

    // GET /role - роли проекта
    const roles = await this.makeRequest('GET', '/role');
    this.logTest('Get Project Roles', roles, 200, '/role');

    // GET /issueLinkType - типы связей
    const linkTypes = await this.makeRequest('GET', '/issueLinkType');
    this.logTest('Get Issue Link Types', linkTypes, 200, '/issueLinkType');
  }

  /**
   * === ИЗМЕНЯЮЩИЕ ЭНДПОИНТЫ ===
   */

  async testModifyingEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 20 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 20)) {
      // Блок пропускается без сообщения
      this.testCounter += 20; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING MODIFYING ENDPOINTS ===');
    console.log('Creating test issue for modification tests...');

    // Создаем тестовую задачу
    const testIssue = await this.createTestIssue();
    if (!testIssue) {
      console.error('❌ Cannot proceed with modifying endpoints - test issue creation failed');
      return;
    }

    this.testIssueKey = testIssue.key;
    console.log(`✅ Test issue created: ${this.testIssueKey}`);

    // Тестируем модификацию задачи
    await this.testIssueModification();

    // Тестируем комментарии
    await this.testCommentOperations();

    // Тестируем transitions
    await this.testIssueTransitions();

    // Тестируем worklog
    await this.testWorklogOperations();

    // Тестируем версии проекта (если есть права)
    await this.testVersionOperations();

    // Тестируем связи между задачами
    await this.testIssueLinkOperations();

    // Удаляем тестовую задачу
    await this.cleanupTestIssue();
  }

  async createTestIssue () {
    const issueData = {
      fields: {
        project: { key: this.testProjectKey },
        summary: `Test Issue for API Testing - ${new Date().toISOString()}`,
        description: 'This issue was created for API endpoint testing purposes.',
        issuetype: { name: TEST_ISSUE_TYPE_NAME },
      },
    };

    const result = await this.makeRequest('POST', '/issue', issueData);
    this.logTest('Create Test Issue', result, 201, '/issue');

    if (result.success) {
      this.createdResources.issues.push(result.data.key);
      return result.data;
    }
    return null;
  }

  async testIssueModification () {
    if (!this.testIssueKey) return;

    console.log('\n--- Testing Issue Modification ---');

    // PUT /issue/{issueIdOrKey} - обновление задачи
    const updateData = {
      fields: {
        summary: `Updated Test Issue - ${new Date().toISOString()}`,
        description: 'Updated description for API testing',
      },
    };

    const update = await this.makeRequest('PUT', `/issue/${this.testIssueKey}`, updateData);
    this.logTest('Update Issue', update, 204, `/issue/${this.testIssueKey}`);

    // Проверяем, что изменения применились
    const updated = await this.makeRequest('GET', `/issue/${this.testIssueKey}?fields=summary,description`);
    this.logTest('Verify Issue Update', updated, 200, `/issue/${this.testIssueKey}`);

    if (updated.success && updated.data.fields.summary.includes('Updated')) {
      console.log('✅ Issue update verified successfully');
    }
  }

  async testCommentOperations () {
    if (!this.testIssueKey) return;

    console.log('\n--- Testing Comment Operations ---');

    // POST /issue/{issueIdOrKey}/comment - добавить комментарий
    const commentData = {
      body: `Test comment added via API - ${new Date().toISOString()}`,
    };

    const addComment = await this.makeRequest('POST', `/issue/${this.testIssueKey}/comment`, commentData);
    this.logTest('Add Comment', addComment, 201, `/issue/${this.testIssueKey}/comment`);

    let commentId = null;
    if (addComment.success) {
      commentId = addComment.data.id;
    }

    // GET /issue/{issueIdOrKey}/comment - получить комментарии
    const getComments = await this.makeRequest('GET', `/issue/${this.testIssueKey}/comment`);
    this.logTest('Get Comments', getComments, 200, `/issue/${this.testIssueKey}/comment`);

    // PUT /issue/{issueIdOrKey}/comment/{id} - обновить комментарий
    if (commentId) {
      const updateCommentData = {
        body: `Updated test comment - ${new Date().toISOString()}`,
      };
      const updateComment = await this.makeRequest('PUT', `/issue/${this.testIssueKey}/comment/${commentId}`, updateCommentData);
      this.logTest('Update Comment', updateComment, 200, `/issue/${this.testIssueKey}/comment/${commentId}`);

      // DELETE /issue/{issueIdOrKey}/comment/{id} - удалить комментарий
      const deleteComment = await this.makeRequest('DELETE', `/issue/${this.testIssueKey}/comment/${commentId}`);
      this.logTest('Delete Comment', deleteComment, 204, `/issue/${this.testIssueKey}/comment/${commentId}`);
    }
  }

  async testIssueTransitions () {
    if (!this.testIssueKey) return;

    console.log('\n--- Testing Issue Transitions ---');

    // GET /issue/{issueIdOrKey}/transitions - получить доступные переходы
    const transitions = await this.makeRequest('GET', `/issue/${this.testIssueKey}/transitions`);
    this.logTest('Get Available Transitions', transitions, 200, `/issue/${this.testIssueKey}/transitions`);

    if (transitions.success && transitions.data.transitions && transitions.data.transitions.length > 0) {
      const firstTransition = transitions.data.transitions[0];

      // POST /issue/{issueIdOrKey}/transitions - выполнить переход
      const transitionData = {
        transition: { id: firstTransition.id },
      };

      const doTransition = await this.makeRequest('POST', `/issue/${this.testIssueKey}/transitions`, transitionData);
      this.logTest(`Execute Transition (${firstTransition.name})`, doTransition, 204, `/issue/${this.testIssueKey}/transitions`);
    }
  }

  async testWorklogOperations () {
    if (!this.testIssueKey) return;

    console.log('\n--- Testing Worklog Operations ---');

    // POST /issue/{issueIdOrKey}/worklog - добавить worklog
    const worklogData = {
      timeSpent: '2h',
      comment: `API testing worklog - ${new Date().toISOString()}`,
      started: new Date().toISOString(),
    };

    const addWorklog = await this.makeRequest('POST', `/issue/${this.testIssueKey}/worklog`, worklogData);
    this.logTest('Add Worklog', addWorklog, 201, `/issue/${this.testIssueKey}/worklog`);

    let worklogId = null;
    if (addWorklog.success) {
      worklogId = addWorklog.data.id;
    }

    // GET /issue/{issueIdOrKey}/worklog - получить worklog
    const getWorklog = await this.makeRequest('GET', `/issue/${this.testIssueKey}/worklog`);
    this.logTest('Get Worklog', getWorklog, 200, `/issue/${this.testIssueKey}/worklog`);

    // PUT /issue/{issueIdOrKey}/worklog/{id} - обновить worklog
    if (worklogId) {
      const updateWorklogData = {
        timeSpent: '3h',
        comment: `Updated API testing worklog - ${new Date().toISOString()}`,
      };
      const updateWorklog = await this.makeRequest('PUT', `/issue/${this.testIssueKey}/worklog/${worklogId}`, updateWorklogData);
      this.logTest('Update Worklog', updateWorklog, 200, `/issue/${this.testIssueKey}/worklog/${worklogId}`);

      // DELETE /issue/{issueIdOrKey}/worklog/{id} - удалить worklog
      const deleteWorklog = await this.makeRequest('DELETE', `/issue/${this.testIssueKey}/worklog/${worklogId}`);
      this.logTest('Delete Worklog', deleteWorklog, 204, `/issue/${this.testIssueKey}/worklog/${worklogId}`);
    }
  }

  async testVersionOperations () {
    console.log('\n--- Testing Version Operations ---');

    // POST /version - создать версию
    const versionData = {
      name: `API Test Version - ${Date.now()}`,
      description: 'Version created for API testing',
      project: this.testProjectKey,
    };

    const createVersion = await this.makeRequest('POST', '/version', versionData);
    this.logTest('Create Version', createVersion, 201, '/version');

    let versionId = null;
    if (createVersion.success) {
      versionId = createVersion.data.id;
      this.createdResources.versions.push(versionId);
    }

    // PUT /version/{id} - обновить версию
    if (versionId) {
      const updateVersionData = {
        name: `Updated API Test Version - ${Date.now()}`,
        description: 'Updated version for API testing',
      };
      const updateVersion = await this.makeRequest('PUT', `/version/${versionId}`, updateVersionData);
      this.logTest('Update Version', updateVersion, 200, `/version/${versionId}`);

      // GET /version/{id} - получить версию
      const getVersion = await this.makeRequest('GET', `/version/${versionId}`);
      this.logTest('Get Version', getVersion, 200, `/version/${versionId}`);
    }
  }

  async testIssueLinkOperations () {
    if (!this.testIssueKey) return;

    console.log('\n--- Testing Issue Link Operations ---');

    // Создаем вторую задачу для связи
    const secondIssue = await this.createTestIssue();
    if (!secondIssue) {
      console.log('⚠️ Cannot test issue links - failed to create second issue');
      return;
    }

    // POST /issueLink - создать связь
    const linkData = {
      type: { name: 'Relates' },
      inwardIssue: { key: this.testIssueKey },
      outwardIssue: { key: secondIssue.key },
      comment: { body: 'Link created for API testing' },
    };

    const createLink = await this.makeRequest('POST', '/issueLink', linkData);
    this.logTest('Create Issue Link', createLink, 201, '/issueLink');

    // POST /issue/{issueIdOrKey}/remotelink - создать удаленную связь
    const remoteLinkData = {
      object: {
        url: 'https://example.com/test-link',
        title: 'Test Remote Link',
      },
    };

    const createRemoteLink = await this.makeRequest('POST', `/issue/${this.testIssueKey}/remotelink`, remoteLinkData);
    this.logTest('Create Remote Link', createRemoteLink, 201, `/issue/${this.testIssueKey}/remotelink`);

    // GET /issue/{issueIdOrKey}/remotelink - получить удаленные связи
    const getRemoteLinks = await this.makeRequest('GET', `/issue/${this.testIssueKey}/remotelink`);
    this.logTest('Get Remote Links', getRemoteLinks, 200, `/issue/${this.testIssueKey}/remotelink`);
  }

  /**
   * === AGILE/BOARD ENDPOINTS ===
   */

  async testAgileEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 5 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 5)) {
      // Блок пропускается без сообщения
      this.testCounter += 5; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING AGILE ENDPOINTS ===');

    // Эти эндпоинты могут быть недоступны в тестовом эмуляторе
    // но мы их протестируем для полноты

    // GET /agile/1.0/board - получить доски
    const boards = await this.makeAgileRequest('GET', '/agile/1.0/board', null, {});
    this.logTest('Get Agile Boards', boards, [200, 404], '/agile/1.0/board');

    if (boards.success && boards.data.values && boards.data.values.length > 0) {
      const boardId = boards.data.values[0].id;

      // GET /agile/1.0/board/{boardId}/sprint - получить спринты
      const sprints = await this.makeAgileRequest('GET', `/agile/1.0/board/${boardId}/sprint`);
      this.logTest('Get Board Sprints', sprints, [200, 404], `/agile/1.0/board/${boardId}/sprint`);

      // GET /agile/1.0/board/{boardId}/issue - получить задачи доски
      const boardIssues = await this.makeAgileRequest('GET', `/agile/1.0/board/${boardId}/issue`);
      this.logTest('Get Board Issues', boardIssues, [200, 404], `/agile/1.0/board/${boardId}/issue`);
    }
  }

  /**
   * === ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ===
   */

  async testAdditionalEndpoints () {
    // Проверяем, есть ли выбранные тесты в этом блоке (примерно 15 тестов)
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, 15)) {
      // Блок пропускается без сообщения
      this.testCounter += 15; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log('\n=== TESTING ADDITIONAL ENDPOINTS ===');

    // GET /attachment/{id} - получить вложение (если есть)
    const attachmentTest = await this.makeRequest('GET', '/attachment/10000');
    this.logTest('Get Attachment (Sample)', attachmentTest, [200, 404], '/attachment/10000');

    // GET /applicationrole - роли приложений
    const appRoles = await this.makeRequest('GET', '/applicationrole');
    this.logTest('Get Application Roles', appRoles, [200, 403], '/applicationrole');

    // GET /configuration - конфигурация
    const config = await this.makeRequest('GET', '/configuration');
    this.logTest('Get Configuration', config, [200, 403], '/configuration');

    // GET /serverInfo - информация о сервере
    const serverInfo = await this.makeRequest('GET', '/serverInfo');
    this.logTest('Get Server Info', serverInfo, 200, '/serverInfo');

    if (serverInfo.success) {
      this.validateProperties(serverInfo.data, ['version', 'buildNumber'], 'Server Info Properties');
    }

    // GET /dashboard - панели управления
    const dashboards = await this.makeRequest('GET', '/dashboard');
    this.logTest('Get Dashboards', dashboards, [200, 404], '/dashboard');

    // GET /filter/favourite - избранные фильтры
    const filters = await this.makeRequest('GET', '/filter/favourite');
    this.logTest('Get Favourite Filters', filters, 200, '/filter/favourite');

    // GET /groups/picker - группы (picker)
    const groups = await this.makeRequest('GET', '/groups/picker');
    this.logTest('Get Groups Picker', groups, [200, 403], '/groups/picker');

    // GET /notificationscheme - схемы уведомлений
    const notificationSchemes = await this.makeRequest('GET', '/notificationscheme');
    this.logTest('Get Notification Schemes', notificationSchemes, [200, 403], '/notificationscheme');

    // GET /permissionscheme - схемы разрешений
    const permissionSchemes = await this.makeRequest('GET', '/permissionscheme');
    this.logTest('Get Permission Schemes', permissionSchemes, [200, 403], '/permissionscheme');

    // GET /permissions - разрешения
    const permissions = await this.makeRequest('GET', '/permissions');
    this.logTest('Get Permissions', permissions, 200, '/permissions');

    // GET /workflow - рабочие процессы
    const workflows = await this.makeRequest('GET', '/workflow');
    this.logTest('Get Workflows', workflows, [200, 403], '/workflow');

    // GET /workflowscheme - схемы рабочих процессов
    const workflowSchemes = await this.makeRequest('GET', '/workflowscheme');
    this.logTest('Get Workflow Schemes', workflowSchemes, [200, 403], '/workflowscheme');
  }

  async cleanupTestIssue () {
    console.log('\n--- Cleaning Up Test Resources ---');

    // Удаляем созданные версии
    for (const versionId of this.createdResources.versions) {
      const deleteVersion = await this.makeRequest('DELETE', `/version/${versionId}`);
      this.logTest(`Delete Version ${versionId}`, deleteVersion, 204, `/version/${versionId}`);
    }

    // Удаляем созданные задачи
    for (const issueKey of this.createdResources.issues) {
      const deleteIssue = await this.makeRequest('DELETE', `/issue/${issueKey}`);
      this.logTest(`Delete Issue ${issueKey}`, deleteIssue, 204, `/issue/${issueKey}`);
    }

    console.log('✅ Cleanup completed');
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

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
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
      // Системные эндпоинты
      console.log('\n=== TESTING SYSTEM ENDPOINTS ===');
      const myself = await this.makeRequest('GET', '/myself');
      this.logTest('Get Current User (myself)', myself, 200, '/myself');

      const serverInfo = await this.makeRequest('GET', '/serverInfo');
      this.logTest('Get Server Info', serverInfo, 200, '/serverInfo');

      const config = await this.makeRequest('GET', '/configuration');
      this.logTest('Get Configuration', config, 200, '/configuration');

      const appRoles = await this.makeRequest('GET', '/applicationrole');
      this.logTest('Get Application Roles', appRoles, 200, '/applicationrole');

      const permissions = await this.makeRequest('GET', '/permissions');
      this.logTest('Get Permissions', permissions, 200, '/permissions');

      // Запускаем shared test cases для согласованности
      await this.testSharedTestCases();

      // Стандартные тесты
      await this.testIssueEndpoints();
      await this.testSearchEndpoints();
      await this.testProjectEndpoints();
      await this.testUserEndpoints();
      await this.testMetadataEndpoints();

      // Версии и компоненты
      console.log('\n=== TESTING VERSION & COMPONENT ENDPOINTS ===');

      // Создаем версию
      const version = await this.makeRequest('POST', '/version', {
        name: 'Test Version 2.0',
        description: 'Test version for comprehensive testing',
        projectId: 10000,
        released: false,
      });
      this.logTest('Create Version', version, 201, '/version');

      if (version.success && version.data.id) {
        const versionId = version.data.id;
        this.createdResources.versions.push(versionId);

        const getVersion = await this.makeRequest('GET', `/version/${versionId}`);
        this.logTest('Get Version', getVersion, 200, `/version/${versionId}`);

        const updateVersion = await this.makeRequest('PUT', `/version/${versionId}`, { released: true });
        this.logTest('Update Version', updateVersion, 200, `/version/${versionId}`);
      }

      // Issue Links
      console.log('\n=== TESTING ISSUE LINK ENDPOINTS ===');

      const linkTypes = await this.makeRequest('GET', '/issueLinkType');
      this.logTest('Get Issue Link Types', linkTypes, 200, '/issueLinkType');

      // Создаем две задачи для связывания
      const issue1 = await this.makeRequest('POST', '/issue', {
        fields: {
          summary: 'Link Test Issue 1',
          project: { key: this.testProjectKey },
          issuetype: { name: TEST_ISSUE_TYPE_NAME },
        },
      });
      this.logTest('Create Link Test Issue 1', issue1, 201, '/issue');

      const issue2 = await this.makeRequest('POST', '/issue', {
        fields: {
          summary: 'Link Test Issue 2',
          project: { key: this.testProjectKey },
          issuetype: { name: TEST_ISSUE_TYPE_NAME },
        },
      });
      this.logTest('Create Link Test Issue 2', issue2, 201, '/issue');

      if (issue1.success && issue2.success) {
        this.createdResources.issues.push(issue1.data.key, issue2.data.key);

        const link = await this.makeRequest('POST', '/issueLink', {
          type: { id: '10000' },
          inwardIssue: { key: issue1.data.key, id: issue1.data.id },
          outwardIssue: { key: issue2.data.key, id: issue2.data.id },
        });
        this.logTest('Create Issue Link', link, 201, '/issueLink');

        if (link.success && link.data.id) {
          this.createdResources.links.push(link.data.id);

          const deleteLink = await this.makeRequest('DELETE', `/issueLink/${link.data.id}`);
          this.logTest('Delete Issue Link', deleteLink, 204, `/issueLink/${link.data.id}`);
        }

        // Remote links
        const remoteLink = await this.makeRequest('POST', `/issue/${issue1.data.key}/remotelink`, {
          object: {
            url: 'https://example.com',
            title: 'Example Remote Link',
          },
        });
        this.logTest('Create Remote Link', remoteLink, 201, `/issue/${issue1.data.key}/remotelink`);

        const getRemoteLinks = await this.makeRequest('GET', `/issue/${issue1.data.key}/remotelink`);
        this.logTest('Get Remote Links', getRemoteLinks, 200, `/issue/${issue1.data.key}/remotelink`);
      }

      // Workflows and Schemes
      console.log('\n=== TESTING WORKFLOW & SCHEME ENDPOINTS ===');

      const workflows = await this.makeRequest('GET', '/workflow');
      this.logTest('Get Workflows', workflows, 200, '/workflow');

      const workflowSchemes = await this.makeRequest('GET', '/workflowscheme');
      this.logTest('Get Workflow Schemes', workflowSchemes, 200, '/workflowscheme');

      const notificationSchemes = await this.makeRequest('GET', '/notificationscheme');
      this.logTest('Get Notification Schemes', notificationSchemes, 200, '/notificationscheme');

      const permissionSchemes = await this.makeRequest('GET', '/permissionscheme');
      this.logTest('Get Permission Schemes', permissionSchemes, 200, '/permissionscheme');

      // Dashboards and Filters
      console.log('\n=== TESTING DASHBOARD & FILTER ENDPOINTS ===');

      const dashboards = await this.makeRequest('GET', '/dashboard');
      this.logTest('Get Dashboards', dashboards, 200, '/dashboard');

      const filters = await this.makeRequest('GET', '/filter/favourite');
      this.logTest('Get Favourite Filters', filters, 200, '/filter/favourite');

      // Groups and Roles
      console.log('\n=== TESTING GROUP & ROLE ENDPOINTS ===');

      const groups = await this.makeRequest('GET', '/groups/picker');
      this.logTest('Get Groups', groups, 200, '/groups/picker');

      const roles = await this.makeRequest('GET', '/role');
      this.logTest('Get Roles', roles, 200, '/role');

      // Attachments
      console.log('\n=== TESTING ATTACHMENT ENDPOINTS ===');

      const attachment = await this.makeRequest('GET', '/attachment/10000');
      this.logTest('Get Attachment', attachment, 200, '/attachment/10000');

      // Bulk operations
      console.log('\n=== TESTING BULK OPERATION ENDPOINTS ===');

      const bulkIssues = await this.makeRequest('POST', '/issue/bulk', {
        issueUpdates: [
          {
            fields: {
              summary: 'Bulk Issue 1',
              project: { key: this.testProjectKey },
              issuetype: { name: TEST_ISSUE_TYPE_NAME },
            },
          },
          {
            fields: {
              summary: 'Bulk Issue 2',
              project: { key: this.testProjectKey },
              issuetype: { name: TEST_ISSUE_TYPE_NAME },
            },
          },
        ],
      });
      this.logTest('Create Bulk Issues', bulkIssues, 201, '/issue/bulk');

      if (bulkIssues.success && bulkIssues.data.issues) {
        const issueKeys = bulkIssues.data.issues.map(i => i.key);
        this.createdResources.issues.push(...issueKeys);

        // Test changelog
        const changelog = await this.makeRequest('POST', '/issue/changelog/list', {
          issueIds: issueKeys,
        });
        this.logTest('Get Issues Changelog', changelog, 200, '/issue/changelog/list');
      }

      // Search GET endpoint
      console.log('\n=== TESTING SEARCH GET ENDPOINT ===');

      const searchGet = await this.makeRequest('GET', `/search?jql=project=${this.testProjectKey}&maxResults=5`);
      this.logTest('Search Issues (GET)', searchGet, 200, '/search');

      // Изменяющие тесты
      await this.testModifyingEndpoints();

      // Agile эндпоинты
      await this.testAgileEndpoints();

      // Дополнительные эндпоинты
      await this.testAdditionalEndpoints();

      // Очистка созданных ресурсов
      await this.cleanup();

    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
    } finally {
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

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(t => !t.success)
        .forEach(test => {
          console.log(`   • [${test.number}] ${test.name} [${test.method} ${test.endpoint}] - ${test.status}: ${test.details}`);
        });


      if (this.failedTestNumbers && this.failedTestNumbers.length > 0) {
        console.log(`\n❌ FAILED TEST NUMBERS: ${this.failedTestNumbers.join(',')}`);
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
      console.log('  --tests=1,5,10-15  Run only specific tests (numbers or ranges)');
      console.log('  --help, -h         Show this help message\n');
      console.log('Examples:');
      console.log('  node tests/jira-endpoints-tester.js --tests=1,5,10');
      console.log('  node tests/jira-endpoints-tester.js --tests=1-20,50-60');
      console.log('  node tests/jira-endpoints-tester.js --extended\n');
      return;
    }

    if (isExtended) {
      console.log('📋 Running EXTENDED test suite...\n');
      await tester.runExtendedTests();
    } else {
      console.log('📋 Running standard test suite...');
      if (tester.selectedTests) {
        console.log(`🎯 Selected tests: ${tester.selectedTests.length} test(s)`);
      } else {
        console.log('💡 Tip: Use --extended or -e flag for comprehensive testing');
        console.log('💡 Tip: Use --tests=1,5,10-15 for selective test execution');
      }
      console.log('');
      await tester.runAllTests();
    }
  })();
}
