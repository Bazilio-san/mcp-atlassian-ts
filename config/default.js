// Default configuration for MCP Atlassian TypeScript server
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const { name, version, description } = packageJson;

const defaultConfig = {
  // Package metadata (auto-populated from package.json)
  name,                          // Application name
  productName: 'MCP Atlassian',  // Display name
  version,                       // Current version
  description,                   // Application description
  
  // Server configuration
  server: {
    port: 3000,                  // HTTP server port (default: 3000, range: 1024-65535)
    host: '0.0.0.0',            // Server bind address ('0.0.0.0' for all interfaces, 'localhost' for local only)
    environment: 'development',  // Environment: development, production, test
    transportType: 'http',       // Transport type: stdio, http, sse
    serviceMode: null            // Service mode: jira or confluence (required)
  },
  
  // JIRA configuration
  jira: {
    url: '***',                  // JIRA instance URL (e.g., https://jira.company.com)
    email: '***',                // User email for basic authentication
    auth: {
      apiToken: '***',           // API token for basic authentication
      pat: '***',                // Personal Access Token (alternative to basic auth)
      oauth2: {
        clientId: '***',         // OAuth 2.0 client ID
        clientSecret: '***',     // OAuth 2.0 client secret
        accessToken: '***',      // OAuth 2.0 access token
        refreshToken: '***',     // OAuth 2.0 refresh token
        redirectUri: '***'       // OAuth 2.0 redirect URI
      }
    },
    maxResults: 50              // Maximum results per API request (default: 50, max: 100)
  },
  
  // Confluence configuration
  confluence: {
    url: '***',                  // Confluence instance URL (e.g., https://wiki.company.com)
    email: '***',                // User email for basic authentication
    auth: {
      apiToken: '***',           // API token for basic authentication
      pat: '***',                // Personal Access Token (alternative to basic auth)
      oauth2: {
        clientId: '***',         // OAuth 2.0 client ID
        clientSecret: '***',     // OAuth 2.0 client secret
        accessToken: '***',      // OAuth 2.0 access token
        refreshToken: '***',     // OAuth 2.0 refresh token
        redirectUri: '***'       // OAuth 2.0 redirect URI
      }
    },
    maxResults: 50              // Maximum results per API request (default: 50, max: 100)
  },
  
  // Logging configuration
  logger: {
    level: 'info',               // Log level: debug, info, warn, error
    pretty: true                 // Pretty-print logs in development
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 900000,            // Rate limit window in milliseconds (default: 15 minutes)
    maxRequests: 100             // Maximum requests per window (default: 100)
  },
  
  // Cache configuration
  cache: {
    ttlSeconds: 300,             // Cache TTL in seconds (default: 5 minutes)
    maxItems: 1000               // Maximum cached items (default: 1000)
  },
  
  // SSL/TLS configuration
  ssl: {
    rejectUnauthorized: true    // Reject unauthorized SSL certificates (set to false for self-signed)
  },
  
  // Feature flags
  features: {
    enabledTools: []             // List of enabled tools (empty array = all tools enabled)
  }
};

export default defaultConfig;