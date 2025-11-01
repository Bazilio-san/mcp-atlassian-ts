/**
 * Centralized error handling system for the MCP Atlassian server
 */

import { formatHttpRateLimitError } from './utils/rate-limit.js';

import type { McpError } from '../types';
import chalk from 'chalk';
import { logger as lgr } from './utils/logger.js';

const logger = lgr.getSubLogger({ name: chalk.red('errors') });

/**
 * Base error class for all MCP Atlassian errors
 */
export class McpAtlassianError extends Error implements McpError {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor (
    code: string,
    message: string,
    details?: Record<string, unknown>,
    statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    this.statusCode = statusCode;

    // Maintain proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON (): McpError {
    const result: McpError = {
      code: this.code,
      message: this.message,
    };

    if (this.details !== undefined) {
      result.details = this.details;
    }

    if (this.stack !== undefined) {
      result.stack = this.stack;
    }

    return result;
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, details, 401);
  }
}

/**
 * Authorization-related errors
 */
export class AuthorizationError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, details, 403);
  }
}

/**
 * API-related errors
 */
export class ApiError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>, statusCode: number = 400) {
    super('API_ERROR', message, details, statusCode);
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, details, 503);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends McpAtlassianError {
  constructor (message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super('RATE_LIMIT_ERROR', message, details, 429);
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details, 400);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends McpAtlassianError {
  constructor (resource: string, identifier: string, details?: Record<string, unknown>) {
    super(
      'NOT_FOUND_ERROR',
      `${resource} with identifier '${identifier}' not found`,
      { resource, identifier, ...details },
      404,
    );
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends McpAtlassianError {
  constructor (toolName: string, message: string, details?: Record<string, unknown>) {
    super(
      'TOOL_EXECUTION_ERROR',
      `Failed to execute tool '${toolName}': ${message}`,
      { toolName, ...details },
      400,
    );
  }
}

/**
 * Server-related errors
 */
export class ServerError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>) {
    super('SERVER_ERROR', message, details, 500);
  }
}

/**
 * Create JSON-RPC 2.0 error response
 */
export function createJsonRpcErrorResponse (
  error: Error | McpAtlassianError,
  requestId?: string | number | null,
): any {
  const isCustomError = error instanceof McpAtlassianError;

  return {
    jsonrpc: '2.0',
    id: requestId ?? 1,
    error: {
      code: isCustomError ? (typeof error.code === 'number' ? error.code : -32000) : -32603,
      message: error.message,
      data: isCustomError && error.details !== undefined ? error.details : undefined,
    },
  };
}


/**
 * Map HTTP status codes to appropriate error classes
 */
export function createErrorFromStatus (
  status: number,
  message: string,
  details?: Record<string, unknown>,
): McpAtlassianError {
  switch (status) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message, details);
    case 403:
      return new AuthorizationError(message, details);
    case 404:
      return new NotFoundError('Resource', 'unknown', details);
    case 429:
      // Extract Retry-After header if available
      const retryAfter = details?.headers && typeof details.headers === 'object'
        ? (details.headers as any)['retry-after'] || (details.headers as any)['Retry-After']
        : undefined;
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      const formattedMessage = formatHttpRateLimitError(retrySeconds);
      return new RateLimitError(formattedMessage, details);
    case 503:
      return new NetworkError(message, details);
    default:
      return new ApiError(message, details, status);
  }
}

/**
 * Extract error information from Axios error
 */
export function handleAxiosError (error: any): never {
  if (error.response) {
    // Server responded with error status
    const { status, data, headers } = error.response;
    const message = data?.errorMessages?.[0] || data?.message || error.message;
    const details = {
      status,
      data,
      headers,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
    };

    throw createErrorFromStatus(status, message, details);
  } else if (error.request) {
    // Request made but no response received
    throw new NetworkError('No response received from server', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      timeout: error.code === 'ECONNABORTED',
    });
  } else {
    // Error in request setup
    throw new ServerError(`Request setup error: ${error.message}`, {
      originalError: error,
    });
  }
}

export const eh = (err: any): Error => {
  return err instanceof Error ? err : new Error(String(err));
};

export const ehs = (err: any): string => {
  return err instanceof Error ? err.message : String(err);
};

export const addErrorMessage = (err: any, msg: string) => {
  if (err instanceof Error) {
    err.message = `${msg}. ${err.message}`;
  }
};

/**
 * Wrap function calls with error handling
 */
export async function withErrorHandling<T> (
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: Error | any) {
    logger.error('ERROR', error);

    // Re-throw if it's already a custom error
    if (error instanceof McpAtlassianError) {
      throw error;
    }

    // Handle Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      handleAxiosError(error);
    }

    // Convert unknown errors
    const message = ehs(error);
    throw new ServerError(message, {
      context,
      originalError:
        error instanceof Error
          ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
          : error,
    });
  }
}
