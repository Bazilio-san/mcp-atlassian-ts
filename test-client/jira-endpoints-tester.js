/**
 * Comprehensive JIRA REST API v2 Endpoints Tester
 * Vanilla JavaScript module for testing all JIRA endpoints
 * Не использует тестовые фреймворки - только ванильный JS
 */

// Для Node.js версий без глобального fetch
import fetch from 'node-fetch';

class JiraEndpointsTester {
  constructor (config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8080';
    this.auth = config.auth || { type: 'basic', username: 'admin', password: 'admin' };
    this.testResults = [];
    this.testIssueKey = null;
    this.testProjectKey = 'TEST';
    this.createdResources = {
      issues: [],
      sprints: [],
      versions: [],
      links: []
    };
  }

  /**
   * Получить заголовки авторизации
   */
  getAuthHeaders () {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.auth.type === 'basic') {
      const credentials = btoa(`${this.auth.username}:${this.auth.password}`);
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

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        url,
        method
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        url,
        method
      };
    }
  }

  /**
   * Логирование результатов тестов
   */
  logTest (testName, result, expected = null, endpoint = null) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const details = expected ? `Expected: ${expected}, Got: ${result.status}` : `Status: ${result.status}`;
    const endpointInfo = endpoint ? ` [${result.method} ${endpoint}]` : '';

    console.log(`${status} ${testName}${endpointInfo} - ${details}`);

    this.testResults.push({
      name: testName,
      success: result.success,
      status: result.status,
      endpoint,
      method: result.method,
      details: result.statusText || result.error,
      timestamp: new Date().toISOString()
    });

    if (!result.success && result.error) {
      console.error(`   Error: ${result.error}`);
    }
  }

  /**
   * Проверить наличие ожидаемых свойств в объекте
   */
  validateProperties (obj, expectedProps, testName) {
    const missing = expectedProps.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      console.log(`❌ FAIL ${testName} - Missing properties: ${missing.join(', ')}`);
      return false;
    }
    console.log(`✅ PASS ${testName} - All expected properties present`);
    return true;
  }

  /**
   * === ИНФОРМАЦИОННЫЕ ЭНДПОИНТЫ ===
   */

  async testIssueEndpoints () {
    console.log('\n=== TESTING ISSUE ENDPOINTS ===');

    // GET /issue/{issueIdOrKey} - получить задачу
    const getIssue = await this.makeRequest('GET', `/issue/${this.testProjectKey}-1`);
    this.logTest('Get Issue', getIssue, 200, `/issue/${this.testProjectKey}-1`);

    if (getIssue.success) {
      this.validateProperties(getIssue.data, ['key', 'fields'], 'Issue Properties');
      this.validateProperties(getIssue.data.fields, ['summary', 'status', 'issuetype'], 'Issue Fields');
    }

    // GET /issue/{issueIdOrKey}/editmeta - метаданные для редактирования
    const editMeta = await this.makeRequest('GET', `/issue/${this.testProjectKey}-1/editmeta`);
    this.logTest('Get Issue Edit Meta', editMeta, 200, `/issue/${this.testProjectKey}-1/editmeta`);

    if (editMeta.success) {
      this.validateProperties(editMeta.data, ['fields'], 'Edit Meta Properties');
    }

    // GET /issue/{issueIdOrKey}/transitions - доступные переходы
    const transitions = await this.makeRequest('GET', `/issue/${this.testProjectKey}-1/transitions`);
    this.logTest('Get Issue Transitions', transitions, 200, `/issue/${this.testProjectKey}-1/transitions`);

    if (transitions.success && transitions.data.transitions) {
      this.validateProperties(transitions.data.transitions[0] || {}, ['id', 'name'], 'Transition Properties');
    }

    // GET /issue/{issueIdOrKey}/comment - комментарии
    const comments = await this.makeRequest('GET', `/issue/${this.testProjectKey}-1/comment`);
    this.logTest('Get Issue Comments', comments, 200, `/issue/${this.testProjectKey}-1/comment`);

    // GET /issue/{issueIdOrKey}/worklog - рабочие логи
    const worklog = await this.makeRequest('GET', `/issue/${this.testProjectKey}-1/worklog`);
    this.logTest('Get Issue Worklog', worklog, 200, `/issue/${this.testProjectKey}-1/worklog`);

    // GET /issue/createmeta - метаданные для создания
    const createMeta = await this.makeRequest('GET', '/issue/createmeta');
    this.logTest('Get Create Meta', createMeta, 200, '/issue/createmeta');

    if (createMeta.success) {
      this.validateProperties(createMeta.data, ['projects'], 'Create Meta Properties');
    }
  }

  async testSearchEndpoints () {
    console.log('\n=== TESTING SEARCH ENDPOINTS ===');

    // POST /search - поиск JQL
    const searchData = {
      jql: `project = ${this.testProjectKey}`,
      maxResults: 10,
      fields: ['summary', 'status', 'assignee']
    };
    const search = await this.makeRequest('POST', '/search', searchData);
    this.logTest('JQL Search', search, 200, '/search');

    if (search.success) {
      this.validateProperties(search.data, ['issues', 'total'], 'Search Results Properties');
    }

    // GET /search - поиск GET параметрами
    const searchGet = await this.makeRequest('GET', `/search?jql=project=${this.testProjectKey}&maxResults=5`);
    this.logTest('JQL Search GET', searchGet, 200, '/search');
  }

  async testProjectEndpoints () {
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
        issuetype: { name: 'Task' }
      }
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
        description: 'Updated description for API testing'
      }
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
      body: `Test comment added via API - ${new Date().toISOString()}`
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
        body: `Updated test comment - ${new Date().toISOString()}`
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
        transition: { id: firstTransition.id }
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
      started: new Date().toISOString()
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
        comment: `Updated API testing worklog - ${new Date().toISOString()}`
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
      project: this.testProjectKey
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
        description: 'Updated version for API testing'
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
      comment: { body: 'Link created for API testing' }
    };

    const createLink = await this.makeRequest('POST', '/issueLink', linkData);
    this.logTest('Create Issue Link', createLink, 201, '/issueLink');

    // POST /issue/{issueIdOrKey}/remotelink - создать удаленную связь
    const remoteLinkData = {
      object: {
        url: 'https://example.com/test-link',
        title: 'Test Remote Link'
      }
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
    console.log('\n=== TESTING AGILE ENDPOINTS ===');

    // Эти эндпоинты могут быть недоступны в тестовом эмуляторе
    // но мы их протестируем для полноты

    // GET /agile/1.0/board - получить доски
    const boards = await this.makeRequest('GET', '/agile/1.0/board', null, {});
    this.logTest('Get Agile Boards', boards, [200, 404], '/agile/1.0/board');

    if (boards.success && boards.data.values && boards.data.values.length > 0) {
      const boardId = boards.data.values[0].id;

      // GET /agile/1.0/board/{boardId}/sprint - получить спринты
      const sprints = await this.makeRequest('GET', `/agile/1.0/board/${boardId}/sprint`);
      this.logTest('Get Board Sprints', sprints, [200, 404], `/agile/1.0/board/${boardId}/sprint`);

      // GET /agile/1.0/board/{boardId}/issue - получить задачи доски
      const boardIssues = await this.makeRequest('GET', `/agile/1.0/board/${boardId}/issue`);
      this.logTest('Get Board Issues', boardIssues, [200, 404], `/agile/1.0/board/${boardId}/issue`);
    }
  }

  /**
   * === ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ===
   */

  async testAdditionalEndpoints () {
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
          console.log(`   • ${test.name} [${test.method} ${test.endpoint}] - ${test.status}: ${test.details}`);
        });
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
      results: this.testResults
    };
  }
}

// ES Modules экспорт
export default JiraEndpointsTester;

// Автозапуск если файл запущен напрямую
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  (async () => {
    const tester = new JiraEndpointsTester({
      baseUrl: 'http://localhost:8080', // URL эмулятора JIRA
      auth: {
        type: 'basic',
        username: 'admin',
        password: 'admin'
      }
    });

    await tester.runAllTests();
  })();
}
