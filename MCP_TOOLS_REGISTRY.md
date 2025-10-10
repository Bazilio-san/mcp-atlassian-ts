# Реестр MCP инструментов Atlassian

> Полный список всех реализованных инструментов Model Context Protocol для интеграции с JIRA и Confluence

## Общая статистика

- **Всего инструментов:** 50
- **JIRA инструментов:** 30
- **Confluence инструментов:** 17
- **Утилитарных инструментов:** 3

---

## 📊 JIRA Инструменты (30)

### Управление задачами (8)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_issue` | Получить детальную информацию о задаче по ключу или ID | `GET /rest/api/2/issue/{issueKey}` |
| `jira_search_issues` | Поиск задач с использованием JQL (JIRA Query Language) | `POST /rest/api/2/search` |
| `jira_create_issue` | Создать новую задачу | `POST /rest/api/2/issue` |
| `jira_update_issue` | Обновить существующую задачу | `PUT /rest/api/2/issue/{issueKey}` |
| `jira_delete_issue` | Удалить задачу (с опцией удаления подзадач) | `DELETE /rest/api/2/issue/{issueKey}` |
| `jira_batch_create_issues` | Массовое создание задач (одним запросом) | `POST /rest/api/2/issue/bulk` |
| `jira_add_comment` | Добавить комментарий к задаче | `POST /rest/api/2/issue/{issueKey}/comment` |
| `jira_get_transitions` | Получить доступные переходы статусов для задачи | `GET /rest/api/2/issue/{issueKey}/transitions` |

### Переходы и проекты (2)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_transition_issue` | Перевести задачу в новый статус | `POST /rest/api/2/issue/{issueKey}/transitions` |
| `jira_get_projects` | Получить список всех доступных проектов | `GET /rest/api/2/project` |

### Управление пользователями (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_user_profile` | Получить профиль пользователя по ID или email | `GET /rest/api/2/user` |

### Поля и метаданные (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_search_fields` | Поиск полей JIRA (включая кастомные поля) | `GET /rest/api/2/field` |

### Версии проектов (3)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_project_versions` | Получить все версии проекта | `GET /rest/api/2/project/{projectKey}/versions` |
| `jira_create_version` | Создать новую версию в проекте | `POST /rest/api/2/version` |
| `jira_batch_create_versions` | Массовое создание версий | `POST /rest/api/2/version` (multiple) |

### Связи задач (4)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_link_types` | Получить все типы связей между задачами | `GET /rest/api/2/issueLinkType` |
| `jira_create_issue_link` | Создать связь между двумя задачами | `POST /rest/api/2/issueLink` |
| `jira_create_remote_issue_link` | Создать внешнюю ссылку из задачи на URL | `POST /rest/api/2/issue/{issueKey}/remotelink` |
| `jira_remove_issue_link` | Удалить связь между задачами | `DELETE /rest/api/2/issueLink/{linkId}` |

### Эпики (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_link_to_epic` | Связать задачу с эпиком | `PUT /rest/api/2/issue/{issueKey}` (customfield) |

### Учет времени (2)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_worklog` | Получить записи о затраченном времени по задаче | `GET /rest/api/2/issue/{issueKey}/worklog` |
| `jira_add_worklog` | Добавить запись о затраченном времени | `POST /rest/api/2/issue/{issueKey}/worklog` |

### Вложения (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_download_attachments` | Получить метаданные и ссылки для скачивания вложений | `GET /rest/api/2/issue/{issueKey}` (fields.attachment) |

