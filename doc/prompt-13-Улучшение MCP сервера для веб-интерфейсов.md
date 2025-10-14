# План-задание: Улучшение MCP сервера для веб-интерфейсов с гибкой аутентификацией

## 📋 Цель

Модернизировать MCP сервер для поддержки веб-интерфейсов с множеством одновременных пользователей, реализовав полный MCP protocol с улучшенным transport layer и гибкой системой аутентификации.

## 🎯 Задачи

### 1. 🔄 Streamable HTTP Transport (Полная поддержка)

**Что реализовать:**
- Полная MCP protocol поддержка на `/mcp/v1`
- URL rewriting для совместимости (`/mcp` → `/mcp/v1`)
- Все MCP методы: `initialize`, `initialized`, `tools/list`, `tools/call`, `resources/list`, `resources/read`
- Правильная обработка JSON-RPC 2.0 с `id` и `result`
- Гибкая аутентификация на основе заголовков

**Пример реализации:**
```typescript
// URL Rewriting middleware
app.use((req, res, next) => {
  if (req.path === '/mcp') {
    req.url = '/mcp/v1' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  }
  next();
});

// Streamable HTTP endpoint
app.post('/mcp/v1', async (req, res) => {
  logger.info(`[Streamable HTTP] New connection`);

  try {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });

    req.on('end', async () => {
      const request = JSON.parse(body.trim());
      let result;

      switch (request.method) {
        case 'initialize':
          result = {
            protocolVersion: '0.1.0',
            capabilities: { tools: {}, resources: {} },
            serverInfo: { name: 'mcp-atlassian', version: '1.0.0' }
          };
          break;

        case 'tools/list':
          const tools = await this.toolRegistry.listTools();
          result = { tools };
          break;

        case 'tools/call':
          const { name, arguments: args } = request.params;
          result = await this.toolRegistry.executeTool(name, args || {}, req.authHeaders);
          break;

        // ... другие методы
      }

      res.json({
        jsonrpc: '2.0',
        id: request.id,
        result
      });
    });
  } catch (error) {
    res.status(400).json({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});
```

### 2. ⚡ SSE Transport

**Что реализовать:**
- Server-Sent Events на `/sse`
- Message endpoint на `/message` для SSE сообщений
- Активный транспорт менеджмент с `sseTransports` Map
- Connection lifecycle с proper cleanup

**Пример реализации:**
```typescript
// Store active SSE transports
const sseTransports = new Map<string, SSEServerTransport>();

// SSE endpoint
app.get('/sse', async (req, res) => {
  logger.info(`[SSE] New connection`);

  // Extract custom headers for authentication
  const customHeaders: Record<string, string> = {};
  Object.keys(req.headers).forEach(headerName => {
    if (headerName.toLowerCase().startsWith('x-')) {
      const headerValue = req.headers[headerName];
      if (typeof headerValue === 'string') {
        customHeaders[headerName] = headerValue;
      }
    }
  });

  const server = this.createServerForHeaders(customHeaders);
  const transport = new SSEServerTransport('/message', res);

  // Store transport
  const transportId = `transport-${Date.now()}-${Math.random()}`;
  sseTransports.set(transportId, transport);

  // Override handlers to pass custom headers
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    this.handleToolCallWithHeaders(request, customHeaders)
  );

  await server.connect(transport);

  // Cleanup on disconnect
  req.on('close', () => {
    logger.info(`[SSE] Connection closed`);
    sseTransports.delete(transportId);
  });
});

// Message endpoint for SSE
app.post('/message', async (req, res) => {
  const transports = Array.from(sseTransports.values());
  if (transports.length === 0) {
    res.status(503).json({ error: 'No active SSE connection' });
    return;
  }

  const transport = transports[transports.length - 1];
  await transport.handlePostMessage(req, res);
});
```

### 3. 🔐 Гибкая система аутентификации

**Что реализовать:**
- Server token validation через `X-Server-Token`
- Два режима аутентификации:
  1. **System mode** (если `X-Server-Token` валиден): используется текущий механизм с данными из конфига
  2. **Header mode** (если токен отсутствует или невалиден): аутентификация через заголовки запроса
