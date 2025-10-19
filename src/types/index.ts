/**
 * Core TypeScript type definitions for the MCP Atlassian server
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';


// Authentication types
export interface BasicAuth {
  type: 'basic';
  username: string;
  password: string;
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

// User substitution configuration
export interface SubstitutionConfig {
  users: Record<string, string>; // Mapping from original user to substitute user
  httpHeader: string; // HTTP header name to modify
}

// Server configuration
export interface ServerConfig {
  port: number;
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
  subst?: SubstitutionConfig; // Optional user substitution configuration
}

// JIRA configuration
export interface JCConfig {
  url: string;
  origin: string;
  auth: AuthConfig;
  maxResults: number;
  epicLinkFieldId?: string; // Custom field ID for Epic Link (defaults to customfield_10014)
  powerEndpoint?: {
    baseUrl: string;
    auth: AuthConfig;
  };
}

// Error types
export interface McpError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// Logging types
export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;

  [key: string]: unknown;
}

// HTTP Client types
export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  maxRetries: number;
  retryDelay: number;
}

// Re-export common types
export * from './jira.js';
export * from './confluence.js';

export interface ToolWithHandler extends Tool {
  handler: (args: any, context: any) => Promise<any>;
}
