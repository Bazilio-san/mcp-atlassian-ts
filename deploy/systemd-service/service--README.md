## Installing application as a daemon via systemctl

**Via script:**

```shell
cd /var/opt/node/mcp-jira/deploy/systemd-service/
sudo ./service-install.sh
```

**Manually:**

```shell
SERVICE="mcp-jira"
# Copy file
cd /var/opt/node/$SERVICE/systemd-service
sudo cp ./service.service /etc/systemd/system/$SERVICE.service

# Update service configuration
sudo systemctl daemon-reload

# Enable service without starting it. It will start automatically on next system reboot.
systemctl enable $SERVICE
# Start service
systemctl start $SERVICE

# Enable and start service
systemctl enable --now $SERVICE

# Check status
sudo systemctl -l status $SERVICE

# Stop
sudo systemctl stop $SERVICE

# Restart
sudo systemctl restart $SERVICE
```


## Viewing service logs

[journalctl cheatsheet in Linux](https://losst.pro/shpargalka-po-journalctl-v-linux)

```shell
# Logs are saved by default to /var/log/syslog
sudo journalctl -o cat -xefu mcp-jira

# -u Show messages for the specified systemd unit
# -f Show only the most recent journal entries, and continuously print new entries as they are appended to the journal.
# -e Immediately jump to the end of the journal inside the implied pager tool. This implies -n1000 to guarantee that the pager will not buffer logs of unbounded size
# -x - add error explanations, documentation links or forums where possible

sudo journalctl --vacuum-size=1K
```


## Removing service

**Via script:**

```shell
SERVICE="mcp-jira"
cd /var/opt/node/$SERVICE/systemd-service
sudo ./service-delete.sh
```

**Manually:**

```shell
SERVICE="mcp-jira"
systemctl stop $SERVICE
systemctl disable --now $SERVICE
rm /etc/systemd/system/$SERVICE.service
# Command to remove process occupying port
WS_PORT=9015 && lsof -i tcp:$WS_PORT | grep $WS_PORT | awk '{print $2}' | head -1 | xargs kill
systemctl daemon-reload
```

## Reinstalling service

**Via script:**

```shell
SERVICE="mcp-jira"
cd /var/opt/node/$SERVICE/systemd-service
sudo ./service-reinstall.sh
```

**Manually:**

```shell
SERVICE="mcp-jira"
cd /home/bio/service/$SERVICE
systemctl stop $SERVICE
systemctl disable --now $SERVICE
rm /etc/systemd/system/$SERVICE.service
# Command to remove process occupying port
WS_PORT=9015 && lsof -i tcp:$WS_PORT | grep $WS_PORT | awk '{print $2}' | head -1 | xargs kill
systemctl daemon-reload

sudo cp ./service.service /etc/systemd/system/$SERVICE.service
systemctl enable $SERVICE
systemctl restart $SERVICE
systemctl status $SERVICE
journalctl -o cat -xefu $SERVICE
```
