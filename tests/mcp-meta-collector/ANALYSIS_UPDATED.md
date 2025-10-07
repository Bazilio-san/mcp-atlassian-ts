# Обновленный анализ различий MCP инструментов (на основе реального кода)

## 📊 Точная сводка

| Аспект | Вендор (Atlassian Cloud) | Наш проект (Server/DC) |
|--------|-------------------------|------------------------|
| **Всего инструментов** | 27 | 47 |
| **JIRA инструменты** | 13 | 30 |
| **Confluence инструменты** | 12 | 17 |
| **Универсальные** | 2 (search, fetch) | 0 |
| **Архитектура** | Cloud (cloudId, Rovo) | Server (прямой URL) |
| **Batch операции** | Нет | Да (3 инструмента) |
| **Agile поддержка** | Нет | Расширенная (8 инструментов) |

---

## 🔍 Детальное сравнение JIRA инструментов

### ✅ У НАС ЕСТЬ, у вендора НЕТ (17 уникальных)

#### Batch операции
1. ✅ **jira_batch_create_issues** - массовое создание (нет у вендора)
2. ✅ **jira_batch_create_versions** - массовое создание версий (нет у вендора)
3. ✅ **jira_batch_get_changelogs** - changelogs для нескольких issues

#### Agile/Scrum полная поддержка
4. ✅ **jira_get_agile_boards** - список Agile досок
5. ✅ **jira_get_board_issues** - issues с доски
6. ✅ **jira_get_sprints_from_board** - спринты с доски
7. ✅ **jira_get_sprint_issues** - issues из спринта
8. ✅ **jira_create_sprint** - создание спринта
9. ✅ **jira_update_sprint** - обновление спринта

#### Расширенные возможности
10. ✅ **jira_get_transitions** - получение доступных переходов
11. ✅ **jira_transition_issue** - выполнение перехода
12. ✅ **jira_search_fields** - поиск полей включая кастомные
13. ✅ **jira_get_project_versions** - версии проекта
14. ✅ **jira_create_version** - создание версии
15. ✅ **jira_get_link_types** - типы связей issues
16. ✅ **jira_remove_issue_link** - удаление связи
17. ✅ **jira_link_to_epic** - специальная связь с Epic

#### Worklog
18. ✅ **jira_get_worklog** - получение worklog записей
19. ✅ **jira_add_worklog** - добавление worklog

#### Attachments
20. ✅ **jira_download_attachments** - метаданные и ссылки на вложения

### ❌ У ВЕНДОРА ЕСТЬ, у нас НЕТ (6 специфичных)

#### Cloud-специфичные метаданные
1. ❌ **getAccessibleAtlassianResources** - получение cloudId (Cloud API)
2. ❌ **atlassianUserInfo** - информация о текущем пользователе Cloud
3. ❌ **lookupJiraAccountId** - поиск accountId по имени/email

#### Расширенные метаданные для создания
4. ❌ **getJiraProjectIssueTypesMetadata** - метаданные типов issues
5. ❌ **getJiraIssueTypeMetaWithFields** - детальные поля для типа issue

#### Remote links
6. ❌ **getJiraIssueRemoteIssueLinks** - получение remote links

#### Attachments (расширенное)
7. ❌ **addJiraAttachmentToIssue** - загрузка вложения (у нас только download)

### ⚖️ Общие инструменты (разные реализации)

| Наш инструмент | Вендорский | Различия |
|---------------|------------|----------|
| `jira_get_issue` | `getJiraIssue` | ✅ Одинаковые |
| `jira_search_issues` | `searchJiraUsingJql` | ✅ Одинаковые |
| `jira_create_issue` | `createJiraIssue` | У вендора - композитный (вызывает метаданные) |
| `jira_update_issue` | `updateJiraIssue` | ✅ Одинаковые |
| `jira_delete_issue` | `deleteJiraIssue` | ✅ Одинаковые |
| `jira_add_comment` | `addJiraComment` | ✅ Одинаковые |
| `jira_create_issue_link` | `linkTwoJiraIssues` | ✅ Одинаковые |
| `jira_get_projects` | Нет | У нас есть |
| `jira_get_user_profile` | Частично (`atlassianUserInfo`) | У нас - любой user, у вендора - только текущий |
| `jira_create_remote_issue_link` | Частично (`getJiraIssueRemoteIssueLinks`) | У нас - создание, у вендора - только чтение |

