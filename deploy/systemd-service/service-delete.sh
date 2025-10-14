#!/usr/bin/bash

c="\e[1;36m"; lc="\e[0;36m";
g="\e[1;32m"; lg="\e[0;32m";
c0='\033[0;0m'

if [ -n "$1" ]; then WS_PORT="$1"; else WS_PORT=9015; fi
if [ -n "$2" ]; then SERVICE="$2"; else SERVICE="mcp-jira"; fi

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
  echo -e "$c**** Удаление сервиса $g$SERVICE$c слушающего порт $g$WS_PORT$c ****$c0"
  systemctl stop $SERVICE
  systemctl disable --now $SERVICE
  rm /etc/systemd/system/$SERVICE.service
  PID=$(lsof -i tcp:$WS_PORT | grep $WS_PORT | awk '{print $2}' | head -1)
  if [ ! -z "$PID" ]; then kill $PID; fi
  systemctl daemon-reload
  echo -e "$c**** Сервис удален ****$c0"
else
  echo -e "$c**** Сервис $g$SERVICE$c не найден ****$c0"
fi

