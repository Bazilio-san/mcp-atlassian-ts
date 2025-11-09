# srv.sh - Unified systemd Service Management Script

Универсальный скрипт для управления systemd сервисами Node.js приложений. Консолидирует функциональность из отдельных скриптов `deploy/systemd-service/` в единое решение.

## Особенности

- ✅ **Универсальный запуск**: Работает одинаково при запуске из корня проекта или из папки `deploy/`
- ✅ **Автоопределение версии Node.js**: Приоритет параметр → .envrc → текущая версия
- ✅ **Умный поиск Node.js**: NVM пути → системные пути
- ✅ **Автоматическое чтение конфигурации**: package.json, config для порта
- ✅ **Генерация systemd unit-файлов**: Правильные пути и настройки
- ✅ **Управление процессами**: Остановка процессов на портах при удалении

## Алгоритм работы

### Определение рабочих папок

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"    # Папка скрипта: /path/to/project/deploy/
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"                      # Корень проекта: /path/to/project/
```

**Результат**: Независимо от места запуска, скрипт всегда использует корень проекта для:
- Чтения `package.json`
- Чтения `.envrc`
- Чтения конфигурации
- Установки `WorkingDirectory` в systemd unit

### Алгоритм определения версии Node.js

1. **Параметр `-v <version>`** (высший приоритет)
   ```bash
   ./deploy/srv.sh install -v 20.10.0
   ```

2. **Файл `.envrc` в корне проекта**
   ```bash
   # Ищет строку типа:
   nvm use 22.17.1
   # Извлекает: 22.17.1
   ```

3. **Текущая версия Node.js** (fallback)
   ```bash
   node -v  # Например: v22.17.1 → 22.17.1
   ```

### Алгоритм поиска пути к Node.js

1. **NVM путь** (приоритет)
   ```bash
   $HOME/.nvm/versions/node/v22.17.1/bin/node
   ```

2. **Системный путь** (fallback)
   ```bash
   which node  # Например: /usr/bin/node
   ```

### Алгоритм определения имени сервиса

1. **Параметр `-n <name>`** (приоритет)
2. **Значение `name` из package.json** (по умолчанию)

### Алгоритм определения порта

1. **Параметр `-p <port>`** (приоритет)
2. **Значение `config.webServer.port`** (автоматически)
   ```javascript
   // Выполняется из корня проекта:
   const config = require('config');
   console.log(config.webServer?.port);
   ```

## Команды

### Установка сервиса

```bash
# Базовая установка (автоопределение всех параметров)
./deploy/srv.sh install
./deploy/srv.sh i

# С кастомным именем сервиса
./deploy/srv.sh install -n my-custom-service

# С конкретной версией Node.js
./deploy/srv.sh install -v 20.10.0

# Комбинированные параметры
./deploy/srv.sh i -n custom-service -v 22.17.1
```

**Что происходит:**
1. Определяется версия Node.js и путь к бинарнику
2. Читается `package.json` для получения `main` и `name`
3. Генерируется systemd unit файл в `/etc/systemd/system/<service_name>.service`
4. Выполняется `systemctl daemon-reload`
5. Выполняется `systemctl enable --now <service_name>`

### Удаление сервиса

```bash
# Автоопределение порта из config
./deploy/srv.sh delete
./deploy/srv.sh d

# С кастомным именем сервиса
./deploy/srv.sh delete -n custom-service

# С конкретным портом
./deploy/srv.sh delete -p 8080

# Комбинированные параметры
./deploy/srv.sh d -n custom-service -p 9021
```

**Что происходит:**
1. Определяется порт из конфигурации или параметра
2. Выполняется `systemctl stop <service_name>`
3. Выполняется `systemctl disable <service_name>`
4. Удаляется unit файл `/etc/systemd/system/<service_name>.service`
5. Завершается процесс на указанном порту (если существует)
6. Выполняется `systemctl daemon-reload`

### Переустановка сервиса

```bash
# Полная переустановка
./deploy/srv.sh reinstall
./deploy/srv.sh r

# С параметрами
./deploy/srv.sh r -n custom-service -v 22.17.1 -p 9021
```

**Что происходит:**
1. Выполняется полное удаление сервиса (как в `delete`)
2. Выполняется полная установка сервиса (как в `install`)
3. Показывается статус и запускается просмотр логов

## Примеры запуска

### Из корня проекта

```bash
# Все команды работают из корня
./deploy/srv.sh install
./deploy/srv.sh delete -p 9021
./deploy/srv.sh reinstall -n mcp-fin-office-dev
```

### Из папки deploy

```bash
cd deploy/

