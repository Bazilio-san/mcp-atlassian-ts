/**
 * Shared JIRA API Test Cases
 * Реализует общие тест-кейсы для проверки JIRA API, которые могут использоваться
 * как для прямого тестирования эмулятора, так и для тестирования MCP сервера
 */

import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { TEST_ISSUE_KEY, TEST_ISSUE_TYPE_NAME, TEST_JIRA_PROJECT } from './constants.js';

/**
 * Константы групп тестов
 */
export const TEST_GROUPS = {
  SYSTEM: 1,
  INFORMATIONAL: 2,
  ISSUE_DETAILED: 3,
  SEARCH_DETAILED: 4,
  PROJECT_DETAILED: 5,
  USER_DETAILED: 6,
  METADATA_DETAILED: 7,
  MODIFYING: 8,
  AGILE: 9,
  ADDITIONAL: 10,
  EXTENDED: 11,
  CASCADE: 12
};

/**
 * Информация о группах тестов
 */
export const GROUP_INFO = {
  [TEST_GROUPS.SYSTEM]: { name: 'System', description: 'Системные эндпоинты' },
  [TEST_GROUPS.INFORMATIONAL]: { name: 'Informational', description: 'Базовые информационные тесты' },
  [TEST_GROUPS.ISSUE_DETAILED]: { name: 'IssueDetailed', description: 'Детальные тесты задач' },
  [TEST_GROUPS.SEARCH_DETAILED]: { name: 'SearchDetailed', description: 'Детальные тесты поиска' },
  [TEST_GROUPS.PROJECT_DETAILED]: { name: 'ProjectDetailed', description: 'Детальные тесты проектов' },
  [TEST_GROUPS.USER_DETAILED]: { name: 'UserDetailed', description: 'Детальные тесты пользователей' },
  [TEST_GROUPS.METADATA_DETAILED]: { name: 'MetadataDetailed', description: 'Детальные тесты метаданных' },
  [TEST_GROUPS.MODIFYING]: { name: 'Modifying', description: 'Тесты изменения данных' },
  [TEST_GROUPS.AGILE]: { name: 'Agile', description: 'Тесты Agile API' },
  [TEST_GROUPS.ADDITIONAL]: { name: 'Additional', description: 'Дополнительные тесты' },
  [TEST_GROUPS.EXTENDED]: { name: 'Extended', description: 'Расширенные тесты' },
  [TEST_GROUPS.CASCADE]: { name: 'Cascade', description: 'Каскадные операции' }
};

/**
 * Определяет набор тест-кейсов для различных JIRA API эндпоинтов
 * Каждый тест-кейс содержит информацию о том, как вызвать API и как проверить результат
 */
export class SharedJiraTestCases {
  constructor() {
    this.testProjectKey = TEST_JIRA_PROJECT;
    this.testUsername = appConfig.jira.auth.basic.username;
    this.testIssueKey = TEST_ISSUE_KEY;
    this.createdResources = {
      issues: [],
      versions: [],
      links: []
    };
  }

