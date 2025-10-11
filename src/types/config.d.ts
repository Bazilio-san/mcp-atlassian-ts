/**
 * TypeScript configuration interfaces for node-config
 */

// Authentication types
export interface IBasicAuth {
  username?: string;
  password?: string;
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

// Tool configuration
export interface IToolsConfig {
  include: 'ALL' | string[];
  exclude: string[];
}

// JIRA configuration
export interface IJiraConfig {
  url: string;
  auth?: {
    basic?: IBasicAuth;
    pat?: string;
    oauth2?: IOAuth2Auth;
  };
  maxResults: number;
  epicLinkFieldId?: string;
  usedInstruments?: IToolsConfig;
}

// Confluence configuration
export interface IConfluenceConfig {
  url: string;
  auth?: {
    basic?: IBasicAuth;
    pat?: string;
    oauth2?: IOAuth2Auth;
  };
  maxResults: number;
  usedInstruments?: IToolsConfig;
}

// Legacy alias for backward compatibility
export type IJCConfig = IJiraConfig | IConfluenceConfig;

// SSL/TLS configuration
export interface ISslConfig {
  rejectUnauthorized: boolean;
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
  features: Record<string, never>;
}
