/**
 * Centralized logging system with PII masking
 */

import pino from 'pino';
import pinoPretty from 'pino-pretty';
import chalk from 'chalk';
import type { LogContext } from '../../types/index.js';

export const eh = (err: any): Error => {
  return err instanceof Error ? err : new Error(String(err));
};

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
 * Mask sensitive information in log messages with circular reference protection
 */
function maskSensitiveData (data: any, visited = new WeakSet()): any {
  if (typeof data === 'string') {
    let masked = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      masked = masked.replace(pattern, match => {
        if (match.includes('@')) {
          // Email masking: keep first char and domain
          return match.replace(
            /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            (_, user, domain) => `${user.charAt(0)}***@${domain}`,
          );
        }
        return '[MASKED]';
      });
    });
    return masked;
  }

  if (data === null || data === undefined) {
    return data;
  }

  // Prevent circular references and limit depth
  if (typeof data === 'object') {
    if (visited.has(data)) {
      return '[Circular]';
    }
    visited.add(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, visited));
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
        masked[key] = maskSensitiveData(data[key], visited);
      }
    });
    return masked;
  }

  return data;
}

/**
 * Create a pino logger instance
 */
function createPinoLogger () {
  // Get log level from environment to avoid circular dependency
  // The actual config will be loaded later in init-config.ts
  const logLevel = process.env.LOG_LEVEL || 'info';

  const pinoConfig: pino.LoggerOptions = {
    level: logLevel,
    timestamp: pino.stdTimeFunctions.epochTime,
    formatters: {
      level (label) {
        return { level: label };
      },
    },
    hooks: {
      logMethod (inputArgs, method) {
        // Mask sensitive data in all log arguments
        const maskedArgs = inputArgs.map(arg => maskSensitiveData(arg));
        if (maskedArgs.length === 0) {
          return method.apply(this, [''] as [string, ...any[]]);
        }
        return method.apply(this, maskedArgs as [string, ...any[]]);
      },
    },
  };

  const prettyOptions = {
    colorize: false, // Disable default colorize to use chalk
    // Hide meta fields and level from the output line
    ignore: 'pid,hostname,level',
    // Format: 16:10:47 [auth] Testing authentication...
    messageFormat: (log: any, messageKey: string) => {
      const component = log.component || 'default';
      // Pino might use 'msg' or 'message' as the key, check both
      const message = log.message || log.msg || log[messageKey] || '';
      return formatLogMessage(component, message);
    },
    translateTime: 'HH:MM:ss',
    hideObject: true,
  };

  const prettyStream = pinoPretty(prettyOptions);

  return pino(pinoConfig, prettyStream as any);
}

/**
 * Custom colors for specific components (can be overridden at runtime)
 */
const CUSTOM_COLORS: Record<string, any> = {};

/**
 * Set custom color for a component
 */
function setComponentColor (component: string, color: any) {
  CUSTOM_COLORS[component] = color;
}

/**
 * Format log message with component-specific coloring
 */
function formatLogMessage (component: any, message: string): string {
  // Handle nested components (array or object with component property)
  let componentName: string;
  if (Array.isArray(component)) {
    componentName = component.join('][');
  } else if (typeof component === 'object' && component.component) {
    componentName = component.component;
  } else {
    componentName = String(component);
  }

  // Try to find color for the base component or first component in array
  const baseComponent = Array.isArray(component) ? component[0] : componentName;
  const color = CUSTOM_COLORS[baseComponent] || chalk.bgYellowBright.black;
  const coloredComponent = color(`[${componentName}]`);
  return `${coloredComponent} ${message}`;
}

// Global logger instance
const globalLogger = createPinoLogger();

/**
 * Create a component-specific logger
 */
export function createLogger (component: string, color?: any) {
  // Set custom color if provided
  if (color) {
    setComponentColor(component, color);
  }

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
      // If adding a component, create nested component structure
      if (bindings.component) {
        const parentComponent = componentLogger.bindings()?.component || component;
        const nestedComponent = Array.isArray(parentComponent)
          ? [...parentComponent, bindings.component]
          : [parentComponent, bindings.component];
        return componentLogger.child(maskSensitiveData({ component: nestedComponent }));
      }
      return componentLogger.child(maskSensitiveData(bindings));
    },
  };
}

/**
 * Express middleware for request logging
 */
export function createRequestLogger () {
  return (req: any, res: any, next: any) => {
    const requestLogger = createLogger('http2', chalk.blue);

    const start = Date.now();

    requestLogger.info(`-> ${req.method} ${req.url} | IP: ${req.ip} | UA: ${req.get('User-Agent')}`);
    // Log response
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode >= 400 ? chalk.red(`[${res.statusCode}]`) : chalk.green(`[${res.statusCode}]`);
      requestLogger.info(`<- ${req.method} ${req.url} ${statusCode} / ${duration} ms | ${(Buffer.isBuffer(body) ? body?.length : JSON.stringify(body)?.length) || 0} b`);
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Global error handler logger
 */
export function logUnhandledError (error: Error, context?: LogContext) {
  const errorLogger = createLogger('unhandled', chalk.red);
  errorLogger.fatal('Unhandled error occurred', error, context);
}

// Set up global error handlers
process.on('uncaughtException', error => {
  logUnhandledError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logUnhandledError(eh(reason), {
    type: 'unhandledRejection',
    promise: String(promise),
  });
});

export function getDebug (pattern: string) {
  const debugEnv = process.env.DEBUG;
  const enabled = debugEnv && (debugEnv === '*' || debugEnv.split(',').some((v) => (v === pattern)));
  return { enabled };
}

export { globalLogger as logger };
