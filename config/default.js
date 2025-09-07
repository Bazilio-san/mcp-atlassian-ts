// Default configuration for MCP Atlassian TypeScript server
const { name, version, description } = require('../package.json');

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
    transportType: 'http'        // Transport type: stdio, http, sse
  },
  
  // Atlassian configuration
  atlassian: {
    url: '***',                  // Atlassian instance URL (e.g., https://your-domain.atlassian.net)
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
    }
  },
  
  // JIRA configuration
  jira: {
    maxResults: 50,              // Maximum results per API request (default: 50, max: 100)
    defaultProject: null         // Default project key for JIRA operations
  },
  
  // Confluence configuration
  confluence: {
    maxResults: 50,              // Maximum results per API request (default: 50, max: 100)
    defaultSpace: null           // Default space key for Confluence operations
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
    rejectUnauthorized: true,    // Reject unauthorized SSL certificates (set to false for self-signed)
    verifyPeer: true             // Verify SSL peer certificate
  },
  
  // Feature flags
  features: {
    enabledTools: []             // List of enabled tools (empty array = all tools enabled)
  }
};

module.exports = defaultConfig;