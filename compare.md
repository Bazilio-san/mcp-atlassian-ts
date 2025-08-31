# Сравнение инструментов Atlassian MCP

Сравнение реализованных инструментов для JIRA и Confluence в двух реализациях репозитория:
- Python: папка `mcp-atlassian-py`
- TypeScript: папка `src`

Ниже приведены таблицы соответствий (по возможностям), где указаны имена инструментов в каждой реализации. Если названия отличаются, добавлены примечания.

## JIRA — инструменты

| Возможность | Python (mcp-atlassian-py) | TypeScript (src) | Примечания |
|---|---|---|---|
| Получить профиль пользователя | get_user_profile | jira_get_user_profile |  |
| Получить задачу | get_issue | jira_get_issue |  |
| Поиск задач (JQL) | search | jira_search_issues |  |
| Поиск полей | search_fields | jira_search_fields |  |
| Задачи проекта | get_project_issues | — (через jira_search_issues) | В TS достигается через JQL `project = KEY` |
| Переходы по задаче | get_transitions | jira_get_transitions |  |
| Рабочие логи задачи | get_worklog | jira_get_worklog |  |
| Скачать вложения | download_attachments | jira_download_attachments |  |
| Agile-доски | get_agile_boards | jira_get_agile_boards |  |
| Задачи на доске | get_board_issues | jira_get_board_issues |  |
| Спринты доски | get_sprints_from_board | jira_get_sprints_from_board |  |
| Задачи спринта | get_sprint_issues | jira_get_sprint_issues |  |
| Типы ссылок задач | get_link_types | jira_get_link_types |  |
| Создать задачу | create_issue | jira_create_issue |  |
| Пакетное создание задач | batch_create_issues | jira_batch_create_issues |  |
| Пакетное получение changelog | batch_get_changelogs | jira_batch_get_changelogs |  |
| Обновить задачу | update_issue | jira_update_issue |  |
| Удалить задачу | delete_issue | jira_delete_issue |  |
| Добавить комментарий | add_comment | jira_add_comment |  |
| Добавить worklog | add_worklog | jira_add_worklog |  |
| Привязать к эпику | link_to_epic | jira_link_to_epic |  |
| Создать ссылку между задачами | create_issue_link | jira_create_issue_link |  |
| Создать remote ссылку | create_remote_issue_link | jira_create_remote_issue_link |  |
| Удалить ссылку | remove_issue_link | jira_remove_issue_link |  |
| Перевести задачу | transition_issue | jira_transition_issue |  |
| Создать спринт | create_sprint | jira_create_sprint |  |
| Обновить спринт | update_sprint | jira_update_sprint |  |
| Версии проекта | get_project_versions | jira_get_project_versions |  |
| Список проектов | get_all_projects | jira_get_projects | Разные имена, одинаковая сущность |
| Создать версию | create_version | jira_create_version |  |
| Пакетное создание версий | batch_create_versions | jira_batch_create_versions |  |

Итого:
- Python JIRA: 31 инструмента
- TypeScript JIRA: сопоставимые по покрытию, отдельный `get_project_issues` в TS достигается через JQL

## Confluence — инструменты

| Возможность | Python (mcp-atlassian-py) | TypeScript (src) | Примечания |
|---|---|---|---|
| Поиск (текст/CQL) | search | confluence_search |  |
| Получить страницу по ID / по title+space | get_page | confluence_get_page, confluence_get_page_by_title | В Python один инструмент с параметрами; в TS — два отдельных |
| Дочерние страницы | get_page_children | confluence_get_page_children |  |
| Комментарии страницы | get_comments | confluence_get_comments |  |
| Метки страницы (labels) — получить | get_labels | confluence_get_labels |  |
| Метки страницы — добавить | add_label | confluence_add_label |  |
| Создать страницу | create_page | confluence_create_page |  |
| Обновить страницу | update_page | confluence_update_page |  |
| Удалить страницу | delete_page | confluence_delete_page |  |
| Добавить комментарий | add_comment | confluence_add_comment |  |
| Поиск пользователя | search_user | confluence_search_user |  |
| Список пространств | — | confluence_get_spaces | Присутствует только в TS |
| Информация о пространстве | — | confluence_get_space | Присутствует только в TS |
| Контент пространства | — | confluence_get_space_content | Присутствует только в TS |
| Страницы по метке | — | confluence_get_pages_by_label | Присутствует только в TS |
| История страницы | — | confluence_get_page_history | Присутствует только в TS |

Итого:
- Python Confluence: 11 инструментов
- TypeScript Confluence: 17 инструментов (включая дополнительные возможности по пространствам и истории)

## Источники (файлы)
- Python:
  - JIRA: `mcp-atlassian-py\src\mcp_atlassian\servers\jira.py`
  - Confluence: `mcp-atlassian-py\src\mcp_atlassian\servers\confluence.py`
- TypeScript:
  - JIRA: `src\domains\jira\tools.ts`
  - Confluence: `src\domains\confluence\tools.ts`

Примечание: соответствия устанавливались по назначению инструмента и/или совпадающим названиям. В случаях, когда в одной реализации функция покрывается параметрами (например, `get_page` в Python), а в другой вынесена в отдельные инструменты (например, `confluence_get_page_by_title`), это отражено в примечаниях.
