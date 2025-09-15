/**
 * Shared JIRA API Test Cases
 * Реализует общие тест-кейсы для проверки JIRA API, которые могут использоваться
 * как для прямого тестирования эмулятора, так и для тестирования MCP сервера
 */

/**
 * Определяет набор тест-кейсов для различных JIRA API эндпоинтов
 * Каждый тест-кейс содержит информацию о том, как вызвать API и как проверить результат
 */
export class SharedJiraTestCases {
  constructor(config = {}) {
    this.testProjectKey = config.testProjectKey || 'TEST';
    this.testUsername = config.testUsername || 'admin';
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
          issueKey: `${this.testProjectKey}-1`,
          expand: ['comment']
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testProjectKey}-1`
        },
        validation: {
          checkContent: (content) => content && content.includes(`${this.testProjectKey}-1`),
          checkResult: (result) => result && result.key === `${this.testProjectKey}-1`,
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
          issueKey: `${this.testProjectKey}-1`
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testProjectKey}-1/transitions`
        },
        validation: {
          checkContent: (content) => content && content.includes('transitions'),
          checkResult: (result) => result && result.transitions && Array.isArray(result.transitions),
          expectedProps: ['id', 'name']
        }
      },
      {
        name: 'Get Issue Comments',
        description: 'Получить комментарии к задаче',
        mcpTool: 'jira_get_comments',
        mcpArgs: {
          issueKey: `${this.testProjectKey}-1`
        },
        directApi: {
          method: 'GET',
          endpoint: `/issue/${this.testProjectKey}-1/comment`
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
          issueType: 'Task',
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
              issuetype: { name: 'Task' }
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
          issueKey: `${this.testProjectKey}-1`,
          body: 'This comment was added by MCP test client'
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testProjectKey}-1/comment`,
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
          issueKey: `${this.testProjectKey}-1`,
          summary: `Updated Test Issue - ${new Date().toISOString()}`,
          description: 'Updated description for MCP testing'
        },
        directApi: {
          method: 'PUT',
          endpoint: `/issue/${this.testProjectKey}-1`,
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
          issueKey: `${this.testProjectKey}-1`,
          timeSpent: '2h',
          comment: 'MCP test worklog entry'
        },
        directApi: {
          method: 'POST',
          endpoint: `/issue/${this.testProjectKey}-1/worklog`,
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
        }
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
   * Получить все доступные тест-кейсы
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
    const allTestCases = this.getAllTestCases();
    return [
      ...allTestCases.informational,
      ...allTestCases.modifying,
      ...allTestCases.extended
    ];
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
 * Утилиты для валидации результатов тестов
 */
export class TestValidationUtils {
  /**
   * Проверить наличие ожидаемых свойств в объекте
   */
  static validateProperties(obj, expectedProps, testName) {
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
        testCase.name
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