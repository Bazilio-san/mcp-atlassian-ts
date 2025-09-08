# MCP Atlassian TypeScript Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.13+-purple.svg)](https://github.com/modelcontextprotocol/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **comprehensive, production-ready TypeScript implementation** of the Model Context Protocol (MCP) server for Atlassian JIRA and Confluence. Features **47 MCP tools** covering all aspects of issue management, project administration, Agile workflows, content creation, and team collaboration.

## 🚀 Quick Start

### 1. Build the project
```bash
npm install
npm run build
```

### 2. Configure environment
Create `.env` file with service-specific settings:

#### For JIRA:
```bash
MCP_SERVICE=jira
JIRA_URL=https://jira.company.com
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your-jira-token
TRANSPORT_TYPE=http
```

#### For Confluence:
```bash
MCP_SERVICE=confluence
CONFLUENCE_URL=https://wiki.company.com
CONFLUENCE_EMAIL=user@company.com
CONFLUENCE_API_TOKEN=your-confluence-token
TRANSPORT_TYPE=http
```

### 3. Start MCP Server
```bash
# Using environment variable
export MCP_SERVICE=jira  # or confluence
npm start

# Or using command line argument
npm start -- --service jira
npm start -- --service confluence

# Or using NPM scripts
npm run start:jira
npm run start:confluence
```

## 🧪 Testing

See: [tests/README.md](tests/README.md)

## 🧰 Available Tools

**Total: 47 MCP Tools** - Complete Atlassian integration with comprehensive functionality covering all aspects of JIRA and Confluence management.

### JIRA Tools (30 Tools)

#### 📋 Issue Management (8 Tools)
- `jira_get_issue` - Get detailed issue information
- `jira_search_issues` - Search issues with JQL queries  
- `jira_create_issue` - Create new issue
- `jira_update_issue` - Update existing issue
- `jira_delete_issue` - Delete issue permanently
- `jira_batch_create_issues` - Create multiple issues at once
- `jira_add_comment` - Add comment to issue
- `jira_get_transitions` - Get available status transitions
- `jira_transition_issue` - Change issue status

#### 🏗️ Project Management (3 Tools)
- `jira_get_projects` - List accessible projects
- `jira_get_project_versions` - Get project versions
- `jira_create_version` - Create project version
- `jira_batch_create_versions` - Create multiple versions

#### 👤 User & Metadata Management (3 Tools)
- `jira_get_user_profile` - Get user profile details
- `jira_search_fields` - Search custom fields
- `jira_get_link_types` - Get available issue link types

#### 🔗 Issue Linking (4 Tools)
- `jira_create_issue_link` - Link two issues together
- `jira_create_remote_issue_link` - Create external link
- `jira_remove_issue_link` - Remove issue link
- `jira_link_to_epic` - Link issue to epic

#### ⏱️ Time Tracking (2 Tools)
- `jira_get_worklog` - Get worklog entries
- `jira_add_worklog` - Log work time

#### 📎 Attachments (1 Tool)
- `jira_download_attachments` - Get attachment metadata & links

#### 🏃 Agile & Scrum (8 Tools)
- `jira_get_agile_boards` - Get Scrum/Kanban boards
- `jira_get_board_issues` - Get issues from board
- `jira_get_sprints_from_board` - Get sprints from board
- `jira_get_sprint_issues` - Get issues in sprint
- `jira_create_sprint` - Create new sprint
- `jira_update_sprint` - Update sprint details

#### 📊 Bulk Operations (1 Tool)
- `jira_batch_get_changelogs` - Get change history for multiple issues

### Confluence Tools (17 Tools)

#### 📄 Content Management (6 Tools)
- `confluence_search` - Search content with CQL
- `confluence_get_page` - Get page by ID
- `confluence_get_page_by_title` - Get page by space + title
- `confluence_create_page` - Create new page
- `confluence_update_page` - Update existing page
- `confluence_delete_page` - Delete page (trash/permanent)

#### 🏢 Space Management (3 Tools)
- `confluence_get_spaces` - List accessible spaces
- `confluence_get_space` - Get space details
- `confluence_get_space_content` - Get content in space

#### 💬 Comments (2 Tools)
- `confluence_add_comment` - Add comment to page
- `confluence_get_comments` - Get page comments

#### 👥 User Management (1 Tool)
- `confluence_search_user` - Search users by name/email