  /**
   * Получить базовые информационные тест-кейсы
   * Эти тесты проверяют получение данных без их изменения
   */
  getInformationalTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 1,
        fullId: "2-1",
        name: 'Get Issue',
        description: 'Получить информацию о задаче',
        mcpTool: 'jira_get_issue',
        mcpArgs: {
          issueKey: this.testIssueKey,
          expand: ['comment']
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testIssueKey),
          checkResult: (result) => result && result.key === this.testIssueKey,
          expectedProps: ['key', 'fields']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 2,
        fullId: "2-2",
        name: 'Search Issues',
        description: 'Поиск задач по JQL',
        mcpTool: 'jira_search_issues',
        mcpArgs: {
          jql: `project = ${this.testProjectKey}`,
          maxResults: 10,
          fields: ['summary', 'status', 'assignee']
        },
        directApi: {
          method: 'POST',
          endpoint: '/search',
          data: {
            jql: `project = ${this.testProjectKey}`,
            maxResults: 10,
            fields: ['summary', 'status', 'assignee']
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Search Results'),
          checkResult: (result) => result && result.issues && Array.isArray(result.issues),
          expectedProps: ['issues', 'total']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 3,
        fullId: "2-3",
        name: 'Get Projects',
        description: 'Получить список проектов',
        mcpTool: 'jira_get_projects',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/project'
        },
        validation: {
          checkContent: (content) => content && content.includes('Projects'),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: ['key', 'name', 'id']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 4,
        fullId: "2-4",
        name: 'Get Project Details',
        description: 'Получить детальную информацию о проекте',
        mcpTool: 'jira_get_project',
        mcpArgs: {
          projectKey: this.testProjectKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testProjectKey),
          checkResult: (result) => result && result.key === this.testProjectKey,
          expectedProps: ['key', 'name', 'description']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 5,
        fullId: "2-5",
        name: 'Get Issue Transitions',
        description: 'Получить доступные переходы статуса для задачи',
        mcpTool: 'jira_get_transitions',
        mcpArgs: {
          issueKey: this.testIssueKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/transitions`
        },
        validation: {
          checkContent: (content) => content && content.includes('transitions'),
          checkResult: (result) => result && result.transitions && Array.isArray(result.transitions),
          expectedProps: ['transitions'],
          arrayElementProps: { path: 'transitions', props: ['id', 'name'] }
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 6,
        fullId: "2-6",
        name: 'Get Issue Comments',
        description: 'Получить комментарии к задаче',
        mcpTool: 'jira_get_comments',
        mcpArgs: {
          issueKey: this.testIssueKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/comment`
        },
        validation: {
          checkContent: (content) => content && (content.includes('comments') || content.includes('Comments')),
          checkResult: (result) => result && result.comments !== undefined,
          expectedProps: ['comments']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 7,
        fullId: "2-7",
        name: 'Get User Info',
        description: 'Получить информацию о пользователе',
        mcpTool: 'jira_get_user',
        mcpArgs: {
          username: this.testUsername
        },
        directApi: {
          method: 'GET',
          endpoint: `/user?username=${this.testUsername}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testUsername),
          checkResult: (result) => result && result.name === this.testUsername,
          expectedProps: ['name', 'displayName', 'active']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 8,
        fullId: "2-8",
        name: 'Get Current User',
        description: 'Получить информацию о текущем пользователе',
        mcpTool: 'jira_get_current_user',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/myself'
        },
        validation: {
          checkContent: (content) => content && (content.includes('Current user') || content.includes('User')),
          checkResult: (result) => result && result.name,
          expectedProps: ['name', 'displayName', 'active']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 9,
        fullId: "2-9",
        name: 'Get Priorities',
        description: 'Получить список приоритетов',
        mcpTool: 'jira_get_priorities',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/priority'
        },
        validation: {
          checkContent: (content) => content && (content.includes('priorities') || content.includes('Priority')),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: ['id', 'name']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 10,
        fullId: "2-10",
        name: 'Get Statuses',
        description: 'Получить список статусов',
        mcpTool: 'jira_get_statuses',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/status'
        },
        validation: {
          checkContent: (content) => content && (content.includes('statuses') || content.includes('Status')),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: ['id', 'name', 'statusCategory']
        }
      },
      {
        groupNumber: TEST_GROUPS.INFORMATIONAL,
        testNumber: 11,
        fullId: "2-11",
        name: 'Get Issue Types',
        description: 'Получить список типов задач',
        mcpTool: 'jira_get_issue_types',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/issuetype'
        },
        validation: {
          checkContent: (content) => content && (content.includes('types') || content.includes('Type')),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: ['id', 'name']
        }
      }
    ];
  }

  /**
   * Получить системные тест-кейсы (serverInfo, configuration, permissions)
   */
  getSystemTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 1,
        fullId: "1-1",
        name: 'Get Server Info',
        description: 'Получить информацию о сервере JIRA',
        mcpTool: 'jira_get_server_info',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/serverInfo'
        },
        validation: {
          checkContent: (content) => content && content.includes('version'),
          checkResult: (result) => result && result.version,
          expectedProps: ['version', 'buildNumber']
        }
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 2,
        fullId: "1-2",
        name: 'Get Configuration',
        description: 'Получить конфигурацию JIRA',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/configuration'
        },
        validation: {
          checkContent: (content) => content && content.includes('config'),
          checkResult: (result) => result && typeof result === 'object',
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 3,
        fullId: "1-3",
        name: 'Get Permissions',
        description: 'Получить разрешения JIRA',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/permissions'
        },
        validation: {
          checkContent: (content) => content && content.includes('permissions'),
          checkResult: (result) => result && typeof result === 'object',
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.SYSTEM,
        testNumber: 4,
        fullId: "1-4",
        name: 'Get Application Roles',
        description: 'Получить роли приложений',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/applicationrole'
        },
        validation: {
          checkContent: (content) => content && content.includes('roles'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      }
    ];
  }

  /**
   * Получить расширенные тест-кейсы для задач
   */
  getIssueDetailedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 1,
        fullId: "3-1",
        name: 'Get Issue Edit Meta',
        description: 'Получить метаданные для редактирования задачи',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/editmeta`
        },
        validation: {
          checkContent: (content) => content && content.includes('fields'),
          checkResult: (result) => result && result.fields,
          expectedProps: ['fields']
        }
      },
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 2,
        fullId: "3-2",
        name: 'Get Issue Worklog',
        description: 'Получить рабочие логи задачи',
        mcpTool: 'jira_get_worklog',
        mcpArgs: {
          issueKey: this.testIssueKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/worklog`
        },
        validation: {
          checkContent: (content) => content && content.includes('worklog'),
          checkResult: (result) => result && result.worklogs !== undefined,
          expectedProps: ['worklogs']
        }
      },
      {
        groupNumber: TEST_GROUPS.ISSUE_DETAILED,
        testNumber: 3,
        fullId: "3-3",
        name: 'Get Create Meta',
        description: 'Получить метаданные для создания задач',
        mcpTool: 'jira_get_create_meta',
        mcpArgs: {
          projectKeys: [this.testProjectKey]
        },
        directApi: {
          method: 'GET',
          endpoint: '/issue/createmeta'
        },
        validation: {
          checkContent: (content) => content && content.includes('projects'),
          checkResult: (result) => result && result.projects,
          expectedProps: ['projects']
        }
      }
    ];
  }

  /**
   * Получить тест-кейсы для поиска
   */
  getSearchDetailedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.SEARCH_DETAILED,
        testNumber: 1,
        fullId: "4-1",
        name: 'JQL Search GET',
        description: 'Поиск задач по JQL через GET запрос',
        mcpTool: 'jira_search_issues', // используем тот же MCP инструмент
        mcpArgs: {
          jql: `project = ${this.testProjectKey}`,
          maxResults: 5
        },
        directApi: {
          method: 'GET',
          endpoint: `/search?jql=project=${this.testProjectKey}&maxResults=5`
        },
        validation: {
          checkContent: (content) => content && content.includes('Search Results'),
          checkResult: (result) => result && result.issues && Array.isArray(result.issues),
          expectedProps: ['issues', 'total']
        }
      }
    ];
  }

  /**
   * Получить детальные тест-кейсы для проектов
   */
  getProjectDetailedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.PROJECT_DETAILED,
        testNumber: 1,
        fullId: "5-1",
        name: 'Get All Projects',
        description: 'Получить список всех проектов',
        mcpTool: 'jira_get_projects',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/project'
        },
        validation: {
          checkContent: (content) => content && content.includes('Projects'),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: ['key', 'name', 'id']
        }
      },
      {
        groupNumber: TEST_GROUPS.PROJECT_DETAILED,
        testNumber: 2,
        fullId: "5-2",
        name: 'Get Project Statuses',
        description: 'Получить статусы проекта',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/statuses`
        },
        validation: {
          checkContent: (content) => content && content.includes('status'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      }
    ];
  }

  /**
   * Получить детальные тест-кейсы для пользователей
   */
  getUserDetailedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 1,
        fullId: "6-1",
        name: 'Get User by Username',
        description: 'Получить пользователя по имени',
        mcpTool: 'jira_get_user',
        mcpArgs: {
          username: this.testUsername
        },
        directApi: {
          method: 'GET',
          endpoint: `/user?username=${this.testUsername}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testUsername),
          checkResult: (result) => result && result.name === this.testUsername,
          expectedProps: ['name', 'displayName', 'active']
        }
      },
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 2,
        fullId: "6-2",
        name: 'Search Users by Username',
        description: 'Поиск пользователей по имени',
        mcpTool: 'jira_search_users',
        mcpArgs: {
          username: this.testUsername
        },
        directApi: {
          method: 'GET',
          endpoint: `/user/search?username=${this.testUsername}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testUsername),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.USER_DETAILED,
        testNumber: 3,
        fullId: "6-3",
        name: 'Get Assignable Users',
        description: 'Получить назначаемых пользователей для проекта',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/user/assignable/search?project=${this.testProjectKey}&username=${this.testUsername}`
        },
        validation: {
          checkContent: (content) => content && content.includes('user'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      }
    ];
  }

  /**
   * Получить детальные метаданные тест-кейсы
   */
  getMetadataDetailedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 1,
        fullId: "7-1",
        name: 'Get Fields',
        description: 'Получить список полей JIRA',
        mcpTool: 'jira_get_fields',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/field'
        },
        validation: {
          checkContent: (content) => content && (content.includes('fields') || content.includes('Field')),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0,
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 2,
        fullId: "7-2",
        name: 'Get Resolutions',
        description: 'Получить список резолюций',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/resolution'
        },
        validation: {
          checkContent: (content) => content && content.includes('resolution'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: ['id', 'name']
        }
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 3,
        fullId: "7-3",
        name: 'Get Project Roles',
        description: 'Получить роли проекта',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/role'
        },
        validation: {
          checkContent: (content) => content && content.includes('role'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.METADATA_DETAILED,
        testNumber: 4,
        fullId: "7-4",
        name: 'Get Issue Link Types',
        description: 'Получить типы связей задач',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/issueLinkType'
        },
        validation: {
          checkContent: (content) => content && content.includes('link'),
          checkResult: (result) => result && result.issueLinkTypes && Array.isArray(result.issueLinkTypes),
          expectedProps: ['issueLinkTypes']
        }
      }
    ];
  }

  /**
   * Получить тест-кейсы для операций изменения данных
   * Эти тесты создают, изменяют или удаляют данные
   */
  getModifyingTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 1,
        fullId: "8-1",
        name: 'Create Issue',
        description: 'Создать новую задачу',
        mcpTool: 'jira_create_issue',
        mcpArgs: {
          project: this.testProjectKey,
          issueType: TEST_ISSUE_TYPE_NAME,
          summary: 'Test Issue Created by MCP Client',
          description: 'This issue was created during MCP integration testing',
          labels: ['mcp-test', 'automated']
        },
        directApi: {
          method: 'POST',
          endpoint: '/issue',
          data: {
            fields: {
              project: { key: this.testProjectKey },
              summary: 'Test Issue Created by API Client',
              description: 'This issue was created during API testing',
              issuetype: { name: TEST_ISSUE_TYPE_NAME }
            }
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result) => result && result.key && result.key.startsWith(this.testProjectKey),
          expectedProps: ['key', 'id']
        },
        cleanup: (result) => {
          if (result && result.key) {
            this.createdResources.issues.push(result.key);
          }
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 2,
        fullId: "8-2",
        name: 'Add Comment',
        description: 'Добавить комментарий к задаче',
        mcpTool: 'jira_add_comment',
        mcpArgs: {
          issueKey: this.testIssueKey,
          body: 'This comment was added by MCP test client'
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/comment`,
          data: {
            body: 'This comment was added by API test client'
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result) => result && result.id,
          expectedProps: ['id', 'body']
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 3,
        fullId: "8-3",
        name: 'Update Issue',
        description: 'Обновить существующую задачу',
        mcpTool: 'jira_update_issue',
        mcpArgs: {
          issueKey: this.testIssueKey,
          summary: `Updated Test Issue - ${new Date().toISOString()}`,
          description: 'Updated description for MCP testing'
        },
        directApi: {
          method: 'PUT',
          endpoint: `/issue/${this.testIssueKey}`,
          data: {
            fields: {
              summary: `Updated Test Issue - ${new Date().toISOString()}`,
              description: 'Updated description for API testing'
            }
          }
        },
        validation: {
          checkContent: (content) => content && (content.includes('Successfully') || content.includes('Updated')),
          checkResult: (result, response) => response && response.status && [200, 204].includes(response.status)
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 4,
        fullId: "8-4",
        name: 'Add Worklog',
        description: 'Добавить рабочий лог к задаче',
        mcpTool: 'jira_add_worklog',
        mcpArgs: {
          issueKey: this.testIssueKey,
          timeSpent: '2h',
          comment: 'MCP test worklog entry'
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/worklog`,
          data: {
            timeSpent: '2h',
            comment: 'API test worklog entry',
            started: new Date().toISOString()
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result) => result && result.id,
          expectedProps: ['id', 'timeSpent']
        },
        cleanup: (result) => {
          if (result && result.id) {
            // Worklog ID будет использован для удаления в каскадных операциях
          }
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 5,
        fullId: "8-5",
        name: 'Create Version',
        description: 'Создать версию проекта',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: '/version',
          data: {
            name: `API Test Version - ${Date.now()}`,
            description: 'Version created for API testing',
            project: this.testProjectKey
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result) => result && result.id,
          expectedProps: ['id', 'name']
        },
        cleanup: (result) => {
          if (result && result.id) {
            this.createdResources.versions.push(result.id);
          }
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 6,
        fullId: "8-6",
        name: 'Update Version',
        description: 'Обновить версию проекта',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'PUT',
          endpoint: '/version/{versionId}', // будет заменено в runtime
          data: {
            name: `Updated API Test Version - ${Date.now()}`,
            description: 'Updated version for API testing'
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result, response) => response && response.status && [200, 204].includes(response.status)
        },
        dependsOn: 'Create Version' // зависит от создания версии
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 7,
        fullId: "8-7",
        name: 'Get Version',
        description: 'Получить информацию о версии',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/version/{versionId}' // будет заменено в runtime
        },
        validation: {
          checkContent: (content) => content && content.includes('version'),
          checkResult: (result) => result && result.id,
          expectedProps: ['id', 'name']
        },
        dependsOn: 'Create Version'
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 8,
        fullId: "8-8",
        name: 'Create Issue Link',
        description: 'Создать связь между задачами',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: '/issueLink',
          data: {
            type: { name: 'Relates' },
            inwardIssue: { key: this.testIssueKey },
            outwardIssue: { key: '{secondIssueKey}' }, // будет заменено в runtime
            comment: { body: 'Link created for API testing' }
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result, response) => response && response.status && [201, 204].includes(response.status)
        },
        dependsOn: 'Create Issue' // зависит от создания второй задачи
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 9,
        fullId: "8-9",
        name: 'Create Remote Link',
        description: 'Создать удаленную связь для задачи',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testIssueKey}/remotelink`,
          data: {
            object: {
              url: 'https://example.com/test-link',
              title: 'Test Remote Link'
            }
          }
        },
        validation: {
          checkContent: (content) => content && content.includes('Successfully'),
          checkResult: (result) => result && result.id,
          expectedProps: ['id']
        }
      },
      {
        groupNumber: TEST_GROUPS.MODIFYING,
        testNumber: 10,
        fullId: "8-10",
        name: 'Get Remote Links',
        description: 'Получить удаленные связи задачи',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testIssueKey}/remotelink`
        },
        validation: {
          checkContent: (content) => content && content.includes('links'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      }
    ];
  }

  /**
   * Получить тест-кейсы для Agile/Board операций
   */
  getAgileTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 1,
        fullId: "9-1",
        name: 'Get Agile Boards',
        description: 'Получить список Agile досок',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board'
        },
        validation: {
          checkContent: (content) => content && content.includes('boards'),
          checkResult: (result) => result && result.values && Array.isArray(result.values),
          expectedProps: ['values']
        }
      },
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 2,
        fullId: "9-2",
        name: 'Get Board Sprints',
        description: 'Получить спринты доски',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board/{boardId}/sprint' // будет заменено в runtime
        },
        validation: {
          checkContent: (content) => content && content.includes('sprints'),
          checkResult: (result) => result && result.values && Array.isArray(result.values),
          expectedProps: ['values']
        },
        dependsOn: 'Get Agile Boards'
      },
      {
        groupNumber: TEST_GROUPS.AGILE,
        testNumber: 3,
        fullId: "9-3",
        name: 'Get Board Issues',
        description: 'Получить задачи доски',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/agile/1.0/board/{boardId}/issue' // будет заменено в runtime
        },
        validation: {
          checkContent: (content) => content && content.includes('issues'),
          checkResult: (result) => result && result.issues && Array.isArray(result.issues),
          expectedProps: ['issues']
        },
        dependsOn: 'Get Agile Boards'
      }
    ];
  }

  /**
   * Получить дополнительные тест-кейсы
   */
  getAdditionalTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 1,
        fullId: "10-1",
        name: 'Get Attachment Sample',
        description: 'Получить пример вложения',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/attachment/10000'
        },
        validation: {
          checkContent: (content) => content && content.includes('attachment'),
          checkResult: (result, response) => response && [200, 404].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 2,
        fullId: "10-2",
        name: 'Get Dashboards',
        description: 'Получить панели управления',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/dashboard'
        },
        validation: {
          checkContent: (content) => content && content.includes('dashboard'),
          checkResult: (result, response) => response && [200, 404].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 3,
        fullId: "10-3",
        name: 'Get Favourite Filters',
        description: 'Получить избранные фильтры',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/filter/favourite'
        },
        validation: {
          checkContent: (content) => content && content.includes('filter'),
          checkResult: (result) => result && Array.isArray(result),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 4,
        fullId: "10-4",
        name: 'Get Groups Picker',
        description: 'Получить группы (picker)',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/groups/picker'
        },
        validation: {
          checkContent: (content) => content && content.includes('groups'),
          checkResult: (result, response) => response && [200, 403].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 5,
        fullId: "10-5",
        name: 'Get Notification Schemes',
        description: 'Получить схемы уведомлений',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/notificationscheme'
        },
        validation: {
          checkContent: (content) => content && content.includes('scheme'),
          checkResult: (result, response) => response && [200, 403].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 6,
        fullId: "10-6",
        name: 'Get Permission Schemes',
        description: 'Получить схемы разрешений',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/permissionscheme'
        },
        validation: {
          checkContent: (content) => content && content.includes('scheme'),
          checkResult: (result, response) => response && [200, 403].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 7,
        fullId: "10-7",
        name: 'Get Workflows',
        description: 'Получить рабочие процессы',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflow'
        },
        validation: {
          checkContent: (content) => content && content.includes('workflow'),
          checkResult: (result, response) => response && [200, 403].includes(response.status),
          expectedProps: []
        }
      },
      {
        groupNumber: TEST_GROUPS.ADDITIONAL,
        testNumber: 8,
        fullId: "10-8",
        name: 'Get Workflow Schemes',
        description: 'Получить схемы рабочих процессов',
        mcpTool: null, // нет MCP инструмента
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/workflowscheme'
        },
        validation: {
          checkContent: (content) => content && content.includes('scheme'),
          checkResult: (result, response) => response && [200, 403].includes(response.status),
          expectedProps: []
        }
      }
    ];
  }

  /**
   * Получить каскадные тест-кейсы (сложные операции)
   */
  getCascadeTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 1,
        fullId: "12-1",
        name: 'Complete Issue Modification Workflow',
        description: 'Полный цикл работы с задачей: создание, модификация, добавление комментария, worklog, cleanup',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Issue', storeAs: 'issueKey' },
          { action: 'modify', testCase: 'Update Issue', useResource: 'issueKey' },
          { action: 'add', testCase: 'Add Comment', useResource: 'issueKey' },
          { action: 'add', testCase: 'Add Worklog', useResource: 'issueKey' },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'issueKey' }
        ]
      },
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 2,
        fullId: "12-2",
        name: 'Version Management Workflow',
        description: 'Создание, обновление и получение версии проекта',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Version', storeAs: 'versionId' },
          { action: 'modify', testCase: 'Update Version', useResource: 'versionId' },
          { action: 'get', testCase: 'Get Version', useResource: 'versionId' },
          { action: 'cleanup', testCase: 'Delete Version', useResource: 'versionId' }
        ]
      },
      {
        groupNumber: TEST_GROUPS.CASCADE,
        testNumber: 3,
        fullId: "12-3",
        name: 'Issue Linking Workflow',
        description: 'Создание двух задач и связывание их между собой',
        type: 'cascade',
        steps: [
          { action: 'create', testCase: 'Create Issue', storeAs: 'firstIssueKey' },
          { action: 'create', testCase: 'Create Issue', storeAs: 'secondIssueKey' },
          { action: 'link', testCase: 'Create Issue Link', useResources: ['firstIssueKey', 'secondIssueKey'] },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'firstIssueKey' },
          { action: 'cleanup', testCase: 'Delete Issue', useResource: 'secondIssueKey' }
        ]
      }
    ];
  }

  /**
   * Получить расширенные тест-кейсы для полной проверки API
   * Включает дополнительные эндпоинты и более сложные сценарии
   */
  getExtendedTestCases() {
    return [
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 1,
        fullId: "11-1",
        name: 'Get Server Info',
        description: 'Получить информацию о сервере JIRA',
        mcpTool: 'jira_get_server_info',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/serverInfo'
        },
        validation: {
          checkContent: (content) => content && content.includes('version'),
          checkResult: (result) => result && result.version,
          expectedProps: ['version', 'buildNumber']
        }
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 2,
        fullId: "11-2",
        name: 'Get Project Versions',
        description: 'Получить версии проекта',
        mcpTool: 'jira_get_project_versions',
        mcpArgs: {
          projectKey: this.testProjectKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/versions`
        },
        validation: {
          checkContent: (content) => content && (content.includes('versions') || content.includes('Version')),
          checkResult: (result) => result && Array.isArray(result)
        }
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 3,
        fullId: "11-3",
        name: 'Get Project Components',
        description: 'Получить компоненты проекта',
        mcpTool: 'jira_get_project_components',
        mcpArgs: {
          projectKey: this.testProjectKey
        },
        directApi: {
          method: 'GET',
          endpoint: `/project/${this.testProjectKey}/components`
        },
        validation: {
          checkContent: (content) => content && (content.includes('components') || content.includes('Component')),
          checkResult: (result) => result && Array.isArray(result)
        }
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 4,
        fullId: "11-4",
        name: 'Search Users',
        description: 'Поиск пользователей',
        mcpTool: 'jira_search_users',
        mcpArgs: {
          username: this.testUsername
        },
        directApi: {
          method: 'GET',
          endpoint: `/user/search?username=${this.testUsername}`
        },
        validation: {
          checkContent: (content) => content && content.includes(this.testUsername),
          checkResult: (result) => result && Array.isArray(result)
        }
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 5,
        fullId: "11-5",
        name: 'Get Fields',
        description: 'Получить список полей JIRA',
        mcpTool: 'jira_get_fields',
        mcpArgs: {},
        directApi: {
          method: 'GET',
          endpoint: '/field'
        },
        validation: {
          checkContent: (content) => content && (content.includes('fields') || content.includes('Field')),
          checkResult: (result) => result && Array.isArray(result) && result.length > 0
        }
      },
      {
        groupNumber: TEST_GROUPS.EXTENDED,
        testNumber: 6,
        fullId: "11-6",
        name: 'Get Create Meta',
        description: 'Получить метаданные для создания задач',
        mcpTool: 'jira_get_create_meta',
        mcpArgs: {
          projectKeys: [this.testProjectKey]
        },
        directApi: {
          method: 'GET',
          endpoint: '/issue/createmeta'
        },
        validation: {
          checkContent: (content) => content && content.includes('projects'),
          checkResult: (result) => result && result.projects,
          expectedProps: ['projects']
        }
      }
    ];
  }

  /**
   * Получить все доступные тест-кейсы по категориям
   */
  getAllTestCasesByCategory() {
    return {
      system: this.getSystemTestCases(),
      informational: this.getInformationalTestCases(),
      issueDetailed: this.getIssueDetailedTestCases(),
      searchDetailed: this.getSearchDetailedTestCases(),
      projectDetailed: this.getProjectDetailedTestCases(),
      userDetailed: this.getUserDetailedTestCases(),
      metadataDetailed: this.getMetadataDetailedTestCases(),
      modifying: this.getModifyingTestCases(),
      agile: this.getAgileTestCases(),
      additional: this.getAdditionalTestCases(),
      cascade: this.getCascadeTestCases(),
      extended: this.getExtendedTestCases()
    };
  }

  /**
   * Получить все доступные тест-кейсы (старый формат для совместимости)
   */
  getAllTestCases() {
    return {
      informational: this.getInformationalTestCases(),
      modifying: this.getModifyingTestCases(),
      extended: this.getExtendedTestCases()
    };
  }

  /**
   * Получить плоский список всех тест-кейсов
   */
  getAllTestCasesFlat() {
    const allTestCases = this.getAllTestCasesByCategory();
    return [
      ...allTestCases.system,
      ...allTestCases.informational,
      ...allTestCases.issueDetailed,
      ...allTestCases.searchDetailed,
      ...allTestCases.projectDetailed,
      ...allTestCases.userDetailed,
      ...allTestCases.metadataDetailed,
      ...allTestCases.modifying,
      ...allTestCases.agile,
      ...allTestCases.additional,
      // cascade тесты обрабатываются отдельно
      ...allTestCases.extended
    ];
  }

  /**
   * Получить тест-кейсы по именам
   */
  getTestCasesByNames(names) {
    const allTestCases = this.getAllTestCasesFlat();
    return names.map(name =>
      allTestCases.find(tc => tc.name === name)
    ).filter(Boolean);
  }

  /**
   * Получить тест-кейсы для быстрого запуска (минимальный набор)
   */
  getTestCasesForQuickRun() {
    return this.getMinimalTestCases();
  }

  /**
   * Получить тест-кейсы для полного запуска (~62 теста)
   */
  getTestCasesForFullRun() {
    return this.getAllTestCasesFlat();
  }

  /**
   * Получить тест-кейсы по категории
   */
  getTestCasesByCategory(category) {
    const allTestCases = this.getAllTestCasesByCategory();
    return allTestCases[category] || [];
  }

  /**
   * Получить минимальный набор тест-кейсов для быстрой проверки
   */
  getMinimalTestCases() {
    const informational = this.getInformationalTestCases();
    const modifying = this.getModifyingTestCases();

    return [
      informational.find(tc => tc.name === 'Get Issue'),
      informational.find(tc => tc.name === 'Search Issues'),
      informational.find(tc => tc.name === 'Get Projects'),
      informational.find(tc => tc.name === 'Get Issue Transitions'),
      modifying.find(tc => tc.name === 'Create Issue'),
      modifying.find(tc => tc.name === 'Add Comment')
    ].filter(Boolean);
  }

  /**
   * Получить созданные ресурсы для очистки
   */
  getCreatedResources() {
    return this.createdResources;
  }

  /**
   * Очистить созданные ресурсы
   */
  clearCreatedResources() {
    this.createdResources = {
      issues: [],
      versions: [],
      links: []
    };
  }

  // ========== GROUPED TEST MANAGEMENT METHODS ==========

  /**
   * Получить тест по полному ID (формат N-M)
   */
  getTestByFullId(fullId) {
    const allTestCases = this.getAllTestCasesFlat();
    return allTestCases.find(tc => tc.fullId === fullId);
  }

  /**
   * Получить все тесты в группе
   */
  getTestsByGroup(groupNumber) {
    const allTestCases = this.getAllTestCasesFlat();
    return allTestCases.filter(tc => tc.groupNumber === groupNumber);
  }

  /**
   * Получить информацию о группе
   */
  getGroupInfo(groupNumber) {
    return GROUP_INFO[groupNumber] || null;
  }

  /**
   * Получить все группы с их информацией
   */
  getAllGroupInfo() {
    return GROUP_INFO;
  }

  /**
   * Валидировать уникальность ID тестов
   */
  validateTestIds() {
    const allTestCases = this.getAllTestCasesFlat();
    const idCounts = new Map();
    const duplicates = [];

    // Подсчитываем встречаемость каждого ID
    allTestCases.forEach(tc => {
      if (tc.fullId) {
        const count = idCounts.get(tc.fullId) || 0;
        idCounts.set(tc.fullId, count + 1);
        if (count === 1) {
          duplicates.push(tc.fullId);
        }
      }
    });

    // Проверяем также соответствие fullId формату N-M
    const invalidFormats = allTestCases
      .filter(tc => tc.fullId && !/^\d+-\d+$/.test(tc.fullId))
      .map(tc => tc.fullId);

    return {
      isValid: duplicates.length === 0 && invalidFormats.length === 0,
      duplicates,
      invalidFormats,
      totalTests: allTestCases.length,
      testsWithIds: allTestCases.filter(tc => tc.fullId).length
    };
  }

  /**
   * Парсинг команды выбора тестов (формат --tests=1-1,4-*,5)
   */
  parseTestSelection(testsString) {
    if (!testsString) {
      return { includeAll: true, selections: [] };
    }

    const selections = [];
    const parts = testsString.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [groupStr, testStr] = part.split('-', 2);
        const groupNumber = parseInt(groupStr);

        if (isNaN(groupNumber)) {
          throw new Error(`Invalid group number: ${groupStr}`);
        }

        if (testStr === '*') {
          // Вся группа: 4-*
          selections.push({
            type: 'group',
            groupNumber,
            testNumber: null
          });
        } else {
          const testNumber = parseInt(testStr);
          if (isNaN(testNumber)) {
            throw new Error(`Invalid test number: ${testStr}`);
          }
          // Конкретный тест: 1-1
          selections.push({
            type: 'test',
            groupNumber,
            testNumber,
            fullId: `${groupNumber}-${testNumber}`
          });
        }
      } else {
        // Только номер группы: 5 (эквивалентно 5-*)
        const groupNumber = parseInt(part);
        if (isNaN(groupNumber)) {
          throw new Error(`Invalid group number: ${part}`);
        }
        selections.push({
          type: 'group',
          groupNumber,
          testNumber: null
        });
      }
    }

    return {
      includeAll: false,
      selections
    };
  }

  /**
   * Фильтрация тестов на основе выбора пользователя
   */
  getTestsBySelection(testsString) {
    const selection = this.parseTestSelection(testsString);

    if (selection.includeAll) {
      return this.getAllTestCasesFlat();
    }

    const allTestCases = this.getAllTestCasesFlat();
    const selectedTests = [];

    for (const sel of selection.selections) {
      if (sel.type === 'group') {
        // Добавляем все тесты из группы
        const groupTests = allTestCases.filter(tc => tc.groupNumber === sel.groupNumber);
        selectedTests.push(...groupTests);
      } else if (sel.type === 'test') {
        // Добавляем конкретный тест
        const test = allTestCases.find(tc => tc.fullId === sel.fullId);
        if (test) {
          selectedTests.push(test);
        }
      }
    }

    // Удаляем дубликаты по fullId
    const uniqueTests = selectedTests.filter((test, index, arr) =>
      arr.findIndex(t => t.fullId === test.fullId) === index
    );

    return uniqueTests;
  }

  /**
   * Получить статистику по группам
   */
  getGroupStatistics() {
    const allTestCases = this.getAllTestCasesFlat();
    const groupStats = {};

    // Инициализируем статистику для всех групп
    Object.keys(GROUP_INFO).forEach(groupNum => {
      groupStats[groupNum] = {
        groupNumber: parseInt(groupNum),
        groupName: GROUP_INFO[groupNum].name,
        totalTests: 0,
        testsWithMcp: 0,
        testsWithDirectApi: 0
      };
    });

    // Подсчитываем статистику
    allTestCases.forEach(tc => {
      if (tc.groupNumber && groupStats[tc.groupNumber]) {
        groupStats[tc.groupNumber].totalTests++;
        if (tc.mcpTool) {
          groupStats[tc.groupNumber].testsWithMcp++;
        }
        if (tc.directApi) {
          groupStats[tc.groupNumber].testsWithDirectApi++;
        }
      }
    });

    return groupStats;
  }
}

