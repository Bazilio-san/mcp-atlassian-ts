# Node-Config Implementation Guide for Claude Code

## Overview

This guide provides comprehensive instructions for implementing or migrating projects to use the 
`node-config` module for configuration management. Following the KISS (Keep It Simple, Stupid) 
principle, this approach provides a clean, hierarchical configuration system without unnecessary 
abstractions.

## Core Principles

### 1. Direct Usage - KISS Principle

**DO NOT create unnecessary abstraction layers!**

```typescript
// ✅ CORRECT - Direct import and usage
import { appConfig } from '../../bootstrap/init-config';
const serverPort = appConfig.server.port;

// ❌ WRONG - Unnecessary wrapper/manager/adapter
class ConfigManager {
  getServerPort() { return config.get('server.port'); }
}
```

The `node-config` module already provides all necessary functionality. Additional wrappers only 
add complexity without value.

### 2. Strict TypeScript Typing

All configuration parameters must be strongly typed:

```typescript
// _types_/config.d.ts
export interface IConfig extends IAFDatabasesConfig {
  name: string;
  version: string;
  server: {
    port: number;
    host: string;
  };
  // ... other configuration
}
```

### 3. Configuration Hierarchy

Configuration loads in priority order (highest priority last):

1. `config/default.js` - Base configuration with all parameters
2. `config/{NODE_ENV}.yaml` - Environment-specific settings
3. `config/local.yaml` - Developer's local overrides (gitignored)
4. `config/local-{NODE_ENV}.yaml` - Environment-specific local overrides
5. `config/custom-environment-variables.yaml` - Environment variable mappings
6. `.env` files - Environment variables via dotenv
7. Runtime values - Programmatically set values

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install config dotenv
npm install --save-dev @types/config
```

### Step 2: Create Configuration Structure

```
project-root/
├── config/
│   ├── default.js                          # Base configuration
│   ├── development.yaml                    # Development overrides
│   ├── production.yaml                     # Production overrides
│   ├── custom-environment-variables.yaml   # Env variable mappings
│   ├── local.yaml                          # Local overrides (gitignored)
│   └── _local.yaml                         # Template for local.yaml
├── src/
│   └── bootstrap/
│       ├── init-config.ts                  # Config initialization
│       └── dotenv.ts                       # Environment variable loader
├── _types_/
│   └── config.d.ts                         # TypeScript interfaces
├── .env.example                            # Environment variables template
└── .env                                    # Actual env vars (gitignored)
```

### Step 3: Create Base Configuration

```javascript
// config/default.js
const { name, productName, version, description } = require('../package.json');

const defaultConfig = {
  // Metadata from package.json
  name,
  productName,
  version,
  description,
  
  // Application settings
  app: {
    port: 3000,
    host: 'localhost',
  },
  
  // Database configuration
  db: {
    postgres: {
      dbs: {
        main: {
          host: 'localhost',
          port: 5432,
          database: '***',  // Placeholder for sensitive data
          user: '***',
          password: '***'
        }
      }
    }
  },
  
  // Logging configuration
  logger: {
    level: 'info',
    maxSize: '100m',
    prefix: name
  }
};

module.exports = defaultConfig;
```

### Step 4: Define TypeScript Interfaces

```typescript
// _types_/config.d.ts
import { IAFDatabasesConfig } from 'af-db-ts';

export interface IAppConfig {
  port: number;
  host: string;
}

export interface ILoggerConfig {
  level: 'error' | 'warn' | 'info' | 'verbose' | 'debug';
  maxSize: string;
  prefix: string;
}

export interface IConfig extends IAFDatabasesConfig {
  name: string;
  productName: string;
  version: string;
  description: string;
  app: IAppConfig;
  logger: ILoggerConfig;
}
```

### Step 5: Map Environment Variables

```yaml
# config/custom-environment-variables.yaml
app:
  port: APP_PORT
  host: APP_HOST

db:
  postgres:
    dbs:
      main:
        host: DB_HOST
        port: DB_PORT
        database: DB_NAME
        user: DB_USER
        password: DB_PASSWORD

logger:
  level: LOG_LEVEL
```

### Step 6: Initialize Configuration

```typescript
// src/bootstrap/dotenv.ts
import * as dotenv from 'dotenv';

// Load general environment variables
const generalEnv = dotenv.config();

// Load secret environment variables from suffixed file
const suffixEnv = process.env.SUFFIX_ENV;
const secretEnv = suffixEnv 
  ? dotenv.config({ path: `.env.${suffixEnv}` })
  : { parsed: {} };

// Merge all environment variables (secrets override general)
const dotEnvResult = {
  parsed: {
    ...generalEnv.parsed,
    ...secretEnv.parsed
  }
};

export default dotEnvResult;
```

```typescript
// src/bootstrap/init-config.ts
import './dotenv';  // Load environment variables first
import config from 'config';
import { IConfig } from '../../_types_/config';

// Convert config object to typed interface
export const appConfig: IConfig = config.util.toObject() as IConfig;

// Optional: Validate required configuration
const validateConfig = () => {
  if (!appConfig.db.postgres.dbs.main.host) {
    throw new Error('Database configuration is missing');
  }
};

