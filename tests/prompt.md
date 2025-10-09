tests/endpoints/jira.js

class JiraDirectApiExecutor extends BaseTestExecutor - излишнее наследование.

Все что используется из BaseTestExecutor перенеси в класс JiraDirectApiExecutor
а файл BaseTestExecutor - удали.

Посмотри, есть ли функции и методы в tests/endpoints/jira.js
котоорые нигде не используются и упрости.

Используй принцип KISS по максимуму
