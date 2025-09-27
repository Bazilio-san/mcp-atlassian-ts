# Atlassian MCP Tools Fetcher

This directory contains JavaScript modules to connect to the Atlassian MCP server and retrieve the complete specification of available tools.

## Prerequisites

The Atlassian MCP server requires authentication. You'll need one of the following:
- An Atlassian API token
- OAuth2 credentials
- An active Atlassian account

## Files

- `fetch-mcp-tools.js` - Basic SSE client (no auth)
- `fetch-with-auth.js` - SSE client with authentication support
- `atlassian-mcp-client.js` - Full MCP protocol client with EventSource

## Installation

```bash
cd orig
npm install
```

## Usage

### With Authentication (Recommended)

```bash
# Set your access token as environment variable
export ATLASSIAN_ACCESS_TOKEN=your_token_here

# Run the authenticated fetcher
node fetch-with-auth.js
```

Or run interactively (will prompt for token):
```bash
node fetch-with-auth.js
```

### Getting an Access Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name and copy the token
4. Use this token as your ATLASSIAN_ACCESS_TOKEN

### Output Files

The fetcher will generate three files:

1. **`atlassian-mcp-tools-[date].json`** - Complete JSON specification with all tool details
2. **`atlassian-mcp-tools-[date].md`** - Markdown documentation with categorized tools
3. **`atlassian-mcp-tools-[date].d.ts`** - TypeScript type definitions for the tools

## Authentication Methods

The Atlassian MCP server supports multiple authentication methods:

### API Token (Simplest)
```bash
export ATLASSIAN_ACCESS_TOKEN=your_api_token
```

### OAuth2 Flow
For production applications, use the OAuth2 flow as described in:
https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/

## Server Information

- **URL**: https://mcp.atlassian.com/v1/sse
- **Protocol**: Server-Sent Events (SSE) with MCP protocol
- **Authentication**: Bearer token (API token or OAuth2 access token)

## Troubleshooting

### 401 Unauthorized Error
- Ensure you have a valid API token
- Check that the token is correctly set in the environment variable
- Verify your Atlassian account has the necessary permissions

### No Tools Retrieved
- The server might be rate-limiting requests
- Your organization might have specific access controls
- Try again after a few minutes

### Connection Timeouts
- Check your network connection
- Verify firewall settings allow HTTPS connections to mcp.atlassian.com

## References

- [Getting Started with Atlassian Remote MCP Server](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/)
- [Setting up Claude AI](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-claude-ai/)
- [Using with MCP Clients](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/using-with-other-supported-mcp-clients/)