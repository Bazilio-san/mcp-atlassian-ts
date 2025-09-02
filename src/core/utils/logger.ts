/**
 * Centralized logging system with PII masking
 */

import pino from 'pino';

import { getServerConfig } from '../config/index.js';

import type { LogContext } from '../../types/index.js';

// Sensitive data patterns to mask
const SENSITIVE_PATTERNS = [
  // API tokens and keys
  /token['":\s]+['"]\w+['"]/gi,
  /api[_-]?key['":\s]+['"]\w+['"]/gi,
  /secret['":\s]+['"]\w+['"]/gi,
  /password['":\s]+['"]\w+['"]/gi,
  // Authorization headers
  /authorization['":\s]+['"](basic|bearer)\s+\w+['"]/gi,
  // Email patterns (partial masking)
  /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  // URL credentials
  /https?:\/\/[^:]+:[^@]+@/gi,
];

/**
 * Mask sensitive information in log messages
 */
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let masked = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      masked = masked.replace(pattern, match => {
        if (match.includes('@')) {
          // Email masking: keep first char and domain
          return match.replace(
            /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            (_, user, domain) => `${user.charAt(0)}***@${domain}`
          );
        }
        return '[MASKED]';
      });
    });
    return masked;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }

  if (data && typeof data === 'object') {
    const masked: any = {};
    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('authorization')
      ) {
        masked[key] = '[MASKED]';
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    });
    return masked;
  }

  return data;
}

/**
 * Create a pino logger instance
 */
function createPinoLogger() {
  let config;
  try {
    config = getServerConfig();
  } catch {
    // Fallback configuration if config loading fails
    config = {
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      environment: (process.env.NODE_ENV as any) || 'development',
    };
  }

  const pinoConfig: pino.LoggerOptions = {
    level: config.logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    hooks: {
      logMethod(inputArgs, method) {
        // Mask sensitive data in all log arguments
        const maskedArgs = inputArgs.map(arg => maskSensitiveData(arg));
        if (maskedArgs.length === 0) {
          return method.apply(this, [''] as [string, ...any[]]);
        }
        return method.apply(this, maskedArgs as [string, ...any[]]);
      },
    },
  };

  // Pretty print for development
  if (config.environment === 'development') {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        messageFormat: '[{component}] {msg}',
      },
    };
  }

  return pino(pinoConfig);
}

// Global logger instance
const globalLogger = createPinoLogger();

/**
 * Create a component-specific logger
 */
export function createLogger(component: string) {
  const componentLogger = globalLogger.child({ component });

  return {
    debug: (message: string, context?: LogContext, ...args: any[]) => {
      componentLogger.debug(maskSensitiveData({ ...context, message }), ...args);
    },

    info: (message: string, context?: LogContext, ...args: any[]) => {
      componentLogger.info(maskSensitiveData({ ...context, message }), ...args);
    },

    warn: (message: string, context?: LogContext, ...args: any[]) => {
      componentLogger.warn(maskSensitiveData({ ...context, message }), ...args);
    },

    error: (message: string, error?: Error | LogContext, ...args: any[]) => {
      const logData: any = { message };

      if (error instanceof Error) {
        logData.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        logData.context = error;
      }

      componentLogger.error(maskSensitiveData(logData), ...args);
    },

    fatal: (message: string, error?: Error | LogContext, ...args: any[]) => {
      const logData: any = { message };

      if (error instanceof Error) {
        logData.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        logData.context = error;
      }

      componentLogger.fatal(maskSensitiveData(logData), ...args);
    },

    child: (bindings: Record<string, any>) => {
      return componentLogger.child(maskSensitiveData(bindings));
    },
  };
}

/**
 * Express middleware for request logging
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const requestLogger = globalLogger.child({
      component: 'http',
      requestId: req.headers['x-request-id'] || Math.random().toString(36).substring(7),
    });

    const start = Date.now();

    requestLogger.info({
      message: 'Request started',
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Log response
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - start;

      requestLogger.info({
        message: 'Request completed',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: Buffer.isBuffer(body) ? body.length : JSON.stringify(body).length,
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Global error handler logger
 */
export function logUnhandledError(error: Error, context?: LogContext) {
  const errorLogger = createLogger('unhandled');
  errorLogger.fatal('Unhandled error occurred', error, context);
}

// Set up global error handlers
process.on('uncaughtException', error => {
  logUnhandledError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logUnhandledError(reason instanceof Error ? reason : new Error(String(reason)), {
    type: 'unhandledRejection',
    promise: String(promise),
  });
});

export { globalLogger as logger };
