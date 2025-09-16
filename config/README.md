# Configuration Directory

This directory contains configuration files for the MCP Atlassian TypeScript server using the `node-config` module.

## Files

- **default.json** - Base configuration with all default values (JSON format for ES modules compatibility)
- **development.yaml** - Development environment overrides
- **production.yaml** - Production environment overrides
- **test.yaml** - Test environment overrides
- **custom-environment-variables.yaml** - Environment variable mappings
- **_local.yaml** - Template for local overrides (copy to local.yaml)
- **local.yaml** - Your local configuration overrides (gitignored)

## Configuration Hierarchy

Configuration loads in priority order (highest priority last):

1. `default.js` - Base configuration
2. `{NODE_ENV}.yaml` - Environment-specific settings
3. `local.yaml` - Local developer overrides (gitignored)
4. `local-{NODE_ENV}.yaml` - Environment-specific local overrides
5. Environment variables (via custom-environment-variables.yaml)
6. `.env` files (loaded by dotenv)

## Usage

### Direct Import (Recommended)

```typescript
import { appConfig } from '../src/bootstrap/init-config';

// Use configuration directly
const port = appConfig.server.port;
const atlassianUrl = appConfig.atlassian.url;
```

### Environment Variables

Set environment variables to override configuration:

```bash
export ATLASSIAN_URL=https://your-domain.atlassian.net
export SERVER_PORT=8080
export LOG_LEVEL=debug
```

### Local Overrides

Create a `local.yaml` file to override settings for your local development:

```yaml
# config/local.yaml
server:
  port: 8080
  
logger:
  level: debug
```

## Important Notes

- **NEVER** commit sensitive data (passwords, tokens) to the repository
- Use environment variables for secrets in production
- The `local.yaml` file is gitignored for local development settings
- All configuration parameters must be defined in `default.js`
