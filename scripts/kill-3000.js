#!/usr/bin/env node
/**
 * Kill OMS emulator running on default port 3000 (cross-platform)
 * Also kills WebSocket server on port 3006
 * Usage: node scripts/kill-emulator.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function killPort(portNumber) {
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${portNumber}`);

      if (!stdout.trim()) {
        return false;
      }

      const lines = stdout.trim().split('\n');
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      }

      if (pids.size === 0) {
        return false;
      }

      for (const pid of pids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          console.log(`✅  Killed process ${pid} on port ${portNumber}`);
        } catch (error) {
          console.error(`Failed to kill process ${pid}:`, error.message);
        }
      }
      return true;
    } else {
      try {
        const { stdout } = await execAsync(`lsof -ti:${portNumber}`);

        if (!stdout.trim()) {
          return false;
        }

        const pids = stdout.trim().split('\n').filter(pid => pid);

        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`);
            console.log(`✅  Killed process ${pid} on port ${portNumber}`);
          } catch (error) {
            console.error(`Failed to kill process ${pid}:`, error.message);
          }
        }
        return true;
      } catch (error) {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

async function killEmulator() {
  console.log('🔍 Stopping OMS Emulator...\n');

  // Kill HTTP server on port 3000
  console.log('Checking port 3000 (HTTP API)...');
  const httpKilled = await killPort(3000);
  if (!httpKilled) {
    console.log('   No process found on port 3000');
  }

  // Kill WebSocket server on port 3006 (or 3001 for old version)
  console.log('\nChecking port 3006 (WebSocket)...');
  const ws3006Killed = await killPort(3006);
  if (!ws3006Killed) {
    console.log('   No process found on port 3006');

    // Check old port 3001
    console.log('\nChecking port 3001 (WebSocket - old version)...');
    const ws3001Killed = await killPort(3001);
    if (!ws3001Killed) {
      console.log('   No process found on port 3001');
    }
  }

  console.log('\n✅  Emulator shutdown complete');
}

killEmulator().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
