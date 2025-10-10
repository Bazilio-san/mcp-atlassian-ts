Сделай возможность подключать инструменты по списку, указанному в файле `config.yaml` в корне проекта

Список должен иметь формат:
```yaml
usedInstruments:
  jira:
    include: ALL | [ <список инструментов> ]
    exclude: [ <список инструментов> ]
  confluence:
    include: ALL | [ <список инструментов> ]
    exclude: [ <список инструментов> ]
```


Подключи JiraToolsManager из src/domains/jira/tools-manager.ts вместо src/domains/jira/tools.ts

Сделай возможность подключать инструменты по списку, указанному в файле `config.yaml` в корне проекта

не надо добавлять 
