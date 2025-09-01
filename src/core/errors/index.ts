/**
 * Centralized error handling system for the MCP Atlassian server
 */

import { createLogger } from '../utils/logger.js';

import type { McpError } from '../../types/index.js';

const logger = createLogger('errors');

/**
 * Base error class for all MCP Atlassian errors
 */
export class McpAtlassianError extends Error implements McpError {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;

    // Maintain proper stack trace for V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): McpError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIGURATION_ERROR', message, details, 500);
  }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, details, 401);
  }
}

/**
 * Authorization-related errors
 */
export class AuthorizationError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, details, 403);
  }
}

/**
 * API-related errors
 */
export class ApiError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>, statusCode: number = 400) {
    super('API_ERROR', message, details, statusCode);
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, details, 503);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends McpAtlassianError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super('RATE_LIMIT_ERROR', message, details, 429);
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details, 400);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends McpAtlassianError {
  constructor(resource: string, identifier: string, details?: Record<string, unknown>) {
    super(
      'NOT_FOUND_ERROR',
      `${resource} with identifier '${identifier}' not found`,
      { resource, identifier, ...details },
      404
    );
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends McpAtlassianError {
  constructor(toolName: string, message: string, details?: Record<string, unknown>) {
    super(
      'TOOL_EXECUTION_ERROR',
      `Failed to execute tool '${toolName}': ${message}`,
      { toolName, ...details },
      400
    );
  }
}

/**
 * Cache-related errors
 */
export class CacheError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CACHE_ERROR', message, details, 500);
  }
}

/**
 * Server-related errors
 */
export class ServerError extends McpAtlassianError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SERVER_ERROR', message, details, 500);
  }
}

/**
 * Error response interface for API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | McpAtlassianError,
  requestId?: string
): ErrorResponse {
  const isCustomError = error instanceof McpAtlassianError;

  return {
    success: false,
    error: {
      code: isCustomError ? error.code : 'INTERNAL_ERROR',
      message: error.message,
      details: isCustomError ? error.details : undefined,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Error handler for async functions
 */
export function asyncErrorHandler<T extends any[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof McpAtlassianError) {
        throw error;
      }

      // Convert unknown errors to ServerError
      const message = error instanceof Error ? error.message : String(error);
      throw new ServerError(message, {
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
  };
}

/**
 * Error boundary decorator for class methods
 */
export function errorBoundary(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      logger.error(`Error in ${target.constructor.name}.${propertyKey}:`, error);

      if (error instanceof McpAtlassianError) {
        throw error;
      }

      // Convert unknown errors
      const message = error instanceof Error ? error.message : String(error);
      throw new ServerError(message, {
        method: `${target.constructor.name}.${propertyKey}`,
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
  };

  return descriptor;
}

/**
 * Map HTTP status codes to appropriate error classes
 */
export function createErrorFromStatus(
  status: number,
  message: string,
  details?: Record<string, unknown>
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
      return new RateLimitError(message, details);
    case 503:
      return new NetworkError(message, details);
    default:
      return new ApiError(message, details, status);
  }
}

/**
 * Extract error information from Axios error
 */
export function handleAxiosError(error: any): never {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    const message = data?.errorMessages?.[0] || data?.message || error.message;
    const details = {
      status,
      data,
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

/**
 * Wrap function calls with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log the error with context
    logger.error(
      'Operation failed',
      error instanceof Error ? error : new Error(String(error)),
      context
    );

    // Re-throw if it's already a custom error
    if (error instanceof McpAtlassianError) {
      throw error;
    }

    // Handle Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      handleAxiosError(error);
    }

    // Convert unknown errors
    const message = error instanceof Error ? error.message : String(error);
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
