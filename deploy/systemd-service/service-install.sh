#!/usr/bin/bash

c="\e[1;36m"; lc="\e[0;36m";
g="\e[1;32m"; lg="\e[0;32m";
m="\e[1;35m"; lm="\e[0;35m";
r="\e[1;31m"; lr="\e[0;31m";
y="\e[1;33m"; ly="\e[0;33m";
c0='\033[0;0m'

if [ -n "$1" ]; then SERVICE="$1"; else SERVICE="mcp-jira"; fi

service_exists() {
    local n=$1
    if [[ $(systemctl list-units --all -t service --full --no-legend "$n.service" | sed 's/●//g' | sed 's/^\s*//g' | cut -f1 -d' ') == $n.service ]]; then
        return 0
    else
        return 1
    fi
}

if service_exists "$SERVICE"
then
  echo -e "$c**** Service $g$SERVICE$c already installed ****$c0"
else
  echo -e "$c**** Installing service $g$SERVICE$c ****$c0"

  cp ./service.service /etc/systemd/system/$SERVICE.service
  # Update service configuration
  systemctl daemon-reload
  # Enable and start service
  systemctl enable --now $SERVICE

  echo -e "$c**** Service $g$SERVICE$c installed ****$c0"
  echo ""
  echo -e "${m}View log status: ${y}systemctl -l status $SERVICE$c0"
  echo ""
  echo -e "${m}View log: ${y}journalctl -o cat -xefu $SERVICE$c0"
  echo ""
fi
