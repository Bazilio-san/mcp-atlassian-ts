import { McpAtlassianError } from './McpAtlassianError.js';

/**
 * Validation-related errors
 */
export class ValidationError extends McpAtlassianError {
  constructor (message: string, details?: Record<string, unknown>, printed?: boolean) {
    super('VALIDATION_ERROR', message, details, 400, printed);
  }
}
