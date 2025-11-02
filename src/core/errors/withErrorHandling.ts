import { logger as lgr } from '../utils/logger.js';
import chalk from 'chalk';
import { McpAtlassianError } from './McpAtlassianError.js';
import { toStr, handleAxiosError, ServerError } from './errors.js';

const logger = lgr.getSubLogger({ name: chalk.red('errors') });

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
    logger.error('withErrorHandling:', error);
    error.printed = true;

    // Re-throw if it's already a custom error
    if (error instanceof McpAtlassianError) {
      throw error;
    }

    // Handle Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      handleAxiosError(error);
    }

    // Convert unknown errors
    const message = toStr(error);
    const details = {
      context,
      originalError:
        error instanceof Error
          ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
          : error,
    };
    throw new ServerError(message, details, true);
  }
}
