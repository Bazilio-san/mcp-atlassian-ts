# Запуск тестов

## Настройка
Проверьте `.env` файл:
- `JIRA_URL` - URL вашего JIRA сервера
- `JIRA_USERNAME` - логин
- `JIRA_PASSWORD` - API токен (не пароль!)
- `TEST_JIRA_PROJECT` - тестовый проект (по умолчанию TEST)

## Запуск тестов

### 1. Тесты прямого API JIRA
```bash
# Запустить все тесты
node tests/jira-endpoints-tester.js

# Выборочные тесты
node tests/jira-endpoints-tester.js --tests=1-1,2-*,9

# С подробным выводом
node tests/jira-endpoints-tester.js --verbose
```

## Параметры
- `--tests=X-Y` - запуск конкретных тестов (X - группа, Y - номер теста)
- `--tests=X-*` - запуск всех тестов группы X
- `--verbose` - подробный вывод
- `--log=filename.json` - логирование ответов API в файл
