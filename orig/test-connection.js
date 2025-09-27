#!/usr/bin/env node

import https from 'https';
import http from 'http';
import EventSource from 'eventsource';

console.log('Testing different connection methods to Atlassian MCP...\n');

// Test 1: Direct HTTPS request
async function testDirectHTTPS() {
  console.log('1. Testing direct HTTPS request...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'mcp.atlassian.com',
      path: '/v1/sse',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'User-Agent': 'MCP-Test-Client/1.0'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, JSON.stringify(res.headers, null, 2).substring(0, 500));

      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
        if (data.length < 1000) {
          console.log(`   Data chunk: ${chunk.toString().substring(0, 200)}`);
        }
      });

      res.on('end', () => {
        console.log(`   Total data received: ${data.length} bytes`);
        if (data.length > 0 && data.length < 1000) {
          console.log(`   Response body: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

// Test 2: EventSource connection
async function testEventSource() {
  console.log('\n2. Testing EventSource connection...');

  return new Promise((resolve) => {
    const es = new EventSource('https://mcp.atlassian.com/v1/sse', {
      headers: {
        'User-Agent': 'MCP-Test-Client/1.0'
      }
    });

    let messageCount = 0;
    const timeout = setTimeout(() => {
      console.log(`   Timeout reached. Received ${messageCount} messages`);
      es.close();
      resolve();
    }, 10000);

    es.onopen = () => {
      console.log('   EventSource: Connection opened');
    };

    es.onmessage = (event) => {
      messageCount++;
      console.log(`   Message ${messageCount}:`, event.data.substring(0, 200));
      if (messageCount >= 5) {
        clearTimeout(timeout);
        es.close();
        resolve();
      }
    };

    es.onerror = (error) => {
      console.log('   EventSource error:', error.message || 'Connection failed');
      clearTimeout(timeout);
      es.close();
      resolve();
    };

    // Listen for specific event types
    es.addEventListener('endpoint', (event) => {
      console.log('   Endpoint event:', event.data);
    });

    es.addEventListener('message', (event) => {
      console.log('   Message event:', event.data.substring(0, 200));
    });
  });
}

// Test 3: Try different endpoints
async function testAlternativeEndpoints() {
  console.log('\n3. Testing alternative endpoints...');

  const endpoints = [
    'https://mcp.atlassian.com/v1/messages',
    'https://mcp.atlassian.com/v1',
    'https://mcp.atlassian.com',
    'https://api.atlassian.com/mcp/v1/sse'
  ];

  for (const endpoint of endpoints) {
    console.log(`   Testing ${endpoint}...`);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/event-stream',
          'User-Agent': 'MCP-Test-Client/1.0'
        }
      });

      console.log(`     Status: ${response.status} ${response.statusText}`);

      if (response.status < 500) {
        const contentType = response.headers.get('content-type');
        console.log(`     Content-Type: ${contentType}`);

        if (contentType?.includes('json')) {
          const text = await response.text();
          console.log(`     Response: ${text.substring(0, 200)}`);
        }
      }
    } catch (error) {
      console.log(`     Error: ${error.message}`);
    }
  }
}

// Test 4: Test with authentication
async function testWithAuth() {
  console.log('\n4. Testing with Bearer token (if available)...');

  const token = process.env.ATLASSIAN_ACCESS_TOKEN || process.env.ATLASSIAN_API_TOKEN;

  if (!token) {
    console.log('   No token found in environment. Skipping auth test.');
    return;
  }

  console.log('   Found token in environment, testing authenticated request...');

  return new Promise((resolve) => {
    const options = {
      hostname: 'mcp.atlassian.com',
      path: '/v1/sse',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'MCP-Test-Client/1.0'
      }
    };

    https.get(options, (res) => {
      console.log(`   Status: ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
        if (data.length < 500) {
          console.log(`   Data: ${chunk.toString().substring(0, 200)}`);
        }
      });

      res.on('end', () => {
        console.log(`   Total authenticated data: ${data.length} bytes`);
        resolve();
      });
    }).on('error', (err) => {
      console.log(`   Auth error: ${err.message}`);
      resolve();
    });
  });
}

// Test 5: Test proxy endpoint
async function testProxy() {
  console.log('\n5. Testing local proxy (if you want to debug SSE)...');
  console.log('   You can run a local proxy to see the actual SSE traffic');
  console.log('   Example: mitm-proxy or Charles Proxy');
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('Atlassian MCP Connection Tester');
  console.log('='.repeat(60));

  await testDirectHTTPS();
  await testEventSource();
  await testAlternativeEndpoints();
  await testWithAuth();
  testProxy();

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!');
  console.log('\nNext steps:');
  console.log('1. If you see 401 errors, you need authentication');
  console.log('2. If connection hangs, the server might be waiting for specific headers');
  console.log('3. Check if you need to be on Atlassian network/VPN');
  console.log('4. Try with a valid API token from https://id.atlassian.com');
}

main().catch(console.error);