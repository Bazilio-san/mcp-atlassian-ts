# Running Tests

## Setup
Check the `.env` file:
- `JIRA_URL` - URL of your JIRA server (https://jira.your-org.com)
- `JIRA_USERNAME` - username
- `JIRA_PASSWORD` - password / token
- `TEST_JIRA_PROJECT` - test project (default TEST)


## 1. Direct JIRA API Tests
```bash
# Run all tests
node tests/endpoints/jira.js

# Selective tests
node tests/endpoints/jira.js --tests=1-1,2-*,9

```

### Parameters:
- `--tests=X-Y` - run specific tests (X - group, Y - test number)
- `--tests=X-*` - run all tests in group X



## 2. MCP JIRA Tests (via MCP protocol)
```bash
# Run all MCP tests
node tests/mcp/jira.js

# Selective tests
node tests/mcp/jira.js --tests=1-1,2-*,9

# Tests for jira_get_issue tool
node tests/mcp/jira.js --tests=jira_get_issue

# Combined filters
node tests/mcp/jira.js --tests=1-1,jira_search_issues,8-*

# Show help
node tests/mcp/jira.js --help
```

### Parameters:
- `--tests=X-Y` - run specific tests (X - group, Y - test number)
- `--tests=X-*` - run all tests in group X
- `--tests=toolName` - run tests for specific tool
- `--help` or `-h` - show help

#### MCP JIRA Test Groups:
1. **Issue Management** (1-1 to 1-9) - issue management
2. **Project Management** (2-1 to 2-4) - project management
3. **User Management** (3-1) - user management
4. **Fields & Metadata** (4-1) - fields and metadata
5. **Issue Links** (5-1 to 5-4) - issue links
6. **Worklog** (6-1 to 6-2) - time tracking
7. **Attachments** (7-1) - attachments
8. **Agile/Scrum** (8-1 to 8-6) - Agile tools
9. **Bulk Operations** (9-1 to 9-2) - bulk operations
10. **Other** (10-1) - other tools


==============================================================================

Test execution:

## Start emulator
node tests/emulator/jira.js

## Start MCP server (in separate terminal)
JIRA_URL="http://localhost:8080" JIRA_USERNAME="admin" JIRA_PASSWORD="admin" \
MCP_SERVICE_MODE="jira" TRANSPORT_TYPE="http" SERVER_PORT="3000" \
node dist/src/index.js

## Run tests (in third terminal)
node tests/run-http-tests.js