### Agile/Scrum (7)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `jira_get_agile_boards` | Получить все Agile доски (Scrum/Kanban) | `GET /rest/agile/1.0/board` |
| `jira_get_board_issues` | Получить задачи с Agile доски | `GET /rest/agile/1.0/board/{boardId}/issue` |
| `jira_get_sprints_from_board` | Получить спринты с доски | `GET /rest/agile/1.0/board/{boardId}/sprint` |
| `jira_get_sprint_issues` | Получить задачи из конкретного спринта | `GET /rest/agile/1.0/sprint/{sprintId}/issue` |
| `jira_create_sprint` | Создать новый спринт на доске | `POST /rest/agile/1.0/sprint` |
| `jira_update_sprint` | Обновить существующий спринт | `PUT /rest/agile/1.0/sprint/{sprintId}` |
| `jira_batch_get_changelogs` | Получить историю изменений для нескольких задач (Cloud only) | `POST /rest/api/2/issue/changelog/list` |

---

## 📝 Confluence Инструменты (17)

### Поиск и получение контента (3)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_search` | Поиск контента с использованием CQL (Confluence Query Language) | `GET /wiki/rest/api/search` |
| `confluence_get_page` | Получить детальную информацию о странице по ID | `GET /wiki/rest/api/content/{pageId}` |
| `confluence_get_page_by_title` | Получить страницу по ключу пространства и заголовку | `GET /wiki/rest/api/content` |

### Управление страницами (3)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_create_page` | Создать новую страницу или блог-пост | `POST /wiki/rest/api/content` |
| `confluence_update_page` | Обновить существующую страницу | `PUT /wiki/rest/api/content/{pageId}` |
| `confluence_delete_page` | Удалить страницу (в корзину или навсегда) | `DELETE /wiki/rest/api/content/{pageId}` |

### Управление пространствами (3)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_get_spaces` | Получить все доступные пространства | `GET /wiki/rest/api/space` |
| `confluence_get_space` | Получить детальную информацию о пространстве | `GET /wiki/rest/api/space/{spaceKey}` |
| `confluence_get_space_content` | Получить контент (страницы/блоги) из пространства | `GET /wiki/rest/api/content` |

### Комментарии (2)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_add_comment` | Добавить комментарий к странице | `POST /wiki/rest/api/content` |
| `confluence_get_comments` | Получить комментарии страницы | `GET /wiki/rest/api/content/{contentId}/child/comment` |

### Управление пользователями (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_search_user` | Поиск пользователей по имени или email | `GET /wiki/rest/api/search/user` |

### Управление метками (3)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_add_label` | Добавить метку к странице | `POST /wiki/rest/api/content/{contentId}/label` |
| `confluence_get_labels` | Получить все метки страницы | `GET /wiki/rest/api/content/{contentId}/label` |
| `confluence_get_pages_by_label` | Найти все страницы с определенной меткой | `GET /wiki/rest/api/content/search` |

### Иерархия страниц (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_get_page_children` | Получить дочерние страницы | `GET /wiki/rest/api/content/{pageId}/child/page` |

### История и версии (1)
| Инструмент | Описание | API Endpoint |
|-----------|----------|--------------|
| `confluence_get_page_history` | Получить историю версий страницы | `GET /wiki/rest/api/content/{contentId}/history` |

---

## ⚙️ Утилитарные инструменты (3)

| Инструмент | Описание |
|-----------|----------|
| `cache_clear` | Очистить кэш для принудительного обращения к API (поддерживает паттерны) |
| `cache_stats` | Получить статистику кэша и метрики производительности |
| `health_check` | Проверить здоровье и подключение к сервисам Atlassian |

---

## 🌐 API Версии и эндпоинты

### JIRA REST API
Проект использует следующие версии JIRA REST API:
- **JIRA Core API v2**: `/rest/api/2/*` - основные операции с задачами, проектами, пользователями
- **JIRA Agile API v1.0**: `/rest/agile/1.0/*` - операции с досками, спринтами, backlog

### Confluence REST API
Проект использует Confluence REST API:
- **Confluence REST API**: `/wiki/rest/api/*` - операции со страницами, пространствами, комментариями

### Особенности эндпоинтов

#### JIRA
- **Базовый URL**: `{JIRA_URL}/rest/api/2/`
- **Agile URL**: `{JIRA_URL}/rest/agile/1.0/`
- **Аутентификация**: Basic Auth, PAT, OAuth 2.0
- **Формат данных**: JSON
- **Параметры**: Query params для фильтрации и expand

