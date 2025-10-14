# MCP Atlassian Server

A comprehensive Model Context Protocol (MCP) server for Atlassian JIRA and Confluence integration with flexible authentication and multi-user web interface support.

## 🚀 Features

- **📋 47 MCP Tools**: Complete coverage of JIRA (30 tools) and Confluence (17 tools) operations
- **🔄 Multiple Transport Support**: STDIO, HTTP, and Server-Sent Events (SSE)
- **🔐 Flexible Authentication**: System mode for trusted clients and header-based authentication for external clients
- **🌐 Web Interface Support**: Full MCP protocol implementation for web-based clients
- **⚡ High Performance**: Caching, rate limiting, and optimized tool execution
- **🛡️ Enterprise Ready**: Comprehensive security, logging, and monitoring

## 📦 Installation

```bash
npm install
npm run build
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Authentication
SERVER_TOKEN=your-secret-server-token-12345

# Service Selection (REQUIRED)
MCP_SERVICE=jira                    # or 'confluence' or 'both'

# JIRA Configuration
JIRA_URL=https://your-domain.atlassian.net
JIRA_PAT=your-jira-personal-access-token
JIRA_USERNAME=your-jira-username
JIRA_PASSWORD=your-jira-api-token
JIRA_ACCOUNT_ID=your-account-id

# Confluence Configuration
CONFLUENCE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_PAT=your-confluence-personal-access-token
CONFLUENCE_USERNAME=your-confluence-username
CONFLUENCE_PASSWORD=your-confluence-api-token

# Server Configuration
SERVER_PORT=3000
TRANSPORT_TYPE=stdio                # 'stdio', 'http', or 'sse'

# Performance
CACHE_TTL_SECONDS=300
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL=info
LOG_PRETTY=true
LOG_AUTH_ATTEMPTS=true
```

### Configuration File (config.yaml)

```yaml
# Server configuration
server:
  token: your-secret-server-token-12345
  port: 3000
  transport: stdio

# Service selection
service: jira  # or 'confluence' or 'both'

# JIRA configuration
jira:
  url: https://your-domain.atlassian.net
  auth:
    basic:
      username: ${JIRA_USERNAME}
      password: ${JIRA_PASSWORD}
    pat: ${JIRA_PAT}
    accountId: ${JIRA_ACCOUNT_ID}
  maxResults: 50
  customFields:
    epicLink: customfield_10014
  usedInstruments:
    include: ALL
    exclude: []

# Confluence configuration
confluence:
  url: https://your-domain.atlassian.net/wiki
  auth:
    basic:
      username: ${CONFLUENCE_USERNAME}
      password: ${CONFLUENCE_PASSWORD}
    pat: ${CONFLUENCE_PAT}
  maxResults: 50
  usedInstruments:
    include: ALL
    exclude: []

# Performance settings
cache:
  ttlSeconds: 300
  maxSize: 1000

rateLimit:
  requests: 100
  windowMs: 60000
```

## 🔐 Flexible Authentication System

The server supports a comprehensive flexible authentication system with two distinct modes that can automatically switch based on the provided credentials:

### 🏢 System Mode (Trusted Clients)

When a valid `X-Server-Token` header is provided and matches the configured server token, the server uses system credentials from configuration:

**Configuration:**
```bash
# Environment variable
SERVER_TOKEN=your-secret-server-token-12345

# Or in config.yaml
server:
  token: your-secret-server-token-12345
```

**Usage:**
```bash
curl -X POST http://localhost:3000/mcp \
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

**Benefits:**
- 🔒 **Secure**: Only clients with valid server token can access
- 🏢 **Enterprise**: Uses centralized system credentials
- 📊 **Softer Rate Limiting**: More generous limits for trusted clients
- ⚡ **Performance**: No per-request authentication overhead

### 👥 Header Mode (External Clients)

When no server token is provided or the token is invalid, the client must supply authentication headers for each request:

```bash
curl -X POST http://localhost:3000/mcp \
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