/**
 * Менеджер ресурсов для отслеживания созданных объектов и их очистки
 */
export class ResourceManager {
  constructor() {
    this.resources = {
      issues: [],
      versions: [],
      links: [],
      worklogs: [],
      comments: [],
      remoteLinks: []
    };
    this.resourceMap = new Map(); // для хранения связей между именами и ID
  }

  /**
   * Добавить ресурс для отслеживания
   */
  addResource(type, id, name = null) {
    if (this.resources[type]) {
      this.resources[type].push(id);
      if (name) {
        this.resourceMap.set(name, { type, id });
      }
    }
  }

  /**
   * Получить ресурс по имени
   */
  getResource(name) {
    return this.resourceMap.get(name);
  }

  /**
   * Получить все ресурсы определенного типа
   */
  getResourcesByType(type) {
    return this.resources[type] || [];
  }

  /**
   * Очистить все ресурсы
   */
  clearAll() {
    this.resources = {
      issues: [],
      versions: [],
      links: [],
      worklogs: [],
      comments: [],
      remoteLinks: []
    };
    this.resourceMap.clear();
  }

  /**
   * Получить созданные ресурсы для очистки (совместимость)
   */
  getCreatedResources() {
    return this.resources;
  }
}

/**
 * Утилиты для выполнения каскадных операций
 */
