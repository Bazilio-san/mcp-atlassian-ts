# MCP Atlassian TypeScript Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.13+-purple.svg)](https://github.com/modelcontextprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive, production-ready TypeScript implementation of the Model Context Protocol (MCP) server for Atlassian JIRA and Confluence. Built with modern architecture, type safety, and enterprise-grade features.

## 🚀 Features

### Core Capabilities
- **🔧 JIRA Integration**: Complete issue management, searching, comments, transitions, and project access
- **📝 Confluence Integration**: Page creation, updates, search, space management, and commenting
- **🔒 Multi-Auth Support**: Basic Auth, Personal Access Tokens, and OAuth 2.0
- **⚡ High Performance**: Built-in caching, connection pooling, and request optimization
- **🛡️ Security**: Rate limiting, input validation, and PII masking in logs
- **📊 Observability**: Comprehensive logging, health checks, and metrics

### Architecture Highlights
- **Type-Safe**: Full TypeScript with strict settings and comprehensive type definitions
- **Modular Design**: Clean separation of concerns with domain-driven structure
- **Error Handling**: Centralized error management with proper HTTP status mapping
- **Transport Agnostic**: Support for STDIO, HTTP, and Server-Sent Events (SSE)
- **Docker Ready**: Multi-stage builds with security best practices
- **Testing**: Comprehensive test suite with Jest and custom matchers

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Available Tools](#available-tools)
- [API Reference](#api-reference)
- [Development](#development)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🛠 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Access to Atlassian JIRA/Confluence instance
- Valid authentication credentials

### From Source
```bash
# Clone the repository
git clone https://github.com/example/mcp-atlassian-typescript.git
cd mcp-atlassian-typescript

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your environment (see Configuration section)
nano .env

# Build the project
npm run build

# Start the server
npm start
```

### Using Docker
```bash
# Pull and run the container
docker run -d \
  --name mcp-atlassian \
  -p 3000:3000 \
  --env-file .env \
  mcp-atlassian-typescript:latest
```

## 🚀 Quick Start

1. **Set up your environment**:
   ```bash
   # Required environment variables
   export ATLASSIAN_URL="https://your-domain.atlassian.net"
   export ATLASSIAN_EMAIL="your-email@company.com"
   export ATLASSIAN_API_TOKEN="your-api-token"
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Test the connection**:
   ```bash
   curl http://localhost:3000/health
   ```

4. **Use MCP tools** (via compatible client):
   ```json
   {
     "method": "tools/call",
     "params": {
       "name": "jira_get_issue",
       "arguments": {
         "issueKey": "PROJ-123"
       }
     }
   }
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ATLASSIAN_URL` | ✅ | Your Atlassian instance URL | - |
| `ATLASSIAN_EMAIL` | ⚠️ | Email for Basic Auth | - |
| `ATLASSIAN_API_TOKEN` | ⚠️ | API Token for Basic Auth | - |
| `ATLASSIAN_PAT` | ⚠️ | Personal Access Token | - |
| `ATLASSIAN_OAUTH_*` | ⚠️ | OAuth 2.0 credentials | - |
| `PORT` | ❌ | HTTP server port | `3000` |
| `NODE_ENV` | ❌ | Environment mode | `development` |
| `LOG_LEVEL` | ❌ | Logging level | `info` |
| `TRANSPORT_TYPE` | ❌ | Transport type | `http` |
| `RATE_LIMIT_MAX_REQUESTS` | ❌ | Rate limit per window | `100` |
| `CACHE_TTL_SECONDS` | ❌ | Cache TTL in seconds | `300` |

⚠️ **Authentication**: You must provide ONE of the authentication methods:
- Basic Auth: `ATLASSIAN_EMAIL` + `ATLASSIAN_API_TOKEN`
- Personal Access Token: `ATLASSIAN_PAT`
- OAuth 2.0: `ATLASSIAN_OAUTH_*` variables

### Advanced Configuration

Create a `.env` file based on `.env.example`:

```bash
# Atlassian Configuration
ATLASSIAN_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
TRANSPORT_TYPE=http

# Security & Performance
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=300
CACHE_MAX_ITEMS=1000

# Optional: Tool Selection
ENABLED_TOOLS=jira_get_issue,jira_search_issues,confluence_search
```

## 🔐 Authentication

### 1. Basic Authentication (API Token)
Most common method using email + API token:

```bash
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=ATATT3xFfGF0123...
```

**Getting an API Token**:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token to your environment

### 2. Personal Access Token (PAT)
More secure, granular permissions:

```bash
ATLASSIAN_PAT=your-personal-access-token
```

**Creating a PAT**:
1. Go to Atlassian Admin → Product Access → API tokens
2. Create new token with required scopes
3. Copy token to environment

### 3. OAuth 2.0
Enterprise-grade authentication:

```bash
ATLASSIAN_OAUTH_CLIENT_ID=your-client-id
ATLASSIAN_OAUTH_CLIENT_SECRET=your-client-secret
ATLASSIAN_OAUTH_ACCESS_TOKEN=your-access-token
ATLASSIAN_OAUTH_REFRESH_TOKEN=your-refresh-token
```

## 🧰 Available Tools

### JIRA Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `jira_get_issue` | Get issue details | `issueKey`, `expand`, `fields` |
| `jira_search_issues` | Search issues with JQL | `jql`, `maxResults`, `startAt` |
| `jira_create_issue` | Create new issue | `project`, `issueType`, `summary` |
| `jira_update_issue` | Update existing issue | `issueKey`, `summary`, `description` |
| `jira_add_comment` | Add comment to issue | `issueKey`, `body`, `visibility` |
| `jira_get_transitions` | Get available transitions | `issueKey` |
| `jira_transition_issue` | Transition issue status | `issueKey`, `transitionId` |
| `jira_get_projects` | List accessible projects | `expand`, `recent` |

### Confluence Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `confluence_search` | Search content with CQL | `cql`, `limit`, `excerpt` |
| `confluence_get_page` | Get page by ID | `pageId`, `expand`, `version` |
| `confluence_get_page_by_title` | Get page by space + title | `spaceKey`, `title` |
| `confluence_create_page` | Create new page | `spaceKey`, `title`, `body` |
| `confluence_update_page` | Update existing page | `pageId`, `title`, `body` |
| `confluence_get_spaces` | List accessible spaces | `type`, `status`, `limit` |
| `confluence_get_space` | Get space details | `spaceKey`, `expand` |
| `confluence_get_space_content` | Get space content | `spaceKey`, `type`, `limit` |
| `confluence_add_comment` | Add page comment | `pageId`, `body` |

### Utility Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `cache_clear` | Clear cache entries | `pattern` (optional) |
| `cache_stats` | Get cache statistics | - |
| `health_check` | System health check | `detailed` (boolean) |

## 📚 API Reference

### Tool Call Examples

#### Get JIRA Issue
```json
{
  "method": "tools/call",
  "params": {
    "name": "jira_get_issue",
    "arguments": {
      "issueKey": "PROJ-123",
      "expand": ["changelog", "transitions"]
    }
  }
}
```

#### Search Issues with JQL
```json
{
  "method": "tools/call",
  "params": {
    "name": "jira_search_issues",
    "arguments": {
      "jql": "project = PROJ AND status = Open",
      "maxResults": 20,
      "fields": ["summary", "status", "assignee"]
    }
  }
}
```

#### Create Confluence Page
```json
{
  "method": "tools/call",
  "params": {
    "name": "confluence_create_page",
    "arguments": {
      "spaceKey": "DOCS",
      "title": "API Documentation",
      "body": "<p>This is the API documentation page.</p>",
      "labels": ["api", "documentation"]
    }
  }
}
```

### Response Format
All tools return responses in this format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Formatted response content with relevant information"
    }
  ]
}
```

## 🔧 Development

### Setup Development Environment
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start in development mode
npm run dev

# Run tests
npm test

# Lint and format code
npm run lint
npm run format

# Type check
npm run typecheck
```

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload using tsx |
| `npm run dev:stdio` | Start in STDIO mode for testing |
| `npm run build` | Build for production |
| `npm run build:clean` | Clean build (remove dist first) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | TypeScript type checking |

### Project Structure
```
src/
├── core/                    # Core systems
│   ├── auth/               # Authentication management
│   ├── cache/              # Caching system
│   ├── config/             # Configuration management
│   ├── errors/             # Error handling
│   ├── server/             # MCP server implementation
│   └── utils/              # Shared utilities
├── domains/                # Domain-specific code
│   ├── jira/              # JIRA integration
│   │   ├── client.ts      # JIRA API client
│   │   └── tools.ts       # JIRA MCP tools
│   └── confluence/        # Confluence integration
│       ├── client.ts      # Confluence API client
│       └── tools.ts       # Confluence MCP tools
├── types/                 # TypeScript definitions
│   ├── index.ts          # Common types
│   ├── jira.ts           # JIRA-specific types
│   └── confluence.ts     # Confluence-specific types
└── index.ts              # Main entry point
```

## 🐳 Docker Deployment

### Build and Run
```bash
# Build the image
docker build -t mcp-atlassian-typescript .

# Run with environment file
docker run -d \
  --name mcp-atlassian \
  -p 3000:3000 \
  --env-file .env \
  mcp-atlassian-typescript

# Check health
docker exec mcp-atlassian curl http://localhost:3000/health
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Considerations
- Use multi-stage builds for smaller images
- Run as non-root user (already configured)
- Set resource limits
- Use health checks
- Mount logs volume for persistence

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test files
npm test -- --testPathPattern=jira

# Run in watch mode
npm run test:watch
```

### Test Structure
```
__tests__/
├── setup.ts              # Jest setup and utilities
├── core/                 # Core system tests
├── domains/              # Domain-specific tests
└── integration/          # Integration tests
```

### Custom Jest Matchers
```typescript
// Custom matchers available in tests
expect('PROJ-123').toBeValidJiraKey();
expect('123456').toBeValidConfluencePageId();
```

## 📈 Monitoring and Observability

### Health Check Endpoint
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "service": "mcp-atlassian-typescript",
  "version": "2.0.0",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Cache Statistics
Use the `cache_stats` tool to monitor cache performance:
```json
{
  "hits": 150,
  "misses": 25,
  "keys": 45,
  "hitRate": 0.857,
  "memory": "2.1MB"
}
```

### Logging
Structured logging with PII masking:
```json
{
  "level": "info",
  "time": "2024-01-01T12:00:00.000Z",
  "component": "jira-tools",
  "message": "Executing JIRA tool",
  "toolName": "jira_get_issue",
  "issueKey": "PROJ-123"
}
```

## 🔧 Troubleshooting

### Common Issues

#### Authentication Errors
```
Error: Authentication failed - token refresh failed
```
**Solution**: Check your credentials and ensure they have proper permissions.

#### Rate Limiting
```
Error: Rate limit exceeded
```
**Solution**: Reduce request frequency or increase rate limits in configuration.

#### Connection Issues
```
Error: No response received from server
```
**Solution**: Verify `ATLASSIAN_URL` and network connectivity.

### Debug Mode
Enable detailed logging:
```bash
export LOG_LEVEL=debug
npm start
```

### Health Check
Test system connectivity:
```bash
curl http://localhost:3000/health
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the full test suite
5. Submit a pull request

### Code Quality
- Follow TypeScript strict mode
- Maintain test coverage above 70%
- Use conventional commit messages
- Follow existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol) team for the MCP specification
- [Atlassian](https://atlassian.com) for their comprehensive APIs
- Open source community for excellent tooling and libraries

## 📞 Support

- **Documentation**: [Full API Documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/example/mcp-atlassian-typescript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/example/mcp-atlassian-typescript/discussions)
- **Security**: See [SECURITY.md](SECURITY.md) for security policies

---

**Built with ❤️ by the MCP Atlassian TypeScript team**