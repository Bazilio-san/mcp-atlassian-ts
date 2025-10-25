/**
 * Context interface for JIRA tool modules
 */

import type { AxiosInstance } from 'axios';
import { IADFDocument, JCConfig } from './index';

/**
 * Context provided to each tool handler
 * Contains all dependencies needed for tool execution
 */
export interface ToolContext {
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
   * JIRA configuration
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

  mdToADF: (markdown: string) => string | IADFDocument;
}