export class CascadeExecutor {
  constructor(resourceManager) {
    this.resourceManager = resourceManager;
    this.executionResults = new Map();
  }

  /**
   * Выполнить каскадную операцию
   */
  async executeCascade(cascadeTestCase, testRunner) {
    const results = [];

    for (const step of cascadeTestCase.steps) {
      try {
        const testCase = this.findTestCase(step.testCase, testRunner);
        if (!testCase) {
          throw new Error(`Test case '${step.testCase}' not found`);
        }

        // Подготовить тест-кейс с подстановкой ресурсов
        const preparedTestCase = this.prepareTestCase(testCase, step);

        // Выполнить тест
        const result = await testRunner.runTestCase(preparedTestCase);

        // Сохранить результат
        if (step.storeAs && result.success && result.data) {
          const resourceId = this.extractResourceId(result.data, step.testCase);
          this.resourceManager.addResource(
            this.getResourceType(step.testCase),
            resourceId,
            step.storeAs
          );
        }

        results.push({
          step: step.action,
          testCase: step.testCase,
          success: result.success,
          result
        });

      } catch (error) {
        results.push({
          step: step.action,
          testCase: step.testCase,
          success: false,
          error: error.message
        });
        break; // прерываем каскад при ошибке
      }
    }

    return {
      name: cascadeTestCase.name,
      type: 'cascade',
      success: results.every(r => r.success),
      steps: results
    };
  }

