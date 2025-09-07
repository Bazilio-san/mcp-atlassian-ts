# JIRA REST API v2 Endpoints Tester

Комплексный модуль для тестирования всех эндпоинтов JIRA REST API v2 на ванильном JavaScript без использования тестовых фреймворков.

## 🎯 Возможности

- ✅ **Информационные эндпоинты** - тестирует чтением данных и проверяет наличие ожидаемых свойств
- ✅ **Изменяющие эндпоинты** - создает тестовые задачи, модифицирует их, проверяет результаты и удаляет
- ✅ **Полное покрытие** - тестирует все эндпоинты из `__tests__/jira-api-v2.http` + дополнительные из документации
- ✅ **Валидация данных** - проверяет структуру ответов и наличие обязательных полей
- ✅ **Автоматическая очистка** - удаляет созданные тестовые ресурсы
- ✅ **Подробные отчеты** - генерирует статистику успешности тестов

## 🧪 Покрываемые эндпоинты

### Информационные эндпоинты
- **Issues**: `GET /issue/{key}`, `GET /issue/{key}/editmeta`, `GET /issue/{key}/transitions`, `GET /issue/{key}/comment`, `GET /issue/{key}/worklog`, `GET /issue/createmeta`
- **Search**: `POST /search`, `GET /search` (JQL queries)  
- **Projects**: `GET /project`, `GET /project/{key}`, `GET /project/{key}/statuses`, `GET /project/{key}/versions`, `GET /project/{key}/components`
- **Users**: `GET /user`, `GET /user/search`, `GET /user/assignable/search`, `GET /myself`
- **Metadata**: `GET /priority`, `GET /status`, `GET /issuetype`, `GET /field`, `GET /resolution`, `GET /role`, `GET /issueLinkType`
- **Additional**: `GET /serverInfo`, `GET /configuration`, `GET /dashboard`, `GET /filter/favourite`, `GET /permissions`, etc.

### Изменяющие эндпоинты  
- **Issue Management**: `POST /issue`, `PUT /issue/{key}`, `DELETE /issue/{key}`
- **Comments**: `POST /issue/{key}/comment`, `PUT /issue/{key}/comment/{id}`, `DELETE /issue/{key}/comment/{id}`
- **Transitions**: `POST /issue/{key}/transitions`
- **Worklog**: `POST /issue/{key}/worklog`, `PUT /issue/{key}/worklog/{id}`, `DELETE /issue/{key}/worklog/{id}`
- **Versions**: `POST /version`, `PUT /version/{id}`, `DELETE /version/{id}`
- **Issue Links**: `POST /issueLink`, `POST /issue/{key}/remotelink`

### Agile эндпоинты
- **Boards**: `GET /agile/1.0/board`, `GET /agile/1.0/board/{id}/sprint`, `GET /agile/1.0/board/{id}/issue`

## 🚀 Использование

### Автономный запуск
```bash
cd test-client
node jira-endpoints-tester.js
```

### Программное использование
```javascript
const JiraEndpointsTester = require('./jira-endpoints-tester');

// Создание экземпляра тестера
const tester = new JiraEndpointsTester({
    baseUrl: 'http://localhost:8080',  // URL JIRA сервера
    auth: { 
        type: 'basic', 
        username: 'admin', 
        password: 'admin' 
    }
});

// Запуск всех тестов
const results = await tester.runAllTests();

console.log(`Пройдено: ${results.passedTests}/${results.totalTests}`);
console.log(`Процент успешности: ${results.passRate}%`);
```

### Кастомная конфигурация
```javascript
const tester = new JiraEndpointsTester({
    baseUrl: 'https://your-jira.com',
    auth: { 
        type: 'token',  // или 'basic'
        token: 'your-api-token'
    }
});

// Тестирование только информационных эндпоинтов
await tester.testIssueEndpoints();
await tester.testProjectEndpoints();
await tester.testMetadataEndpoints();
```

