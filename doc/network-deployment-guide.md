# Руководство по развертыванию MCP Atlassian сервера в сети

## 🚀 Обзор

Данное руководство описывает как развернуть MCP Atlassian сервер как сетевой HTTP-сервис на одном Linux сервере для использования с других серверов по сети.

## 📋 Архитектура развертывания

```
┌─────────────────┐    HTTP/HTTPS     ┌─────────────────┐
│   Client Linux  │ ──────────────── │  Server Linux   │
│    (Consumer)   │      :3000       │   (MCP Server)  │
└─────────────────┘                  └─────────────────┘
                                             │
                                             │ HTTPS API
                                             ▼
                                    ┌─────────────────┐
                                    │   Atlassian     │
                                    │ (JIRA/Confluence) │
                                    └─────────────────┘
```

---

## 🖥️ Развертывание на сервере (Linux Server)

### Требования к системе

- **OS:** Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Node.js:** 18+ 
- **RAM:** минимум 512MB (рекомендуется 1GB+)
- **Storage:** 1GB свободного места
- **Network:** доступ к Atlassian instance

### Метод 1: Docker развертывание (Рекомендуется)

#### 1.1 Установка Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# Перелогиниться для применения группы docker
su - $USER
```

#### 1.2 Клонирование проекта

```bash
# Создать рабочую директорию
sudo mkdir -p /opt/mcp-atlassian
sudo chown $USER:$USER /opt/mcp-atlassian
cd /opt/mcp-atlassian

# Клонировать репозиторий (замените URL на актуальный)
git clone https://github.com/your-org/mcp-atlassian-js.git .

