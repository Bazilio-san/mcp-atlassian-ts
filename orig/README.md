# Atlassian MCP Tools Export

Скрипт для подключения к Atlassian MCP серверу и экспорта полной спецификации инструментов.

## Быстрый старт

```bash
# Установить зависимости
npm install

# Запустить экспорт
node export-atlassian-mcp-info.js
```

## Настройка авторизации

### Вариант 1: OAuth 2.0 с PKCE (РЕКОМЕНДУЕТСЯ для MCP)

1. В [Developer Console](https://developer.atlassian.com/console/myapps/) создайте приложение
2. Включите OAuth 2.0 (3LO) в разделе Authorization
3. Укажите Callback URL: `http://localhost:3000/callback`
4. Скопируйте Client ID и добавьте в файл `orig/.env`:
```
ATL_CLIENT_ID=ваш_client_id_здесь
```
5. Запустите скрипт - откроется браузер для авторизации

### Вариант 2: Готовый Access Token

Если у вас уже есть access token (например, из другого OAuth флоу), добавьте в `orig/.env`:
```
ATLASSIAN_ACCESS_TOKEN=ваш_access_token_здесь
```

### Вариант 3: Personal Access Token (может не работать с MCP)

1. Перейдите на https://id.atlassian.com/manage-profile/security/api-tokens
2. Создайте новый API токен
3. Сохраните токен в файле `orig/.env`:
```
ATLASSIAN_ACCESS_TOKEN=ваш_api_token_здесь
```

**Важно:** PAT часто не работает с MCP сервером. Используйте OAuth 2.0!

## Результат

После успешного запуска скрипт создаст:
- `atlassian-mcp-tools-YYYY-MM-DD.json` - полная спецификация всех инструментов
- `atlassian-mcp-tools-summary-YYYY-MM-DD.md` - читаемая сводка по категориям

Спецификация включает:
- Полное описание каждого инструмента
- Все параметры с типами и описаниями
- Обязательные/опциональные параметры
- Примеры использования (если доступны)
- Категоризацию по сервисам (JIRA, Confluence, Bitbucket и т.д.)

## Проблемы с авторизацией

Если получаете ошибку 401:
1. Проверьте правильность токена
2. Убедитесь, что у вас есть доступ к Atlassian организации
3. Для MCP сервера может требоваться OAuth авторизация вместо PAT

Подробная документация по OAuth: https://developer.atlassian.com/cloud/oauth/getting-started/