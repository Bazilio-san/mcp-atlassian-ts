# План рефакторинга Confluence инструментов

## Аналитика текущего состояния

### Текущая архитектура Confluence
- Все 17 инструментов определены в одном большом файле `tools.ts` (1200+ строк)
- Хендлеры реализованы как приватные методы класса `ConfluenceToolsManager`
- Большой switch в методе `executeTool` для маршрутизации
- Описания инструментов и их обработчики в разных местах файла

### Целевая архитектура (по аналогии с JIRA)
- Инструменты разнесены по модулям в папках по функциональности
- Каждый инструмент экспортируется с именем, совпадающим с `name` (например, `confluence_search`)
- Хендлер встроен в объект инструмента как свойство `handler`
- Упрощенный `ConfluenceToolsManager` без огромного switch

## Детальный план рефакторинга

### Шаг 1: Создание структуры папок

```
src/domains/confluence/tools/
├── content/          # Работа с контентом (страницы, поиск)
│   ├── search.ts
│   ├── get-page.ts
│   ├── get-page-by-title.ts
│   ├── create-page.ts
│   ├── update-page.ts
│   └── delete-page.ts
├── spaces/           # Работа с пространствами
│   ├── get-spaces.ts
│   ├── get-space.ts
│   └── get-space-content.ts
├── comments/         # Комментарии
│   ├── add-comment.ts
│   └── get-comments.ts
├── labels/           # Метки
│   ├── add-label.ts
│   ├── get-labels.ts
│   └── get-pages-by-label.ts
├── hierarchy/        # Иерархия страниц
│   └── get-page-children.ts
├── history/          # История версий
│   └── get-page-history.ts
├── users/            # Пользователи
    └── search-user.ts
```

### Шаг 2: Создание shared контекста

Файл: `src/domains/confluence/shared/tool-context.ts`
```typescript
export interface ConfluenceToolContext {
  httpClient: AxiosInstance;
  cache: {
    getOrSet: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
    del: (key: string) => void;
    keys: () => string[];
  };
  config: JCConfig;
  logger: {
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
  // Utility functions
  normalizeToArray: (value: string | string[] | undefined) => string[];
  invalidatePageCache: (pageId: string) => void;
}
```

### Шаг 3: Структура файла инструмента

Пример: `src/domains/confluence/tools/content/search.ts`

```typescript
import type { ConfluenceToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { ToolWithHandler } from '../../../../types';

export const confluence_search: ToolWithHandler = {
  name: 'confluence_search',
  description: 'Search Confluence content using CQL',
  inputSchema: {
    // ... схема из текущего инструмента
  },
  annotations: {
    title: 'Search Confluence content using CQL',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (args: any, context: ConfluenceToolContext) => {
    return withErrorHandling(async () => {
      const { cql, offset = 0, limit = 50, excerpt = 'highlight', expand } = args;
      const { httpClient, config, logger, normalizeToArray } = context;

      logger.info('Searching Confluence content', { cql });

      // Логика из текущего метода searchContent
      const searchResult = await httpClient.get('/rest/api/content/search', {
        params: {
          cql,
          start: offset,
          limit,
          excerpt,
          expand: normalizeToArray(expand).join(','),
        },
      });

      // ... остальная логика обработки результатов
    });
  },
};
```

### Шаг 4: Обновление типов

В `src/types/confluence.ts` уже есть необходимые типы.
Нужно только убедиться, что `ToolWithHandler` доступен для Confluence инструментов.

### Шаг 5: Упрощение ConfluenceToolsManager