# Или скопировать файлы с локального сервера
scp -r /path/to/mcp-atlassian-js/* user@server:/opt/mcp-atlassian/
```

#### 1.3 Конфигурация окружения

```bash
# Создать файл окружения
cp .env.example .env

# Настроить переменные окружения
nano .env
```

Содержимое `.env`:
```bash
# === ОБЯЗАТЕЛЬНЫЕ НАСТРОЙКИ ===

# Atlassian Configuration
ATLASSIAN_URL=https://your-company.atlassian.net
ATLASSIAN_EMAIL=your-service-account@company.com
ATLASSIAN_API_TOKEN=ATATT3xFfGF0T5o...

# Network Configuration  
PORT=3000
NODE_ENV=production
TRANSPORT_TYPE=http

# === ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ===

# Logging
LOG_LEVEL=info

# Security & Performance
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Caching
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=1000

# Health check endpoint
HEALTH_CHECK_ENABLED=true
```

#### 1.4 Сборка и запуск Docker контейнера

```bash
# Сборка образа
sudo docker build -t mcp-atlassian:latest .

# Создание и запуск контейнера
sudo docker run -d \
  --name mcp-atlassian-server \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v /opt/mcp-atlassian/logs:/app/logs \
  -v /opt/mcp-atlassian/.env:/app/.env:ro \
  mcp-atlassian:latest

# Проверка статуса
sudo docker logs mcp-atlassian-server
sudo docker ps
```

#### 1.5 Использование Docker Compose (альтернатива)

```bash
# Запуск с Docker Compose
sudo docker-compose up -d

# Проверка логов
sudo docker-compose logs -f mcp-atlassian

# Остановка
sudo docker-compose down
```

### Метод 2: Нативная установка

#### 2.1 Установка Node.js

```bash
# Установка Node.js 18+ через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Или через nvm (рекомендуется)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 2.2 Установка и конфигурация

```bash
# Создание пользователя для сервиса
sudo useradd -r -s /bin/false mcp-atlassian
sudo mkdir -p /opt/mcp-atlassian
sudo chown mcp-atlassian:mcp-atlassian /opt/mcp-atlassian

# Переключение на рабочую директорию
cd /opt/mcp-atlassian

# Копирование файлов проекта
sudo cp -r /path/to/your/project/* .
sudo chown -R mcp-atlassian:mcp-atlassian .

# Установка зависимостей
sudo -u mcp-atlassian npm ci --production

# Сборка проекта
sudo -u mcp-atlassian npm run build

# Создание конфигурации
sudo -u mcp-atlassian cp .env.example .env
sudo -u mcp-atlassian nano .env
```

#### 2.3 Создание systemd сервиса

```bash
# Создание файла сервиса
sudo tee /etc/systemd/system/mcp-atlassian.service << EOF
[Unit]
Description=MCP Atlassian TypeScript Server
After=network.target
Requires=network.target

[Service]
Type=simple
User=mcp-atlassian
Group=mcp-atlassian
WorkingDirectory=/opt/mcp-atlassian
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-atlassian/.env
ExecStart=/usr/bin/node dist/src/index.js
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
Restart=always
RestartSec=10
SyslogIdentifier=mcp-atlassian

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mcp-atlassian/logs
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictRealtime=true

[Install]
WantedBy=multi-user.target
EOF

# Запуск и включение сервиса
sudo systemctl daemon-reload
sudo systemctl enable mcp-atlassian
sudo systemctl start mcp-atlassian

# Проверка статуса
sudo systemctl status mcp-atlassian
```

---

## 🔧 Конфигурация сети и безопасности

### Настройка файрвола

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw enable

# iptables (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Или более строгие правила (только с определенных IP)
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### Настройка Nginx (Reverse Proxy) - Опционально

```bash
# Установка Nginx
sudo apt-get install nginx

# Создание конфигурации
sudo tee /etc/nginx/sites-available/mcp-atlassian << EOF
server {
    listen 80;
    server_name mcp-server.yourdomain.com;  # Замените на ваш домен
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name mcp-server.yourdomain.com;
    
    # SSL Configuration (получите сертификат через Let's Encrypt)
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy configuration
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint (публичный доступ)
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
EOF

# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/mcp-atlassian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 💻 Использование с клиентского Linux сервера

### Метод 1: HTTP REST API

```bash
# Тестирование соединения
curl http://YOUR_SERVER_IP:3000/health

# Пример вызова MCP tool
curl -X POST http://YOUR_SERVER_IP:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "jira_get_issue",
      "arguments": {
        "issueKey": "PROJ-123"
      }
    }
  }'
```

### Метод 2: Создание клиентской библиотеки

```bash
# Создание простого клиента на Python
cat > mcp_client.py << 'EOF'
#!/usr/bin/env python3
import requests
import json
import sys

class MCPAtlassianClient:
    def __init__(self, server_url):
        self.server_url = server_url.rstrip('/')
        self.session = requests.Session()
    
    def health_check(self):
        """Проверка состояния сервера"""
        try:
            response = self.session.get(f"{self.server_url}/health", timeout=10)
            return response.status_code == 200
        except Exception as e:
            print(f"Health check failed: {e}")
            return False
    
    def call_tool(self, tool_name, arguments):
        """Вызов MCP tool"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        try:
            response = self.session.post(
                f"{self.server_url}/mcp",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            return {"error": str(e)}

# Пример использования
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 mcp_client.py <server_ip>")
        sys.exit(1)
    
    server_ip = sys.argv[1]
    client = MCPAtlassianClient(f"http://{server_ip}:3000")
    
    # Проверка соединения
    if not client.health_check():
        print("❌ Server is not available")
        sys.exit(1)
    
    print("✅ Server is healthy")
    
    # Пример получения issue
    result = client.call_tool("jira_get_issue", {"issueKey": "PROJ-123"})
    print("Result:", json.dumps(result, indent=2))
EOF

chmod +x mcp_client.py

# Использование
python3 mcp_client.py 192.168.1.100
```

### Метод 3: Bash скрипт для простых запросов

```bash
# Создание Bash клиента
cat > mcp_bash_client.sh << 'EOF'
#!/bin/bash

SERVER_URL="http://$1:3000"

if [ -z "$1" ]; then
    echo "Usage: $0 <server_ip> [tool_name] [arguments_json]"
    exit 1
fi

# Health check
health_check() {
    echo "🔍 Checking server health..."
    if curl -s -f "$SERVER_URL/health" > /dev/null; then
        echo "✅ Server is healthy"
        return 0
    else
        echo "❌ Server is not available"
        return 1
    fi
}

# Call MCP tool
call_tool() {
    local tool_name="$1"
    local arguments="$2"
    
    if [ -z "$tool_name" ]; then
        echo "❌ Tool name is required"
        return 1
    fi
    
    if [ -z "$arguments" ]; then
        arguments="{}"
    fi
    
    echo "🚀 Calling tool: $tool_name"
    
    curl -X POST "$SERVER_URL/mcp" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": 1,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"$tool_name\",
                \"arguments\": $arguments
            }
        }" | jq '.'
}

# Main
health_check || exit 1

if [ -n "$2" ]; then
    call_tool "$2" "$3"
else
    echo "ℹ️  Server is ready. Use: $0 <server_ip> <tool_name> [arguments_json]"
fi
EOF

chmod +x mcp_bash_client.sh

# Примеры использования:
./mcp_bash_client.sh 192.168.1.100
./mcp_bash_client.sh 192.168.1.100 jira_get_issue '{"issueKey":"PROJ-123"}'
./mcp_bash_client.sh 192.168.1.100 jira_search_issues '{"jql":"project = PROJ AND status = Open", "maxResults": 10}'
```

---

## 📊 Мониторинг и обслуживание

### Проверка состояния сервиса

```bash
# Docker
sudo docker ps
sudo docker logs mcp-atlassian-server
sudo docker stats mcp-atlassian-server

# Systemd
sudo systemctl status mcp-atlassian
sudo journalctl -u mcp-atlassian -f

# Проверка портов
sudo netstat -tlnp | grep :3000
sudo ss -tlnp | grep :3000
```

### Настройка логирования

```bash
# Создание директории для логов
sudo mkdir -p /var/log/mcp-atlassian
sudo chown mcp-atlassian:mcp-atlassian /var/log/mcp-atlassian

# Настройка ротации логов
sudo tee /etc/logrotate.d/mcp-atlassian << EOF
/var/log/mcp-atlassian/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload mcp-atlassian
    endscript
}
EOF
```

### Мониторинг производительности

```bash
# Создание скрипта мониторинга
cat > /opt/mcp-atlassian/monitor.sh << 'EOF'
#!/bin/bash

HEALTH_URL="http://localhost:3000/health"
LOG_FILE="/var/log/mcp-atlassian/monitor.log"

check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if curl -s -f $HEALTH_URL > /dev/null; then
        echo "[$timestamp] ✅ Service is healthy" >> $LOG_FILE
        return 0
    else
        echo "[$timestamp] ❌ Service is down" >> $LOG_FILE
        
        # Попытка перезапуска (для systemd)
        systemctl restart mcp-atlassian
        echo "[$timestamp] 🔄 Service restarted" >> $LOG_FILE
        
        return 1
    fi
}

check_health
EOF

chmod +x /opt/mcp-atlassian/monitor.sh

# Добавление в cron для проверки каждые 5 минут
echo "*/5 * * * * /opt/mcp-atlassian/monitor.sh" | sudo crontab -
```

---

## 🔒 Безопасность и лучшие практики

### 1. Безопасность API токенов

```bash
# Создание secure .env файла
sudo chown root:mcp-atlassian /opt/mcp-atlassian/.env
sudo chmod 640 /opt/mcp-atlassian/.env

