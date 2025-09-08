/**
 * TypeScript configuration interfaces for node-config
 */

// Authentication types
export interface IBasicAuth {
  type: 'basic';
  email: string;
  token: string;
}

export interface IPatAuth {
  type: 'pat';
  token: string;
}

export interface IOAuth2Auth {
  type: 'oauth2';
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri?: string;
}

export type IAuthConfig = IBasicAuth | IPatAuth | IOAuth2Auth;

// Server configuration
export interface IServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  transportType: 'stdio' | 'http' | 'sse';
  serviceMode?: 'jira' | 'confluence';
}

// Logging configuration
export interface ILoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  pretty: boolean;
}

// Rate limiting configuration
export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Cache configuration
export interface ICacheConfig {
  ttlSeconds: number;
  maxItems: number;
}

// JIRA configuration
export interface IJiraConfig {
  url: string;
  email?: string;
  auth?: {
    apiToken?: string;
    pat?: string;
    oauth2?: {
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
      redirectUri?: string;
    };
  };
  maxResults: number;
  defaultProject?: string;
}

// Confluence configuration
export interface IConfluenceConfig {
  url: string;
  email?: string;
  auth?: {
    apiToken?: string;
    pat?: string;
    oauth2?: {
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
      redirectUri?: string;
    };
  };
  maxResults: number;
  defaultSpace?: string;
}

// SSL/TLS configuration
export interface ISslConfig {
  rejectUnauthorized: boolean;
  verifyPeer: boolean;
}

// Main configuration interface
export interface IConfig {
  // Package metadata
  name: string;
  productName: string;
  version: string;
  description: string;
  
  // Server settings
  server: IServerConfig;
  
  // Service-specific settings
  jira: IJiraConfig;
  confluence: IConfluenceConfig;
  
  // Infrastructure settings
  logger: ILoggerConfig;
  rateLimit: IRateLimitConfig;
  cache: ICacheConfig;
  ssl: ISslConfig;
  
  // Feature flags
  features: {
    enabledTools?: string[];
  };
}