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

// Atlassian configuration
export interface IAtlassianConfig {
  url: string;
  email?: string;
  auth?: {
    email?: string;
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
}

// Server configuration
export interface IServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  transportType: 'stdio' | 'http' | 'sse';
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
  maxResults: number;
  defaultProject?: string;
}

// Confluence configuration
export interface IConfluenceConfig {
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
  
  // Atlassian settings
  atlassian: IAtlassianConfig;
  
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