- Поддержка `SERVER_TOKEN` из переменных окружения или `config.yaml -> server.token`
- Автоматическое переключение режимов аутентификации

**Логика аутентификации:**
```typescript
interface AuthenticationConfig {
  serverToken?: string; // из SERVER_TOKEN или config.yaml -> server.token
}

class AuthenticationManager {
  private serverToken: string | undefined;

  constructor() {
    // Load server token from environment or config
    this.serverToken = process.env.SERVER_TOKEN ||
                      this.loadServerTokenFromConfig();
  }

  // Middleware для аутентификации
  authenticationMiddleware() {
    return (req, res, next) => {
      const providedToken = req.headers['x-server-token'] as string;

      if (this.isValidServerToken(providedToken)) {
        // System mode: использовать текущую логику
        req.authMode = 'system';
        req.authHeaders = this.getSystemAuthHeaders();
        logger.info('[Auth] System authentication mode - using config credentials');
      } else {
        // Header mode: использовать данные из заголовков
        req.authMode = 'headers';
        req.authHeaders = this.extractAuthHeaders(req.headers);
        logger.info('[Auth] Header-based authentication mode - using request headers');
      }

      next();
    };
  }

  private isValidServerToken(token?: string): boolean {
    return !!(token && this.serverToken && token === this.serverToken);
  }

  private getSystemAuthHeaders(): Record<string, string> {
    // Текущая логика - данные из конфига/переменных окружения
    return {
      // JIRA authentication
      'x-jira-token': process.env.JIRA_PAT || '',
      'x-jira-username': process.env.JIRA_USERNAME || '',
      'x-jira-password': process.env.JIRA_PASSWORD || '',

      // Confluence authentication
      'x-confluence-token': process.env.CONFLUENCE_PAT || '',
      'x-confluence-username': process.env.CONFLUENCE_USERNAME || '',
      'x-confluence-password': process.env.CONFLUENCE_PASSWORD || ''
    };
  }

  private extractAuthHeaders(headers: any): Record<string, string> {
    const authHeaders: Record<string, string> = {};

    // Extract только x- заголовки для аутентификации (кроме server-token)
    Object.keys(headers).forEach(headerName => {
      const lowerHeaderName = headerName.toLowerCase();
      if (lowerHeaderName.startsWith('x-') &&
          !lowerHeaderName.includes('server-token')) {
        const headerValue = headers[headerName];
        if (typeof headerValue === 'string') {
          authHeaders[lowerHeaderName] = headerValue;
        }
      }
    });

    return authHeaders;
  }

  private loadServerTokenFromConfig(): string | undefined {
    try {
      const yaml = require('yaml');
      const fs = require('fs');
      const config = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
      return config?.server?.token;
    } catch (error) {
      logger.warn(`Failed to load server token from config: ${error.message}`);
      return undefined;
    }
  }
}
```

**Пример интеграции в middleware:**
```typescript
// Применять middleware аутентификации до всех других
app.use(this.authManager.authenticationMiddleware());

// Использование в tool execution
app.post('/mcp/v1', async (req, res) => {
  // ... парсинг запроса ...

  // Передача auth headers в выполнение инструмента
  const { name, arguments: args } = request.params;
  result = await this.toolRegistry.executeTool(name, args || {}, req.authHeaders);

  // ... ответ ...
});
```

### 4. 🛡️ Enhanced Security

**Что реализовать:**
- Rate limiting с учетом режима аутентификации
- Server token validation
- CORS для веб-интерфейсов
- Request validation
- Разные лимиты для system и header modes

**Пример реализации:**
```typescript
// Enhanced rate limiting с учетом режима аутентификации
app.use(async (req, res, next) => {
  const authMode = req.authMode || 'unknown';

  // Разные лимиты для разных режимов
  let clientId: string;
  let rateLimitKey: string;

  if (authMode === 'system') {
    // Доверенные клиенты - более мягкие лимиты
    clientId = `system-${req.headers['x-server-token']}`;
    rateLimitKey = `system-${clientId}`;
  } else {
    // Внешние клиенты - более строгие лимиты
    clientId = req.ip || 'anonymous';
    rateLimitKey = `headers-${clientId}`;
  }

  try {
    await this.rateLimiter.consume(rateLimitKey);
    next();
  } catch (error) {
    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Rate limit exceeded for ${authMode} authentication`
      }
    });
  }
});