**Benefits:**
- 🔑 **Per-Client**: Each client uses its own credentials
- 🌐 **Web-Friendly**: Ideal for web applications and external integrations
- 🛡️ **Isolated**: Clients can only access their own resources
- 🔍 **Auditable**: Individual client tracking and logging

### 📋 Supported Authentication Headers

#### JIRA Authentication Headers
- `X-JIRA-Token`: Personal Access Token (PAT)
- `X-JIRA-Username`: Username (for Basic Auth)
- `X-JIRA-Password`: API Token (for Basic Auth)

#### Confluence Authentication Headers
- `X-Confluence-Token`: Personal Access Token (PAT)
- `X-Confluence-Username`: Username (for Basic Auth)
- `X-Confluence-Password`: API Token (for Basic Auth)

### 🔄 Automatic Mode Switching

The authentication system automatically detects the appropriate mode:

```typescript
// System Mode - Valid server token
if (providedToken === configuredServerToken) {
  // Use system credentials from config.yaml or environment
  useSystemAuthentication();
}

// Header Mode - No or invalid server token
else if (hasJiraHeaders || hasConfluenceHeaders) {
  // Use credentials from request headers
  useHeaderAuthentication();
}

// Authentication Required
else {
  // Reject request with 401 Unauthorized
  rejectRequest();
}
```

### 🎯 Use Cases

#### System Mode Use Cases:
- **Internal Applications**: Enterprise tools with centralized auth
- **Trusted Integrations**: MCP Desktop clients, IDE plugins
- **Background Services**: Automated processes and scripts
- **Admin Tools**: System administration interfaces

#### Header Mode Use Cases:
- **Web Applications**: Multi-user SaaS platforms
- **Customer Portals**: External-facing applications
- **API Gateways**: Third-party integrations
- **Mobile Apps**: Mobile client applications

### 🔒 Security Features

- **Token Validation**: Cryptographic server token verification
- **Header Isolation**: Header-based clients cannot access system credentials
- **Rate Limiting**: Different limits for trusted vs external clients
- **Audit Logging**: Complete authentication attempt tracking
- **CORS Support**: Configurable cross-origin policies
- **Input Validation**: Request sanitization and validation

## 🏃‍♂️ Usage

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Start with specific transport
npm run dev:stdio      # STDIO transport (default)
npm run dev:http       # HTTP transport on port 3000
npm run dev:sse        # SSE transport
```

### Production Mode

```bash
# Build the project
npm run build

# Start production server
npm start

# Start with specific service
npm run start:jira        # JIRA only
npm run start:confluence  # Confluence only
```

### Docker Deployment

```bash
# Build Docker image
docker build -t mcp-atlassian .

# Run with environment variables
docker run -p 3000:3000 \
  -e SERVER_TOKEN=your-secret-token \
  -e JIRA_URL=https://your-domain.atlassian.net \
  -e JIRA_PAT=your-pat \
  mcp-atlassian
