# Задача: Преобразование архитектуры JIRA модулей

## Описание проблемы

В настоящее время функционал одного инструмента JIRA разбросан по нескольким местам, что создает сложности в отладке и понимании кода:

1. **Описание инструмента** в `src/domains/jira/tools.ts` → метод `getAvailableTools()`
2. **Маршрутизация и обработка** в `JiraToolsManager.executeTool()` → switch-case + приватные методы класса
3. **Реализация логики** в `src/domains/jira/client.ts` → методы класса `JiraClient`

**Пример для инструмента `jira_get_issue`:**
- Описание: `tools.ts:52-88` (37 строк)
- Обработчик: `tools.ts:1121 + tools.ts:1212-1248` (37 строк)
- Реализация: `client.ts:144-172` (29 строк)

Итого 103 строки кода разбросаны по 3 местам для одного инструмента.

## Цель преобразования

Создать модульную архитектуру, где каждый инструмент представлен **одним модулем**, содержащим:

1. **Описание инструмента** (name, description, inputSchema, annotations)
2. **Handler-функцию** с полной логикой (HTTP-вызовы, кеширование, форматирование ответа)
3. **Все вспомогательные функции** для данного инструмента

## Требования

### Обязательные требования
- ✅ **Сохранить всю существующую логику** работы инструментов
- ✅ **Сохранить кеширование** (ключи, TTL, инвалидация)
- ✅ **Сохранить обработку ошибок** (withErrorHandling, типы ошибок)
- ✅ **Сохранить форматирование ответов** (точный формат для MCP-клиентов)
- ✅ **Сохранить аутентификацию** и работу с HTTP-клиентом
- ✅ **Сохранить логирование** (контекст и сообщения)
- ✅ **Сохранить валидацию** входных параметров

### Качественные улучшения
- 🎯 **Один файл = один инструмент** для легкой отладки
- 📝 **Имена файлов соответствуют именам инструментов**
- 🧪 **Возможность тестирования каждого инструмента изолированно**
- 🔧 **Простота добавления/удаления инструментов**
- 📦 **Четкое разделение по функциональным группам**

## Предлагаемая архитектура

### Новая структура файлов

```
src/domains/jira/
├── tools/                          # Новая папка для модулей инструментов
│   ├── core/                       # Базовые операции с задачами (6 инструментов)
│   │   ├── get-issue.ts
│   │   ├── search-issues.ts
│   │   ├── create-issue.ts
│   │   ├── update-issue.ts
│   │   ├── delete-issue.ts
│   │   └── batch-create-issues.ts
│   ├── comments/                   # Комментарии и переходы (3 инструмента)
│   │   ├── add-comment.ts
│   │   ├── get-transitions.ts
│   │   └── transition-issue.ts
│   ├── projects/                   # Управление проектами (4 инструмента)
│   │   ├── get-projects.ts
│   │   ├── get-project-versions.ts
│   │   ├── create-version.ts
│   │   └── batch-create-versions.ts
│   ├── users/                      # Пользователи (1 инструмент)
│   │   └── get-user-profile.ts
│   ├── links/                      # Связи между задачами (5 инструментов)
│   │   ├── get-link-types.ts
│   │   ├── create-issue-link.ts
│   │   ├── create-remote-issue-link.ts
│   │   ├── remove-issue-link.ts
│   │   └── link-to-epic.ts
│   ├── worklog/                    # Учет времени (2 инструмента)
│   │   ├── get-worklog.ts
│   │   └── add-worklog.ts
│   ├── attachments/                # Вложения (1 инструмент)
│   │   └── download-attachments.ts
│   ├── agile/                      # Agile/Scrum (6 инструментов)
│   │   ├── get-agile-boards.ts
│   │   ├── get-board-issues.ts
│   │   ├── get-sprints-from-board.ts
│   │   ├── get-sprint-issues.ts
│   │   ├── create-sprint.ts
│   │   └── update-sprint.ts
│   ├── metadata/                   # Метаданные (1 инструмент)
│   │   └── search-fields.ts
│   └── bulk/                       # Массовые операции (1 инструмент)
│       └── batch-get-changelogs.ts
├── shared/                         # Общие компоненты
│   ├── tool-context.ts            # Интерфейс контекста инструментов
│   ├── cache-utils.ts             # Утилиты для кеширования
│   └── response-formatters.ts     # Общие форматтеры ответов (если нужны)
├── tools.ts                       # Упрощенный менеджер инструментов
└── client.ts                      # Сокращенный клиент (только базовые HTTP-методы)
```