// Authentication middleware logging
app.use((req, res, next) => {
  if (req.path.startsWith('/sse') || req.path.startsWith('/mcp')) {
    logger.info(`[Auth] Request: ${req.method} ${req.path}, Mode: ${req.authMode}, Headers: ${Object.keys(req.authHeaders || {}).length}`);
  }
  next();
});
```

### 5. 🏗️ Архитектурные изменения

**Структура файлов:**
```
src/
├── core/
│   ├── server/
│   │   ├── index.ts              # Основной сервер
│   │   ├── transports.ts         # Transport management
│   │   ├── auth-manager.ts       # Authentication management
│   │   └── middleware.ts         # Custom middleware
│   └── errors/
│       └── index.ts              # Error handling
├── domains/
│   ├── jira/
│   │   └── tools/
│   │       └── ...               # Existing tools
│   └── confluence/
│       └── tools/
│           └── ...               # Existing tools
└── types/
    └── config.d.ts               # Type definitions
```

## 📝 Implementation Steps

### Phase 1: Foundation
1. ✅ **Анализировать** существующую архитектуру
2. ✅ **Создать** `AuthenticationManager` класс
3. ✅ **Модифицировать** существующий HTTP endpoint
4. ✅ **Добавить** URL rewriting middleware

### Phase 2: Authentication System
1. ✅ **Реализовать** server token validation
2. ✅ **Добавить** system mode authentication (current logic)
3. ✅ **Добавить** header-based authentication mode
4. ✅ **Создать** middleware для автоматического переключения
5. ✅ **Интегрировать** с существующими инструментами

### Phase 3: Transport Layer
1. ✅ **Рефакторить** SSE endpoint с гибкой аутентификацией
2. ✅ **Добавить** `/message` endpoint с поддержкой режимов
3. ✅ **Реализовать** streamable HTTP transport
4. ✅ **Добавить** все MCP методы с поддержкой auth headers

### Phase 4: Security & Performance
1. ✅ **Улучшить** rate limiting с учетом режимов аутентификации
2. ✅ **Добавить** token validation middleware
3. ✅ **Добавить** error handling и logging

### Phase 5: Testing & Documentation
1. ✅ **Тестировать** оба режима аутентификации
2. ✅ **Тестировать** web interface scenarios
3. ✅ **Написать** integration tests
4. ✅ **Обновить** документацию
5. ✅ **Валидировать** MCP protocol compliance

## 🔧 Code Examples

### Enhanced Server Class
```typescript
export class McpAtlassianServer {
  protected server: Server;
  protected authManager: AuthenticationManager;
  protected app: express.Application;

  constructor(serverConfig: ServerConfig, serviceConfig: JCConfig) {
    this.authManager = new AuthenticationManager();
    // ... existing constructor code
    this.setupHttpTransport();
  }

  private setupHttpTransport(): void {
    // Authentication middleware first!
    this.app.use(this.authManager.authenticationMiddleware());

    // URL rewriting
    this.app.use(this.urlRewritingMiddleware());

    // MCP endpoints
    this.setupMcpEndpoints();
  }

  private urlRewritingMiddleware() {
    return (req, res, next) => {
      if (req.path === '/mcp') {
        req.url = '/mcp/v1' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
      }
      next();
    };
  }
}
```

### Simple Client Support
```typescript
// Support web client connections
app.get('/sse', async (req, res) => {
  // Extract authentication headers
  const authHeaders = this.extractAuthHeaders(req.headers);

  // Create server instance for these headers
  const server = this.createServerForHeaders(authHeaders);

  // Setup SSE transport
  const transport = new SSEServerTransport('/message', res);

  // Connect server
  await server.connect(transport);

  // Setup cleanup
  req.on('close', () => {
    logger.info('[SSE] Connection closed');
  });
});