---

## 🔍 Детальное сравнение Confluence инструментов

### ✅ У НАС ЕСТЬ, у вендора НЕТ (5 уникальных)

1. ✅ **confluence_get_page_by_title** - поиск страницы по названию + space
2. ✅ **confluence_search_user** - поиск пользователей
3. ✅ **confluence_get_labels** - получение labels страницы
4. ✅ **confluence_get_pages_by_label** - поиск страниц по label
5. ✅ **confluence_delete_page** - удаление страницы

### ❌ У ВЕНДОРА ЕСТЬ, у нас НЕТ (2 специфичных)

#### Inline комментарии (Cloud feature)
1. ❌ **getConfluencePageInlineComments** - inline комментарии с textSelection
2. ❌ **createConfluenceInlineComment** - создание inline комментария

### ⚖️ Общие инструменты (разные реализации)

| Наш инструмент | Вендорский | Различия |
|---------------|------------|----------|
| `confluence_search` | `searchConfluenceUsingCql` | ✅ Одинаковые (CQL) |
| `confluence_get_page` | `getConfluencePage` | У вендора - с конвертацией в Markdown |
| `confluence_get_spaces` | `getConfluenceSpaces` | ✅ Одинаковые |
| `confluence_get_space_content` | `getPagesInConfluenceSpace` | ✅ Одинаковые |
| `confluence_create_page` | `createConfluencePage` | ✅ Одинаковые |
| `confluence_update_page` | `updateConfluencePage` | ✅ Одинаковые |
| `confluence_add_comment` | `createConfluenceFooterComment` | У вендора - разделение на footer/inline |
| `confluence_get_comments` | `getConfluencePageFooterComments` | У нас - universal (footer+inline), у вендора - раздельно |
| `confluence_get_page_children` | `getConfluencePageDescendants` | ✅ Одинаковые (иерархия) |
| `confluence_add_label` | Нет у вендора | ✅ Есть у нас |
| `confluence_get_page_history` | Нет у вендора | ✅ Есть у нас |
| `confluence_get_space` | Частично в `getConfluenceSpaces` | У нас - детальная инфо по space |

---

## 💡 Что улучшить в нашем коде (на основе вендорских примеров)

### 1. MCP Annotations - КРИТИЧНО

**Вендор добавляет ко всем инструментам:**
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

**Наш код НЕ имеет annotations. Задача:**
```typescript
// Добавить в src/domains/jira/tools.ts и src/domains/confluence/tools.ts

// Пример для GET операций
{
  name: 'jira_get_issue',
  description: '...',
  inputSchema: { ... },
  annotations: {
    title: 'Retrieve JIRA issue',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
}

// Пример для DELETE операций
{
  name: 'jira_delete_issue',
  description: '...',
  inputSchema: { ... },
  annotations: {
    title: 'Delete JIRA issue permanently',
    readOnlyHint: false,
    destructiveHint: true,  // ВАЖНО!
    idempotentHint: true,
    openWorldHint: false
  }
}
```

**Матрица annotations для наших инструментов:**

| Операция | readOnly | destructive | idempotent | Инструменты |
|----------|----------|-------------|------------|-------------|
| **GET** | ✅ true | ❌ false | ✅ true | get_issue, search_issues, get_projects, get_worklog |
| **CREATE** | ❌ false | ❌ false | ❌ false | create_issue, add_comment, create_page |
| **UPDATE** | ❌ false | ❌ false | ✅ true | update_issue, transition_issue, update_page |
| **DELETE** | ❌ false | ✅ true | ✅ true | delete_issue, remove_issue_link, delete_page |

### 2. Улучшенные Descriptions с примерами