**Итого: 30 инструментов в 7 логических группах**

### Структура модуля инструмента

Каждый файл инструмента должен содержать:

```typescript
// Пример: src/domains/jira/tools/core/get-issue.ts

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, NotFoundError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

// 1. ОПИСАНИЕ ИНСТРУМЕНТА (полная копия из текущего tools.ts)
export const getIssueTool: Tool = {
  name: 'jira_get_issue',
  description: `Get detailed information about a JIRA issue by key or ID`,
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: `Issue id or key can be used to uniquely identify an existing issue...`,
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: `Additional fields to expand. e.g.: ["changelog", "transitions"]`,
        default: [],
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: `Specific fields to return. e.g.: ["summary", "status", "assignee"]`,
        default: [],
      },
    },
    required: ['issueKey'],
    additionalProperties: false,
  },
  annotations: {
    title: 'Retrieve JIRA issue',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

// 2. HANDLER-ФУНКЦИЯ (вся логика из JiraToolsManager.getIssue + JiraClient.getIssue)
export async function getIssueHandler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { issueKey, expand = [], fields } = args;
    const { httpClient, cache, config, logger, normalizeToArray } = context;

    logger.info('Fetching JIRA issue', { issueKey });

    // Кеширование (копируется из client.ts:153-171)
    const options = {
      expand: normalizeToArray(expand),
      fields: fields ? normalizeToArray(fields) : undefined,
    };

    const cacheKey = generateCacheKey('jira', 'issue', { issueKey, ...options });

    const issue = await cache.getOrSet(cacheKey, async () => {
      const params: any = {};
      if (options.expand?.length) params.expand = options.expand.join(',');
      if (options.fields?.length) params.fields = options.fields.join(',');

      const response = await httpClient.get(`/rest/api/2/issue/${issueKey}`, { params });

      if (!response.data) {
        throw new NotFoundError('Issue', issueKey);
      }

      return response.data;
    });

    // Форматирование ответа (копируется из tools.ts:1224-1247)
    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue: ${issue.key}**\n\n` +
            `**Summary:** ${issue.fields.summary}\n` +
            `**Status:** ${issue.fields.status.name}\n` +
            `**Assignee:** ${issue.fields.assignee?.displayName || 'Unassigned'}\n` +
            `**Reporter:** ${issue.fields.reporter.displayName}\n` +
            `**Created:** ${new Date(issue.fields.created).toLocaleString()}\n` +
            `**Updated:** ${new Date(issue.fields.updated).toLocaleString()}\n` +
            `**Priority:** ${issue.fields.priority?.name || 'None'}\n` +
            `**Issue Type:** ${issue.fields.issuetype.name}\n` +
            `**Project:** ${issue.fields.project.name} (${issue.fields.project.key})\n${
              issue.fields.labels?.length ? `**Labels:** ${issue.fields.labels.join(', ')}\n` : ''
            }${
              issue.fields.description
                ? `\n**Description:**\n${formatDescription(issue.fields.description)}\n`
                : ''
            }\n**Direct Link:** ${config.url}/browse/${issue.key}`,
        },
      ],
    };
  });
}

// 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (если нужны для конкретного инструмента)
function formatDescription(description: any): string {
  if (typeof description === 'string') return description;
  if (description && typeof description === 'object') {
    return JSON.stringify(description, null, 2);
  }
  return String(description);
}
```

### Контекст инструментов

Создать `src/domains/jira/shared/tool-context.ts`:

```typescript
import type { AxiosInstance } from 'axios';
import type { JCConfig } from '../../../types/index.js';

export interface ToolContext {
  // HTTP клиент с аутентификацией и custom headers
  httpClient: AxiosInstance;

