#!/bin/bash

# Script to remove restart and logs utilities and all their components

# Check for superuser privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: this script must be run with superuser privileges (sudo)"
    exit 1
fi

# Define installation paths
RESTART_SCRIPT="/usr/local/bin/restart"
LOGS_SCRIPT="/usr/local/bin/logs"
RESTART_COMPLETION_SCRIPT="/etc/bash_completion.d/restart"
LOGS_COMPLETION_SCRIPT="/etc/bash_completion.d/logs"
CONFIG_FILE="/etc/restart-config.json"

echo "Starting removal of restart and logs utilities..."

# Remove files
echo "Removing files..."
rm -f "$RESTART_SCRIPT"
rm -f "$LOGS_SCRIPT"
rm -f "$RESTART_COMPLETION_SCRIPT"
rm -f "$LOGS_COMPLETION_SCRIPT"
rm -f "$CONFIG_FILE"

# Verify removal
echo "Verifying removal..."
if [ ! -f "$RESTART_SCRIPT" ] && [ ! -f "$LOGS_SCRIPT" ] && [ ! -f "$RESTART_COMPLETION_SCRIPT" ] && [ ! -f "$LOGS_COMPLETION_SCRIPT" ] && [ ! -f "$CONFIG_FILE" ]; then
    echo "✓ Removal verification successful"
else
    echo "✗ Removal verification failed"
    exit 1
fi

echo "Utilities restart and logs successfully removed!"
echo "Auto-completion will be disabled in new terminal sessions"

exit 0