  /**
   * Найти тест-кейс по имени
   */
  findTestCase(name, testRunner) {
    return testRunner.sharedTestCases.getTestCasesByNames([name])[0];
  }

  /**
   * Подготовить тест-кейс с подстановкой ресурсов
   */
  prepareTestCase(testCase, step) {
    const prepared = JSON.parse(JSON.stringify(testCase)); // deep clone

    if (step.useResource) {
      const resource = this.resourceManager.getResource(step.useResource);
      if (resource) {
        // Заменить плейсхолдеры в endpoint и data
        prepared.directApi.endpoint = prepared.directApi.endpoint
          .replace(`{${step.useResource}}`, resource.id)
          .replace(`{${resource.type}Id}`, resource.id);

        if (prepared.directApi.data) {
          prepared.directApi.data = this.replacePlaceholders(
            prepared.directApi.data,
            step.useResource,
            resource.id
          );
        }
      }
    }

    if (step.useResources) {
      // Для случаев с несколькими ресурсами (например, связывание задач)
      step.useResources.forEach((resourceName, index) => {
        const resource = this.resourceManager.getResource(resourceName);
        if (resource) {
          prepared.directApi.data = this.replacePlaceholders(
            prepared.directApi.data,
            resourceName,
            resource.id
          );
        }
      });
    }

    return prepared;
  }

