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

console.log('Testing different auth methods...\n');

// Test with Basic Auth (email:token)
console.log('1. Testing with Basic Auth (need email)...');
console.log('   Enter your Atlassian email (or press Enter to skip): ');

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({ input, output });
const email = await rl.question('');
rl.close();

if (email) {
  const basicAuth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    const resp = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    });

    console.log(`   Status: ${resp.status}`);

    if (resp.ok) {
      const resources = await resp.json();
      console.log(`   ✅ Basic Auth works! Found ${resources.length} resources`);
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
}

console.log('\n💡 Notes:');
console.log('- API tokens must be used with email in Basic Auth format');
console.log('- Format: base64(email:api_token)');
console.log('- This still won\'t work with MCP - MCP needs OAuth!');