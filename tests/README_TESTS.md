# Запуск тестов

## Настройка
Проверьте `.env` файл:
- `JIRA_URL` - URL вашего JIRA сервера (https://jira.your-org.com)
- `JIRA_USERNAME` - логин
- `JIRA_PASSWORD` - API токен (не пароль!)
- `TEST_JIRA_PROJECT` - тестовый проект (по умолчанию TEST)


## 1. Тесты прямого API JIRA
```bash
# Запустить все тесты
node tests/endpoints/jira.js

# Выборочные тесты
node tests/endpoints/jira.js --tests=1-1,2-*,9

```

### Параметры:
- `--tests=X-Y` - запуск конкретных тестов (X - группа, Y - номер теста)
- `--tests=X-*` - запуск всех тестов группы X



## 2. Тесты MCP JIRA (через MCP протокол)
```bash
# Запустить все MCP тесты
node tests/mcp/jira.js

# Выборочные тесты
node tests/mcp/jira.js --tests=1-1,2-*,9

# Тесты для инструмента jira_get_issue
node tests/mcp/jira.js --tests=jira_get_issue

# Комбинированные фильтры
node tests/mcp/jira.js --tests=1-1,jira_search_issues,8-*

# Справка по параметрам
node tests/mcp/jira.js --help
```

### Параметры:
- `--tests=X-Y` - запуск конкретных тестов (X - группа, Y - номер теста)
- `--tests=X-*` - запуск всех тестов группы X
- `--tests=toolName` - запуск тестов для конкретного инструмента
- `--help` или `-h` - показать справку

#### Группы тестов MCP JIRA:
1. **Issue Management** (1-1 до 1-9) - управление задачами
2. **Project Management** (2-1 до 2-4) - управление проектами
3. **User Management** (3-1) - управление пользователями
4. **Fields & Metadata** (4-1) - поля и метаданные
5. **Issue Links** (5-1 до 5-4) - связи задач
6. **Worklog** (6-1 до 6-2) - учет времени
7. **Attachments** (7-1) - вложения
8. **Agile/Scrum** (8-1 до 8-6) - Agile инструменты
9. **Bulk Operations** (9-1 до 9-2) - массовые операции
10. **Other** (10-1) - прочие инструменты


==============================================================================

Запуск тестирования:

## Запустить эмулятор
node tests/emulator/jira.js

## Запустить MCP сервер (в отдельном терминале)
JIRA_URL="http://localhost:8080" JIRA_USERNAME="admin" JIRA_PASSWORD="admin" \
MCP_SERVICE="jira" TRANSPORT_TYPE="http" SERVER_PORT="3000" \
node dist/src/index.js

## Запустить тесты (в третьем терминале)
node tests/run-http-tests.js


