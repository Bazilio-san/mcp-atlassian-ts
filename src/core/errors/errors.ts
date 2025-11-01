/**
 * Centralized error handling system for the MCP Atlassian server
 */

import { formatHttpRateLimitError } from '../utils/rate-limit.js';
import { McpAtlassianError } from './McpAtlassianError.js';
import { ValidationError } from './ValidationError.js';

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

export const toError = (err: any): Error => {
  return err instanceof Error ? err : new Error(String(err));
};

export const toStr = (err: any): string => {
  return err instanceof Error ? err.message : String(err);
};

export const addErrorMessage = (err: any, msg: string) => {
  if (err instanceof Error) {
    err.message = `${msg}. ${err.message}`;
  }
};