**❌ Наше текущее:**
```typescript
{
  issueKey: {
    type: 'string',
    description: 'The issue key (e.g., PROJ-123) or ID',
  }
}
```

**✅ Вендорское (детальное):**
```typescript
{
  issueIdOrKey: {
    type: 'string',
    description: 'Issue id or key can be used to uniquely identify an existing issue.\n' +
                 'Issue id is a numerical identifier. An example issue id is 10000.\n' +
                 'Issue key is formatted as a project key followed by a hyphen \'-\' character ' +
                 'and then followed by a sequential number.\n' +
                 'An example issue key is ISSUE-1.'
  }
}
```

**Задача для Claude Code:**
```bash
# Обновить descriptions параметров во всех инструментах
# Шаблон: [ЧТО ЭТО] + [ФОРМАТ] + [ПРИМЕРЫ]

# Примеры обновлений:
issueKey → "Issue key or ID. Key format: PROJECT-123. ID format: numeric (e.g., 10000)"
jql → "JQL query string. Example: 'project = PROJ AND status = Open'\nLearn more: https://confluence.atlassian.com/jiracoreserver/advanced-searching-939937694.html"
pageId → "Confluence page ID. Numeric identifier (e.g., 123456) found in page URL"
spaceKey → "Confluence space key. Uppercase identifier (e.g., PROJ, TEAM)"
```

### 3. anyOf для гибких параметров

**Вендор использует anyOf:**
```json
{
  "keys": {
    "anyOf": [
      { "type": "string" },
      { "type": "array", "items": { "type": "string" } }
    ],
    "description": "Filter by space keys. Single key or array of keys"
  }
}
```

**Наши параметры требующие anyOf:**

```typescript
// src/domains/jira/tools.ts
{
  name: 'jira_create_issue',
  inputSchema: {
    properties: {
      labels: {
        anyOf: [
          { type: 'string', description: 'Single label' },
          { type: 'array', items: { type: 'string' }, description: 'Multiple labels' }
        ]
      },
      components: {
        anyOf: [
          { type: 'string', description: 'Single component name' },
          { type: 'array', items: { type: 'string' }, description: 'Multiple component names' }
        ]
      }
    }
  }
}

// src/domains/jira/tools.ts & confluence/tools.ts
{
  expand: {
    anyOf: [
      { type: 'string', description: 'Single field to expand' },
      { type: 'array', items: { type: 'string' }, description: 'Multiple fields to expand' }
    ]
  },
  fields: {
    anyOf: [
      { type: 'string', description: 'Single field name' },
      { type: 'array', items: { type: 'string' }, description: 'Multiple field names' }
    ]
  }
}
```

### 4. Максимумы и defaults в schemas

**Вендорское:**
```json
{
  "maxResults": {
    "type": "number",
    "maximum": 100,
    "default": 50,
    "description": "Maximum results per page. Default: 50, Max: 100"
  }
}
```

**Наши инструменты нуждаются в maximum:**

```typescript
// Добавить maximum ко всем maxResults/limit параметрам
{
  maxResults: {
    type: 'number',
    description: 'Maximum number of results to return',
    default: 50,
    minimum: 1,
    maximum: 100  // Добавить это!
  },
  startAt: {
    type: 'number',
    description: 'Starting index for results',
    default: 0,
    minimum: 0  // Добавить это!
  }
}
```

### 5. HTML → Markdown конвертация для Confluence

**Вендор возвращает Markdown:**
```json
{
  "description": "Get a specific page or live doc data (including body content) from Confluence by its ID. Returns the page body content converted to Markdown format."
}
```

**Наш код возвращает HTML:**
```typescript
// src/domains/confluence/tools.ts:682
page.body?.storage?.value  // HTML формат
```

**Задача - добавить конвертер:**
```typescript
// src/domains/confluence/utils/markdown-converter.ts
import TurndownService from 'turndown';

export class MarkdownConverter {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  htmlToMarkdown(html: string): string {
    return this.turndown.turndown(html);
  }
}

// Использование в tools.ts:
const markdown = new MarkdownConverter().htmlToMarkdown(page.body.storage.value);
return {
  content: [{
    type: 'text',
    text: `**Confluence Page: ${page.title}**\n\n` +
          `**Content (Markdown):**\n${markdown}`
  }]
};
```

