# MCP Client Testing with Mass Endpoint Verification

```bash
# Terminal 1: Start JIRA emulator (Standalone)
# Runs on port 8080. Contains test data: project TEST, issues TEST-1/TEST-2. No external dependencies
node tests/jira-emulator.js

# Terminal 2: Start MCP server  
npm start

# Terminal 3: Run MCP Client Tests (Network-based)
node tests/mcp-client-tests.js
```

# "Endpoint Tester": JIRA REST API v2 Endpoints Tester - direct endpoint testing (without MCP)

Comprehensive module for testing all JIRA REST API v2 endpoints in vanilla JavaScript 
without using testing frameworks.


## 🎯 Features

- ✅ **Informational endpoints** - tests by reading data and checks for expected properties
- ✅ **Modifying endpoints** - creates test issues, modifies them, checks results and deletes
- ✅ **Full coverage** - tests all endpoints from `tests/jira-api-v2.http` + additional from documentation
- ✅ **Data validation** - checks response structure and required fields presence
- ✅ **Automatic cleanup** - deletes created test resources
- ✅ **Detailed reports** - generates test success statistics

## 🧪 Covered endpoints

### Informational endpoints
- **Issues**:
  - `GET /issue/{key}`
  - `GET /issue/{key}/editmeta`
  - `GET /issue/{key}/transitions`
  - `GET /issue/{key}/comment`
  - `GET /issue/{key}/worklog`
  - `GET /issue/createmeta`
- **Search**:
  - `POST /search`
  - `GET /search` (JQL queries)
- **Projects**:
  - `GET /project`
  - `GET /project/{key}`
  - `GET /project/{key}/statuses`
  - `GET /project/{key}/versions`
  - `GET /project/{key}/components`
- **Users**:
  - `GET /user`
  - `GET /user/search`
  - `GET /user/assignable/search`
  - `GET /myself`
- **Metadata**:
  - `GET /priority`
  - `GET /status`
  - `GET /issuetype`
  - `GET /field`
  - `GET /resolution`
  - `GET /role`
  - `GET /issueLinkType`
- **Additional**:
  - `GET /serverInfo`
  - `GET /configuration`
  - `GET /dashboard`
  - `GET /filter/favourite`
  - `GET /permissions`

### Modifying endpoints
- **Issue Management**:
  - `POST /issue`
  - `PUT /issue/{key}`
  - `DELETE /issue/{key}`
- **Comments**:
  - `POST /issue/{key}/comment`
  - `PUT /issue/{key}/comment/{id}`
  - `DELETE /issue/{key}/comment/{id}`
- **Transitions**:
  - `POST /issue/{key}/transitions`
- **Worklog**:
  - `POST /issue/{key}/worklog`
  - `PUT /issue/{key}/worklog/{id}`
  - `DELETE /issue/{key}/worklog/{id}`
- **Versions**:
  - `POST /version`
  - `PUT /version/{id}`
  - `DELETE /version/{id}`
- **Issue Links**:
  - `POST /issueLink`
  - `POST /issue/{key}/remotelink`

### Agile endpoints
- **Boards**:
  - `GET /agile/1.0/board`
  - `GET /agile/1.0/board/{id}/sprint`
  - `GET /agile/1.0/board/{id}/issue`

## 🚀 Usage

### Running "Endpoint Tester" with emulator

Set in .env

```dotenv
JIRA_URL=http://localhost:8080
JIRA_PAT=test
SERVER_PORT=3000
TEST_ADD_X_HEADER=x-user:vpupkin
```

```bash
node tests/jira-endpoints-tester.js
```

### Programmatic usage
```javascript
const JiraEndpointsTester = require('./jira-endpoints-tester');

// Creating tester instance
const tester = new JiraEndpointsTester();

// Running all tests
const results = await tester.runAllTests();

console.log(`Passed: ${results.passedTests}/${results.totalTests}`);
console.log(`Success rate: ${results.passRate}%`);
```

### Custom configuration
```javascript
const tester = new JiraEndpointsTester();

// Testing only informational endpoints
await tester.testIssueEndpoints();
await tester.testProjectEndpoints();
await tester.testMetadataEndpoints();
```

## 📊 Output examples

```
🚀 Starting comprehensive JIRA REST API v2 endpoint tests...
📡 Base URL: http://localhost:8080
👤 Auth: basic (admin)
📋 Test Project: TEST

=== TESTING ISSUE ENDPOINTS ===
✅ PASS Get Issue [GET /issue/TEST-1] - Status: 200
✅ PASS Issue Properties - All expected properties present
✅ PASS Get Issue Edit Meta [GET /issue/TEST-1/editmeta] - Status: 200
✅ PASS Get Issue Transitions [GET /issue/TEST-1/transitions] - Status: 200

=== TESTING MODIFYING ENDPOINTS ===
✅ PASS Create Test Issue [POST /issue] - Status: 201
✅ Test issue created: TEST-3
✅ PASS Update Issue [PUT /issue/TEST-3] - Status: 204
✅ Issue update verified successfully

===============================================================================
📊 JIRA REST API v2 ENDPOINT TESTING REPORT
===============================================================================
⏱️  Total Duration: 15.42 seconds
📊 Total Tests: 85
✅ Passed: 78
❌ Failed: 7
📈 Pass Rate: 91.8%
===============================================================================
```

## 🎛️ Configuration

### Constructor parameters
```javascript
const cfg = {
    baseUrl: 'http://localhost:8080',  // URL JIRA server
    auth: {
        type: 'basic',      // 'basic' or 'token'
        username: 'admin',  // for basic auth
        password: 'admin',  // for basic auth  
        token: 'api-token'  // for token auth
    }
}
```

### Internal settings
- `testProjectKey: 'TEST'` - project key for testing
- Automatic creation/deletion of test resources
- Timeouts and retries for HTTP requests

## 🧹 Resource management

Tester automatically tracks created resources:
- **Issues** - test issues
- **Versions** - project versions  
- **Comments** - comments
- **Worklogs** - time logs
- **Links** - issue links

All created resources are deleted at the end of testing.

## 🔍 Data validation

For informational endpoints tester checks:
- HTTP status codes (200, 201, 204, 404 etc.)
- Presence of required fields in responses
- JSON structure correctness
- Data type compliance

For modifying endpoints additionally:
- Actual application of changes
- Data consistency after operations
- Correctness of create/update/delete operations

## 🚀 CI/CD Integration

```bash
# In pipeline can be used like this:
node jira-endpoints-tester.js > test-results.log
if [ $? -eq 0 ]; then
    echo "API tests passed"
else
    echo "API tests failed"
    exit 1
fi
```

## 🤝 Compatibility

- **JIRA Versions**: Server 7.x+, Cloud, Data Center
- **Node.js**: 12+
- **Browsers**: Modern browsers with fetch API
- **API Version**: REST API v2

## 📝 Logs and reports

Results are saved in `tester.testResults`:
```javascript
const res = {
    name: 'Get Issue',
    success: true,
    status: 200, 
    endpoint: '/issue/TEST-1',
    method: 'GET',
    details: 'OK',
    timestamp: '2025-01-15T10:30:00.000Z',
};
```

## 🎯 Usage with emulator

For working with built-in JIRA emulator:
```bash
# Terminal 1 - start emulator
node tests/jira-emulator.js

# Terminal 2 - run tests
node tests/jira-endpoints-tester.js
```

Emulator provides test data:
- Project: **TEST**  
- Issues: **TEST-1**, **TEST-2**
- User: **admin/admin**
- Full set of metadata (priorities, statuses, issue types)
