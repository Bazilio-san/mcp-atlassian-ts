# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Build the TypeScript project to `dist/` directory
- `npm run build:clean` - Clean build (removes dist/ first)
- `npm run dev` - Development with hot reload using tsx watch
- `npm run dev:stdio` - Run in development with STDIO transport
- `npm start` - Start production server from `dist/src/index.js`

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
- **Required**: `ATLASSIAN_URL` 
- **Authentication**: One of `ATLASSIAN_API_TOKEN`, `ATLASSIAN_PAT`, or OAuth2 credentials
- **Transport**: `TRANSPORT_TYPE` (stdio/http/sse), `PORT` (default: 3000)
- **Performance**: `CACHE_TTL_SECONDS`, `RATE_LIMIT_MAX_REQUESTS`

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
