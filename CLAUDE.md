# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build the TypeScript project to `dist/` directory
- `npm run build:clean` - Clean build (removes dist/ first)
- `npm run dev` - Development with hot reload using tsx watch
- `npm run dev:stdio` - Run in development with STDIO transport
- `npm start` - Start production server from `dist/src/index.js`
- `npm run start:jira` - Start JIRA-only service mode
- `npm run start:confluence` - Start Confluence-only service mode

### Testing
- `npm test` - Run Jest test suite
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode
- Test files are located in `tests/**/*.test.ts`

### Code Quality
- `npm run lint` - Run ESLint on .js and .ts files
- `npm run lint:fix` - Auto-fix lint issues
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Testing Infrastructure
The project includes comprehensive testing tools:

#### JIRA Emulator (Standalone Testing)
```bash
node tests/jira-emulator.js
```
- Runs on port 8080
- Contains test data: project TEST, issues TEST-1/TEST-2
- No external dependencies required

#### Complete Test Flow
```bash
# Terminal 1: Start JIRA emulator
node tests/jira-emulator.js

# Terminal 2: Start MCP server  
npm start

# Terminal 3: Run tests
node tests/mcp-client-tests.js
```

#### JIRA API Endpoint Testing (100% Coverage)
```bash
# Terminal 1: Start JIRA emulator
node tests/jira-emulator.js

# Terminal 2: Run comprehensive API tests
node tests/endpoints/jira.js
```

**Test Results:**
- ✅ **62/62 tests passing** (100% success rate)
- ⚡ **0.33s** execution time  
- 🎯 Complete coverage of all JIRA REST API v2 endpoints
- 🔧 Self-contained testing with built-in emulator

## Architecture Overview

This is a **Model Context Protocol (MCP) server** for Atlassian JIRA and Confluence integration with **47 MCP tools** covering comprehensive functionality.

### Core Architecture
```
src/
├── core/              # Core infrastructure systems
│   ├── auth/         # Authentication (Basic, PAT, OAuth2)
│   ├── cache/        # Caching system with TTL support
│   ├── config/       # Configuration management
│   ├── errors/       # Error handling and types
│   ├── server/       # MCP server with multiple transports
│   └── utils/        # Logging and utilities
├── domains/          # Domain-specific implementations
│   ├── jira/         # JIRA client and 30 tools
│   └── confluence/   # Confluence client and 17 tools
├── types/            # TypeScript type definitions
└── index.ts          # Main entry point with CLI support
```

### Service Mode Support
The server supports single-service mode operation:
- `MCP_SERVICE=jira` - JIRA-only mode (30 tools)
- `MCP_SERVICE=confluence` - Confluence-only mode (17 tools)

### Transport Support
The server supports multiple transport types:
- `stdio` - For MCP client integration (Claude Desktop)
- `http` - For network-based testing and integration (port 3000)
- `sse` - Server-Sent Events (experimental)

### Key Components

#### MCP Server (`src/core/server/index.ts`)
- Handles MCP protocol requests (list_tools, call_tool, etc.)
- Rate limiting and security middleware
- Multiple transport support (STDIO, HTTP, SSE)
- Health check endpoint at `/health`
- Express.js HTTP server for testing

#### Tool Registry (`src/core/server/tools.ts`)
- Manages registration and execution of 47 MCP tools
- Tool discovery and validation
- Centralized tool execution with error handling

#### Authentication Manager (`src/core/auth/index.ts`)
- Supports Basic Auth, Personal Access Tokens, and OAuth 2.0
- Connection testing and validation
- Auth configuration management

#### Domain Clients
- **JIRA Client**: 30 tools covering issues, projects, Agile/Scrum, time tracking
- **Confluence Client**: 17 tools covering content, spaces, comments, labels

### Configuration
Environment configuration via `.env` file:

#### Required Variables
- **Service Mode**: `MCP_SERVICE` (jira|confluence) - **REQUIRED**
- **URLs**: `JIRA_URL` and/or `CONFLUENCE_URL` 

#### Authentication (Choose ONE method per service)
**JIRA Authentication:**
- **Basic Auth**: `JIRA_USERNAME` + `JIRA_PASSWORD` (username + API token)
- **PAT**: `JIRA_PAT` (Personal Access Token)
- **OAuth2**: `JIRA_OAUTH_CLIENT_ID`, `JIRA_OAUTH_CLIENT_SECRET`, etc.

**Confluence Authentication:**
- **Basic Auth**: `CONFLUENCE_USERNAME` + `CONFLUENCE_PASSWORD` (username + API token)
- **PAT**: `CONFLUENCE_PAT` (Personal Access Token)  
- **OAuth2**: `CONFLUENCE_OAUTH_CLIENT_ID`, `CONFLUENCE_OAUTH_CLIENT_SECRET`, etc.

#### Optional Configuration
- **Transport**: `TRANSPORT_TYPE` (stdio/http/sse), `SERVER_PORT` (default: 3000)
- **Performance**: `CACHE_TTL_SECONDS`, `RATE_LIMIT_MAX_REQUESTS`
- **Logging**: `LOG_LEVEL`, `LOG_PRETTY`
- **Features**: `ENABLED_TOOLS` (comma-separated list of tools to enable)

### Authentication Structure
The new authentication system uses a structured approach:

```typescript
interface JiraConfig {
  url: string;
  auth: {
    basic?: {
      username: string;  // JIRA_USERNAME
      password: string;  // JIRA_PASSWORD (API token)
    };
    pat?: string;        // JIRA_PAT
    oauth2?: {
      clientId: string;
      clientSecret: string;
      // ...
    };
  };
  maxResults: number;
}
```

### TypeScript Configuration
- Target: ES2022 with ESNext modules
- Strict type checking enabled with additional safety flags
- Declaration files and source maps generated
- Incremental compilation support

### Development Features
- Hot reload development server
- Comprehensive logging with Pino
- Rate limiting and security headers
- Caching layer with statistics
- Production-ready error handling
- Service-specific deployment options
- Docker container support

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

      
      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.

Write all comments and text in English.

We can swear and use foul language.