# Использование секретов через файлы (рекомендуется)
echo "your-api-token" | sudo tee /opt/mcp-atlassian/secrets/api-token > /dev/null
sudo chown root:mcp-atlassian /opt/mcp-atlassian/secrets/api-token
sudo chmod 600 /opt/mcp-atlassian/secrets/api-token
```

### 2. Rate Limiting и DDoS защита

```bash
# В .env файле
RATE_LIMIT_WINDOW_MS=60000          # 1 минута
RATE_LIMIT_MAX_REQUESTS=50          # Максимум 50 запросов за минуту
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
```

### 3. SSL/TLS (если используется без Nginx)

```bash
# Добавление в .env для прямого HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/certificate.pem
SSL_KEY_PATH=/path/to/private.key
```

---

## 🚨 Устранение неполадок

### Общие проблемы

#### 1. Сервер не запускается

```bash
# Проверка логов
sudo journalctl -u mcp-atlassian -n 50

# Проверка конфигурации
sudo -u mcp-atlassian node -e "
const config = require('./dist/core/config/index.js');
console.log('Config loaded successfully');
"

# Проверка портов
sudo lsof -i :3000
```

#### 2. Проблемы с аутентификацией Atlassian

```bash
# Тестирование API токена вручную
curl -u "your-email@company.com:your-api-token" \
  https://your-company.atlassian.net/rest/api/2/myself