#### Confluence
- **Базовый URL**: `{CONFLUENCE_URL}/wiki/rest/api/`
- **Аутентификация**: Basic Auth, PAT, OAuth 2.0
- **Формат данных**: JSON
- **Storage Format**: HTML-based format для контента

---

## 🔧 Функциональные категории

### По типу операций:

#### Чтение данных (23)
JIRA: `get_issue`, `search_issues`, `get_transitions`, `get_projects`, `get_user_profile`, `search_fields`, `get_project_versions`, `get_link_types`, `get_worklog`, `download_attachments`, `get_agile_boards`, `get_board_issues`, `get_sprints_from_board`, `get_sprint_issues`, `batch_get_changelogs`

Confluence: `search`, `get_page`, `get_page_by_title`, `get_spaces`, `get_space`, `get_space_content`, `get_labels`, `get_pages_by_label`, `get_page_children`, `get_comments`, `get_page_history`

Utility: `cache_stats`, `health_check`

#### Запись/Создание (11)
JIRA: `create_issue`, `batch_create_issues`, `add_comment`, `create_version`, `batch_create_versions`, `create_issue_link`, `create_remote_issue_link`, `link_to_epic`, `add_worklog`, `create_sprint`

Confluence: `create_page`, `add_comment`, `add_label`

#### Обновление (5)
JIRA: `update_issue`, `transition_issue`, `update_sprint`

Confluence: `update_page`, `search_user`

#### Удаление (4)
JIRA: `delete_issue`, `remove_issue_link`

Confluence: `delete_page`

Utility: `cache_clear`

---

## 🚀 Режимы работы

### Service Mode
Сервер поддерживает режим работы с одним сервисом:

- **JIRA-only** (`MCP_SERVICE=jira`): 30 JIRA инструментов + 3 утилитарных
- **Confluence-only** (`MCP_SERVICE=confluence`): 17 Confluence инструментов + 3 утилитарных
- **Full mode** (default): Все 50 инструментов

### Фильтрация инструментов
Управление списком доступных инструментов осуществляется через файл `config.yaml` в корне проекта:
```yaml
usedInstruments:
  jira:
    # Включить все инструменты
    include: ALL
    # Или только определенные
    # include: [jira_get_issue, jira_search_issues, jira_create_issue]

    # Исключить определенные инструменты (работает с include: ALL)
    exclude: []
    # exclude: [jira_delete_issue, jira_batch_create_issues]

  confluence:
    # Включить все инструменты
    include: ALL
    # Или только определенные
    # include: [confluence_get_page, confluence_search, confluence_create_page]

    # Исключить определенные инструменты
    exclude: []
    # exclude: [confluence_delete_page, confluence_update_page]
```

**Возможности конфигурации:**
- `include: ALL` - включить все инструменты сервиса (по умолчанию)
- `include: [tool1, tool2]` - включить только указанные инструменты
- `exclude: [tool3, tool4]` - исключить определенные инструменты (работает только с `include: ALL`)
- Утилитарные инструменты (`cache_clear`, `health_check`, `cache_stats`) всегда доступны

---

## 📋 Примеры использования

### JIRA MCP Tools
```javascript
// Поиск задач
jira_search_issues({ jql: "project = PROJ AND status = Open" })
// → POST /rest/api/2/search

// Создание задачи
jira_create_issue({
  project: "PROJ",
  issueType: "Task",
  summary: "New task"
})
// → POST /rest/api/2/issue

// Получение спринтов
jira_get_sprints_from_board({ boardId: "123", state: "active" })
// → GET /rest/agile/1.0/board/123/sprint
```

