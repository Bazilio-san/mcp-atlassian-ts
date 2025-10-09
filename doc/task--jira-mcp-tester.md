# Task: JIRA MCP HTTP Tester Implementation

## Задача
Добейся работоспособности при запуске MCP сервера по транспорту HTTP в режиме JIRA.
Напиши тестер ВСЕХ инструментов MCP сервера JIRA в виде внешнего MCP клиента в файле `tests/jira-mcp-http-tester.js`.

## Цели
1. **Полная работоспособность HTTP транспорта** для MCP сервера в режиме JIRA
2. **Тестирование всех JIRA MCP инструментов** через внешний HTTP клиент
3. **Проверка передачи кастомных HTTP заголовков** (X-*) от клиента до эмулятора
4. **Логирование результатов** каждого теста в отдельные файлы `JIRA_<имя_инструмента>.md`

## Анализ текущей архитектуры

### MCP Server Structure
```
src/
├── core/server/
│   ├── index.ts           # McpAtlassianServer с HTTP транспортом
│   ├── jira-server.ts     # JIRA-specific server
│   └── tools.ts           # ToolRegistry
├── domains/jira/
│   ├── client.ts          # JiraClient для API вызовов
│   └── tools.ts           # JiraToolsManager с ~30 инструментами
└── types/
    ├── jira.ts           # JIRA типы
    └── config.d.ts       # Конфигурация
```

### Existing Test Infrastructure
- **JIRA Emulator**: `tests/jira-emulator.js` (порт 8080)
- **Test Framework**: Готовая инфраструктура в `tests/core/`
- **API Coverage**: 62/62 JIRA endpoints протестированы в `tests/endpoints/jira.js`

## Детальный план реализации

### Phase 1: HTTP Transport Validation
**Цель**: Убедиться что MCP сервер корректно работает по HTTP

#### 1.1 Проверка HTTP сервера
- [ ] Запустить MCP сервер с `TRANSPORT_TYPE=http`
- [ ] Проверить доступность health endpoint `/health`
- [ ] Проверить MCP endpoints: `/`, `/sse`, `/ws`
- [ ] Валидация конфигурации JIRA через переменные окружения

#### 1.2 MCP Protocol over HTTP
- [ ] Реализация HTTP клиента для MCP протокола
- [ ] Тестирование базовых MCP операций:
  - `list_tools` - получение списка всех инструментов
  - `call_tool` - вызов конкретного инструмента
  - `list_resources` - получение списка ресурсов
  - `ping` - проверка соединения

### Phase 2: JIRA Tools Discovery
**Цель**: Получить полный список JIRA MCP инструментов

#### 2.1 Извлечение списка инструментов
- [ ] Анализ `src/domains/jira/tools.ts` для получения всех tool names
- [ ] Создание mapping: tool name → description → parameters
- [ ] Категоризация инструментов по функциональности:
  - Issue Management (get/create/update/delete/search issues)
  - Project Management (projects, versions, components)
  - Agile/Scrum (boards, sprints)
  - User Management (users, assignable users)
  - Comments & Attachments
  - Time Tracking (worklogs)
  - Metadata (priorities, statuses, types, fields)

#### 2.2 Test Data Preparation
- [ ] Подготовка test cases для каждого инструмента
- [ ] Использование данных из JIRA эмулятора (TEST project, TEST-1/TEST-2 issues)
- [ ] Подготовка граничных случаев и негативных тестов

### Phase 3: HTTP MCP Client Implementation
**Цель**: Создать `tests/jira-mcp-http-tester.js`

#### 3.1 Core MCP HTTP Client
```javascript
class McpHttpClient {
  constructor(baseUrl, customHeaders = {}) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders; // Для X-* заголовков
  }

  async listTools() {
    // HTTP POST to /mcp/list_tools
  }

  async callTool(toolName, parameters) {
    // HTTP POST to /mcp/call_tool
    // Include custom X-* headers
  }

  async listResources() {
    // HTTP POST to /mcp/list_resources
  }

  async ping() {
    // HTTP POST to /mcp/ping
  }
}
```

#### 3.2 Test Framework Integration
- [ ] Интеграция с существующей test infrastructure:
  - `tests/core/test-reporter.js` для отчетов
  - `tests/core/validation-engine.js` для валидации
  - `tests/core/response-logger/api-response-logger.js` для логирования
- [ ] Создание специализированного MCP test runner

#### 3.3 Custom Headers Testing
- [ ] Добавление X-Test-Header для трассировки запросов
- [ ] Проверка что заголовок передается:
  - MCP Client → MCP Server → JIRA Client → JIRA Emulator
- [ ] Логирование заголовков на каждом уровне

### Phase 4: Comprehensive Tool Testing
**Цель**: Тестирование ВСЕХ JIRA MCP инструментов

#### 4.1 Test Categories Implementation

**Issue Management Tools** (~10 tools):
- `jira_get_issue` - получение issue по key/ID
- `jira_create_issue` - создание нового issue
- `jira_update_issue` - обновление полей issue
- `jira_delete_issue` - удаление issue
- `jira_search_issues` - поиск issues по JQL
- `jira_get_issue_transitions` - получение доступных переходов
- `jira_transition_issue` - выполнение перехода статуса
- `jira_get_issue_changelog` - история изменений
- `jira_bulk_create_issues` - массовое создание

