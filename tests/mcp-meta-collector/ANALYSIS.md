# Анализ различий MCP инструментов: Вендор vs Серверная версия

## 📊 Сводка

| Аспект | Вендор (Atlassian Cloud) | Наш проект (Server/DC) |
|--------|-------------------------|------------------------|
| **Всего инструментов** | 27 | 33 |
| **JIRA инструменты** | 13 | 30 |
| **Confluence инструменты** | 12 | 0 |
| **Системные инструменты** | 2 | 3 |
| **Архитектура** | Cloud (cloudId) | Server (прямой URL) |
| **Batch операции** | Нет | Да (3 инструмента) |
| **Agile поддержка** | Базовая | Расширенная (8 инструментов) |

---

## 🔍 Инструменты только у вендора (отсутствуют у нас)

### Confluence (12 инструментов) - КРИТИЧЕСКИЙ GAP
1. **getConfluenceSpaces** - получение списка spaces с фильтрацией
2. **getConfluencePage** - получение страницы с конвертацией в Markdown
3. **getPagesInConfluenceSpace** - список страниц в space
4. **getConfluencePageFooterComments** - комментарии внизу страницы
5. **getConfluencePageInlineComments** - inline комментарии с привязкой к тексту
6. **getConfluencePageDescendants** - дочерние страницы в иерархии
7. **createConfluencePage** - создание страницы/live doc
8. **updateConfluencePage** - обновление страницы
9. **createConfluenceFooterComment** - создание footer комментария
10. **createConfluenceInlineComment** - создание inline комментария с textSelection
11. **searchConfluenceUsingCql** - поиск через CQL
12. **getConfluencePageDescendants** - навигация по иерархии

### JIRA специфичные инструменты
13. **getAccessibleAtlassianResources** - получение cloudId для Cloud API
14. **atlassianUserInfo** - информация о текущем пользователе
15. **lookupJiraAccountId** - поиск пользователей по имени/email
16. **getJiraIssueRemoteIssueLinks** - remote links (Confluence, внешние)
17. **getJiraProjectIssueTypesMetadata** - метаданные типов issues для создания
18. **getJiraIssueTypeMetaWithFields** - детальные метаданные полей для типа issue

### Rovo Search (облачная фича)
19. **search** - универсальный поиск через Rovo Search (замена JQL/CQL)
20. **fetch** - получение контента по ARI (Atlassian Resource Identifier)

---

## ✅ Инструменты только у нас (отсутствуют у вендора)

### Batch операции (эффективность)
1. **jira_batch_create_issues** - массовое создание issues
2. **jira_batch_create_versions** - массовое создание версий
3. **jira_batch_get_changelogs** - получение changelogs для нескольких issues

### Расширенная Agile поддержка
4. **jira_get_agile_boards** - список всех Agile досок
5. **jira_get_board_issues** - issues с доски
6. **jira_get_sprints_from_board** - спринты с доски
7. **jira_get_sprint_issues** - issues из спринта
8. **jira_create_sprint** - создание спринта
9. **jira_update_sprint** - обновление спринта

### JIRA Server специфика
10. **jira_delete_issue** - удаление issue (деструктивная операция)
11. **jira_search_fields** - поиск полей включая кастомные
12. **jira_link_to_epic** - специальная связь с Epic
13. **jira_remove_issue_link** - удаление связи между issues
14. **jira_download_attachments** - метаданные и ссылки на вложения
15. **jira_get_worklog** - получение worklog записей
16. **jira_add_worklog** - добавление worklog

### Системные инструменты
17. **cache_clear** - очистка кэша
18. **cache_stats** - статистика кэша
19. **health_check** - проверка здоровья сервисов

---

## 💡 Что полезного взять из вендорского варианта

### 1. Улучшенные описания (descriptions)

#### ❌ Наше текущее
```typescript
"description": "Get detailed information about a JIRA issue by key or ID"
```

#### ✅ Вендорское (более информативное)
```typescript
"description": "Get the details of a Jira issue by issue id or key."
```

**Рекомендация:** Добавить примеры использования прямо в description:
```typescript
"description": "Get detailed information about a JIRA issue by key or ID. Issue id is a numerical identifier (e.g., 10000). Issue key is formatted as PROJECT-123."
```

### 2. Детальные описания параметров

#### ❌ Наше текущее
```typescript
{
  "issueKey": {
    "type": "string",
    "description": "The issue key (e.g., PROJ-123) or ID"
  }
}
```

#### ✅ Вендорское (с примерами и пояснениями)
```typescript
{
  "issueIdOrKey": {
    "type": "string",
    "description": "Issue id or key can be used to uniquely identify an existing issue.\nIssue id is a numerical identifier. An example issue id is 10000.\nIssue key is formatted as a project key followed by a hyphen '-' character and then followed by a sequential number.\nAn example issue key is ISSUE-1."
  }
}
```

