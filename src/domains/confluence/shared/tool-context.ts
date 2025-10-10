/**
 * Context interface for Confluence tool modules
 */

import type { AxiosInstance } from 'axios';
import type { JCConfig } from '../../../types/index.js';

/**
 * Context provided to each tool handler
 * Contains all dependencies needed for tool execution
 */
export interface ConfluenceToolContext {
  /**
   * HTTP client with authentication and custom headers
   */
  httpClient: AxiosInstance;

  /**
   * Cache instance with same interface as current implementation
   */
  cache: {
    getOrSet: <T>(key: string, fn: () => Promise<T>, ttl?: number) => Promise<T>;
    del: (key: string) => void;
    keys: () => string[];
  };

  /**
   * Confluence configuration
   */
  config: JCConfig;

  /**
   * Logger instance (same as createLogger)
   */
  logger: {
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };

  /**
   * Utility functions (from current ConfluenceToolsManager)
   */
  normalizeToArray: (value: string | string[] | undefined) => string[];
  invalidatePageCache: (pageId: string) => void;

  /**
   * Custom headers if provided
   */
  customHeaders?: Record<string, string> | undefined;
}