# Utilities for managing systemd services

These utilities provide a convenient way to manage systemd services using aliases and auto-completion.

## Installation

```shell
cd <path to project>/deploy/systemd-service/scripts/
sudo ./utility_installer.sh
```

## Usage

### Restarting service
```bash
restart jira-bot  # Restarts jira-bot service
restart jb        # Same using alias
```

### Viewing service logs
```bash
logs jira-bot    # View jira-bot service logs
logs jb          # Same using alias
```

## Configuring aliases

Aliases are configured in the `/etc/restart-config.json` file. You can edit this file to add new aliases.

```json
{
  "service_aliases": {
    "mb": "multi-bot",
    "jb": "jira-bot"
    "mcpj": "mcp-jira"
  }
}
```
