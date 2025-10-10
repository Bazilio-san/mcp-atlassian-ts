# MCP Metadata Extractor

Tool for extracting metadata from MCP (Model Context Protocol) servers, including tool signatures, prompts, resources, and server version information.

## Features

- ✅ Supports both **STDIO** and **HTTP/SSE** transports
- 📦 Extracts all tool signatures with full parameter details
- 📝 Retrieves available prompts
- 📂 Lists server resources
- 💾 Saves metadata to JSON files
- 🔄 Easy configuration for multiple servers

## Installation

```bash
cd tmp_mcp_a_client
npm install
```

## Usage

### Quick Start with Local Server

The easiest way to test the tool is with the local Atlassian MCP server:

```bash
# 1. Build the main project (from root directory)
cd ..
npm run build

# 2. Start JIRA emulator (in separate terminal)
node tests/emulator/jira.js

# 3. Run the example (from tmp_mcp_a_client directory)
cd tmp_mcp_a_client
node example-local.js
```

This will extract metadata from the local MCP server and save to `mcp-local-atlassian-meta.json`.

### Running the Test Suite

The `test.js` file includes configurations for multiple MCP servers:

```bash
node test.js
```

**Current Test Status:**
- ✅ **Local Atlassian (STDIO)** - Working with JIRA emulator
- ⚠️ **Atlassian Cloud (SSE)** - Requires OAuth authentication (skipped)
- ⚠️ **FINAM API (SSE)** - Requires API credentials (skipped)

### Using the MCP Client Module

#### Basic Usage

```javascript
import { extractMCPMetadata } from './mcp-client.js';

// Configure and extract metadata
const result = await extractMCPMetadata({
  name: 'my-server',
  sse: {
    url: 'https://example.com/sse',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
});

console.log(result.metadata);
console.log(`Saved to: ${result.filePath}`);
```

#### Advanced Usage with Class

```javascript
import { MCPClient } from './mcp-client.js';

const client = new MCPClient({
  name: 'custom-server',
  sse: {
    url: 'https://example.com/sse'
  }
});

await client.connect();
const metadata = await client.extractMetadata();
await client.saveMetadata(metadata, 'custom-output.json');
await client.disconnect();
```

## Configuration Options

### SSE Transport (Server-Sent Events)

Used for connecting to remote MCP servers over HTTP:

```javascript
{
  name: 'server-name',
  sse: {
    url: 'https://server-url/sse',
    headers: {
      'Authorization': 'Bearer TOKEN',
      'Custom-Header': 'value'
    }
  }
}
```

### STDIO Transport

Used for connecting to local MCP servers via standard input/output:

```javascript
{
  name: 'server-name',
  stdio: {
    command: 'node',
    args: ['path/to/server.js'],
    env: {
      API_KEY: 'your-key',
      DEBUG: 'true'
    }
  }
}
```

## MCP Server Examples

### 1. Atlassian MCP Server

**Official Documentation:** https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/

#### Connection Options

##### Option A: Direct SSE Connection

```javascript
{
  name: 'atlassian',
  sse: {
    url: 'https://mcp.atlassian.com/v1/sse'
  }
}
```

##### Option B: Using mcp-remote Proxy (STDIO)

The `mcp-remote` proxy handles OAuth authentication:

```javascript
{
  name: 'atlassian',
  stdio: {
    command: 'npx',
    args: ['-y', 'mcp-remote', 'https://mcp.atlassian.com/v1/sse']
  }
}
```

Or run directly in terminal:

```bash
npx -y mcp-remote https://mcp.atlassian.com/v1/sse
```

**Note:** For older versions of mcp-remote, specify version:

```bash
npx -y mcp-remote@0.1.13 https://mcp.atlassian.com/v1/sse
```

#### IDE Configuration (VS Code/Cursor)

**VS Code - mcp.json:**

```json
{
  "servers": {
    "atlassian-mcp-server": {
      "url": "https://mcp.atlassian.com/v1/sse",
      "type": "http"
    }
  },
  "inputs": []
}
```

**Cursor - MCP Settings:**

```json
{
  "Atlassian-MCP-Server": {
    "url": "https://mcp.atlassian.com/v1/sse"
  }
}
```

**Cursor (Legacy):**

```json
{
  "mcp-atlassian-api": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://mcp.atlassian.com/v1/sse"
    ]
  }
}
```

### 2. FINAM Trade API MCP Server

**Website:** https://mcp-finam-trade-api.bazilio.ru/

#### Connection Options

##### SSE Transport

```javascript
{
  name: 'finam-trade-api',
  sse: {
    url: 'https://mcp-finam-trade-api.bazilio.ru/sse',
    headers: {
      'Authorization': 'Bearer YOUR_SECRET_TOKEN',
      'X-Finam-Account-Id': 'YOUR_ACCOUNT_ID'
    }
  }
}
```

##### STDIO Transport (Local Server)

```javascript
{
  name: 'finam-trade-api',
  stdio: {
    command: 'node',
    args: ['dist/mcp/index.js'],
    env: {
      API_BASE_URL: 'https://api.finam.ru'
    }
  }
}
```

#### NPM Package

```bash
npm install mcp-finam-trade-api
```

#### Available Transports

1. **STDIO:** `node dist/mcp/index.js`
2. **SSE:**
   - Connect: `GET /sse`
   - Send messages: `POST /message`
3. **Streamable HTTP:** `POST /mcp/v1`

#### Health Check

```bash
curl https://mcp-finam-trade-api.bazilio.ru/health
```

## Output Format

The extracted metadata is saved as JSON with the following structure:

```json
{
  "serverInfo": {
    "name": "server-name",
    "version": "1.0.0"
  },
  "tools": [
    {
      "name": "tool-name",
      "description": "Tool description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string",
            "description": "Parameter description"
          }
        },
        "required": ["param1"]
      }
    }
  ],
  "prompts": [
    {
      "name": "prompt-name",
      "description": "Prompt description",
      "arguments": []
    }
  ],
  "resources": [
    {
      "uri": "resource://uri",
      "name": "Resource name",
      "description": "Resource description",
      "mimeType": "text/plain"
    }
  ],
  "extractedAt": "2025-10-07T12:00:00.000Z"
}
```

## Troubleshooting

### Connection Errors

**Problem:** Cannot connect to SSE server

**Solution:**
- Verify the URL is correct
- Check network connectivity
- Ensure authentication headers are valid

### Authentication Issues

**Problem:** 401 Unauthorized or authentication failures

**Solution:**
- For Atlassian: Use `mcp-remote` proxy to handle OAuth
- For FINAM: Provide valid `Authorization` and `X-Finam-Account-Id` headers

### STDIO Transport Issues

**Problem:** Command not found or process spawn error

**Solution:**
- Verify command path is correct
- Ensure required dependencies are installed
- Check environment variables are set

### Version Compatibility

**Problem:** mcp-remote version issues

**Solution:**
- Try specifying a specific version: `npx -y mcp-remote@0.1.13 URL`
- Update to latest: `npx -y mcp-remote URL`

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `node-fetch` - HTTP requests for SSE transport
- `eventsource` - EventSource polyfill for Node.js

## License

MIT
