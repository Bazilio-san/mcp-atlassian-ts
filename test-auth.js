#!/usr/bin/env node

/**
 * Test script for flexible authentication system
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3000';

// Test configurations
const tests = [
  {
    name: 'System Mode - Valid Server Token',
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Token': 'test-server-token'
    },
    expectedMode: 'system'
  },
  {
    name: 'Header Mode - No Server Token',
    headers: {
      'Content-Type': 'application/json',
      'X-JIRA-Token': 'test-jira-token'
    },
    expectedMode: 'headers'
  },
  {
    name: 'Header Mode - Invalid Server Token',
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Token': 'invalid-token',
      'X-JIRA-Token': 'test-jira-token'
    },
    expectedMode: 'headers'
  },
  {
    name: 'No Authentication - Should Fail',
    headers: {
      'Content-Type': 'application/json'
    },
    expectedMode: 'error'
  }
];

function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/mcp',
      method: 'POST',
      headers: test.headers,
      'Content-Length': Buffer.byteLength(data)
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            status: res.statusCode,
            response
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            response: body
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Flexible Authentication System\n');

  for (const test of tests) {
    console.log(`📋 Test: ${test.name}`);

    try {
      const result = await makeRequest(test);

      if (test.expectedMode === 'error') {
        if (result.status === 401) {
          console.log('✅ PASSED - Correctly rejected request');
        } else {
          console.log(`❌ FAILED - Expected 401, got ${result.status}`);
        }
      } else {
        if (result.status === 200) {
          console.log(`✅ PASSED - Request accepted (${test.expectedMode} mode)`);
        } else if (result.status === 401) {
          console.log(`❌ FAILED - Authentication rejected (${test.expectedMode} mode expected)`);
        } else {
          console.log(`❌ FAILED - Unexpected status: ${result.status}`);
        }
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
    }

    console.log('---');
  }

  console.log('\n🎯 Test completed!');
  console.log('\n💡 To test with a real server:');
  console.log('1. Set SERVER_TOKEN=test-server-token in environment');
  console.log('2. Configure JIRA authentication in config.yaml');
  console.log('3. Start server: npm start');
  console.log('4. Run this script again');
}

// Check if server is running
function checkServer() {
  return new Promise((resolve) => {
    http.get('http://localhost:3000/health', (res) => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('\n🚀 To start the server:');
    console.log('1. Set environment variables:');
    console.log('   SERVER_TOKEN=test-server-token');
    console.log('   JIRA_URL=https://your-domain.atlassian.net');
    console.log('   JIRA_PAT=your-token');
    console.log('2. Run: npm start');
    console.log('3. Run this script again');
    return;
  }

  await runTests();
}

main().catch(console.error);