```typescript
export class ConfluenceToolsManager {
  private client: ConfluenceClient;
  private config: JCConfig;
  private tools: Map<string, ToolWithHandler>;
  private context: ConfluenceToolContext;

  constructor(config: JCConfig) {
    this.config = config;
    this.client = new ConfluenceClient(config);

    // Создаем контекст для инструментов
    this.context = {
      httpClient: this.client.getHttpClient(),
      cache: cacheInstance,
      config: this.config,
      logger: createLogger('confluence-tools'),
      normalizeToArray: this.normalizeToArray.bind(this),
      invalidatePageCache: this.invalidatePageCache.bind(this),
    };

    // Регистрируем все инструменты
    this.tools = { 
        confluence_search, 
        confluence_get_page }
      // ... все остальные инструменты
    };
  }

  getAvailableTools(): Tool[] {
    return Object.vaues(this.tools);
  }

  async executeTool(name: string, args: any, customHeaders?: Record<string, string>): Promise<any> {
    const tool = this.tools[name];
    if (!tool) {
      throw new ToolExecutionError(name, `Unknown Confluence tool: ${name}`);
    }

    // Добавляем custom headers в контекст временно
    const contextWithHeaders = customHeaders
      ? { ...this.context, customHeaders }
      : this.context;

    return tool.handler(args, contextWithHeaders);
  }
}
```

## Порядок выполнения

### Фаза 1: Подготовка (10 минут)
1. Создать структуру папок `src/domains/confluence/tools/`
2. Создать файл `src/domains/confluence/shared/tool-context.ts`
3. Добавить интерфейс `ConfluenceToolContext`

### Фаза 2: Миграция инструментов (40 минут)
Для каждого из 17 инструментов:
1. Создать отдельный файл в соответствующей папке
2. Перенести описание инструмента из `getAvailableTools()`
3. Перенести логику хендлера из приватного метода
4. Экспортировать инструмент с именем, совпадающим с `name`

Порядок миграции по группам:
- **content/** (6 инструментов): search, get-page, get-page-by-title, create-page, update-page, delete-page
- **spaces/** (3 инструмента): get-spaces, get-space, get-space-content
- **comments/** (2 инструмента): add-comment, get-comments
- **labels/** (3 инструмента): add-label, get-labels, get-pages-by-label
- **hierarchy/** (1 инструмент): get-page-children
- **history/** (1 инструмент): get-page-history
- **users/** (1 инструмент): search-user

### Фаза 3: Рефакторинг ConfluenceToolsManager (15 минут)
1. Удалить все приватные методы-хендлеры
2. Удалить метод `getAvailableTools()` со статическими определениями
3. Добавить импорты всех инструментов
4. Создать `объект` с инструментами в конструкторе
5. Упростить `executeTool()` - убрать switch, использовать объект
6. Реализовать новый `getAvailableTools()` через объект

### Фаза 4: Тестирование (10 минут)
1. Запустить `npm run build`
2. Проверить `npm run typecheck`
4. Проверить работу через MCP клиент

## Преимущества рефакторинга

### Архитектурные
- **Модульность**: Каждый инструмент изолирован в отдельном файле
- **Инкапсуляция**: Инструмент и его хендлер в одном месте
- **Масштабируемость**: Легко добавлять новые инструменты
- **Переиспользование**: Общий контекст для всех инструментов

### Практические
- **Упрощение отладки**: Легче найти и исправить проблему в конкретном инструменте
- **Параллельная разработка**: Разные разработчики могут работать над разными инструментами
- **Уменьшение конфликтов**: Меньше изменений в одном файле
- **Лучшая читаемость**: Файлы по 50-100 строк вместо 1200+

### Сопровождаемость
- **Единообразие с JIRA**: Одинаковая структура для обоих доменов
- **Простота навигации**: Логическая группировка по функциональности
- **Типобезопасность**: TypeScript интерфейсы для контекста и хендлеров
- **Тестируемость**: Каждый инструмент можно тестировать изолированно

## Риски и митигация

## Метрики успеха

- ✅ Все 17 инструментов работают корректно
- ✅ Тесты проходят без ошибок
- ✅  TypeScript компиляция без ошибок
- ✅ Размер файлов: максимум 150 строк на файл инструмента
- ✅ Упрощение `ConfluenceToolsManager` с 1200+ до ~200 строк
- ✅ Единообразие с архитектурой JIRA инструментов