  /**
   * Заменить плейсхолдеры в объекте данных
   */
  replacePlaceholders(obj, resourceName, resourceId) {
    const jsonStr = JSON.stringify(obj);
    const replaced = jsonStr
      .replace(new RegExp(`{${resourceName}}`, 'g'), resourceId)
      .replace(new RegExp(`{${resourceName}Key}`, 'g'), resourceId);
    return JSON.parse(replaced);
  }

  /**
   * Извлечь ID ресурса из результата
   */
  extractResourceId(data, testCaseName) {
    if (testCaseName.includes('Issue')) {
      return data.key || data.id;
    }
    if (testCaseName.includes('Version')) {
      return data.id;
    }
    if (testCaseName.includes('Comment')) {
      return data.id;
    }
    if (testCaseName.includes('Worklog')) {
      return data.id;
    }
    return data.id || data.key;
  }

  /**
   * Определить тип ресурса по имени тест-кейса
   */
  getResourceType(testCaseName) {
    if (testCaseName.includes('Issue')) return 'issues';
    if (testCaseName.includes('Version')) return 'versions';
    if (testCaseName.includes('Comment')) return 'comments';
    if (testCaseName.includes('Worklog')) return 'worklogs';
    if (testCaseName.includes('Link')) return 'links';
    return 'issues'; // по умолчанию
  }
}