**Project Management Tools** (~8 tools):
- `jira_get_project` - информация о проекте
- `jira_list_projects` - список проектов
- `jira_get_project_statuses` - статусы по проектам
- `jira_get_project_versions` - версии проекта
- `jira_create_version` - создание версии
- `jira_update_version` - обновление версии
- `jira_delete_version` - удаление версии
- `jira_get_project_components` - компоненты проекта

**Comments & Attachments** (~6 tools):
- `jira_get_issue_comments` - комментарии issue
- `jira_add_comment` - добавление комментария
- `jira_update_comment` - обновление комментария
- `jira_delete_comment` - удаление комментария
- `jira_create_attachment` - создание вложения
- `jira_delete_attachment` - удаление вложения

**Time Tracking** (~4 tools):
- `jira_get_issue_worklogs` - worklogs issue
- `jira_add_worklog` - добавление worklog
- `jira_update_worklog` - обновление worklog
- `jira_delete_worklog` - удаление worklog

**Agile/Scrum** (~3 tools):
- `jira_get_boards` - Agile boards
- `jira_get_board_sprints` - спринты board
- `jira_get_sprint_issues` - issues спринта

**User & Metadata** (~6 tools):
- `jira_get_current_user` - текущий пользователь
- `jira_search_users` - поиск пользователей
- `jira_get_assignable_users` - назначаемые пользователи
- `jira_get_priorities` - приоритеты
- `jira_get_statuses` - статусы
- `jira_get_issue_types` - типы issues
- `jira_get_fields` - поля

#### 4.2 Test Implementation Pattern
Для каждого инструмента:
```javascript
async function testTool(toolName, testCases) {
  const results = [];

  for (const testCase of testCases) {
    try {
      // 1. Call MCP tool via HTTP
      const response = await mcpClient.callTool(toolName, testCase.params);

      // 2. Validate response
      const validation = validateResponse(response, testCase.expected);

      // 3. Check custom headers propagation
      const headerCheck = await checkHeaderPropagation(testCase.customHeaders);

      // 4. Log results
      const result = {
        toolName,
        testCase: testCase.name,
        parameters: testCase.params,
        response: response,
        validation: validation,
        headerCheck: headerCheck,
        timestamp: new Date().toISOString()
      };

      results.push(result);

      // 5. Log to individual file
      await logToFile(`JIRA_${toolName}.md`, result);

    } catch (error) {
      // Handle and log errors
    }
  }

  return results;
}
```

### Phase 5: Test Execution & Validation
**Цель**: Запуск полного тестирования и верификация результатов

#### 5.1 Test Orchestration
- [ ] Последовательность запуска:
  1. Запуск JIRA эмулятора (порт 8080)
  2. Запуск MCP сервера HTTP (порт 3000)
  3. Выполнение всех тестов
  4. Генерация отчетов

#### 5.2 Result Logging & Reporting
- [ ] Создание индивидуальных файлов `JIRA_<tool_name>.md` с:
  - Имя MCP инструмента
  - JSON параметров вызова
  - Полный ответ инструмента
  - Результат валидации
  - Статус проверки заголовков
  - Timestamp и execution time

#### 5.3 Validation Criteria
- [ ] **Функциональность**: Все инструменты возвращают корректные ответы
- [ ] **HTTP заголовки**: X-* заголовки проходят до эмулятора
- [ ] **Error handling**: Корректная обработка ошибок
- [ ] **Performance**: Acceptable response times

### Phase 6: Issues Resolution
**Цель**: Решение найденных проблем

#### 6.1 Common Issues Expected
- HTTP transport configuration issues
- MCP protocol over HTTP parsing problems
- Authentication flow for HTTP requests
- Header propagation issues
- Tool parameter validation issues

#### 6.2 Debug & Fix Strategy
- [ ] Детальное логирование на каждом уровне:
  - MCP Client HTTP requests
  - MCP Server request processing
  - JIRA Client API calls
  - JIRA Emulator request handling
- [ ] Step-by-step debugging при ошибках
- [ ] Итеративное исправление и повторное тестирование

## Файловая структура результатов

```
tests/
├── jira-mcp-http-tester.js     # Основной тестер (НОВЫЙ)
├── jira-emulator.js            # Существующий эмулятор
└── results/                    # Папка результатов (НОВАЯ)
    ├── JIRA_jira_get_issue.md
    ├── JIRA_jira_create_issue.md
    ├── JIRA_jira_search_issues.md
    ├── ...
    └── test_summary.md          # Общий отчет
```

## Критерии успеха

### Обязательные требования
1. ✅ **HTTP Transport**: MCP сервер работает по HTTP без ошибок
2. ✅ **All Tools Tested**: Все ~30 JIRA инструментов протестированы
3. ✅ **Header Propagation**: X-* заголовки доходят до эмулятора
4. ✅ **Detailed Logging**: Каждый тест логируется в отдельный .md файл
5. ✅ **100% Success Rate**: Все тесты проходят успешно

### Дополнительные критерии качества
- Comprehensive error handling и graceful degradation