validateConfig();
```

### Step 7: Use Configuration in Code

```typescript
// src/services/database.ts
import { appConfig } from '../bootstrap/init-config';

export class DatabaseService {
  connect() {
    const dbConfig = appConfig.db.postgres.dbs.main;
    
    return createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password
    });
  }
}
```

## Best Practices

### 1. Security

- **NEVER** commit real passwords or tokens to the repository
- Use placeholders (`***`) in default configuration for sensitive data
- Keep `.env` and `local*.yaml` files in `.gitignore`
- Use environment variables or secret management systems in production
- Create `.env.example` with dummy values as documentation

### 2. Adding New Configuration Parameters

When adding new configuration parameters:

1. Add to `config/default.js` with safe default value
2. Update TypeScript interface in `_types_/config.d.ts`
3. If sensitive, add mapping to `custom-environment-variables.yaml`
4. Document in `.env.example` with comments
5. Add descriptive comments for complex parameters

#### Documentation Requirements

**IMPORTANT**: All configuration parameters must be properly documented:

1. **In `.env.example`** - Add descriptive comments for each environment variable:
   ```bash
   # Database connection settings
   DB_HOST=localhost      # PostgreSQL server hostname
   DB_PORT=5432          # PostgreSQL server port (default: 5432)
   ...
   ```

2. **In `config/default.js`** - Add inline comments explaining parameter purpose and valid values:
   ```javascript
   module.exports = {
     // Application metadata (auto-populated from package.json)
     name,        // Application name
     version,     // Current version
     
     server: {
       port: 3000,      // HTTP server port (default: 3000, range: 1024-65535)
       host: '0.0.0.0'  // Server bind address ('0.0.0.0' for all interfaces, 'localhost' for local only)
     },
     // ...
   };
   ```

3. **Comment Guidelines**:
   - Explain what the parameter controls
   - Provide default values and valid ranges
   - Include units for time/size values (ms, seconds, MB, etc.)
   - Note any dependencies or related parameters
   - Warn about security implications for sensitive parameters
   - Use examples for complex configuration formats

### 3. Environment-Specific Configuration

```yaml
# config/development.yaml:
logger:
  level: debug  # More verbose logging in development
```

```yaml
# config/production.yaml
logger:
  level: warn   # Only warnings and errors in production
```

### 4. Database Configuration Pattern

For multiple database connections:

```javascript
// config/default.js
const defaultConfig = {
  db: {
    postgres: {
      dbs: {
        main: {
          // Primary application database
          host: 'localhost',
          port: 5432,
          database: 'app_main',
          user: '***',
          password: '***'
        },
        analytics: {
          // Analytics database (read-only)
          host: 'localhost',
          port: 5432,
          database: 'app_analytics',
          user: '***',
          password: '***'
        }
      }
    },
    redis: {
      cache: {
        host: 'localhost',
        port: 6379,
        password: '***'
      }
    }
  }
};
```

## Migration Checklist

When migrating existing projects to node-config:

- [ ] Install `config` and `dotenv` packages
- [ ] Create `/config` directory structure
- [ ] Move existing configuration to `default.js`. NO default.json! Namely `default.js`
- [ ] Create TypeScript interfaces for all config sections
- [ ] Map environment variables in `custom-environment-variables.yaml`
- [ ] Create `.env.example` with all variables documented
- [ ] Initialize config in bootstrap layer
- [ ] Replace all direct `process.env` usage with `appConfig`
- [ ] Remove any existing configuration managers/wrappers
- [ ] Add config validation on startup
- [ ] Test with different NODE_ENV values
- [ ] Update deployment documentation

## Common Pitfalls to Avoid

1. **Creating unnecessary abstractions** - Use `appConfig` directly
2. **Forgetting to add all parameters to default.js** - Every parameter must have a default
   (use `'***'` as default value for secrets/passwords)
3. **Committing sensitive data** - Use placeholders and environment variables
4. **Not typing configuration** - Always maintain TypeScript interfaces
5. **Using `config.get()` directly** - Use typed `appConfig` instead
6. **Mixing configuration sources** - Follow the hierarchy strictly
7. **Not validating required configuration** - Add startup validation

## Example: Complete Mini-Project Setup

```javascript
// config/default.js
const { name, version } = require('../package.json');

module.exports = {
  name,
  version,
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  api: {
    timeout: 30000,
    rateLimit: 100
  }
};
```

```typescript
// _types_/config.d.ts
export interface IConfig {
  name: string;
  version: string;
  server: {
    port: number;
    host: string;
  };
  api: {
    timeout: number;
    rateLimit: number;
  };
}
```

```typescript
// src/bootstrap/init-config.ts
import './dotenv';
import config from 'config';
import { IConfig } from '../../_types_/config';

export const appConfig: IConfig = config.util.toObject() as IConfig;
```

```typescript
// src/index.ts
import { appConfig } from './bootstrap/init-config';

console.log(`Starting ${appConfig.name} v${appConfig.version}`);
console.log(`Server: ${appConfig.server.host}:${appConfig.server.port}`);
```

This guide provides a complete, KISS-compliant approach to implementing node-config in any 
TypeScript project. Follow these patterns to maintain clean, maintainable configuration 
management without unnecessary complexity.