### Confluence MCP Tools
```javascript
// Поиск контента
confluence_search({ cql: "space = SPACE AND type = page" })
// → GET /wiki/rest/api/search

// Создание страницы
confluence_create_page({
  spaceKey: "SPACE",
  title: "New Page",
  body: "Content"
})
// → POST /wiki/rest/api/content

// Получение меток
confluence_get_labels({ pageId: "123456" })
// → GET /wiki/rest/api/content/123456/label
```

### Утилиты
```javascript
// Очистка кэша
cache_clear({ pattern: "jira_*" })

// Проверка здоровья
health_check({ detailed: true })
```

### Прямые HTTP запросы (для справки)

#### JIRA
```bash
# Получить задачу
curl -X GET "{JIRA_URL}/rest/api/2/issue/PROJ-123" \
  -H "Authorization: Basic {base64_credentials}"

# Поиск задач
curl -X POST "{JIRA_URL}/rest/api/2/search" \
  -H "Content-Type: application/json" \
  -d '{"jql": "project = PROJ", "maxResults": 50}'

# Получить спринты доски
curl -X GET "{JIRA_URL}/rest/agile/1.0/board/123/sprint" \
  -H "Authorization: Bearer {token}"
```

#### Confluence
```bash
# Получить страницу
curl -X GET "{CONFLUENCE_URL}/wiki/rest/api/content/123456?expand=body.storage,version" \
  -H "Authorization: Basic {base64_credentials}"

# Поиск контента
curl -X GET "{CONFLUENCE_URL}/wiki/rest/api/search?cql=space=SPACE" \
  -H "Authorization: Bearer {token}"

# Создать страницу
curl -X POST "{CONFLUENCE_URL}/wiki/rest/api/content" \
  -H "Content-Type: application/json" \
  -d '{"type":"page","title":"New Page","space":{"key":"SPACE"},"body":{"storage":{"value":"<p>Content</p>","representation":"storage"}}}'
```

---

## 🔗 Связанные файлы

- **Реализация JIRA**: `src/domains/jira/tools.ts`
- **Реализация Confluence**: `src/domains/confluence/tools.ts`
- **Реестр инструментов**: `src/core/server/tools.ts`
- **Клиенты**: `src/domains/{jira,confluence}/client.ts`
- **Типы**: `src/types/index.ts`

---

## 📊 Архитектура

```
ToolRegistry (tools.ts)
├── JiraToolsManager (30 tools)
│   ├── Issue Management (8)
│   ├── Projects & Users (3)
│   ├── Versions (3)
│   ├── Links & Epics (5)
│   ├── Worklog (2)
│   ├── Attachments (1)
│   └── Agile/Scrum (7)
│
├── ConfluenceToolsManager (17 tools)
│   ├── Content (6)
│   ├── Spaces (3)
│   ├── Comments (2)
│   ├── Users (1)
│   ├── Labels (3)
│   ├── Hierarchy (1)
│   └── History (1)
│
└── Utility Tools (3 tools)
    ├── cache_clear
    ├── cache_stats
    └── health_check
```

---

## ⚠️ Особенности

### Cloud-только инструменты
- `jira_batch_get_changelogs` - работает только в JIRA Cloud

### Экспериментальные возможности
- **Custom headers**: Все инструменты поддерживают кастомные HTTP заголовки
- **Field expansion**: Гибкая настройка расширения полей через параметр `expand`
- **Batch operations**: Массовые операции для оптимизации производительности

### Кэширование
- Автоматическое кэширование GET-запросов
- TTL (Time To Live) настраивается через `CACHE_TTL_SECONDS`
- Селективная очистка кэша по паттернам

---

## 🔍 Быстрый поиск по эндпоинтам

### JIRA REST API v2 (`/rest/api/2/*`)

