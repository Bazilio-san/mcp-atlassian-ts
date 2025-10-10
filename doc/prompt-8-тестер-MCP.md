Измени тестер MCP инструментов JIRA tests/mcp/jira.js
Используй настройки из `config.yaml`, чтобы выполнять тесты только тех MCP инструментов JIRA,
которые задействованы в соответствии с настройками.
Очевидно, фильтрацию лучше сделать на уровне функций tests/mcp/jira-test-cases.js
Используй функцию парсинга `config.yaml` из dist/src/core/config/tool-config.js