// Route messages to active transport
app.post('/message', async (req, res) => {
  const transports = Array.from(sseTransports.values());
  if (transports.length === 0) {
    res.status(503).json({ error: 'No active SSE connection' });
    return;
  }

  const transport = transports[transports.length - 1];
  await transport.handlePostMessage(req, res);
});
```

### Configuration Examples

**Environment variables:**
```bash
# Server token for trusted clients
SERVER_TOKEN=your-secret-server-token-12345

# System authentication (for trusted clients with valid token)
JIRA_PAT=your-jira-pat-from-env
JIRA_USERNAME=your-jira-username
JIRA_PASSWORD=your-jira-api-token
CONFLUENCE_PAT=your-confluence-pat
CONFLUENCE_USERNAME=your-confluence-username
CONFLUENCE_PASSWORD=your-confluence-api-token

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
```

**config.yaml:**
```yaml
server:
  token: your-secret-server-token-12345  # Alternative to SERVER_TOKEN

jira:
  url: https://your-domain.atlassian.net
  auth:
    pat: ${JIRA_PAT}
    username: ${JIRA_USERNAME}
    password: ${JIRA_PASSWORD}

confluence:
  url: https://your-domain.atlassian.net/wiki
  auth:
    pat: ${CONFLUENCE_PAT}
    username: ${CONFLUENCE_USERNAME}

# Tool configuration
jira:
  usedInstruments:
    include: ALL
    exclude: []

confluence:
  usedInstruments:
    include: ALL
    exclude: []
```

**Usage Examples:**

1. **System Mode (trusted client):**
```bash
curl -X POST http://localhost:3000/mcp/v1 \
  -H "Content-Type: application/json" \
  -H "X-Server-Token: your-secret-server-token-12345" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "jira_get_issue",
      "arguments": {"issueId": "TEST-123"}
    }
  }'
```

2. **Header Mode (external client):**
```bash
curl -X POST http://localhost:3000/mcp/v1 \
  -H "Content-Type: application/json" \
  -H "X-JIRA-Token: external-jira-pat" \
  -H "X-JIRA-Username: external-jira-username" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "jira_get_issue",
      "arguments": {"issueId": "TEST-123"}
    }
  }'
```

## 🎯 Success Criteria

- ✅ Поддержка веб-интерфейсов
- ✅ Полная MCP protocol реализация
- ✅ Гибкая система аутентификации (system + header modes)
- ✅ Server token validation
- ✅ URL rewriting для совместимости
- ✅ Proper error handling и logging
- ✅ Rate limiting per authentication mode
- ✅ Модульная архитектура
- ✅ Backward compatibility с текущей системой

## 📊 Testing Strategy

### Unit Tests
- AuthenticationManager functionality
- Server token validation logic
- Transport layer operations
- Middleware behavior
- Error handling

### Integration Tests
- System authentication mode
- Header-based authentication mode
- Mode switching logic
- Web interface scenarios
- SSE connections
- HTTP transport

### Security Tests
- Invalid server token handling
- Missing authentication headers
- Token leakage prevention
- Rate limiting bypass attempts
- Authentication mode isolation

### Load Tests
- Concurrent connections
- Mixed authentication modes
- Memory usage
- Performance degradation
- Resource cleanup

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Server authentication
SERVER_TOKEN=your-secret-server-token-12345

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000  # 1 minute

# Transport
SERVER_PORT=3000

# Logging
LOG_LEVEL=info
LOG_AUTH_ATTEMPTS=true
```

### Monitoring
- Authentication mode usage statistics
- Server token validation success/failure rates
- Header-based authentication attempts
- Connection lifecycle metrics
- Rate limiting statistics per mode
- Error rates per transport and auth mode
- Memory usage trends

---

*Этот план обеспечивает полноценную поддержку веб-интерфейсов с гибкой системой аутентификации, позволяющей использовать как доверенные клиенты с системной аутентификацией (текущая логика), так и внешние клиенты с аутентификацией через заголовки.*