### 6. Inline комментарии для Confluence

**Вендор поддерживает:**
```typescript
{
  name: 'createConfluenceInlineComment',
  inputSchema: {
    properties: {
      textSelection: {
        type: 'object',
        properties: {
          textContent: { type: 'string' },
          startOffset: { type: 'number' },
          endOffset: { type: 'number' }
        }
      }
    }
  }
}
```

**Задача - добавить поддержку:**
```typescript
// src/domains/confluence/tools.ts - новый инструмент
{
  name: 'confluence_add_inline_comment',
  description: 'Add an inline comment to specific text in a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'The page ID'
      },
      body: {
        type: 'string',
        description: 'Comment text'
      },
      textSelection: {
        type: 'object',
        description: 'Text selection for inline comment',
        properties: {
          textContent: {
            type: 'string',
            description: 'The selected text content'
          },
          startOffset: {
            type: 'number',
            description: 'Start position of selection'
          },
          endOffset: {
            type: 'number',
            description: 'End position of selection'
          }
        },
        required: ['textContent', 'startOffset', 'endOffset']
      }
    },
    required: ['pageId', 'body', 'textSelection']
  }
}
```

---

## 🔗 Композитные инструменты из вендорского варианта

### 1. Вендорский `createJiraIssue` - композитный

**Что делает:**
1. Проверяет существование проекта
2. Получает метаданные типов issues (`getJiraProjectIssueTypesMetadata`)
3. Получает детальные поля (`getJiraIssueTypeMetaWithFields`)
4. Создает issue с валидацией

**Рекомендация для нашего проекта:**
```typescript
// src/domains/jira/tools.ts - новый helper
{
  name: 'jira_prepare_issue_creation',
  description: 'Get metadata needed to create an issue: available types, required fields, field constraints for a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key (e.g., PROJ)'
      }
    },
    required: ['projectKey']
  }
}

// Реализация
private async prepareIssueCreation(args: any) {
  const { projectKey } = args;

  const [project, createMeta] = await Promise.all([
    this.client.getProject(projectKey),
    this.client.getCreateMeta({ projectKeys: projectKey, expand: 'projects.issuetypes.fields' })
  ]);

  const issueTypes = createMeta.projects[0].issuetypes.map(it => ({
    id: it.id,
    name: it.name,
    description: it.description,
    requiredFields: Object.entries(it.fields)
      .filter(([_, field]: [string, any]) => field.required)
      .map(([key, field]: [string, any]) => ({
        key,
        name: field.name,
        type: field.schema.type,
        allowedValues: field.allowedValues
      }))
  }));

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        project: {
          key: project.key,
          name: project.name,
          id: project.id
        },
        issueTypes,
        usage: 'Use this metadata to create issues with correct fields and types'
      }, null, 2)
    }]
  };
}
```

### 2. Вендорский `getConfluencePage` - конвертация + иерархия

**Что делает:**
1. Получает страницу с body.storage
2. Конвертирует HTML → Markdown
3. Получает ancestors (breadcrumbs)
4. Получает metadata (version, contributors)

