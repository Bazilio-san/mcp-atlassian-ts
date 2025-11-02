import type { McpError } from '../../types/index.js';

/**
 * Base error class for all MCP Atlassian errors
 */
export class McpAtlassianError extends Error implements McpError {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode: number;
  public readonly printed?: boolean;

  constructor (
    code: string,
    message: string,
    details?: Record<string, unknown>,
    statusCode?: number,
    printed?: boolean,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    } else {
      // @ts-ignore
      delete this.details;
    }
    this.statusCode = statusCode || 500;
    if (printed) {
      this.printed = true;
    } else {
      // @ts-ignore
      delete this.printed;
    }

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
