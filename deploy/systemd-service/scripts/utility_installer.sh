#!/bin/bash

# Script to install restart and logs utilities and all their components

# Check for superuser privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: this script must be run with superuser privileges (sudo)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Define installation paths
RESTART_SCRIPT="/usr/local/bin/restart"
LOGS_SCRIPT="/usr/local/bin/logs"
RESTART_COMPLETION_SCRIPT="/etc/bash_completion.d/restart"
LOGS_COMPLETION_SCRIPT="/etc/bash_completion.d/logs"
CONFIG_FILE="/etc/restart-config.json"

echo "Starting installation of restart and logs utilities..."

# Install dependencies
echo "Installing dependencies..."
apt-get update > /dev/null
apt-get install -y jq > /dev/null 2>&1 || {
    echo "Error: failed to install jq. Check internet connection and repository access."
    exit 1
}

# Check for presence of installation files
for file in "restart_service_with_alias.sh" "restart_completion.sh" "logs_service_with_alias.sh" "logs_completion.sh" "service_aliases.json"; do
    if [ ! -f "$file" ]; then
        echo "Error: file $file not found in current directory"
        exit 1
    fi
done

# Copy files
echo "Copying files..."
cp "restart_service_with_alias.sh" "$RESTART_SCRIPT"
cp "logs_service_with_alias.sh" "$LOGS_SCRIPT"
cp "restart_completion.sh" "$RESTART_COMPLETION_SCRIPT"
cp "logs_completion.sh" "$LOGS_COMPLETION_SCRIPT"
cp "service_aliases.json" "$CONFIG_FILE"

# Set file permissions
echo "Setting file permissions..."
chmod 755 "$RESTART_SCRIPT"
chmod 755 "$LOGS_SCRIPT"
chmod 644 "$RESTART_COMPLETION_SCRIPT"
chmod 644 "$LOGS_COMPLETION_SCRIPT"
chmod 644 "$CONFIG_FILE"

# Reload bash_completion
echo "Activating auto-completion..."
if [ -f /etc/bash_completion ]; then
    source /etc/bash_completion
fi

echo "Verifying installation..."
if [ -f "$RESTART_SCRIPT" ] && [ -f "$LOGS_SCRIPT" ] && [ -f "$RESTART_COMPLETION_SCRIPT" ] && [ -f "$LOGS_COMPLETION_SCRIPT" ] && [ -f "$CONFIG_FILE" ]; then
    echo "✓ File verification successful"
else
    echo "✗ File verification failed"
    exit 1
fi

echo "Utilities restart and logs successfully installed!"
echo ""
echo "Usage:"
echo "  restart <service or alias> - restart systemd service"
echo "  logs <service or alias> - view systemd service logs"
echo ""
echo "Auto-completion will be available in new terminal sessions"
echo "To activate in current session run: source /etc/bash_completion.d/restart and source /etc/bash_completion.d/logs"
echo ""
echo "Alias configuration is located in $CONFIG_FILE"
echo "You can add your own aliases by editing this file"

exit 0
