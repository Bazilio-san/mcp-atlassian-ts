# Service Mode Documentation

## Overview

The MCP Atlassian TypeScript server requires you to specify which service to run:
- **JIRA mode**: Runs JIRA tools and connectivity only
- **Confluence mode**: Runs Confluence tools and connectivity only

There is no combined mode - each server instance is dedicated to a single service for better resource management and deployment flexibility.

## Configuration

### Service Mode Selection (Required)

You MUST specify which service to run using one of these methods:

#### Using Environment Variable

```bash
# JIRA server
export MCP_SERVICE=jira
npm start

# Confluence server
export MCP_SERVICE=confluence
npm start
```

#### Using Command Line Arguments

```bash
# JIRA server
npm start -- --service jira
# or
node dist/index.js --service jira

# Confluence server
npm start -- --service confluence
# or
node dist/index.js --service confluence
```

#### Using NPM Scripts

```bash
# Development mode
npm run dev:jira         # JIRA with hot reload
npm run dev:confluence   # Confluence with hot reload

# Production mode
npm run start:jira       # JIRA production
npm run start:confluence # Confluence production
```

## Service-Specific Configuration

Each service requires its own configuration:

### JIRA Configuration

```bash
# Required JIRA environment variables
JIRA_URL=https://jira.company.com
JIRA_EMAIL=user@company.com

# Authentication (choose one method):
# Option 1: API Token
JIRA_API_TOKEN=your-jira-token

# Option 2: Personal Access Token
JIRA_PAT=your-jira-pat

# Option 3: OAuth 2.0
JIRA_OAUTH_CLIENT_ID=jira-oauth-client
JIRA_OAUTH_CLIENT_SECRET=jira-oauth-secret
JIRA_OAUTH_ACCESS_TOKEN=jira-access-token
JIRA_OAUTH_REFRESH_TOKEN=jira-refresh-token

# Optional settings
JIRA_MAX_RESULTS=50
JIRA_DEFAULT_PROJECT=PROJ
```

### Confluence Configuration

```bash
# Required Confluence environment variables
CONFLUENCE_URL=https://wiki.company.com
CONFLUENCE_EMAIL=user@company.com

# Authentication (choose one method):
# Option 1: API Token
CONFLUENCE_API_TOKEN=your-confluence-token

# Option 2: Personal Access Token
CONFLUENCE_PAT=your-confluence-pat

# Option 3: OAuth 2.0
CONFLUENCE_OAUTH_CLIENT_ID=confluence-oauth-client
CONFLUENCE_OAUTH_CLIENT_SECRET=confluence-oauth-secret
CONFLUENCE_OAUTH_ACCESS_TOKEN=confluence-access-token
CONFLUENCE_OAUTH_REFRESH_TOKEN=confluence-refresh-token

# Optional settings
CONFLUENCE_MAX_RESULTS=50
CONFLUENCE_DEFAULT_SPACE=WIKI
```

## Benefits

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

## Architecture

### Server Classes
- `JiraMcpServer`: JIRA-specific server implementation
- `ConfluenceMcpServer`: Confluence-specific server implementation

### Tool Registry
- `ServiceToolRegistry`: Loads only tools for the selected service
- JIRA mode: 30 tools available
- Confluence mode: 17 tools available

## Deployment Examples

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

## Migration from Legacy Setup

If you were previously using a combined Atlassian configuration:

### Old Configuration (No Longer Supported)
```bash
# These are NO LONGER SUPPORTED
ATLASSIAN_URL=https://company.atlassian.net
ATLASSIAN_EMAIL=user@company.com
ATLASSIAN_API_TOKEN=token
```

### New Configuration (Required)
```bash
# For JIRA
MCP_SERVICE=jira
JIRA_URL=https://jira.company.com
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=jira-token

# For Confluence (separate instance)
MCP_SERVICE=confluence
CONFLUENCE_URL=https://wiki.company.com
CONFLUENCE_EMAIL=user@company.com
CONFLUENCE_API_TOKEN=confluence-token
```

## Troubleshooting

### Error: Service mode is required
**Solution**: Set `MCP_SERVICE` environment variable or use `--service` flag

### Error: JIRA URL is required but not configured
**Solution**: Set `JIRA_URL` environment variable when running in JIRA mode

### Error: Confluence URL is required but not configured
**Solution**: Set `CONFLUENCE_URL` environment variable when running in Confluence mode

### Error: No authentication method configured
**Solution**: Provide API token, PAT, or OAuth credentials for the selected service

## Help

To see available options:
```bash
npm start -- --help
```

## Best Practices

1. **Run separate instances** for JIRA and Confluence in production
2. **Use service-specific credentials** rather than shared ones
3. **Monitor each service independently** for better observability
4. **Scale based on usage** - JIRA typically needs more resources
5. **Use environment variables** for configuration in production
6. **Implement health checks** for each service endpoint