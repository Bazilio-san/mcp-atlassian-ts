/* istanbul ignore file */
// noinspection JSUnusedGlobalSymbols

import { red, reset } from 'af-color';
import { appConfig } from '../../bootstrap/init-config.js';
import { getAFLogger } from 'af-logger-ts';
import chalk from 'chalk';

const { level } = appConfig.logger;

const { logger, fileLogger, exitOnError } = getAFLogger({
  level,
  maxSize: '500m',
  name: '\x1b[1P',
  filePrefix: appConfig.name,
  minLogSize: 0,
  minErrorLogSize: 0,
  prettyLogTemplate: '[{{hh}}:{{MM}}:{{ss}}]: {{logLevelName}} [{{name}}] ',
  prettyErrorTemplate: `${red}{{errorMessage}}${reset}\n{{errorStack}}`,
  maskValuesRegEx: [
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
  ],
});

export { logger, fileLogger, exitOnError };

/**
 * Express middleware for request logging
 */
export function createRequestLogger () {
  return (req: any, res: any, next: any) => {
    const requestLogger = logger.getSubLogger({ name: chalk.blue('http2') });

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