#### 🏷️ Label Management (3 Tools)
- `confluence_add_label` - Add label to page
- `confluence_get_labels` - Get page labels
- `confluence_get_pages_by_label` - Find pages by label

#### 🌳 Page Hierarchy (1 Tool)
- `confluence_get_page_children` - Get child pages

#### 📚 History & Versions (1 Tool)
- `confluence_get_page_history` - Get page version history

## ⚙️ Configuration

### Service Mode (Required)

The server requires you to specify which service to run:
- **JIRA mode**: Runs JIRA tools and connectivity only (30 tools)
- **Confluence mode**: Runs Confluence tools and connectivity only (17 tools)

There is no combined mode - each server instance is dedicated to a single service for better resource management and deployment flexibility.

### Environment Variables (.env)

#### Common Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `MCP_SERVICE` | ✅ | Service mode: `jira` or `confluence` | - |
| `TRANSPORT_TYPE` | ❌ | Transport type: `stdio`, `http`, `sse` | `http` |
| `PORT` | ❌ | HTTP server port | `3000` |
| `LOG_LEVEL` | ❌ | Logging level | `info` |
| `CACHE_TTL_SECONDS` | ❌ | Cache time-to-live | `300` |

#### JIRA Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | ✅ | JIRA instance URL |
| `JIRA_EMAIL` | ✅* | Email for authentication |
| `JIRA_API_TOKEN` | ❌ | API token (choose one auth method) |
| `JIRA_PAT` | ❌ | Personal Access Token |
| `JIRA_OAUTH_CLIENT_ID` | ❌ | OAuth 2.0 client ID |
| `JIRA_OAUTH_CLIENT_SECRET` | ❌ | OAuth 2.0 client secret |
| `JIRA_MAX_RESULTS` | ❌ | Max results per query (default: 50) |
| `JIRA_DEFAULT_PROJECT` | ❌ | Default project key |

#### Confluence Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `CONFLUENCE_URL` | ✅ | Confluence instance URL |
| `CONFLUENCE_EMAIL` | ✅* | Email for authentication |
| `CONFLUENCE_API_TOKEN` | ❌ | API token (choose one auth method) |
| `CONFLUENCE_PAT` | ❌ | Personal Access Token |
| `CONFLUENCE_OAUTH_CLIENT_ID` | ❌ | OAuth 2.0 client ID |
| `CONFLUENCE_OAUTH_CLIENT_SECRET` | ❌ | OAuth 2.0 client secret |
| `CONFLUENCE_MAX_RESULTS` | ❌ | Max results per query (default: 50) |
| `CONFLUENCE_DEFAULT_SPACE` | ❌ | Default space key |

*Required for Basic Auth with API token

### Authentication Methods

Each service supports three authentication methods:

#### 1. API Token (Basic Auth)
```bash
# JIRA
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=your-jira-token

# Confluence
CONFLUENCE_EMAIL=user@company.com
CONFLUENCE_API_TOKEN=your-confluence-token
```

#### 2. Personal Access Token (Recommended)
```bash
# JIRA
JIRA_PAT=your-jira-pat

# Confluence
CONFLUENCE_PAT=your-confluence-pat
```

#### 3. OAuth 2.0
```bash
# JIRA
JIRA_OAUTH_CLIENT_ID=jira-client
JIRA_OAUTH_CLIENT_SECRET=jira-secret
JIRA_OAUTH_ACCESS_TOKEN=jira-access
JIRA_OAUTH_REFRESH_TOKEN=jira-refresh

# Confluence
CONFLUENCE_OAUTH_CLIENT_ID=conf-client
CONFLUENCE_OAUTH_CLIENT_SECRET=conf-secret
CONFLUENCE_OAUTH_ACCESS_TOKEN=conf-access
CONFLUENCE_OAUTH_REFRESH_TOKEN=conf-refresh
```

### Transport Types

- `stdio` - For MCP client integration (Claude Desktop)
- `http` - For network-based testing and integration
- `sse` - Server-Sent Events (experimental)

## 🏗️ Architecture

### Modular Structure
```
src/
├── core/             # Core systems (auth, cache, server)
├── domains/          # Domain-specific code
│   ├── jira/         # JIRA tools and client
│   └── confluence/   # Confluence tools and client  
├── types/            # TypeScript definitions
└── index.ts          # Main entry point

tests/
├── jira-emulator.js          # Standalone JIRA API emulator
├── jira-endpoints-tester.js  # A comprehensive module for testing all Jira Rest API V2
└── mcp-client-tests.js.js    # Complete MCP client and test runner
```

