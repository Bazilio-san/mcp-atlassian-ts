Давай сократим количество различных наименований инструментов и их хендлеров в src/domains/confluence/tools

Предлагаю:
1) занести хендлеры в стандартное свойство handler в описание инструмента.
2) назвать переменные тулов ровно так, как нывается тул. н-р. confluence_create_sprint вместо createSprintTool
   тогда в src/domains/confluence/tools-manager.ts не нужен будет this.toolHandlers. 

================================================================================


План рефакторинга

1. Текущая ситуация

Сейчас у нас:
- Инструменты экспортируются с именами вроде createSprintTool, getIssueTypesTool
- Хендлеры отдельно экспортируются как handleCreateSprint, handleGetIssueTypes
- В tools-manager.ts приходится мапить инструменты и хендлеры через this.toolHandlers

2. Целевая архитектура

Предлагаю:
- Переименовать переменные инструментов точно по имени тула: confluence_create_sprint, confluence_get_issue_types
- Добавить свойство handler прямо в объект инструмента
- Убрать отдельный экспорт хендлеров и мапинг в tools-manager.ts

3. Детальный план изменений

Шаг 1: Рефакторинг файлов инструментов

Для каждого файла в src/domains/confluence/tools/:

Было:
// agile/create-sprint.ts
export const handleCreateSprint = async (client: JiraClient, params: any) => {...}
export const createSprintTool: McpTool = {
    name: 'jira_create_sprint',
    description: '...',
    inputSchema: {...}
}

Станет:
// agile/create-sprint.ts
export const jira_create_sprint: McpTool = {
    name: 'jira_create_sprint',
    description: '...',
    inputSchema: {...},
    handler: async (client: JiraClient, params: any) => {...}  // добавляем хендлер как свойство
}

Шаг 2: Обновление index файлов

В каждом index.ts (agile, issues, projects и т.д.):

Было:
export { createSprintTool, handleCreateSprint } from './create-sprint';

Станет:
export { jira_create_sprint } from './create-sprint';

Шаг 3: Упрощение tools-manager.ts

Было:
class JiraToolsManager {
private toolHandlers: Map<string, ToolHandler>;

    constructor() {
      this.toolHandlers = new Map([
        ['jira_create_sprint', handleCreateSprint],
        // ... много мапинга
      ]);
    }

    async executeTool(name: string, params: any) {
      const handler = this.toolHandlers.get(name);
      // ...
    }
}

Станет:
class JiraToolsManager {
private tools: Map<string, McpTool>;

    constructor() {
      this.tools = {
            jira_create_sprint
        // ... инструменты уже содержат хендлеры
        }
    }

    async executeTool(name: string, params: any) {
      const tool = this.tools[name];
      if (tool?.handler) {
        return await tool.handler(this.client, params);
      }
      // ...
    }
}

Шаг 4: Обновление типов

Добавить в McpTool интерфейс:
interface McpTool {
name: string;
description: string;
inputSchema: InputSchema;
handler?: (client: JiraClient, params: any) => Promise<any>;
}

4. Порядок выполнения

1. Сначала обновлю тип McpTool
2. Затем пройдусь по всем файлам инструментов (30 штук) и:
   - Переименую экспортируемую переменную
   - Сделаю хендлер приватным
   - Добавлю хендлер как свойство инструмента
3. Обновлю все index.ts файлы
4. Упрощу tools-manager.ts
5. Проверю, что тесты проходят

5. Преимущества

- Меньше дублирования имён
- Инкапсуляция: хендлер и описание в одном месте
- Упрощение tools-manager.ts - не нужен отдельный мапинг
- Легче добавлять новые инструменты


