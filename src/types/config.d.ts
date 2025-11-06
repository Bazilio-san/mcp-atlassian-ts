/**
 * TypeScript configuration interfaces for node-config
 */

// Authentication types
export interface IBasicAuth {
  username?: string;
  password?: string;
}

export interface IOAuth2Auth {
  type: 'oauth2';
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri?: string;
}
export type ServiceMode = 'jira' | 'confluence' | 'both';
export type ServiceModeJC = 'jira' | 'confluence';

// Server configuration
export interface IServerConfig {
  port: number;
  host: string;
  transportType: 'stdio' | 'http' | 'sse';
  serviceMode: ServiceMode;
  token?: string; // Server token for trusted clients authentication
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

// User resolution configuration
export interface IUserLookupConfig {
  enabled: boolean;
  serviceUrl: string;
  timeoutMs?: number;
}

// JIRA configuration
export interface IJiraConfig {
  url: string;
  apiVersion: 2 | 3
  restPath: string; // /rest/api/<2|3>
  origin: string;
  auth?: {
    basic?: IBasicAuth;
    pat?: string;
    oauth2?: IOAuth2Auth;
  };
  fieldId: {
    epicLink: string;
    epicName: string;
    storyPoints: string;
  },
  usedInstruments?: IToolsConfig;
  userLookup?: IUserLookupConfig; // НОВОЕ ПОЛЕ
}

// Confluence configuration
export interface IConfluenceConfig {
  url: string;
  origin: string;
  auth?: {
    basic?: IBasicAuth;
    pat?: string;
    oauth2?: IOAuth2Auth;
  };
  usedInstruments?: IToolsConfig;
}

// SSL/TLS configuration
export interface ISslConfig {
  rejectUnauthorized: boolean;
}

// User substitution configuration
export interface ISubstitutionConfig {
  httpHeader?: string; // HTTP header name to use with impersonate plugin
  loginIfNoHeader?: string, // Optional login as this user if no header is provided. Used for caching priorities
  jira?: Record<string, string>; // Mapping from original user to substitute user
  confluence?: Record<string, string>; // Mapping from original user to substitute user
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
  toolAnswerAs: 'structuredContent' | 'text';

  // User substitution configuration
  subst?: ISubstitutionConfig;
}