# Проверка прав доступа токена
curl -u "your-email@company.com:your-api-token" \
  https://your-company.atlassian.net/rest/api/2/permissions
```

#### 3. Проблемы с сетевым доступом

```bash
# Проверка файрвола
sudo ufw status
sudo iptables -L | grep 3000

# Проверка привязки к интерфейсам
sudo netstat -tlnp | grep :3000

# Тестирование с клиента
curl -v http://SERVER_IP:3000/health
telnet SERVER_IP 3000
```

### Диагностические команды

```bash
# Полная диагностика
cat > diagnostic.sh << 'EOF'
#!/bin/bash

echo "=== MCP Atlassian Server Diagnostics ==="
echo "Date: $(date)"
echo ""

echo "=== System Info ==="
uname -a
echo ""

echo "=== Service Status ==="
systemctl status mcp-atlassian --no-pager
echo ""

echo "=== Port Status ==="
sudo netstat -tlnp | grep :3000
echo ""

echo "=== Recent Logs ==="
sudo journalctl -u mcp-atlassian -n 20 --no-pager
echo ""

echo "=== Health Check ==="
curl -s http://localhost:3000/health | jq '.' || echo "Health check failed"
echo ""

echo "=== Resource Usage ==="
ps aux | grep -E '(node|mcp-atlassian)'
echo ""

echo "=== Disk Space ==="
df -h /opt/mcp-atlassian
echo ""
EOF

chmod +x diagnostic.sh
./diagnostic.sh
```

---

## 📚 Примеры интеграции

### Node.js клиент

```javascript
// mcp-client.js
const axios = require('axios');

class MCPClient {
    constructor(serverUrl) {
        this.baseUrl = serverUrl;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async callTool(toolName, arguments = {}) {
        try {
            const response = await this.client.post('/mcp', {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: arguments
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`MCP call failed: ${error.message}`);
        }
    }

    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

// Пример использования
async function example() {
    const client = new MCPClient('http://192.168.1.100:3000');
    
    if (!(await client.healthCheck())) {
        console.error('Server is not healthy');
        return;
    }

    try {
        const result = await client.callTool('jira_search_issues', {
            jql: 'project = PROJ AND status = Open',
            maxResults: 10
        });
        
        console.log('Search results:', result);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
```

---

## 📈 Производительность и масштабирование

### Оптимизация производительности

```bash
# В .env файле
# Увеличение размера кеша для высокой нагрузки
CACHE_MAX_ITEMS=10000
CACHE_TTL_SECONDS=600

# Оптимизация Node.js
NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"

# Использование кластеризации (для высоких нагрузок)
CLUSTER_WORKERS=4
```

### Load Balancer конфигурация (HAProxy)

```bash
# /etc/haproxy/haproxy.cfg
frontend mcp_frontend
    bind *:3000
    mode http
    default_backend mcp_backend

backend mcp_backend
    mode http
    balance roundrobin
    option httpchk GET /health
    server mcp1 127.0.0.1:3001 check
    server mcp2 127.0.0.1:3002 check
```

---

Данное руководство покрывает все основные аспекты развертывания MCP Atlassian сервера в сетевой среде с акцентом на безопасность, надежность и производительность.
