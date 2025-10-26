#!/bin/bash

# Read configuration from file
CONFIG_FILE="/etc/restart-config.json"

# Check for configuration file presence
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file $CONFIG_FILE not found"
    exit 1
fi

# Read aliases from configuration
declare -A service_aliases

if ! jq -e '.service_aliases' "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "Error: Incorrect format of configuration file $CONFIG_FILE"
    echo "Please check JSON syntax"
    exit 1
fi

while read -r alias service; do
    service_aliases["$alias"]="$service"
done < <(jq -r '.service_aliases | to_entries[] | "\(.key) \(.value)"' "$CONFIG_FILE")

# Check if argument was passed
if [ $# -ne 1 ]; then
    echo "Usage: restart <service or alias>"
    exit 1
fi

SERVICE="$1"

# If entered value is an alias, replace it with full service name
if [[ -n "${service_aliases[$SERVICE]}" ]]; then
    ORIGINAL_SERVICE="$SERVICE"
    SERVICE="${service_aliases[$SERVICE]}"
    echo "Using alias: $ORIGINAL_SERVICE -> $SERVICE"
fi

# Check service existence
if ! systemctl list-units --type=service | grep -q "$SERVICE.service"; then
    echo "Error: Service $SERVICE not found"
    exit 1
fi

# Perform restart
echo "Restarting service $SERVICE..."
systemctl restart "$SERVICE"

# Output status after restart
systemctl status "$SERVICE" --no-pager