## 📊 Примеры вывода

```
🚀 Starting comprehensive JIRA REST API v2 endpoint tests...
📡 Base URL: http://localhost:8080
👤 Auth: basic (admin)
📋 Test Project: TEST

=== TESTING ISSUE ENDPOINTS ===
✅ PASS Get Issue [GET /issue/TEST-1] - Status: 200
✅ PASS Issue Properties - All expected properties present
✅ PASS Get Issue Edit Meta [GET /issue/TEST-1/editmeta] - Status: 200
✅ PASS Get Issue Transitions [GET /issue/TEST-1/transitions] - Status: 200

=== TESTING MODIFYING ENDPOINTS ===
✅ PASS Create Test Issue [POST /issue] - Status: 201
✅ Test issue created: TEST-3
✅ PASS Update Issue [PUT /issue/TEST-3] - Status: 204
✅ Issue update verified successfully

===============================================================================
📊 JIRA REST API v2 ENDPOINT TESTING REPORT
===============================================================================
⏱️  Total Duration: 15.42 seconds
📊 Total Tests: 85
✅ Passed: 78
❌ Failed: 7
📈 Pass Rate: 91.8%
===============================================================================
```

## 🎛️ Конфигурация

### Параметры конструктора
```javascript
const cfg = {
    baseUrl: 'http://localhost:8080',  // URL JIRA сервера
    auth: {
        type: 'basic',      // 'basic' или 'token'
        username: 'admin',  // для basic auth
        password: 'admin',  // для basic auth  
        token: 'api-token'  // для token auth
    }
}
```

### Внутренние настройки
- `testProjectKey: 'TEST'` - ключ проекта для тестирования
- Автоматическое создание/удаление тестовых ресурсов
- Таймауты и повторные попытки для HTTP запросов

## 🧹 Управление ресурсами

Тестер автоматически отслеживает созданные ресурсы:
- **Issues** - тестовые задачи
- **Versions** - версии проектов  
- **Comments** - комментарии
- **Worklogs** - записи времени
- **Links** - связи между задачами

Все созданные ресурсы удаляются в конце тестирования.

## 🔍 Валидация данных

Для информационных эндпоинтов тестер проверяет:
- HTTP статус коды (200, 201, 204, 404 и т.д.)
- Наличие обязательных полей в ответах
- Корректность структуры JSON
- Соответствие типов данных

Для изменяющих эндпоинтов дополнительно:
- Фактическое применение изменений
- Консистентность данных после операций
- Корректность создания/обновления/удаления

## 🚀 Интеграция с CI/CD

```bash
# В pipeline можно использовать так:
node jira-endpoints-tester.js > test-results.log
if [ $? -eq 0 ]; then
    echo "API tests passed"
else
    echo "API tests failed"
    exit 1
fi
```

## 🤝 Совместимость

- **JIRA Versions**: Server 7.x+, Cloud, Data Center
- **Node.js**: 12+
- **Browsers**: Modern browsers с fetch API
- **API Version**: REST API v2

## 📝 Логи и отчеты

Результаты сохраняются в `tester.testResults`:
```javascript
const res = {
    name: 'Get Issue',
    success: true,
    status: 200, 
    endpoint: '/issue/TEST-1',
    method: 'GET',
    details: 'OK',
    timestamp: '2025-01-15T10:30:00.000Z',
};
```

## 🎯 Использование с эмулятором

Для работы с встроенным JIRA эмулятором:
```bash
# Terminal 1 - запустить эмулятор
node test-client/src/jira-emulator.js

# Terminal 2 - запустить тесты
node test-client/jira-endpoints-tester.js
```

Эмулятор предоставляет тестовые данные:
- Project: **TEST**  
- Issues: **TEST-1**, **TEST-2**
- User: **admin/admin**
- Полный набор метаданных (приоритеты, статусы, типы задач)