```

## 🛠️ MCP Tools

### JIRA Tools (30 tools)

**Issue Management:**
- `jira_get_issue` - Get issue details
- `jira_create_issue` - Create new issue
- `jira_update_issue` - Update existing issue
- `jira_delete_issue` - Delete issue
- `jira_search_issues` - Search issues with JQL
- `jira_list_issues` - List issues by project

**Project Management:**
- `jira_get_project` - Get project details
- `jira_list_projects` - List all projects
- `jira_get_project_components` - Get project components
- `jira_get_project_versions` - Get project versions

**Agile/Scrum:**
- `jira_get_sprint` - Get sprint details
- `jira_list_sprints` - List sprints
- `jira_get_sprint_issues` - Get issues in sprint
- `jira_create_sprint` - Create new sprint
- `jira_update_sprint` - Update sprint

**Time Tracking:**
- `jira_log_work` - Log work on issue
- `jira_get_worklog` - Get worklog details
- `jira_update_worklog` - Update worklog
- `jira_delete_worklog` - Delete worklog

**Comments & Attachments:**
- `jira_add_comment` - Add comment to issue
- `jira_get_comments` - Get issue comments
- `jira_add_attachment` - Add attachment
- `jira_get_attachments` - Get attachments

**User & Team Management:**
- `jira_get_user` - Get user details
- `jira_search_users` - Search users
- `jira_get_issue_transitions` - Get available transitions
- `jira_transition_issue` - Transition issue

### Confluence Tools (17 tools)

**Content Management:**
- `confluence_get_page` - Get page content
- `confluence_create_page` - Create new page
- `confluence_update_page` - Update existing page
- `confluence_delete_page` - Delete page
- `confluence_search_content` - Search content

**Space Management:**
- `confluence_get_space` - Get space details
- `confluence_list_spaces` - List spaces
- `confluence_create_space` - Create space
- `confluence_update_space` - Update space

**Comments & Labels:**
- `confluence_add_comment` - Add comment to page
- `confluence_get_comments` - Get page comments
- `confluence_add_label` - Add label to content
- `confluence_get_labels` - Get content labels
- `confluence_remove_label` - Remove label

**Attachments:**
- `confluence_add_attachment` - Add attachment
- `confluence_get_attachments` - Get attachments
- `confluence_download_attachment` - Download attachment

## 🧪 Testing

### Authentication Testing

The server includes a comprehensive authentication testing script:

```bash
# Test authentication modes (requires server running)
node test-auth.js
```

**Test Scenarios:**
- ✅ System Mode with valid server token
- ✅ Header Mode without server token
- ✅ Header Mode with invalid server token
- ✅ Authentication rejection for missing credentials

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Integration Testing

The project includes comprehensive testing infrastructure:

#### JIRA Emulator
```bash
# Start standalone JIRA emulator
node tests/emulator/jira.js
```
- Runs on port 8080
- Contains test data: project TEST, issues TEST-1/TEST-2
- No external dependencies required

#### Complete Test Flow
```bash
# Terminal 1: Start JIRA emulator
node tests/emulator/jira.js

# Terminal 2: Start MCP server
npm start

# Terminal 3: Run tests
node tests/mcp-client-tests.js
```

#### API Endpoint Testing
```bash
# Terminal 1: Start JIRA emulator
node tests/emulator/jira.js

# Terminal 2: Run comprehensive API tests
node tests/endpoints/jira.js
```

**Test Results:**
- ✅ **62/62 tests passing** (100% success rate)
- ⚡ **0.33s** execution time
- 🎯 Complete coverage of all JIRA REST API v2 endpoints
- 🔧 Self-contained testing with built-in emulator

### Quick Authentication Test

```bash
# 1. Start server with test configuration
SERVER_TOKEN=test-token JIRA_PAT=test-pat JIRA_URL=https://example.atlassian.net npm start

# 2. Test System Mode
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-Server-Token: test-token" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 3. Test Header Mode
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-JIRA-Token: test-pat" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🏗️ Architecture

```
src/
├── core/
│   ├── auth/              # Authentication management
│   │   ├── auth-manager.ts     # Flexible authentication system
│   │   └── index.ts            # Legacy authentication manager
│   ├── cache/             # Caching system
│   ├── config/            # Configuration management
│   ├── errors/            # Error handling
│   ├── server/            # MCP server and transports
│   │   ├── index.ts            # Main MCP server
│   │   ├── tools.ts           # Tool registry
│   │   └── factory.ts         # Server factory
│   └── utils/             # Utilities and logging
├── domains/
│   ├── jira/              # JIRA client and tools
│   │   ├── tools-manager.ts     # JIRA tools with header support
│   │   └── tools/               # Individual tool implementations
│   └── confluence/        # Confluence client and tools
│       ├── tools-manager.ts     # Confluence tools with header support
│       └── tools/               # Individual tool implementations
├── types/                 # TypeScript definitions
├── bootstrap/             # Configuration initialization
└── index.ts               # Main entry point
```