  // Кеш (точно такой же интерфейс как сейчас)
  cache: {
    getOrSet: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
    del: (key: string) => void;
    keys: () => string[];
  };

  // Конфигурация JIRA
  config: JCConfig;

  // Логгер (точно такой же как createLogger)
  logger: {
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };

  // Утилиты (копируются из текущего JiraToolsManager)
  invalidateIssueCache: (issueKey: string) => void;
  normalizeToArray: (value: string | string[] | undefined) => string[];
}
```

### Упрощенный JiraToolsManager

Новый `src/domains/jira/tools.ts`:

```typescript
import { createAuthenticationManager } from '../../core/auth/index.js';
import { getCache } from '../../core/cache/index.js';
import { createLogger } from '../../core/utils/logger.js';
import type { ToolContext } from './shared/tool-context.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Импорты всех 30 инструментов
import { getIssueTool, getIssueHandler } from './tools/core/get-issue.js';
import { searchIssuesTool, searchIssuesHandler } from './tools/core/search-issues.js';
import { createIssueTool, createIssueHandler } from './tools/core/create-issue.js';
import { updateIssueTool, updateIssueHandler } from './tools/core/update-issue.js';
import { deleteIssueTool, deleteIssueHandler } from './tools/core/delete-issue.js';
import { batchCreateIssuesTool, batchCreateIssuesHandler } from './tools/core/batch-create-issues.js';
// ... импорты всех остальных 24 инструментов

export class JiraToolsManager {
  private context: ToolContext;
  private toolHandlers: Map<string, (args: any, context: ToolContext) => Promise<any>>;

  constructor(config: JCConfig) {
    // Создаем контекст один раз при инициализации
    const authManager = createAuthenticationManager(config.auth, config.url);
    const httpClient = authManager.getHttpClient();
    const cache = getCache();
    const logger = createLogger('jira-tools');

    this.context = {
      httpClient,
      cache,
      config,
      logger,
      invalidateIssueCache: this.invalidateIssueCache.bind(this),
      normalizeToArray: this.normalizeToArray.bind(this),
    };

    // Регистрируем все 30 обработчиков
    this.toolHandlers = new Map([
      ['jira_get_issue', getIssueHandler],
      ['jira_search_issues', searchIssuesHandler],
      ['jira_create_issue', createIssueHandler],
      ['jira_update_issue', updateIssueHandler],
      ['jira_delete_issue', deleteIssueHandler],
      ['jira_batch_create_issues', batchCreateIssuesHandler],
      // ... все остальные 24 инструмента
    ]);
  }

  getAvailableTools(): Tool[] {
    return [
      getIssueTool,
      searchIssuesTool,
      createIssueTool,
      updateIssueTool,
      deleteIssueTool,
      batchCreateIssuesTool,
      // ... все остальные 24 инструмента
    ];
  }

  async executeTool(toolName: string, args: Record<string, any>, customHeaders?: Record<string, string>): Promise<any> {
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new ToolExecutionError(toolName, `Unknown JIRA tool: ${toolName}`);
    }

    // Применяем custom headers если предоставлены
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      // Создаем временный HTTP-клиент с дополнительными headers
      const authManager = createAuthenticationManager(this.context.config.auth, this.context.config.url);
      const customHttpClient = authManager.getHttpClient();

      customHttpClient.interceptors.request.use(
        config => {
          if (config.headers) {
            Object.assign(config.headers, customHeaders);
          }
          return config;
        },
        error => Promise.reject(error)
      );

      const contextWithHeaders = {
        ...this.context,
        httpClient: customHttpClient
      };

