tests/jira-endpoints-tester.js

class JiraDirectApiExecutor extends BaseTestExecutor - излишнее наследование.

Все что используется из BaseTestExecutor перенеси в класс JiraDirectApiExecutor
а файл BaseTestExecutor - удали.

Посмотри, есть ли функции и методы в tests/jira-endpoints-tester.js
котоорые нигде не используются и упрости.

Используй принцип KISS по максимуму
