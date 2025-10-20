#!/bin/bash

# Чтение конфигурации из файла
CONFIG_FILE="/etc/restart-config.json"

# Проверка наличия конфигурационного файла
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Ошибка: Файл конфигурации $CONFIG_FILE не найден"
    exit 1
fi

# Чтение алиасов из конфигурации
declare -A service_aliases

if ! jq -e '.service_aliases' "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "Ошибка: Некорректный формат конфигурационного файла $CONFIG_FILE"
    echo "Пожалуйста, проверьте синтаксис JSON"
    exit 1
fi

while read -r alias service; do
    service_aliases["$alias"]="$service"
done < <(jq -r '.service_aliases | to_entries[] | "\(.key) \(.value)"' "$CONFIG_FILE")

# Проверяем, был ли передан аргумент
if [ $# -ne 1 ]; then
    echo "Использование: restart <сервис или алиас>"
    exit 1
fi

SERVICE="$1"

# Если введенное значение - алиас, заменяем его полным именем сервиса
if [[ -n "${service_aliases[$SERVICE]}" ]]; then
    ORIGINAL_SERVICE="$SERVICE"
    SERVICE="${service_aliases[$SERVICE]}"
    echo "Используется алиас: $ORIGINAL_SERVICE -> $SERVICE"
fi

# Проверяем существование сервиса
if ! systemctl list-units --type=service | grep -q "$SERVICE.service"; then
    echo "Ошибка: Сервис $SERVICE не найден"
    exit 1
fi

# Выполняем перезапуск
echo "Перезапуск сервиса $SERVICE..."
systemctl restart "$SERVICE"

# Вывод статуса после перезапуска
systemctl status "$SERVICE" --no-pager
