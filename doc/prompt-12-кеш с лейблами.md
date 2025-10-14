Сделай кеш с лейблами (метками) проектов.

Кеш размести в файле  src/domains/jira/tools/projects/search-project/labels-cache.ts

При очередном запросе getProjectHandler в src/domains/jira/tools/projects/jira_get_project.ts
дергается кеш и он должен вернуть массив меток, который необходимо добавить в ответ инструмента jira_get_project
в labels (сейчас там пустой массив)


Кеш работает так: 
Если для проета кеш = null (информация не запрашивалась),
то сначала попробовать получить все метки с помощью запроса 

```http request
GET {{baseUrl}}/rest/gadget/1.0/labels/gadget/project-<projectId>/labels
```
(используй powerHttpClient) 

ответ будет такого формата:
```json
{
  "groups": [
    {
      "key": "A-C",
      "labels": [
        {"label": "A8R", "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+A8R"},
        {"label": "AI", "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+AI"},
      ]
    },
    {
      "key": "D-J",
      "labels": [
        {"label": "DOC-PIPE-WIKI", "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+DOC-PIPE-WIKI"},
        {"label": "DOC-PIPELINE", "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+DOC-PIPELINE"},
      ]
    },
    {
      "key": "K-Z",
      "labels": [
        {"label": "PORTAL-BOT", "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+PORTAL-BOT"},
      ]
    },
    {
      "key": "Т",
      "labels": [
        {
          "label": "технические_ошибки",
          "searchUrl": "/issues/?jql=project+%3D+28383+AND+labels+%3D+%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5_%D0%BE%D1%88%D0%B8%D0%B1%D0%BA%D0%B8"
        }
      ]
    }
  ], "field": "Метки", "project": "AI TECH"
}
```

Если этот метод зафейлится (он быстрый но не официальный),
то используй поиск задач проекта - 1000 последних открытых задач в проекте с JQL фильтром 

```http request
POST {{baseUrl}}/rest/api/2/search

{
  "jql": "project = <projectKey> AND labels IS NOT EMPTY ORDER BY updated DESC",
  "fields": ["labels"],
  "maxResults": 1000
}

```
(используй powerHttpClient) 

ответ такой:

```json
{
  "expand": "schema,names",
  "startAt": 0, 
  "maxResults": 1000,
  "total": 371, 
  "issues": [
  {
    "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
    "id": "2037268",
    "self": "https://jira-dev.finam.ru/rest/api/2/issue/2037268",
    "key": "AITECH-778",
    "fields": {"labels": ["CS-BOT"]}
  },
  {
    "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
    "id": "2036841",
    "self": "https://jira-dev.finam.ru/rest/api/2/issue/2036841",
    "key": "AITECH-482",
    "fields": {"labels": ["automated", "mcp-test"]}
  }
]
```
и собери из этого уникальные лейблы


Если же кеш не пуст для проекта, то сразу вернуть массив.

Кеш ключевать по ключу проекта. 
Но функция получения лейблов требует одновременно и ключ и id (это все будет в jira_get_project после ображения к /rest/api/2/project)
Время жизни лейблов проекта в кеше - 1 час


Подготовь подробнейший план-задание для тебя же по реализации
с учетом того, что наш MCP сервер может использоваться в веб-интерфейсах с множеством одновременных пользователей

- Полная MCP protocol поддержка на /mcp/v1 (Streamable HTTP  Полный)
- URL rewriting для совместимости (/mcp → /mcp/v1)
- MCP методы: initialize, tools/list, tools/call, resources/list, resources/read
- Правильная обработка JSON-RPC 2.0 с id и result (Protocol Support Полный MCP )
- Message Endpoint Отдельный
- Server-Sent Events на /sse
- Message endpoint на /message для SSE сообщений
- Активный транспорт менеджмент с sseTransports Map

с примерами кода

Сохрани план-задание в src/1.md

