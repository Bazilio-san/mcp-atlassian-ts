#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const token = process.env.ATLASSIAN_ACCESS_TOKEN;

if (!token) {
  console.error('❌ No ATLASSIAN_ACCESS_TOKEN in .env');
  process.exit(1);
}

console.log('Testing token with Atlassian API...\n');

// Test 1: Check accessible resources
console.log('1. Testing accessible-resources endpoint...');
try {
  const resp = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  console.log(`   Status: ${resp.status}`);

  if (resp.ok) {
    const resources = await resp.json();
    console.log(`   ✅ Token works! Found ${resources.length} resources`);
    resources.forEach(r => {
      console.log(`      - ${r.name} (${r.url})`);
    });
  } else {
    const error = await resp.text();
    console.log(`   ❌ Failed: ${error}`);
  }
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

// Test 2: Try MCP endpoint
console.log('\n2. Testing MCP endpoint...');
try {
  const resp = await fetch('https://mcp.atlassian.com/v1/sse', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream'
    }
  });

  console.log(`   Status: ${resp.status}`);

  if (resp.status === 401) {
    console.log('   ❌ MCP requires OAuth token, not API token');
  } else if (resp.ok) {
    console.log('   ✅ MCP accepts the token!');
  }
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

console.log('\n💡 Summary:');
console.log('- API tokens (PAT) work for REST API but NOT for MCP');
console.log('- MCP requires OAuth 2.0 access token');
console.log('- Use OAuth flow with Client ID to get proper token');