# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Model Context Protocol (MCP) server** for Atlassian JIRA and Confluence integration, providing **51 total MCP tools**:
- **34 JIRA tools** covering issues, projects, Agile/Scrum, attachments, comments, links, worklog, and metadata
- **17 Confluence tools** covering content, spaces, comments, labels, hierarchy, history, and users
- **3 utility tools** for cache management and health checks

The server is built with **TypeScript** and supports modern features including multiple authentication methods, caching, rate limiting, and service-specific deployment modes.

## Development Commands

### Building and Development
- `npm run build` - Build TypeScript project to `dist/` directory
- `npm run cb` - Clean build (removes dist/ first, then builds)
- `npm run dev` - Development with hot reload using tsx watch
- `npm run dev:jira` - Development in JIRA-only mode
- `npm run dev:confluence` - Development in Confluence-only mode
- `npm run dev:stdio` - Development with STDIO transport

### Testing
- `npm test` - Run Jest test suite
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode

### Production
- `npm start` - Start production server (requires MCP_SERVICE env var)
- `npm run start:jira` - Start in JIRA-only mode
- `npm run start:confluence` - Start in Confluence-only mode

### Code Quality
- `npm run lint` - Run ESLint on .js and .ts files
- `npm run lint:fix` - Auto-fix lint issues
- `npm run typecheck` - Run TypeScript type checking

### Docker Support
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container with .env file

## Testing Infrastructure

### JIRA Emulator (Standalone Testing)
```bash
node tests/emulator/jira.js
```
- Runs on port 8080
- Contains test data: project TEST, issues TEST-1/TEST-2
- No external dependencies required
- Supports comprehensive API endpoint testing

### Complete Test Flow
```bash
# Terminal 1: Start JIRA emulator
node tests/emulator/jira.js

# Terminal 2: Start MCP server
npm start

# Terminal 3: Run tests
node tests/mcp/jira.js
```

### JIRA API Endpoint Testing
```bash
# Terminal 1: Start JIRA emulator
node tests/emulator/jira.js

# Terminal 2: Run comprehensive API tests
node tests/endpoints/jira.js
```

**Test Coverage:**
- ✅ **100% API endpoint coverage** for JIRA REST API v2
- ⚡ **~0.33s** execution time for full test suite
- 🔧 Self-contained testing with built-in emulator
- 📊 Detailed test reporting and validation

## Architecture Overview

### Core Architecture
```
src/
├── bootstrap/        # Application initialization and configuration loading
├── core/            # Core infrastructure systems
│   ├── auth/        # Authentication (Basic, PAT, OAuth2)
│   ├── server/      # MCP server with multiple transports
│   └── utils/       # Logging, caching, rate limiting, utilities
├── domains/         # Domain-specific implementations
│   ├── jira/        # JIRA client and 34 tools
│   └── confluence/  # Confluence client and 17 tools
├── types/           # TypeScript type definitions
└── index.ts         # Main entry point with CLI support
```

### Service Mode Support
The server supports single-service operation:
- `MCP_SERVICE=jira` - JIRA-only mode (34 tools + 3 utility tools)
- `MCP_SERVICE=confluence` - Confluence-only mode (17 tools + 3 utility tools)

### Transport Support
- `stdio` - For MCP client integration (Claude Desktop)
- `http` - For network-based testing and integration (default port: 3000)
- `sse` - Server-Sent Events (experimental)

### Key Components

#### MCP Server (`src/core/server/`)
- **index.ts**: Main MCP protocol handler
- **factory.ts**: Service-specific server creation
- **jira-server.ts**: JIRA-focused server implementation
- **confluence-server.ts**: Confluence-focused server implementation
- **tools.ts**: Tool registry and execution management

#### Authentication Manager (`src/core/auth/`)
- Supports Basic Auth, Personal Access Tokens, and OAuth 2.0
- Connection testing and validation
- Header-based authentication override support

