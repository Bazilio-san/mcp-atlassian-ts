/**
 * Port availability checking utilities
 */

import { createLogger } from './logger.js';
import chalk from 'chalk';
import { createServer } from 'net';

const logger = createLogger('port-check', chalk.cyan);

/**
 * Check if a port is available
 */
export async function isPortAvailable (port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });

    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find an available port starting from the given port
 */
export async function findAvailablePort (startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Check port and log helpful message if port is in use
 */
export async function checkPortAvailability (port: number): Promise<void> {
  const available = await isPortAvailable(port);

  if (!available) {
    logger.error(`Port ${port} is already in use.`);
    logger.error('Possible solutions:');
    logger.error(`1. Use a different port: SERVER_PORT=${port + 1} npm start`);
    logger.error('2. Stop the process using this port:');
    logger.error(`   - On Windows: netstat -ano | findstr :${port} then taskkill /PID <PID> /F`);
    logger.error(`   - On Linux/macOS: lsof -ti :${port} | xargs kill -9`);
    logger.error('3. Find what\'s using the port:');
    logger.error(`   - On Windows: netstat -ano | findstr :${port}`);
    logger.error(`   - On Linux/macOS: lsof -i :${port}`);

    throw new Error(`Port ${port} is already in use`);
  }
}