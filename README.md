# MCP Atlassian TypeScript Server

Modern TypeScript MCP server for Atlassian JIRA and Confluence with comprehensive features and robust architecture.

## 🚀 Features

- **🔧 51 MCP Tools**: Complete coverage of JIRA (34 tools) and Confluence (17 tools) operations
- **⚡ Modern TypeScript**: Built with ES2022, strict type checking, and comprehensive error handling
- **🔐 Multiple Authentication**: Basic Auth, Personal Access Tokens (PAT), and OAuth 2.0 support
- **🚀 Service Modes**: Run JIRA-only, Confluence-only, or combined server modes
- **🌐 Transport Options**: STDIO for Claude Desktop, HTTP for testing, SSE experimental
- **📊 Performance**: TTL-based caching, rate limiting, and optimized API calls
- **🧪 Testing**: Comprehensive test suite with JIRA emulator and API endpoint coverage
- **📦 Docker Ready**: Containerized deployment with configuration management

## 📦 Quick Start

### Installation
```bash
git clone https://github.com/Bazilio-san/mcp-atlassian-ts.git
cd mcp-atlassian-ts
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your Atlassian credentials
```

### Run
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

## 🔧 Configuration

Configuration uses a **two-layer approach**:
- **`config.yaml`** - Primary configuration file for all application settings
- **`.env`** - Environment variables for sensitive data only (URLs, credentials)

### Primary Configuration (config.yaml)

Copy `config.yaml.example` to `config.yaml` and customize:

```yaml
# Server settings
server:
  port: 3000
  host: '0.0.0.0'
  transportType: http               # 'stdio', 'http', or 'sse'
  serviceMode: jira                 # 'jira' or 'confluence'

# Logging
logging:
  level: info                       # 'debug', 'info', 'warn', 'error'
  pretty: true

# Performance & Caching
cache:
  ttlSeconds: 300
  maxItems: 1000

rateLimit:
  windowMs: 900000
  maxRequests: 100

# JIRA Configuration
jira:
  url: ${JIRA_URL}                  # From environment variable
  maxResults: 50
  epicLinkFieldId: customfield_10014

  # Authentication via environment variables
  auth:
    basic:
      username: ${JIRA_USERNAME}
      password: ${JIRA_PASSWORD}    # API token recommended
    # pat: ${JIRA_PAT}             # Alternative: Personal Access Token

  # Tool Configuration
  usedInstruments:
    include: ALL                    # Enable all JIRA tools
    exclude: []                     # Or exclude specific tools

# Confluence Configuration
confluence:
  url: ${CONFLUENCE_URL}            # From environment variable
  maxResults: 50

  # Authentication via environment variables
  auth:
    basic:
      username: ${CONFLUENCE_USERNAME}
      password: ${CONFLUENCE_PASSWORD}
    # pat: ${CONFLUENCE_PAT}       # Alternative: Personal Access Token

  # Tool Configuration
  usedInstruments:
    include: ALL                    # Enable all Confluence tools
    exclude: []                     # Or exclude specific tools
```

### Environment Variables (.env)

Copy `.env.example` to `.env` and fill in your credentials:

```bash
# JIRA Authentication (Required for JIRA service)
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_PASSWORD=your-api-token        # Generate at id.atlassian.com

# Alternative: Personal Access Token
# JIRA_PAT=your-personal-access-token

# Confluence Authentication (Required for Confluence service)
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@company.com
CONFLUENCE_PASSWORD=your-api-token

# Alternative: Personal Access Token
# CONFLUENCE_PAT=your-personal-access-token
```

## 🔐 Authentication Methods

The server supports multiple authentication methods for flexibility:

### Basic Authentication (Recommended)
```bash
JIRA_USERNAME=your-email@company.com
JIRA_PASSWORD=your-api-token
```

### Personal Access Token (PAT)
```bash
JIRA_PAT=your-personal-access-token
```

### OAuth 2.0 (Future)
```bash
JIRA_OAUTH_CLIENT_ID=your-client-id
JIRA_OAUTH_CLIENT_SECRET=your-client-secret
```

For detailed authentication setup, see [Atlassian API Documentation](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).

## 🏃‍♂️ Usage

### Development Mode

```bash
# Development with hot reload
npm run dev

# Service-specific development
npm run dev:jira        # JIRA-only mode
npm run dev:confluence  # Confluence-only mode
npm run dev:stdio       # STDIO transport
```

### Production Mode

```bash
# Build and start
npm run build
npm start

# Service-specific modes
npm run start:jira        # JIRA-only server
npm run start:confluence  # Confluence-only server
```

### Docker Deployment

```bash
# Build and run
npm run docker:build
npm run docker:run

# Or manually
docker build -t mcp-atlassian-ts .
docker run -p 3000:3000 --env-file .env mcp-atlassian-ts
```

## 🛠️ Complete Tool List

### 🎯 JIRA Tools (34 tools) {#jira-tools}

