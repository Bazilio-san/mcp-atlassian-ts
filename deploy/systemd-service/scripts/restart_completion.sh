#!/bin/bash

_restart_completion() {
    local cur=${COMP_WORDS[COMP_CWORD]}
    local services=()
    
    # Путь к конфигурационному файлу
    CONFIG_FILE="/etc/restart-config.json"
    
    # Проверка наличия конфигурационного файла
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Ошибка: Файл конфигурации $CONFIG_FILE не найден" >&2
        return 1
    fi
    
    # Чтение алиасов из конфигурации
    declare -A service_aliases
    while read -r alias service; do
        service_aliases["$alias"]="$service"
    done < <(jq -r '.service_aliases | to_entries[] | "\(.key) \(.value)"' "$CONFIG_FILE" 2>/dev/null)
    
    # Получаем список всех systemd сервисов
    while read -r service; do
        services+=("$service")
    done < <(systemctl list-units --type=service --all | grep '\.service' | awk '{print $1}' | sed 's/\.service$//')
    
    # Добавляем алиасы
    for alias in "${!service_aliases[@]}"; do
        services+=("$alias")
    done
    
    COMPREPLY=($(compgen -W "${services[*]}" -- "$cur"))
}

complete -F _restart_completion restart