# Утилиты для управления службами systemd

Эти утилиты предоставляют удобный способ управления службами systemd с использованием алиасов и автодополнением.

## Установка

```shell
cd <path to project>/deploy/systemd-service/scripts/
sudo ./utility_installer.sh
```

## Использование

### Перезапуск службы
```bash
restart jira-bot  # Перезапустит службу jira-bot
restart jb        # То же самое, используя алиас
```

### Просмотр логов службы
```bash
logs jira-bot    # Просмотр логов службы jira-bot
logs jb          # То же самое, используя алиас
```

## Настройка алиасов

Алиасы настраиваются в файле `/etc/restart-config.json`. Вы можете отредактировать этот файл, чтобы добавить новые алиасы.

```json
{
  "service_aliases": {
    "mb": "multi-bot",
    "jb": "jira-bot"
    "mcpj": "mcp-jira"
  }
}
```