#### Tool Managers (`src/domains/*/tools-manager.ts`)
- **JIRA**: 34 tools across core operations, projects, Agile, attachments, links, worklog
- **Confluence**: 17 tools for content management, spaces, collaboration features

## Configuration

### Environment Configuration
All configuration via `.env` file (see `.env.example` for template):

#### Required Variables
- **Service Mode**: `MCP_SERVICE` (jira|confluence) - **REQUIRED**
- **URLs**: `JIRA_URL` and/or `CONFLUENCE_URL`

#### Authentication (Choose ONE method per service)

**JIRA Authentication:**
- **Basic Auth**: `JIRA_USERNAME` + `JIRA_PASSWORD` (API token recommended)
- **PAT**: `JIRA_PAT` (Personal Access Token)
- **OAuth2**: `JIRA_OAUTH_CLIENT_ID`, `JIRA_OAUTH_CLIENT_SECRET`, etc.

**Confluence Authentication:**
- **Basic Auth**: `CONFLUENCE_USERNAME` + `CONFLUENCE_PASSWORD` (API token)
- **PAT**: `CONFLUENCE_PAT` (Personal Access Token)
- **OAuth2**: `CONFLUENCE_OAUTH_CLIENT_ID`, `CONFLUENCE_OAUTH_CLIENT_SECRET`, etc.

#### Optional Configuration
- **Transport**: `TRANSPORT_TYPE` (stdio/http/sse), `SERVER_PORT` (default: 3000)
- **Performance**: `CACHE_TTL_SECONDS`, `RATE_LIMIT_MAX_REQUESTS`, `JIRA_MAX_RESULTS`
- **Logging**: `LOG_LEVEL` (debug/info/warn/error), `LOG_PRETTY` (true/false)
- **JIRA Custom**: `JIRA_EPIC_LINK_FIELD_ID` (default: customfield_10008)

### Tool Configuration (`config.yaml`)
Tools can be selectively enabled/disabled:

```yaml
jira:
  usedInstruments:
    include: ALL  # or specify array: [jira_get_issue, jira_create_issue]
    exclude: []   # exclude specific tools

confluence:
  usedInstruments:
    include: ALL  # or specify array: [confluence_get_page, confluence_search]
    exclude: []   # exclude specific tools
```

## Complete Tool List

### JIRA Tools (34 total)

#### Core Issue Management (9 tools)
- `jira_get_issue` - Get issue by ID or key
- `jira_search_issues` - Search issues with JQL
- `jira_create_issue` - Create new issue (dynamic tool with current priorities)
- `jira_update_issue` - Update existing issue
- `jira_delete_issue` - Delete issue
- `jira_batch_create_issues` - Create multiple issues efficiently
- `jira_get_transitions` - Get available transitions for issue
- `jira_transition_issue` - Transition issue to new status
- `jira_find_epic` - Find epic by name

#### Project Management (8 tools)
- `jira_get_projects` - Get all accessible projects
- `jira_get_project` - Get specific project details
- `jira_find_project` - Find project by name/key
- `jira_create_project_version` - Create new project version
- `jira_batch_create_versions` - Create multiple versions

#### Agile/Scrum (6 tools)
- `jira_get_agile_boards` - Get all Agile boards
- `jira_get_board_issues` - Get issues on specific board
- `jira_get_sprints_from_board` - Get sprints from board
- `jira_get_sprint_issues` - Get issues in specific sprint
- `jira_create_sprint` - Create new sprint
- `jira_update_sprint` - Update existing sprint

#### Issue Links (4 tools)
- `jira_get_link_types` - Get available link types
- `jira_create_issue_link` - Create link between issues
- `jira_create_remote_issue_link` - Create remote link
- `jira_remove_issue_link` - Remove issue link

#### Comments & Epic Links (3 tools)
- `jira_add_comment` - Add comment to issue
- `jira_link_to_epic` - Link issue to epic
- `jira_batch_get_changelogs` - Get changelogs for multiple issues

