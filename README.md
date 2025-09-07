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
Create `.env` file:
```bash
ATLASSIAN_URL=http://localhost:8080
TRANSPORT_TYPE=http
```

### 3. Start MCP Server
```bash
npm start
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

### Environment Variables (.env)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ATLASSIAN_URL` | ✅ | Your Atlassian instance URL | - |
| `TRANSPORT_TYPE` | ❌ | Transport type | `http` |
| `PORT` | ❌ | HTTP server port | `3000` |

### Authentication

For production use, add authentication:

```bash
# Basic Auth
ATLASSIAN_EMAIL=your-email@company.com
ATLASSIAN_API_TOKEN=your-api-token

# Or Personal Access Token (recommended)
ATLASSIAN_PAT=your-personal-access-token
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
| `npm start` | Start production server |
| `npm run dev` | Development with hot reload |
| `npm run build` | Build for production |
| `npm run test` | Run test suite |
| `npm run lint` | Code linting |

### Health Check

```bash
curl http://localhost:3000/health
```

## 📄 License

This project is licensed under the MIT License.