### Core Components

- **MCP Server**: Handles MCP protocol requests with multiple transport support (STDIO, HTTP, SSE)
- **Authentication Manager**:
  - `auth-manager.ts`: Flexible dual-mode authentication (System + Header modes)
  - `index.ts`: Legacy authentication for domain clients
- **Tool Registry**: Manages registration and execution of 47 MCP tools with header support
- **Domain Clients**: Specialized clients for JIRA and Confluence APIs with per-request auth
- **Session Management**: Connection lifecycle and context management for web clients
- **Cache Layer**: Redis-like caching with TTL support
- **Rate Limiter**: Configurable rate limiting per authentication mode

## 🌐 Transport Layer

### STDIO Transport
- Default transport for MCP client integration
- JSON-RPC 2.0 protocol over stdin/stdout
- Ideal for Claude Desktop and other MCP clients

### HTTP Transport
- RESTful API endpoints for web integration (`/mcp`)
- Full MCP protocol implementation with authentication support
- Support for both System and Header authentication modes
- JSON-RPC 2.0 protocol over HTTP
- Ideal for web-based clients and applications

### SSE Transport
- Server-Sent Events for real-time communication (`/sse`)
- Persistent connections with automatic reconnection
- Per-connection authentication context
- Real-time tool execution with client-specific credentials
- Ideal for web applications and live updates

## 📊 Monitoring & Observability

### Health Check
```bash
curl http://localhost:3000/health
```

### Metrics
- Connection lifecycle metrics
- Authentication mode usage statistics (System vs Header)
- Server token validation success/failure rates
- Header-based authentication attempt statistics
- Rate limiting statistics per authentication mode
- Tool execution performance by auth mode
- Cache hit/miss ratios
- Error rates per transport and authentication type
- Active SSE connections by authentication mode

### Logging
- Structured logging with Pino
- Configurable log levels
- Authentication attempt logging
- Request/response tracing
- Error context and stack traces

## 🔒 Security Features

### Authentication Security
- **Dual-Mode Authentication**: Flexible System and Header-based authentication
- **Server Token Validation**: Cryptographic verification of trusted client tokens
- **Per-Request Authentication**: Individual client credentials via headers
- **Header Isolation**: External clients cannot access system credentials
- **Authentication Context**: Secure credential management per connection

### Transport Security
- **HTTPS Support**: TLS encryption for HTTP and SSE transports
- **CORS Configuration**: Configurable cross-origin resource sharing policies
- **Security Headers**: Comprehensive security headers (HSTS, CSP, etc.)
- **Request Validation**: Input validation and sanitization
- **Secure Error Handling**: Error responses without information leakage

### Access Control
- **Rate Limiting**: Different limits for trusted vs external clients
- **IP-Based Tracking**: Client identification and monitoring
- **Session Management**: Connection lifecycle and timeout handling
- **Audit Logging**: Complete authentication attempt tracking
- **Error Logging**: Security event logging and monitoring

### Monitoring & Compliance
- **Authentication Metrics**: Detailed usage statistics and security events
- **Error Tracking**: Comprehensive error monitoring and alerting
- **Performance Monitoring**: Resource usage and response time tracking
- **Compliance Logging**: Audit trails for security and compliance requirements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the [MCP_TOOLS_REGISTRY.md](MCP_TOOLS_REGISTRY.md) for available tools
- Review the test files for usage examples

## 🗺️ Roadmap

- [ ] OAuth 2.0 authentication support
- [ ] Additional Atlassian services (Bitbucket, Trello)
- [ ] Advanced caching strategies
- [ ] GraphQL API support
- [ ] Advanced monitoring and alerting
- [ ] Multi-tenant support
- [ ] Plugin system for custom tools

---

**Built with ❤️ for the Model Context Protocol ecosystem**
