// noinspection UnnecessaryLocalVariableJS

/**
 * JIRA REST API v2 Endpoints Tester
 */

// Для Node.js версий без глобального fetch
import fetch from 'node-fetch';
import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { SharedJiraTestCases, TestValidationUtils, ResourceManager, CascadeExecutor } from './shared-test-cases.js';
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
    this.resourceManager = new ResourceManager();
    this.cascadeExecutor = new CascadeExecutor(this.resourceManager);

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
   * Выполнить отдельный тест-кейс
   */
  async runTestCase(testCase) {
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

    return result;
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
   * Выполнить тесты определенной категории
   */
  async runTestsByCategory(categoryName, estimatedCount = 10) {
    // Проверяем, есть ли выбранные тесты в этом блоке
    if (!this.hasSelectedTestsInRange(this.testCounter + 1, estimatedCount)) {
      // Блок пропускается без сообщения
      this.testCounter += estimatedCount; // Пропускаем счетчик для всех тестов в блоке
      return;
    }

    console.log(`\n=== TESTING ${categoryName.toUpperCase()} ===`);

    const testCases = this.sharedTestCases.getTestCasesByCategory(categoryName);

    for (const testCase of testCases) {
      try {
        await this.runSharedTestCase(testCase);
      } catch (error) {
        console.log(`❌ ERROR ${testCase.name} - ${error.message}`);
      }
    }
  }

  /**
   * Выполнить каскадные тесты
   */
  async runCascadeTests() {
    console.log('\n=== TESTING CASCADE OPERATIONS ===');

    const cascadeTestCases = this.sharedTestCases.getCascadeTestCases();

    for (const cascadeTestCase of cascadeTestCases) {
      try {
        const result = await this.cascadeExecutor.executeCascade(cascadeTestCase, this);

        // Логируем результат каскада как один тест
        const cascadeResult = {
          success: result.success,
          status: result.success ? 200 : 400,
          statusText: result.success ? 'OK' : 'Cascade Failed',
          data: result,
          error: result.success ? null : `Cascade failed: ${result.steps.find(s => !s.success)?.error}`,
          url: 'cascade',
          method: 'CASCADE'
        };

        this.logTest(cascadeTestCase.name, cascadeResult, 200, 'cascade');

        // Логируем детали каскада
        for (const step of result.steps) {
          console.log(`  ${step.success ? '✅' : '❌'} ${step.step}: ${step.testCase}`);
          if (!step.success && step.error) {
            console.log(`    Error: ${step.error}`);
          }
        }

      } catch (error) {
        console.log(`❌ CASCADE ERROR ${cascadeTestCase.name} - ${error.message}`);
      }
    }
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
    await this.runTestsByCategory('informational', 6);
    await this.runTestsByCategory('issueDetailed', 3);
  }

  async testSearchEndpoints () {
    await this.runTestsByCategory('searchDetailed', 2);
  }

  async testProjectEndpoints () {
    await this.runTestsByCategory('projectDetailed', 7);
  }

  async testUserEndpoints () {
    await this.runTestsByCategory('userDetailed', 6);
  }

  async testMetadataEndpoints () {
    await this.runTestsByCategory('metadataDetailed', 10);
  }

  /**
   * === ИЗМЕНЯЮЩИЕ ЭНДПОИНТЫ ===
   */

  async testModifyingEndpoints () {
    await this.runTestsByCategory('modifying', 20);
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
    await this.runTestsByCategory('agile', 5);
  }

  /**
   * === ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ===
   */

  async testAdditionalEndpoints () {
    await this.runTestsByCategory('system', 4);
    await this.runTestsByCategory('additional', 11);
  }

  async cleanupTestIssue () {
    console.log('\n--- Cleaning Up Test Resources ---');

    const createdResources = this.resourceManager.getCreatedResources();

    // Удаляем созданные версии
    for (const versionId of createdResources.versions) {
      const deleteVersion = await this.makeRequest('DELETE', `/version/${versionId}`);
      this.logTest(`Delete Version ${versionId}`, deleteVersion, 204, `/version/${versionId}`);
    }

    // Удаляем созданные задачи
    for (const issueKey of createdResources.issues) {
      const deleteIssue = await this.makeRequest('DELETE', `/issue/${issueKey}`);
      this.logTest(`Delete Issue ${issueKey}`, deleteIssue, 204, `/issue/${issueKey}`);
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
      await this.runTestsByCategory('system', 4);
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