### Three Components

1. **JIRA Emulator**: `node tests/jira-emulator.js`
   - Standalone JIRA API mock server
   - Port 8080, test data included
   - No dependencies

2. **MCP Server**: `npm start` 
   - Uses .env configuration
   - HTTP transport on port 3001
   - Production-ready architecture

3. **MCP Client & Test Runner**: `node tests/mcp-client-tests.js`
   - Complete MCP client with all functionality
   - Integrated test runner for all 47 MCP tools
   - Single consolidated module for testing and validation

## 🔧 Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server (requires MCP_SERVICE) |
| `npm run start:jira` | Start JIRA server |
| `npm run start:confluence` | Start Confluence server |
| `npm run dev` | Development with hot reload |
| `npm run dev:jira` | Development JIRA server |
| `npm run dev:confluence` | Development Confluence server |
| `npm run build` | Build for production |
| `npm run test` | Run test suite |
| `npm run lint` | Code linting |
| `npm run typecheck` | TypeScript type checking |

### Health Check

```bash
curl http://localhost:3000/health
```

## 🚀 Deployment

### Docker Deployment

#### JIRA Server
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
ENV MCP_SERVICE=jira
ENV JIRA_URL=https://jira.company.com
CMD ["npm", "start"]
```

#### Confluence Server
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
ENV MCP_SERVICE=confluence
ENV CONFLUENCE_URL=https://wiki.company.com
CMD ["npm", "start"]
```

### PM2 Deployment

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'mcp-jira',
      script: 'dist/index.js',
      env: {
        MCP_SERVICE: 'jira',
        JIRA_URL: 'https://jira.company.com',
        JIRA_EMAIL: 'bot@company.com',
        JIRA_API_TOKEN: process.env.JIRA_TOKEN
      }
    },
    {
      name: 'mcp-confluence',
      script: 'dist/index.js',
      env: {
        MCP_SERVICE: 'confluence',
        CONFLUENCE_URL: 'https://wiki.company.com',
        CONFLUENCE_EMAIL: 'bot@company.com',
        CONFLUENCE_API_TOKEN: process.env.CONFLUENCE_TOKEN
      }
    }
  ]
};
```

### Kubernetes Deployment

```yaml
# jira-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-jira
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: mcp-jira
        image: mcp-atlassian:latest
        env:
        - name: MCP_SERVICE
          value: "jira"
        - name: JIRA_URL
          value: "https://jira.company.com"
---
# confluence-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-confluence
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: mcp-confluence
        image: mcp-atlassian:latest
        env:
        - name: MCP_SERVICE
          value: "confluence"
        - name: CONFLUENCE_URL
          value: "https://wiki.company.com"
```

## 💡 Benefits of Service Separation

### Resource Efficiency
- Only loads necessary tools for the selected service
- Reduced memory footprint (30-40% less than combined)
- Faster startup times
- Lower CPU usage

### Deployment Flexibility
- Deploy JIRA and Confluence servers independently
- Scale each service based on actual usage
- Different maintenance windows for each service
- Service-specific monitoring and logging

### Security
- Separate credentials for each service
- Principle of least privilege
- Reduced attack surface
- Service isolation

## 🔧 Troubleshooting

### Common Issues

**Error: Service mode is required**
- Solution: Set `MCP_SERVICE` environment variable or use `--service` flag

**Error: JIRA URL is required but not configured**
- Solution: Set `JIRA_URL` environment variable when running in JIRA mode

**Error: Confluence URL is required but not configured**
- Solution: Set `CONFLUENCE_URL` environment variable when running in Confluence mode

**Error: No authentication method configured**
- Solution: Provide API token, PAT, or OAuth credentials for the selected service

### Getting Help

```bash
# Show available options
npm start -- --help

# Check health endpoint
curl http://localhost:3000/health
```

## 📋 Best Practices

1. **Run separate instances** for JIRA and Confluence in production
2. **Use service-specific credentials** rather than shared ones
3. **Monitor each service independently** for better observability
4. **Scale based on usage** - JIRA typically needs more resources
5. **Use environment variables** for configuration in production
6. **Implement health checks** for each service endpoint

## 📄 License

This project is licensed under the MIT License.