# Все команды работают из папки deploy
./srv.sh install
./srv.sh delete -p 9021
./srv.sh reinstall -n mcp-fin-office-dev
```

### Реальные примеры для проекта

```bash
# Установка для разработки
./deploy/srv.sh install -n mcp-fin-office-dev -v 22.17.1

# Установка для продакшена с автоопределением
./deploy/srv.sh install

# Удаление dev версии
./deploy/srv.sh delete -n mcp-fin-office-dev

# Быстрая переустановка после изменений
./deploy/srv.sh reinstall
```

## Генерируемый systemd unit файл

```ini
[Unit]
Description=mcp-fin-office
After=network.target
StartLimitIntervalSec=0

[Service]
User=root
WorkingDirectory=/path/to/project/root
EnvironmentFile=/path/to/project/root/.env
ExecStart=/root/.nvm/versions/node/v22.17.1/bin/node dist/src/_core/index.js
Restart=always
RestartSec=3
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target
```

## Отладка и мониторинг

### Просмотр статуса

```bash
systemctl status mcp-fin-office
```

### Просмотр логов

```bash
# Последние логи
journalctl -u mcp-fin-office

# Следование логам в реальном времени
journalctl -u mcp-fin-office -f

# Логи за последний час
journalctl -u mcp-fin-office --since "1 hour ago"
```

### Ручное управление

```bash
# Остановка
sudo systemctl stop mcp-fin-office

# Запуск
sudo systemctl start mcp-fin-office

# Перезапуск
sudo systemctl restart mcp-fin-office

# Отключение автозапуска
sudo systemctl disable mcp-fin-office
```

## Требования

- **Операционная система**: Linux с systemd
- **Права**: `sudo` права для управления systemd сервисами
- **Node.js**: Установленный Node.js (NVM или системная установка)
- **Файлы проекта**:
  - `package.json` в корне проекта
  - Собранное приложение (файл указанный в `package.json` `main`)
  - Опционально: `.envrc` для определения версии Node.js
  - Опционально: `config/` папка для определения порта

## Структура файлов

```
project-root/
├── package.json              # Источник: name, main
├── .envrc                    # Опционально: версия Node.js
├── config/
│   └── default.yaml         # Опционально: webServer.port
├── deploy/
│   ├── srv.sh              # ← Этот скрипт
│   └── srv.sh.readme.md    # ← Эта документация
└── dist/
    └── src/
        └── _core/
            └── index.js     # Главный файл приложения
```

## Диагностика проблем

### Скрипт не может найти Node.js

```bash
# Проверьте доступность Node.js
node -v
which node

# Проверьте NVM установку
ls -la ~/.nvm/versions/node/
```

### Ошибка чтения package.json

```bash
# Проверьте синтаксис JSON
cat package.json | jq .

# Проверьте наличие полей name и main
node -e "const pkg = require('./package.json'); console.log('name:', pkg.name); console.log('main:', pkg.main);"
```

### Ошибка определения порта

```bash
# Проверьте конфигурацию
node -e "const c = require('config'); console.log('port:', c.webServer?.port);"

# Проверьте файлы конфигурации
ls -la config/
cat config/default.yaml | grep -A5 webServer
```

### Права доступа

```bash
# Проверьте права на управление systemd
sudo systemctl --version

# Проверьте права на запись в /etc/systemd/system/
sudo ls -la /etc/systemd/system/
```

## Интеграция с CI/CD

### Автоматическое развертывание

```bash
#!/bin/bash
# deploy.sh

# Сборка проекта
npm ci
npm run build

# Установка/переустановка сервиса
./deploy/srv.sh reinstall

# Проверка успешности запуска
sleep 5
systemctl is-active --quiet mcp-fin-office && echo "Service started successfully"
```

### Скрипт отката

```bash
#!/bin/bash
# rollback.sh

# Остановка текущего сервиса
./deploy/srv.sh delete

# Восстановление предыдущей версии
git checkout HEAD~1
npm ci
npm run build

# Запуск предыдущей версии
./deploy/srv.sh install
```