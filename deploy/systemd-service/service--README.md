## Установка приложения в качестве демона через systemctl

**Через скрипт:**

```shell
cd /var/opt/node/mcp-jira/deploy/systemd-service/
sudo ./service-install.sh
```

**Руками:**

```shell
SERVICE="mcp-jira"
# Скопировать файл
cd /var/opt/node/$SERVICE/systemd-service
sudo cp ./service.service /etc/systemd/system/$SERVICE.service

# Обновить конфигурацию служб
sudo systemctl daemon-reload

# Включить службу, не запуская ее. Он запустится автоматически при следующем перезапуске системы.
systemctl enable $SERVICE
# Запустить службу
systemctl start $SERVICE

# Включить и запустить службу
systemctl enable --now $SERVICE

# Проверка статуса
sudo systemctl -l status $SERVICE

# Остановка
sudo systemctl stop $SERVICE

# Перезапуск
sudo systemctl restart $SERVICE
```


## Просмотр логов сервиса

[Шпаргалка по journalctl в Linux](https://losst.pro/shpargalka-po-journalctl-v-linux)

```shell
# Логи сохраняются стандартно в /var/log/syslog
sudo journalctl -o cat -xefu mcp-jira

# -u Show messages for the specified systemd unit
# -f Show only the most recent journal entries, and continuously print new entries as they are appended to the journal.
# -e Immediately jump to the end of the journal inside the implied pager tool. This implies -n1000 to guarantee that the pager will not buffer logs of unbounded size
# -x - добавить к информации об ошибках пояснения, ссылки на документацию или форумы там, где это возможно

sudo journalctl --vacuum-size=1K
```


## Удаление службы

**Через скрипт:**

```shell
SERVICE="mcp-jira"
cd /var/opt/node/$SERVICE/systemd-service
sudo ./service-delete.sh
```

**Руками:**

```shell
SERVICE="mcp-jira"
systemctl stop $SERVICE
systemctl disable --now $SERVICE
rm /etc/systemd/system/$SERVICE.service
# Команда удаления процесса, занимающего порт
WS_PORT=9015 && lsof -i tcp:$WS_PORT | grep $WS_PORT | awk '{print $2}' | head -1 | xargs kill
systemctl daemon-reload
```

## Переустановка службы

**Через скрипт:**

```shell
SERVICE="mcp-jira"
cd /var/opt/node/$SERVICE/systemd-service
sudo ./service-reinstall.sh
```

**Руками:**

```shell
SERVICE="mcp-jira"
cd /home/bio/service/$SERVICE
systemctl stop $SERVICE
systemctl disable --now $SERVICE
rm /etc/systemd/system/$SERVICE.service
# Команда удаления процесса, занимающего порт
WS_PORT=9015 && lsof -i tcp:$WS_PORT | grep $WS_PORT | awk '{print $2}' | head -1 | xargs kill
systemctl daemon-reload

sudo cp ./service.service /etc/systemd/system/$SERVICE.service
systemctl enable $SERVICE
systemctl restart $SERVICE
systemctl status $SERVICE
journalctl -o cat -xefu $SERVICE
```
