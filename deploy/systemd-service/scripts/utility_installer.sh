#!/bin/bash

# Скрипт для установки утилит restart и logs и всех их компонентов

# Проверка прав суперпользователя
if [ "$(id -u)" -ne 0 ]; then
    echo "Ошибка: этот скрипт должен быть запущен с правами суперпользователя (sudo)"
    exit 1
fi

# Получение директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Определение путей установки
RESTART_SCRIPT="/usr/local/bin/restart"
LOGS_SCRIPT="/usr/local/bin/logs"
RESTART_COMPLETION_SCRIPT="/etc/bash_completion.d/restart"
LOGS_COMPLETION_SCRIPT="/etc/bash_completion.d/logs"
CONFIG_FILE="/etc/restart-config.json"

echo "Начинаем установку утилит restart и logs..."

# Установка зависимостей
echo "Установка зависимостей..."
apt-get update > /dev/null
apt-get install -y jq > /dev/null 2>&1 || {
    echo "Ошибка: не удалось установить jq. Проверьте подключение к интернету и доступ к репозиториям."
    exit 1
}

# Проверка наличия файлов для установки
for file in "restart_service_with_alias.sh" "restart_completion.sh" "logs_service_with_alias.sh" "logs_completion.sh" "service_aliases.json"; do
    if [ ! -f "$file" ]; then
        echo "Ошибка: файл $file не найден в текущей директории"
        exit 1
    fi
done

# Копирование файлов
echo "Копирование файлов..."
cp "restart_service_with_alias.sh" "$RESTART_SCRIPT"
cp "logs_service_with_alias.sh" "$LOGS_SCRIPT"
cp "restart_completion.sh" "$RESTART_COMPLETION_SCRIPT"
cp "logs_completion.sh" "$LOGS_COMPLETION_SCRIPT"
cp "service_aliases.json" "$CONFIG_FILE"

# Настройка прав доступа
echo "Настройка прав доступа..."
chmod 755 "$RESTART_SCRIPT"
chmod 755 "$LOGS_SCRIPT"
chmod 644 "$RESTART_COMPLETION_SCRIPT"
chmod 644 "$LOGS_COMPLETION_SCRIPT"
chmod 644 "$CONFIG_FILE"

# Перезагрузка bash_completion
echo "Активация автодополнения..."
if [ -f /etc/bash_completion ]; then
    source /etc/bash_completion
fi

echo "Проверка установки..."
if [ -f "$RESTART_SCRIPT" ] && [ -f "$LOGS_SCRIPT" ] && [ -f "$RESTART_COMPLETION_SCRIPT" ] && [ -f "$LOGS_COMPLETION_SCRIPT" ] && [ -f "$CONFIG_FILE" ]; then
    echo "✓ Проверка файлов успешна"
else
    echo "✗ Проверка файлов неуспешна"
    exit 1
fi

echo "Утилиты restart и logs успешно установлены!"
echo ""
echo "Использование:"
echo "  restart <сервис или алиас> - перезапустить службу systemd"
echo "  logs <сервис или алиас> - просмотреть логи службы systemd"
echo ""
echo "Автодополнение будет доступно в новых сессиях терминала"
echo "Для активации в текущей сессии выполните: source /etc/bash_completion.d/restart и source /etc/bash_completion.d/logs"
echo ""
echo "Конфигурация алиасов находится в $CONFIG_FILE"
echo "Вы можете добавить свои алиасы, отредактировав этот файл"

exit 0