      return handler(args, contextWithHeaders);
    }

    return handler(args, this.context);
  }

  async healthCheck(): Promise<any> {
    // Используем существующую логику из JiraClient
    const response = await this.context.httpClient.get('/rest/api/2/myself');
    return {
      status: 'ok',
      user: {
        displayName: response.data.displayName,
        accountId: response.data.accountId,
        emailAddress: response.data.emailAddress,
        active: response.data.active,
      },
    };
  }

  // Утилитные методы (копируются из текущего класса)
  private invalidateIssueCache(issueKey: string): void {
    const cache = this.context.cache;
    const keys = cache.keys();

    const relatedKeys = keys.filter(
      key => key.includes(issueKey) || key.includes('jira:search') || key.includes('jira:projects')
    );

    for (const key of relatedKeys) {
      cache.del(key);
    }

    this.context.logger.debug('Cache invalidated for issue', { issueKey, keysCleared: relatedKeys.length });
  }

  private normalizeToArray(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }
}
```

## План выполнения

### Этап 1: Подготовка инфраструктуры
1. ✅ Создать `src/domains/jira/shared/tool-context.ts`
2. ✅ Создать структуру папок: `tools/{core,comments,projects,users,links,worklog,attachments,agile,metadata,bulk}/`
3. ✅ Создать `src/domains/jira/shared/cache-utils.ts` (если нужны общие утилиты)

### Этап 2: Миграция по группам (30 инструментов)

#### 2.1 Core tools (6 инструментов) - ПРИОРИТЕТ 1
- `tools/core/get-issue.ts` ← `tools.ts:52-88 + tools.ts:1212-1248 + client.ts:144-172`
- `tools/core/search-issues.ts` ← `tools.ts:90-131 + tools.ts:1250-1293 + client.ts:177-201`
- `tools/core/create-issue.ts` ← `tools.ts:133-190 + tools.ts:1295-1345 + client.ts:206-232`
- `tools/core/update-issue.ts` ← `tools.ts:192-239 + tools.ts:1347-1380 + client.ts:237-253`
- `tools/core/delete-issue.ts` ← `tools.ts:391-416 + tools.ts:1382-1398 + client.ts:258-268`
- `tools/core/batch-create-issues.ts` ← `tools.ts:419-453 + tools.ts:1535-1586 + client.ts:803-819`

#### 2.2 Comments & Transitions (3 инструмента)
- `tools/comments/add-comment.ts` ← `tools.ts:241-279 + tools.ts:1400-1422 + client.ts:308-322`
- `tools/comments/get-transitions.ts` ← `tools.ts:281-301 + tools.ts:1424-1452 + client.ts:329-341`
- `tools/comments/transition-issue.ts` ← `tools.ts:303-336 + tools.ts:1454-1475 + client.ts:346-370`

#### 2.3 Projects (4 инструмента)
- `tools/projects/get-projects.ts` ← `tools.ts:338-363 + tools.ts:1477-1508 + client.ts:428-453`
- `tools/projects/get-project-versions.ts` ← `tools.ts:478-500 + tools.ts:1620-1651 + client.ts:594-611`
- `tools/projects/create-version.ts` ← `tools.ts:502-549 + tools.ts:1653-1672 + client.ts:616-641`
- `tools/projects/batch-create-versions.ts` ← `tools.ts:551-583 + tools.ts:1674-1710 + client.ts:646-672`

#### 2.4 Users (1 инструмент)
- `tools/users/get-user-profile.ts` ← `tools.ts:365-388 + tools.ts:1512-1533 + client.ts:110-137`

#### 2.5 Links (5 инструментов)
- `tools/links/get-link-types.ts` ← `tools.ts:585-600 + tools.ts:1712-1738 + client.ts:677-692`
- `tools/links/create-issue-link.ts` ← `tools.ts:602-635 + tools.ts:1740-1767 + client.ts:697-716`
- `tools/links/create-remote-issue-link.ts` ← `tools.ts:637-674 + tools.ts:1769-1792 + client.ts:721-740`
- `tools/links/remove-issue-link.ts` ← `tools.ts:676-697 + tools.ts:1794-1807 + client.ts:745-757`
- `tools/links/link-to-epic.ts` ← `tools.ts:699-725 + tools.ts:1809-1828 + client.ts:762-773`

#### 2.6 Worklog (2 инструмента)
- `tools/worklog/get-worklog.ts` ← `tools.ts:727-759 + tools.ts:1830-1866 + client.ts:377-402`
- `tools/worklog/add-worklog.ts` ← `tools.ts:761-807 + tools.ts:1868-1893 + client.ts:407-421`

#### 2.7 Attachments (1 инструмент)
- `tools/attachments/download-attachments.ts` ← `tools.ts:809-831 + tools.ts:1895-1931 + client.ts:778-783`

#### 2.8 Agile (6 инструментов)
- `tools/agile/get-agile-boards.ts` ← `tools.ts:833-872 + tools.ts:1933-1963 + client.ts:842-868`
- `tools/agile/get-board-issues.ts` ← `tools.ts:874-914 + tools.ts:1965-2002 + client.ts:873-900`
- `tools/agile/get-sprints-from-board.ts` ← `tools.ts:916-952 + tools.ts:2004-2042 + client.ts:905-926`
- `tools/agile/get-sprint-issues.ts` ← `tools.ts:954-994 + tools.ts:2044-2080 + client.ts:931-958`
- `tools/agile/create-sprint.ts` ← `tools.ts:996-1033 + tools.ts:2082-2110 + client.ts:963-986`
- `tools/agile/update-sprint.ts` ← `tools.ts:1035-1077 + tools.ts:2112-2131 + client.ts:991-1016`

#### 2.9 Metadata (1 инструмент)
- `tools/metadata/search-fields.ts` ← `tools.ts:455-476 + tools.ts:1588-1618 + client.ts:564-589`

#### 2.10 Bulk (1 инструмент)
- `tools/bulk/batch-get-changelogs.ts` ← `tools.ts:1079-1102 + tools.ts:2133-2181 + client.ts:824-835`

### Этап 3: Рефакторинг менеджера
1. ✅ Создать новый `JiraToolsManager` с использованием модулей
2. ✅ Добавить все 30 импортов и регистрацию handlers
3. ✅ Протестировать совместимость API
4. ✅ Удалить старые приватные методы из `JiraToolsManager`

### Этап 4: Очистка JiraClient
1. ✅ Удалить методы, которые перенесены в модули инструментов
2. ✅ Оставить только базовые HTTP-методы и утилиты
3. ✅ Обновить импорты и зависимости

### Этап 5: Тестирование
1. ✅ Запустить полный набор тестов
2. ✅ Проверить работу всех 30 инструментов
3. ✅ Проверить работу кеширования и обработки ошибок
4. ✅ Проверить совместимость с существующими MCP-клиентами

## Критерии успеха

### Функциональные требования
- ✅ Все 30 инструментов работают идентично до и после рефакторинга
- ✅ Кеширование работает точно так же (ключи, TTL, инвалидация)
- ✅ Обработка ошибок и логирование не изменяются
- ✅ Custom headers продолжают работать
- ✅ Форматирование ответов остается идентичным

### Качественные улучшения
- ✅ Каждый инструмент находится в одном файле
- ✅ Время отладки одного инструмента уменьшается в 3+ раза
- ✅ Добавление нового инструмента требует создания только одного файла
- ✅ Импорты и зависимости становятся явными для каждого инструмента
- ✅ Тестирование отдельных инструментов становится тривиальным

## Риски и их митигация

### Риск: Нарушение существующей функциональности
**Митигация:**
- Поэтапная миграция с тестированием каждого инструмента
- Точное копирование существующей логики без изменений
- Сохранение всех тестов и добавление новых

### Риск: Дублирование кода между модулями
**Митигация:**
- Использование общего `ToolContext` для всех инструментов
- Создание `shared/` папки для общих утилит
- Рефакторинг общих паттернов после основной миграции

### Риск: Увеличение сложности импортов
**Митигация:**
- Использование barrel exports (index.ts файлов) при необходимости
- Четкая структура папок по функциональным группам
- Автоматическая генерация импортов в IDE

## Ожидаемые результаты

После выполнения задачи:

1. **Структура кода**: 30 самодостаточных модулей вместо разброса по 3 файлам
2. **Отладка**: Время поиска проблемы в инструменте сокращается с ~5 минут до ~30 секунд
3. **Сопровождение**: Добавление нового инструмента занимает создание 1 файла вместо правки 3 файлов
4. **Тестирование**: Возможность создавать изолированные unit-тесты для каждого инструмента
5. **Документация**: Каждый модуль становится self-documenting благодаря явным зависимостям

**Главное достижение**: Решение основной проблемы - разбросанности логики одного инструмента по нескольким местам.