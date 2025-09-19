/**
 * Shared JIRA API Test Cases
 * Реализует общие тест-кейсы для проверки JIRA API, которые могут использоваться
 * как для прямого тестирования эмулятора, так и для тестирования MCP сервера
 */

import { appConfig } from '../dist/src/bootstrap/init-config.js';
import { TEST_ISSUE_KEY, TEST_ISSUE_TYPE_NAME, TEST_JIRA_PROJECT } from './constants.js';

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
