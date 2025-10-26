#!/bin/bash

_logs_completion() {
    local cur=${COMP_WORDS[COMP_CWORD]}
    local services=()

    # Path to configuration file
    CONFIG_FILE="/etc/restart-config.json"

    # Check for configuration file presence
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Error: Configuration file $CONFIG_FILE not found" >&2
        return 1
    fi

    # Read aliases from configuration
    declare -A service_aliases
    while read -r alias service; do
        service_aliases["$alias"]="$service"
    done < <(jq -r '.service_aliases | to_entries[] | "\(.key) \(.value)"' "$CONFIG_FILE" 2>/dev/null)

    # Get list of all systemd services
    while read -r service; do
        services+=("$service")
    done < <(systemctl list-units --type=service --all | grep '\.service' | awk '{print $1}' | sed 's/\.service$//')

    # Add aliases
    for alias in "${!service_aliases[@]}"; do
        services+=("$alias")
    done

    COMPREPLY=($(compgen -W "${services[*]}" -- "$cur"))
}

complete -F _logs_completion logs