**Рекомендация:**
```typescript
// src/domains/confluence/tools.ts - улучшить существующий
{
  name: 'confluence_get_page',
  description: 'Get Confluence page with body converted to Markdown, includes metadata, ancestors, and structure',
  inputSchema: {
    properties: {
      pageId: { type: 'string' },
      includeAncestors: { type: 'boolean', default: true },
      includeDescendants: { type: 'boolean', default: false },
      convertToMarkdown: { type: 'boolean', default: true }
    }
  }
}

private async getPage(args: any) {
  const {
    pageId,
    includeAncestors = true,
    includeDescendants = false,
    convertToMarkdown = true
  } = args;

  const expandFields = ['body.storage', 'version', 'space', 'history'];
  if (includeAncestors) expandFields.push('ancestors');
  if (includeDescendants) expandFields.push('children.page');

  const page = await this.client.getContent(pageId, { expand: expandFields });

  const body = page.body?.storage?.value || '';
  const content = convertToMarkdown
    ? new MarkdownConverter().htmlToMarkdown(body)
    : body;

  let resultText = `**Confluence Page: ${page.title}**\n\n`;

  if (includeAncestors && page.ancestors) {
    const breadcrumbs = page.ancestors.map(a => a.title).join(' > ');
    resultText += `**Path:** ${breadcrumbs} > ${page.title}\n\n`;
  }

  resultText += `**Content${convertToMarkdown ? ' (Markdown)' : ''}:**\n${content}\n`;

  if (includeDescendants && page.children?.page) {
    const children = page.children.page.results.map(c => `- ${c.title}`).join('\n');
    resultText += `\n**Child Pages:**\n${children}\n`;
  }

  return { content: [{ type: 'text', text: resultText }] };
}
```

---

## 📝 Пошаговый план внедрения

### Фаза 1: MCP Annotations (ОБЯЗАТЕЛЬНО) - 1 час

**Команда для Claude Code:**
```bash
Добавить MCP annotations ко всем инструментам в src/domains/jira/tools.ts и src/domains/confluence/tools.ts.

Использовать эту матрицу:
- GET операции (get_*, search_*): readOnlyHint=true, destructiveHint=false, idempotentHint=true
- CREATE операции (create_*, add_*): readOnlyHint=false, destructiveHint=false, idempotentHint=false
- UPDATE операции (update_*, transition_*): readOnlyHint=false, destructiveHint=false, idempotentHint=true
- DELETE операции (delete_*, remove_*): readOnlyHint=false, destructiveHint=true, idempotentHint=true

Для всех: openWorldHint=false
```

### Фаза 2: Descriptions & Parameter improvements - 2 часа

**Команда для Claude Code:**
```bash
Обновить descriptions всех инструментов и параметров в src/domains/jira/tools.ts и src/domains/confluence/tools.ts.

Шаблон для параметров:
"[ЧТО ЭТО] + [ФОРМАТ С ПРИМЕРОМ] + [КАК ИСПОЛЬЗОВАТЬ]"

Примеры:
- issueKey: "Issue key or ID. Key format: PROJECT-123 (project + number). ID format: numeric (e.g., 10000)"
- jql: "JQL query string. Example: 'project = PROJ AND status = Open'. Multiple conditions with AND/OR"
- pageId: "Confluence page ID. Numeric identifier visible in page URL (e.g., 123456)"
- cql: "CQL query string. Example: 'space = SPACE AND title ~ \"keyword\"'. Use ~ for text search"

Добавить maximum/minimum constraints:
- maxResults: maximum=100, minimum=1
- limit: maximum=100, minimum=1
- startAt: minimum=0
```

### Фаза 3: anyOf schemas - 1 час

**Команда для Claude Code:**
```bash
Добавить anyOf для параметров, которые могут быть string или array в src/domains/jira/tools.ts и src/domains/confluence/tools.ts.

Параметры для обновления:
- labels: anyOf[string, array]
- components: anyOf[string, array]
- expand: anyOf[string, array]
- fields: anyOf[string, array]

Шаблон:
{
  labels: {
    anyOf: [
      { type: 'string', description: 'Single label name' },
      { type: 'array', items: { type: 'string' }, description: 'Multiple label names' }
    ]
  }
}
```

### Фаза 4: Markdown конвертация для Confluence - 2 часа

**Команда для Claude Code:**
```bash
Создать Markdown конвертер для Confluence в src/domains/confluence/utils/markdown-converter.ts.

1. Установить зависимость: npm install turndown
2. Создать класс MarkdownConverter с методом htmlToMarkdown
3. Обновить confluence_get_page для использования конвертера
4. Добавить параметр convertToMarkdown: boolean = true
5. Обновить description: "...Returns page content converted to Markdown format"
```

### Фаза 5: Helper инструменты - 3 часа