#### Core Issue Management (9 tools) {#jira-core}
- [`jira_get_issue`](#jira_get_issue) - Get issue by ID or key
- [`jira_search_issues`](#jira_search_issues) - Search issues with JQL
- [`jira_create_issue`](#jira_create_issue) - Create new issue (dynamic tool with current priorities)
- [`jira_update_issue`](#jira_update_issue) - Update existing issue
- [`jira_delete_issue`](#jira_delete_issue) - Delete issue
- [`jira_batch_create_issues`](#jira_batch_create_issues) - Create multiple issues efficiently
- [`jira_get_transitions`](#jira_get_transitions) - Get available transitions for issue
- [`jira_transition_issue`](#jira_transition_issue) - Transition issue to new status
- [`jira_find_epic`](#jira_find_epic) - Find epic by name

#### Project Management (8 tools) {#jira-projects}
- [`jira_get_projects`](#jira_get_projects) - Get all accessible projects
- [`jira_get_project`](#jira_get_project) - Get specific project details
- [`jira_find_project`](#jira_find_project) - Find project by name/key
- [`jira_force_update_projects_index`](#jira_force_update_projects_index) - Refresh projects cache
- [`jira_get_project_versions`](#jira_get_project_versions) - Get project versions/releases
- [`jira_create_version`](#jira_create_version) - Create new project version
- [`jira_batch_create_versions`](#jira_batch_create_versions) - Create multiple versions
- [`jira_get_epics_for_project`](#jira_get_epics_for_project) - Get all epics in project

#### Agile/Scrum (6 tools) {#jira-agile}
- [`jira_get_agile_boards`](#jira_get_agile_boards) - Get all Agile boards
- [`jira_get_board_issues`](#jira_get_board_issues) - Get issues on specific board
- [`jira_get_sprints_from_board`](#jira_get_sprints_from_board) - Get sprints from board
- [`jira_get_sprint_issues`](#jira_get_sprint_issues) - Get issues in specific sprint
- [`jira_create_sprint`](#jira_create_sprint) - Create new sprint
- [`jira_update_sprint`](#jira_update_sprint) - Update existing sprint

#### Issue Links (4 tools) {#jira-links}
- [`jira_get_link_types`](#jira_get_link_types) - Get available link types
- [`jira_create_issue_link`](#jira_create_issue_link) - Create link between issues
- [`jira_create_remote_issue_link`](#jira_create_remote_issue_link) - Create remote link
- [`jira_remove_issue_link`](#jira_remove_issue_link) - Remove issue link

#### Comments & Epic Links (3 tools) {#jira-comments}
- [`jira_add_comment`](#jira_add_comment) - Add comment to issue
- [`jira_link_to_epic`](#jira_link_to_epic) - Link issue to epic
- [`jira_batch_get_changelogs`](#jira_batch_get_changelogs) - Get changelogs for multiple issues

#### Worklog Management (2 tools) {#jira-worklog}
- [`jira_get_worklog`](#jira_get_worklog) - Get worklog entries for issue
- [`jira_add_worklog`](#jira_add_worklog) - Add worklog entry to issue

#### Metadata & Search (2 tools) {#jira-metadata}
- [`jira_get_user_profile`](#jira_get_user_profile) - Get user profile information
- [`jira_search_fields`](#jira_search_fields) - Search and get field metadata

#### Attachments (1 tool) {#jira-attachments}
- [`jira_download_attachments`](#jira_download_attachments) - Download issue attachments

### 📝 Confluence Tools (17 tools) {#confluence-tools}

#### Content Management (6 tools) {#confluence-content}
- [`confluence_search`](#confluence_search) - Search Confluence content
- [`confluence_get_page`](#confluence_get_page) - Get page by ID
- [`confluence_get_page_by_title`](#confluence_get_page_by_title) - Get page by title and space
- [`confluence_create_page`](#confluence_create_page) - Create new page
- [`confluence_update_page`](#confluence_update_page) - Update existing page
- [`confluence_delete_page`](#confluence_delete_page) - Delete page

#### Space Management (3 tools) {#confluence-spaces}
- [`confluence_get_spaces`](#confluence_get_spaces) - Get all accessible spaces
- [`confluence_get_space`](#confluence_get_space) - Get specific space details
- [`confluence_get_space_content`](#confluence_get_space_content) - Get content in space

#### Collaboration (5 tools) {#confluence-collaboration}
- [`confluence_add_comment`](#confluence_add_comment) - Add comment to page
- [`confluence_get_comments`](#confluence_get_comments) - Get page comments
- [`confluence_add_label`](#confluence_add_label) - Add label to page
- [`confluence_get_labels`](#confluence_get_labels) - Get page labels
- [`confluence_get_pages_by_label`](#confluence_get_pages_by_label) - Find pages by label

#### Navigation & History (3 tools) {#confluence-navigation}
- [`confluence_get_page_children`](#confluence_get_page_children) - Get child pages
- [`confluence_get_page_history`](#confluence_get_page_history) - Get page version history
- [`confluence_search_user`](#confluence_search_user) - Search for users

### 🔧 Utility Tools (3 tools) {#utility-tools}
- [`cache_clear`](#cache_clear) - Clear cache (supports pattern matching)
- [`cache_stats`](#cache_stats) - Get cache statistics and performance metrics
- [`health_check`](#health_check) - Check service connectivity and health

## 🚀 Deployment {#deployment}

Production-ready deployment scripts for Linux and Windows environments.

### 📁 Deployment Scripts

| Script | Purpose | Platform |
|--------|---------|----------|
| `deploy/deploy.sh` | Full production deployment | Linux/Unix |
| `deploy/update.sh` | Quick updates without restart | Linux/Unix |
| `deploy/restart.sh` | Service restart with health checks | Linux/Unix |
| `deploy/rollback.sh` | Rollback to backup or git commit | Linux/Unix |
| `deploy/status.sh` | Comprehensive status dashboard | Linux/Unix |
| `deploy/deploy.bat` | Full deployment for Windows | Windows |
| `deploy/status.bat` | Status check for Windows | Windows |

### 🛠️ Setup

```bash
# Make scripts executable (Linux/Unix)
chmod +x deploy/*.sh

# Configure paths in scripts (if needed)
# PROJECT_DIR="/opt/mcp-atlassian-ts"
# BACKUP_DIR="/opt/backups/mcp-atlassian"
```

### 📖 Usage Examples

```bash
# Full deployment
./deploy/deploy.sh main mcp-atlassian

# Quick update
./deploy/update.sh

# Check status
./deploy/status.sh --detailed

# Restart service
./deploy/restart.sh mcp-atlassian --force

# Rollback to backup
./deploy/rollback.sh backup_20231201_143022.tar.gz

# Git rollback
./deploy/rollback.sh HEAD~1 --git
```

### ✨ Features

- ✅ **Automated backups** before deployments
- ✅ **Health checks** and service monitoring
- ✅ **Git integration** with commit tracking
- ✅ **Graceful service reloads** for zero downtime
- ✅ **Rollback capabilities** to previous states
- ✅ **Configuration validation** before startup
- ✅ **Comprehensive logging** of all operations
- ✅ **PM2 integration** for process management

For detailed deployment documentation, see [`deploy/README.md`](deploy/README.md).

## 🧪 Testing {#testing}

### Unit Tests
```bash
npm test                    # Run Jest test suite
npm run test:coverage       # Run with coverage report
npm run test:watch          # Run in watch mode
```

### Integration Testing
The project includes comprehensive testing infrastructure:

#### JIRA Emulator
```bash
node tests/emulator/jira.js
```
- Self-contained JIRA API emulator on port 8080
- Test data: project TEST, issues TEST-1/TEST-2
- No external dependencies required

#### Complete Test Flow
```bash
# Terminal 1: Start JIRA emulator
node tests/emulator/jira.js

# Terminal 2: Start MCP server
npm start

# Terminal 3: Run MCP tests
node tests/mcp/jira.js
```

#### API Endpoint Testing
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

## 🏗️ Architecture {#architecture}

```
src/
├── bootstrap/            # Application initialization and configuration
├── core/                # Core infrastructure systems
│   ├── auth/            # Authentication (Basic, PAT, OAuth2)
│   ├── server/          # MCP server with multiple transports
│   └── utils/           # Logging, caching, rate limiting, utilities
├── domains/             # Domain-specific implementations
│   ├── jira/            # JIRA client and 34 tools
│   └── confluence/      # Confluence client and 17 tools
├── types/               # TypeScript type definitions
└── index.ts             # Main entry point with CLI support
```

### Key Components {#key-components}

- **MCP Server**: Handles MCP protocol with STDIO/HTTP/SSE transports
- **Tool Registry**: Manages 51 MCP tools with validation and execution
- **Authentication**: Multi-method auth (Basic, PAT, OAuth2) with validation
- **Domain Managers**: JIRA and Confluence specialized tool managers
- **Cache Layer**: TTL-based caching with performance statistics
- **Error Handling**: Comprehensive error types and context preservation

## 🌐 Transport Options {#transport-options}

### STDIO (Default)
- JSON-RPC 2.0 over stdin/stdout
- Ideal for Claude Desktop and MCP clients
- Direct integration without HTTP overhead

### HTTP
- RESTful API on port 3000
- JSON-RPC 2.0 over HTTP
- Web-based clients and testing
- Health check at `/health`

### SSE (Experimental)
- Server-Sent Events for real-time updates
- Persistent connections
- Web applications with live updates

## 📊 Development Features {#development-features}

### Code Quality
- **TypeScript**: ES2022 with strict type checking
- **ESLint**: Code quality and style enforcement
- **Jest**: Comprehensive testing framework
- **Hot Reload**: Development server with auto-restart

### Production Features
- **Caching**: TTL-based with statistics (`cache_stats`)
- **Rate Limiting**: Configurable request limits
- **Health Monitoring**: Service connectivity checks (`health_check`)
- **Error Handling**: Comprehensive error types and context
- **Logging**: Structured logging with Pino

## 🤝 Contributing {#contributing}

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License {#license}

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support {#support}

- [GitHub Issues](https://github.com/Bazilio-san/mcp-atlassian-ts/issues)
- [Documentation](CLAUDE.md)
- [Test Examples](tests/)

---

Built with ❤️ for the Model Context Protocol ecosystem