/**
 * Утилиты для валидации результатов тестов
 */
export class TestValidationUtils {
  /**
   * Проверить наличие ожидаемых свойств в объекте
   */
  static validateProperties(obj, expectedProps, testName, arrayElementProps = null) {
    if (!obj || typeof obj !== 'object') {
      return {
        success: false,
        message: `${testName}: Object is null or not an object`
      };
    }

    const missing = expectedProps.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      return {
        success: false,
        message: `${testName}: Missing properties: ${missing.join(', ')}`
      };
    }

    // Проверка свойств элементов массива, если указана
    if (arrayElementProps) {
      const arrayPath = arrayElementProps.path;
      const arrayProps = arrayElementProps.props;

      if (obj[arrayPath] && Array.isArray(obj[arrayPath]) && obj[arrayPath].length > 0) {
        const firstElement = obj[arrayPath][0];
        const missingArrayProps = arrayProps.filter(prop => !(prop in firstElement));

        if (missingArrayProps.length > 0) {
          return {
            success: false,
            message: `${testName}: Missing properties in ${arrayPath}[0]: ${missingArrayProps.join(', ')}`
          };
        }
      }
    }

    return {
      success: true,
      message: `${testName}: All expected properties present`
    };
  }

  /**
   * Проверить MCP ответ на соответствие ожидаемому формату
   */
  static validateMcpResponse(response, testCase) {
    if (response.error) {
      return {
        success: false,
        message: `MCP Error: ${response.error.message || 'Unknown error'}`
      };
    }

    if (!response.result) {
      return {
        success: false,
        message: 'No result in MCP response'
      };
    }

    const content = response.result?.content?.[0]?.text;
    if (!content) {
      return {
        success: false,
        message: 'No content returned from MCP tool'
      };
    }

    if (testCase.validation?.checkContent && !testCase.validation.checkContent(content)) {
      return {
        success: false,
        message: 'Content validation failed'
      };
    }

    return {
      success: true,
      message: 'MCP response validation passed',
      content
    };
  }

  /**
   * Проверить прямой API ответ
   */
  static validateDirectApiResponse(response, testCase) {
    if (!response.success) {
      return {
        success: false,
        message: `API Error: ${response.status} ${response.statusText || response.error}`
      };
    }

    if (testCase.validation?.checkResult && !testCase.validation.checkResult(response.data, response)) {
      return {
        success: false,
        message: 'Result validation failed'
      };
    }

    if (testCase.validation?.expectedProps) {
      const propCheck = this.validateProperties(
        response.data.length ? response.data[0] : response.data,
        testCase.validation.expectedProps,
        testCase.name,
        testCase.validation.arrayElementProps
      );
      if (!propCheck.success) {
        return propCheck;
      }
    }

    return {
      success: true,
      message: 'Direct API response validation passed',
      data: response.data
    };
  }
}

export default SharedJiraTestCases;