**Команда для Claude Code:**
```bash
Добавить helper инструменты в src/domains/jira/tools.ts:

1. jira_prepare_issue_creation - метаданные для создания issue
   - Вызывает getProject + getCreateMeta параллельно
   - Возвращает: доступные типы issues, required fields, allowed values

2. jira_get_attachment_upload_endpoint - подготовка к загрузке
   - Возвращает endpoint и auth headers для загрузки файла

Обновить confluence_get_page:
   - Добавить параметры includeAncestors, includeDescendants
   - Добавить breadcrumbs navigation
   - Добавить child pages список
```

### Фаза 6: Inline комментарии Confluence - 2 часа

**Команда для Claude Code:**
```bash
Добавить поддержку inline комментариев в src/domains/confluence/tools.ts:

1. Новый инструмент: confluence_add_inline_comment
   - Параметр textSelection с startOffset, endOffset, textContent
   - Создание inline comment через API

2. Обновить confluence_get_comments:
   - Добавить фильтр location: 'inline' | 'footer'
   - Для inline - показывать textSelection info
```

---

## ✨ Итоговое состояние после внедрения

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **MCP Annotations** | 0 инструментов | 47 инструментов | +100% |
| **Детальные descriptions** | Базовые | С примерами и форматами | +300% |
| **Гибкие schemas (anyOf)** | 0 | ~15 параметров | +∞ |
| **Markdown конвертация** | Нет | Да (Confluence) | +1 |
| **Helper инструменты** | 0 | 2 композитных | +2 |
| **Inline комментарии** | Нет | Да (Confluence) | +1 |
| **Constraints (max/min)** | Частично | Везде | +100% |

---

## 🎯 Команды для быстрого старта

### Шаг 1: Annotations (запустить ПЕРВЫМ)
```bash
Добавить MCP annotations ко ВСЕМ 47 инструментам в src/domains/jira/tools.ts (30) и src/domains/confluence/tools.ts (17). Использовать матрицу: GET=readOnly:true, CREATE=readOnly:false+idempotent:false, UPDATE=readOnly:false+idempotent:true, DELETE=destructive:true+idempotent:true. Все openWorld:false.
```

### Шаг 2: Descriptions (запустить ВТОРЫМ)
```bash
Обновить descriptions параметров во ВСЕХ инструментах src/domains/{jira,confluence}/tools.ts по шаблону: "[ЧТО]+[ФОРМАТ С ПРИМЕРОМ]+[КАК ИСПОЛЬЗОВАТЬ]". Добавить maximum/minimum для maxResults/limit/startAt.
```

### Шаг 3: anyOf schemas (запустить ТРЕТЬИМ)
```bash
Добавить anyOf для параметров labels, components, expand, fields во всех инструментах src/domains/{jira,confluence}/tools.ts. Формат: anyOf[{type:string}, {type:array, items:{type:string}}].
```

### Шаг 4: Markdown + Helpers (параллельно)
```bash
1) Создать src/domains/confluence/utils/markdown-converter.ts (npm i turndown)
2) Обновить confluence_get_page с convertToMarkdown, includeAncestors, includeDescendants
3) Добавить jira_prepare_issue_creation в src/domains/jira/tools.ts
4) Добавить confluence_add_inline_comment в src/domains/confluence/tools.ts
```

---

## 📊 Финальное сравнение

### Наши преимущества
✅ **Больше инструментов**: 47 vs 27
✅ **Полная Agile поддержка**: 8 инструментов (вендор: 0)
✅ **Batch операции**: 3 инструмента (вендор: 0)
✅ **Worklog**: полная поддержка (вендор: 0)
✅ **Версии проектов**: CRUD операции (вендор: 0)
✅ **Расширенные labels**: full CRUD (вендор: частично)

### Что добавить из вендорского
⭐ **MCP Annotations**: семантические подсказки для AI
⭐ **Детальные descriptions**: примеры и форматы
⭐ **anyOf schemas**: гибкие типы параметров
⭐ **Markdown конвертация**: удобный формат для Confluence
⭐ **Helper инструменты**: композитные операции
⭐ **Inline комментарии**: Cloud feature для Confluence
