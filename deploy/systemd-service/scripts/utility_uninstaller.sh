#!/bin/bash

# Скрипт для удаления утилит restart и logs и всех их компонентов

# Проверка прав суперпользователя
if [ "$(id -u)" -ne 0 ]; then
    echo "Ошибка: этот скрипт должен быть запущен с правами суперпользователя (sudo)"
    exit 1
fi

# Определение путей установки
RESTART_SCRIPT="/usr/local/bin/restart"
LOGS_SCRIPT="/usr/local/bin/logs"
RESTART_COMPLETION_SCRIPT="/etc/bash_completion.d/restart"
LOGS_COMPLETION_SCRIPT="/etc/bash_completion.d/logs"
CONFIG_FILE="/etc/restart-config.json"

echo "Начинаем удаление утилит restart и logs..."

# Удаление файлов
echo "Удаление файлов..."
rm -f "$RESTART_SCRIPT"
rm -f "$LOGS_SCRIPT"
rm -f "$RESTART_COMPLETION_SCRIPT"
rm -f "$LOGS_COMPLETION_SCRIPT"
rm -f "$CONFIG_FILE"

# Проверка удаления
echo "Проверка удаления..."
if [ ! -f "$RESTART_SCRIPT" ] && [ ! -f "$LOGS_SCRIPT" ] && [ ! -f "$RESTART_COMPLETION_SCRIPT" ] && [ ! -f "$LOGS_COMPLETION_SCRIPT" ] && [ ! -f "$CONFIG_FILE" ]; then
    echo "✓ Проверка удаления успешна"
else
    echo "✗ Проверка удаления неуспешна"
    exit 1
fi

echo "Утилиты restart и logs успешно удалены!"
echo "Автодополнение будет отключено в новых сессиях терминала"

exit 0