#### Worklog Management (2 tools)
- `jira_get_worklog` - Get worklog entries for issue
- `jira_add_worklog` - Add worklog entry to issue

#### Metadata & Search (2 tools)
- `jira_get_user_profile` - Get user profile information
- `jira_search_fields` - Search and get field metadata

#### Attachments (1 tool)
- `jira_get_attachments_info` - Download issue attachments

### Confluence Tools (17 total)

#### Content Management (6 tools)
- `confluence_search` - Search Confluence content
- `confluence_get_page` - Get page by ID
- `confluence_get_page_by_title` - Get page by title and space
- `confluence_create_page` - Create new page
- `confluence_update_page` - Update existing page
- `confluence_delete_page` - Delete page

#### Space Management (3 tools)
- `confluence_get_spaces` - Get all accessible spaces
- `confluence_get_space` - Get specific space details
- `confluence_get_space_content` - Get content in space

#### Collaboration (5 tools)
- `confluence_add_comment` - Add comment to page
- `confluence_get_comments` - Get page comments
- `confluence_add_label` - Add label to page
- `confluence_get_labels` - Get page labels
- `confluence_get_pages_by_label` - Find pages by label

#### Navigation & History (3 tools)
- `confluence_get_page_children` - Get child pages
- `confluence_get_page_history` - Get page version history
- `confluence_search_user` - Search for users

### Utility Tools (3 total)
- `cache_clear` - Clear cache (supports pattern matching)
- `cache_stats` - Get cache statistics and performance metrics
- `health_check` - Check service connectivity and health

## Development Features

### Type Safety & Quality
- **TypeScript**: Strict type checking with ES2022 target
- **ESLint**: Code quality and style enforcement
- **Jest**: Comprehensive testing framework
- **Pino**: Structured logging with pretty-printing support

### Performance & Reliability
- **Caching**: TTL-based caching with statistics
- **Rate Limiting**: Configurable request limiting
- **Error Handling**: Comprehensive error types and handling
- **Health Monitoring**: Service connectivity checks

### Development Experience
- **Hot Reload**: Development server with automatic restarts
- **Multiple Transports**: STDIO for Claude, HTTP for testing
- **Docker Support**: Containerized deployment
- **Modular Architecture**: Domain-driven tool organization

### Production Features
- **Service Modes**: Run JIRA-only or Confluence-only servers
- **Authentication**: Multiple auth methods with fallback
- **Security**: Helmet middleware, rate limiting, input validation
- **Monitoring**: Health checks, cache statistics, structured logging

## Important Implementation Notes

### Tool Architecture
- Tools are implemented as modular, self-contained units
- Each tool includes TypeScript definitions, validation schemas, and handlers
- Tools support custom authentication headers for multi-tenant scenarios
- Caching is implemented at the tool level for optimal performance

### Configuration Priority
1. Environment variables (`.env` file)
2. `config.yaml` file for tool selection
3. Command-line arguments override environment settings
4. Utility tools (`cache_*`, `health_check`) are always enabled

### Authentication Structure
Uses structured authentication configuration:
```typescript
interface ServiceConfig {
  url: string;
  auth: {
    basic?: { username: string; password: string };
    pat?: string;
    oauth2?: { clientId: string; clientSecret: string; /* ... */ };
  };
  maxResults: number;
}
```

### Error Handling
- **ValidationError**: Input validation failures
- **ToolExecutionError**: Tool execution failures with context
- **McpAtlassianError**: Atlassian API errors with detailed information
- **ServerError**: Server-level configuration and startup errors

# Important Instructions

**Scope**: Build only what's explicitly requested - no additional features
**File Preference**: Always edit existing files rather than creating new ones
**Testing**: Always run `npm run lint` and `npm run typecheck` after code changes
**Documentation**: Only create documentation files if explicitly requested
**Git Workflow**: Use feature branches, never work directly on main/master
**Tool Usage**: Prefer MCP tools over basic alternatives for complex operations