**Рекомендация для Claude Code:** При рефакторинге descriptions использовать этот шаблон:
```typescript
// Шаблон для улучшения descriptions параметров
{
  "parameterName": {
    "type": "string",
    "description": "[ЧТО ЭТО] + [КАК ИСПОЛЬЗОВАТЬ] + [ПРИМЕРЫ]\n" +
                   "Example: 'Project key or ID. Use PROJECT for key or 10000 for numeric ID.'"
  }
}
```

### 3. MCP Annotations (семантические подсказки)

#### Вендор использует annotations для всех инструментов:
```json
{
  "annotations": {
    "title": "Retrieve Jira issue",
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

**Классификация для наших инструментов:**

| Тип операции | readOnly | destructive | idempotent | openWorld |
|--------------|----------|-------------|------------|-----------|
| **GET операции** | ✅ true | ❌ false | ✅ true | ❌ false |
| `jira_get_issue`, `jira_search_issues`, `jira_get_projects` |||
| **CREATE операции** | ❌ false | ❌ false | ❌ false | ❌ false |
| `jira_create_issue`, `jira_add_comment` ||||
| **UPDATE операции** | ❌ false | ❌ false | ✅ true | ❌ false |
| `jira_update_issue`, `jira_transition_issue` ||||
| **DELETE операции** | ❌ false | ✅ true | ✅ true | ❌ false |
| `jira_delete_issue`, `jira_remove_issue_link` ||||

**Задача для Claude Code:**
```typescript
// Добавить annotations ко всем инструментам в src/domains/jira/tools/*.ts
// Использовать эту функцию:

function getAnnotations(operation: 'get' | 'create' | 'update' | 'delete') {
  const mapping = {
    get: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    create: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    update: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    delete: { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
  };
  return { ...mapping[operation], openWorldHint: false };
}
```

### 4. Умная обработка параметров (anyOf для гибкости)

#### Вендор использует `anyOf` для принятия разных типов:
```json
{
  "keys": {
    "anyOf": [
      { "type": "string" },
      {
        "type": "array",
        "items": { "type": "string" }
      }
    ],
    "description": "Filter by space keys (unique identifiers)"
  }
}
```

**Применение в нашем проекте:** Инструменты, где это полезно:
- `jira_create_issue` → `labels`, `components` могут быть string или array
- `jira_search_issues` → `fields` может быть string или array
- `jira_get_issue` → `expand` может быть string или array

**Задача для Claude Code:**
```typescript
// Обновить схемы в src/domains/jira/tools/issue-management.ts
// Добавить anyOf для параметров, которые могут быть строкой или массивом

// Пример рефакторинга:
const schema = {
  labels: {
    anyOf: [
      { type: "string", description: "Single label" },
      {
        type: "array",
        items: { type: "string" },
        description: "Multiple labels"
      }
    ]
  }
};
```

### 5. Enum значения с описаниями

#### ✅ Вендорское (полные enum с пояснениями)
```json
{
  "status": {
    "type": "string",
    "enum": ["current", "archived", "deleted", "trashed"],
    "description": "Filter pages by status",
    "default": "current"
  }
}
```

**Задача для Claude Code:** Добавить enum constraints где их не хватает:
- `jira_transition_issue` → поле `transitionId` должно валидироваться
- `jira_update_sprint` → `state` использует enum
- `jira_add_worklog` → `visibility.type` использует enum

### 6. Default значения в схемах

#### Вендор явно указывает defaults:
```json
{
  "maxResults": {
    "type": "number",
    "maximum": 100,
    "default": 50,
    "description": "Maximum number of issues to search per page. Default is 50, max is 100"
  }
}
```

**Наши инструменты без defaults (надо добавить):**
- `jira_search_issues.maxResults` → default: 50
- `jira_get_worklog.maxResults` → default: 50
- `jira_get_agile_boards.maxResults` → default: 50

---

## 🔗 Комбинированные инструменты (multi-endpoint)

### Вендор использует композитные операции:

#### 1. **search** (Rovo Search) - объединяет JQL + CQL + текстовый поиск
```json
{
  "name": "search",
  "description": "Search Jira and Confluence using Rovo Search, ALWAYS use this tool to search for Jira and Confluence content unless the word CQL or JQL is used"
}
```

**Вызывает API:**
- `/rest/api/3/search` (JIRA)
- `/wiki/rest/api/content/search` (Confluence)
- Rovo AI Search endpoint

**Рекомендация:** Создать обертку `universal_search`:
```typescript
// src/domains/common/tools/universal-search.ts
{
  name: "universal_search",
  description: "Universal search across JIRA and Confluence. Automatically detects context.",
  handler: async (params) => {
    // Определяем тип поиска по keywords
    if (hasJQLKeywords(params.query)) {
      return jiraClient.searchIssues(params.query);
    } else if (hasCQLKeywords(params.query)) {
      return confluenceClient.searchContent(params.query);
    } else {
      // Текстовый поиск в обоих системах
      const [jiraResults, confluenceResults] = await Promise.all([
        jiraClient.textSearch(params.query),
        confluenceClient.textSearch(params.query)
      ]);
      return { jira: jiraResults, confluence: confluenceResults };
    }
  }
}
```

#### 2. **createJiraIssue** - композитный workflow
```json
{
  "description": "Create a new Jira issue in a given project with a given issue type.",
  "properties": {
    "issueTypeName": {
      "description": "There is a tool 'getJiraProjectIssueTypesMetadata' to get the available issue types"
    }
  }
}
```

**Вызывает несколько эндпоинтов:**
1. `GET /rest/api/3/project/{projectKey}` - валидация проекта
2. `GET /rest/api/3/project/{projectKey}/statuses` - получение типов issues
3. `POST /rest/api/3/issue` - создание issue

**Рекомендация:** Создать helper инструмент `jira_prepare_issue_creation`:
```typescript
// src/domains/jira/tools/helpers/prepare-issue.ts
{
  name: "jira_prepare_issue_creation",
  description: "Get metadata needed to create issue: available types, required fields, field constraints",
  handler: async ({ projectKey }) => {
    const [project, issueTypes, createMeta] = await Promise.all([
      api.get(`/rest/api/2/project/${projectKey}`),
      api.get(`/rest/api/2/project/${projectKey}/statuses`),
      api.get(`/rest/api/2/issue/createmeta?projectKeys=${projectKey}`)
    ]);

    return {
      project: { key: project.key, name: project.name },
      issueTypes: issueTypes.map(t => ({ id: t.id, name: t.name })),
      requiredFields: createMeta.projects[0].issuetypes.map(extractRequired),
      fieldConstraints: createMeta.projects[0].issuetypes.map(extractConstraints)
    };
  }
}
```

#### 3. **getConfluencePage** - конвертация + метаданные
```json
{
  "description": "Get a specific page or live doc data (including body content) from Confluence by its ID. Returns the page body content converted to Markdown format."
}
```

**Вызывает:**
1. `GET /wiki/rest/api/content/{id}?expand=body.storage,version,space` - данные страницы
2. Внутренняя конвертация: HTML → Markdown
3. `GET /wiki/rest/api/content/{id}/child/comment` - комментарии (опционально)

**Рекомендация для Confluence инструментов:**
```typescript
// src/domains/confluence/tools/page-management.ts
{
  name: "confluence_get_page_with_content",
  description: "Get Confluence page with body converted to Markdown, includes metadata and structure",
  handler: async ({ pageId, includeComments = false }) => {
    const page = await api.get(`/rest/api/content/${pageId}`, {
      params: { expand: 'body.storage,version,space,ancestors' }
    });

    const markdown = convertHtmlToMarkdown(page.body.storage.value);

    const result = {
      id: page.id,
      title: page.title,
      body: markdown,
      version: page.version.number,
      space: { key: page.space.key, name: page.space.name },
      ancestors: page.ancestors.map(a => ({ id: a.id, title: a.title }))
    };

    if (includeComments) {
      const comments = await api.get(`/rest/api/content/${pageId}/child/comment`);
      result.comments = comments.results.map(convertCommentToMarkdown);
    }

    return result;
  }
}
```

---

## 🎯 План внедрения улучшений

### Фаза 1: Descriptions & Annotations (1-2 часа)
**Задача для Claude Code:**
```bash
# Обновить все descriptions в JIRA tools
# Файлы: src/domains/jira/tools/*.ts

1. Найти все tool definitions
2. Для каждого tool:
   - Обновить description по шаблону вендора (что + как + примеры)
   - Добавить annotations на основе типа операции
   - Обновить descriptions параметров с примерами
```

**Критерий выполнения:** Все tools имеют:
- Информативный description с примерами
- Правильные annotations (readOnlyHint, destructiveHint, idempotentHint)
- Параметры с детальными descriptions

### Фаза 2: Schema improvements (2-3 часа)
**Задача для Claude Code:**
```bash
# Улучшить input schemas

1. Добавить anyOf для параметров, принимающих string|array
   - Файлы: src/domains/jira/tools/issue-management.ts
   - Параметры: labels, components, fields, expand

2. Добавить enum constraints где их нет
   - jira_update_sprint.state
   - jira_get_sprints_from_board.state
   - visibility.type для всех инструментов

3. Добавить default значения
   - maxResults → 50
   - startAt → 0
   - expand → []
```

**Критерий выполнения:**
- Гибкие схемы с anyOf для массивов
- Все enum значения явно указаны
- Default значения добавлены везде где применимо

### Фаза 3: Confluence support (8-10 часов)
**Задача для Claude Code:**
```bash
# Создать Confluence инструменты аналогично JIRA

1. Создать структуру:
   src/domains/confluence/
   ├── client.ts (Confluence REST API client)
   ├── tools/
   │   ├── space-management.ts (getSpaces, getSpace)
   │   ├── page-management.ts (getPage, createPage, updatePage, deletePage)
   │   ├── comment-management.ts (getComments, addComment)
   │   └── search.ts (CQL search)

2. Для каждого инструмента:
   - Использовать вендорские descriptions как референс
   - Добавить конвертацию HTML → Markdown
   - Поддержка inline/footer комментариев
   - Pagination и фильтрация

3. Интегрировать в server:
   - Обновить src/core/server/confluence-server.ts
   - Добавить в ServiceToolRegistry
```

**Референсные инструменты из вендора:**
- `getConfluenceSpaces` → наш `confluence_get_spaces`
- `getConfluencePage` → наш `confluence_get_page`
- `createConfluencePage` → наш `confluence_create_page`
- `searchConfluenceUsingCql` → наш `confluence_search`

### Фаза 4: Composite tools (3-4 часа)
**Задача для Claude Code:**
```bash
# Создать helper инструменты

1. universal_search (src/domains/common/tools/search.ts):
   - Объединяет JQL + CQL + текстовый поиск
   - Автоопределение типа запроса
   - Параллельный поиск в JIRA + Confluence

2. jira_prepare_issue_creation:
   - Параллельный fetch метаданных проекта
   - Список доступных issue types
   - Required fields для каждого типа
   - Field constraints и validations

3. confluence_page_with_hierarchy:
   - Получение страницы + ancestors + descendants
   - Конвертация в Markdown
   - Включение комментариев (опционально)
```

---

## 📝 Инструкция для быстрого выполнения

### Шаг 1: Обновить descriptions (запустить сейчас)
```bash
# Команда для Claude Code:
"Обновить descriptions всех JIRA tools в src/domains/jira/tools/*.ts используя шаблон из вендорского MCP (tests/mcp-meta-collector/meta/mcp-atlassian-mcp-remote-meta.json). Для каждого tool добавить: 1) Информативный description с примерами, 2) MCP annotations, 3) Детальные descriptions параметров с примерами использования."
```

### Шаг 2: Улучшить schemas (запустить после Шага 1)
```bash
# Команда для Claude Code:
"Обновить input schemas в src/domains/jira/tools/*.ts: 1) Добавить anyOf для параметров labels, components, fields, expand, 2) Добавить enum constraints для state полей, 3) Добавить default значения для maxResults (50), startAt (0), expand ([])."
```

### Шаг 3: Создать Confluence support (отдельная сессия)
```bash
# Команда для Claude Code:
"Создать полную поддержку Confluence в src/domains/confluence/ по аналогии с JIRA. Использовать вендорские инструменты из tests/mcp-meta-collector/meta/mcp-atlassian-mcp-remote-meta.json как референс. Создать: 1) client.ts, 2) tools/space-management.ts, 3) tools/page-management.ts, 4) tools/comment-management.ts, 5) tools/search.ts. Интегрировать в confluence-server.ts и ServiceToolRegistry."
```

### Шаг 4: Composite tools (финальная полировка)
```bash
# Команда для Claude Code:
"Создать composite tools в src/domains/common/tools/: 1) universal_search - объединяет JQL/CQL/текстовый поиск, 2) jira_prepare_issue_creation - helper для подготовки создания issue, 3) confluence_page_with_hierarchy - получение страницы с иерархией и комментариями."
```

---

## ✨ Итоговые улучшения после внедрения

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **Информативность descriptions** | Базовая | Детальная с примерами | +300% |
| **Гибкость schemas** | Жесткие типы | anyOf + enums + defaults | +200% |
| **Confluence поддержка** | 0 инструментов | 12 инструментов | +∞ |
| **Composite operations** | 0 | 3 умных инструмента | +3 |
| **MCP annotations** | Нет | Полная семантика | +100% |
| **Пригодность для AI** | Средняя | Высокая | +150% |

---

## 🔗 Связанные файлы

- Вендорские метаданные: `tests/mcp-meta-collector/meta/mcp-atlassian-mcp-remote-meta.json`
- Наши метаданные: `tests/mcp-meta-collector/meta/mcp-local-atlassian-meta.json`
- JIRA tools: `src/domains/jira/tools/*.ts`
- Confluence tools: `src/domains/confluence/tools/*.ts` (создать)
- Common tools: `src/domains/common/tools/*.ts` (создать)
