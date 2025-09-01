/**
 * Core TypeScript type definitions for the MCP Atlassian server
 */

// Base types
export interface BaseConfig {
  url: string;
  email?: string;
}

// Authentication types
export interface BasicAuth {
  type: 'basic';
  email: string;
  token: string;
}

export interface PersonalAccessToken {
  type: 'pat';
  token: string;
}

export interface OAuth2Auth {
  type: 'oauth2';
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  redirectUri?: string;
}

export type AuthConfig = BasicAuth | PersonalAccessToken | OAuth2Auth;

// Server configuration
export interface ServerConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  transportType: 'stdio' | 'http' | 'sse';
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cache: {
    ttlSeconds: number;
    maxItems: number;
  };
}

// Atlassian configuration
export interface AtlassianConfig extends BaseConfig {
  auth: AuthConfig;
  jira?: {
    maxResults: number;
    defaultProject?: string;
  };
  confluence?: {
    maxResults: number;
    defaultSpace?: string;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total?: number;
    startAt?: number;
    maxResults?: number;
  };
}

// Error types
export interface McpError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// Cache types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Logging types
export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  [key: string]: unknown;
}

// Tool types
export interface ToolConfig {
  enabled: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface ToolRegistry {
  [toolName: string]: ToolConfig;
}

// HTTP Client types
export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  maxRetries: number;
  retryDelay: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common utility types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Re-export common types
export * from './jira.js';
export * from './confluence.js';