| HTTP Method | Endpoint | Инструмент | Назначение |
|-------------|----------|------------|-----------|
| GET | `/issue/{key}` | `jira_get_issue` | Получение задачи |
| POST | `/search` | `jira_search_issues` | Поиск по JQL |
| POST | `/issue` | `jira_create_issue` | Создание задачи |
| PUT | `/issue/{key}` | `jira_update_issue` | Обновление задачи |
| DELETE | `/issue/{key}` | `jira_delete_issue` | Удаление задачи |
| POST | `/issue/bulk` | `jira_batch_create_issues` | Массовое создание |
| POST | `/issue/{key}/comment` | `jira_add_comment` | Добавление комментария |
| GET | `/issue/{key}/transitions` | `jira_get_transitions` | Получение переходов |
| POST | `/issue/{key}/transitions` | `jira_transition_issue` | Смена статуса |
| GET | `/issue/{key}/worklog` | `jira_get_worklog` | Получение worklog |
| POST | `/issue/{key}/worklog` | `jira_add_worklog` | Добавление worklog |
| GET | `/project` | `jira_get_projects` | Список проектов |
| GET | `/user` | `jira_get_user_profile` | Профиль пользователя |
| GET | `/field` | `jira_search_fields` | Поиск полей |
| GET | `/project/{key}/versions` | `jira_get_project_versions` | Версии проекта |
| POST | `/version` | `jira_create_version` | Создание версии |
| GET | `/issueLinkType` | `jira_get_link_types` | Типы связей |
| POST | `/issueLink` | `jira_create_issue_link` | Создание связи |
| DELETE | `/issueLink/{id}` | `jira_remove_issue_link` | Удаление связи |
| POST | `/issue/{key}/remotelink` | `jira_create_remote_issue_link` | Внешняя ссылка |
| POST | `/issue/changelog/list` | `jira_batch_get_changelogs` | История изменений |

### JIRA Agile API v1.0 (`/rest/agile/1.0/*`)

| HTTP Method | Endpoint | Инструмент | Назначение |
|-------------|----------|------------|-----------|
| GET | `/board` | `jira_get_agile_boards` | Список досок |
| GET | `/board/{id}/issue` | `jira_get_board_issues` | Задачи доски |
| GET | `/board/{id}/sprint` | `jira_get_sprints_from_board` | Спринты доски |
| GET | `/sprint/{id}/issue` | `jira_get_sprint_issues` | Задачи спринта |
| POST | `/sprint` | `jira_create_sprint` | Создание спринта |
| PUT | `/sprint/{id}` | `jira_update_sprint` | Обновление спринта |

### Confluence REST API (`/wiki/rest/api/*`)

| HTTP Method | Endpoint | Инструмент | Назначение |
|-------------|----------|------------|-----------|
| GET | `/search` | `confluence_search` | Поиск по CQL |
| GET | `/content/{id}` | `confluence_get_page` | Получение страницы |
| GET | `/content` | `confluence_get_page_by_title` | Поиск по заголовку |
| POST | `/content` | `confluence_create_page` | Создание страницы |
| PUT | `/content/{id}` | `confluence_update_page` | Обновление страницы |
| DELETE | `/content/{id}` | `confluence_delete_page` | Удаление страницы |
| GET | `/space` | `confluence_get_spaces` | Список пространств |
| GET | `/space/{key}` | `confluence_get_space` | Получение пространства |
| GET | `/content/{id}/child/comment` | `confluence_get_comments` | Комментарии |
| POST | `/content/{id}/label` | `confluence_add_label` | Добавление метки |
| GET | `/content/{id}/label` | `confluence_get_labels` | Получение меток |
| GET | `/content/search` | `confluence_get_pages_by_label` | Поиск по метке |
| GET | `/content/{id}/child/page` | `confluence_get_page_children` | Дочерние страницы |
| GET | `/content/{id}/history` | `confluence_get_page_history` | История версий |
| GET | `/search/user` | `confluence_search_user` | Поиск пользователей |

---

## 📚 Дополнительные ресурсы

### Официальная документация
- [JIRA REST API v2](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)
- [JIRA Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/)
- [Confluence REST API](https://developer.atlassian.com/cloud/confluence/rest/v1/)

### Model Context Protocol
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)

---

**Последнее обновление:** 2025-10-06
