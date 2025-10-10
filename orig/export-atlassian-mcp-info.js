#!/usr/bin/env node

import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import session from 'cookie-session';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// OAuth configuration
const CLIENT_ID = process.env.ATL_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID;
const REDIRECT_URI = 'http://localhost:3000/callback';
const AUTH_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const SCOPES = [
  'read:jira-work',
  'read:confluence-content.summary',
  'offline_access'
].join(' ');
const AUDIENCE = 'api.atlassian.com';

let globalAccessToken = process.env.ATLASSIAN_ACCESS_TOKEN;
let server = null;

function base64url (buf) {
  return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

/**
 * Start OAuth server and get access token
 */
async function getAccessTokenViaOAuth () {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(session({ name: 'sess', keys: ['mcp-export'], maxAge: 24*60*60*1000 }));

    const code_verifier = base64url(crypto.randomBytes(32));
    const code_challenge = base64url(crypto.createHash('sha256').update(code_verifier).digest());
    const state = base64url(crypto.randomBytes(16));

    app.get('/auth', (req, res) => {
      req.session.code_verifier = code_verifier;
      req.session.state = state;

      const url = new URL(AUTH_URL);
      url.searchParams.set('audience', AUDIENCE);
      url.searchParams.set('client_id', CLIENT_ID);
      url.searchParams.set('scope', SCOPES);
      url.searchParams.set('redirect_uri', REDIRECT_URI);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', code_challenge);
      url.searchParams.set('code_challenge_method', 'S256');

      res.redirect(url.toString());
    });

    app.get('/callback', async (req, res) => {
      const { code, state: returnedState } = req.query;

      if (!code || returnedState !== state) {
        res.status(400).send('Bad state or no code');
        reject(new Error('OAuth failed - bad state or no code'));
        return;
      }

      try {
        // Exchange code for tokens
        const resp = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            code,
            redirect_uri: REDIRECT_URI,
            code_verifier: code_verifier
          })
        });

        const tokens = await resp.json();

        if (!resp.ok) {
          res.status(400).send(`OAuth error: ${JSON.stringify(tokens)}`);
          reject(new Error(`OAuth token exchange failed: ${tokens.error || 'Unknown error'}`));
          return;
        }

        globalAccessToken = tokens.access_token;

        // Save refresh token if available
        if (tokens.refresh_token) {
          await fs.appendFile(
            path.join(__dirname, '.env'),
            `\nATLASSIAN_REFRESH_TOKEN=${tokens.refresh_token}\n`
          );
        }

        res.send(`
          <html>
            <body>
              <h1>✅ Authentication successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        setTimeout(() => {
          server.close();
          resolve(tokens.access_token);
        }, 1000);

      } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
        reject(error);
      }
    });

    server = app.listen(3000, () => {
      console.log('🌐 OAuth server started on http://localhost:3000');
      console.log('📋 Opening browser for authentication...');
      open('http://localhost:3000/auth');
    });
  });
}

/**
 * Atlassian MCP Tools Export
 * Connects to Atlassian MCP server and saves complete tool specifications
 */
async function exportAtlassianMCPInfo () {
  const serverUrl = 'https://mcp.atlassian.com/v1/sse';

  // Check if we have a token or need OAuth
  if (!globalAccessToken && !CLIENT_ID) {
    console.error('❌ Error: No authentication method available');
    console.log('\nOption 1: Set OAuth Client ID in .env:');
    console.log('  ATL_CLIENT_ID=your_client_id_here');
    console.log('\nOption 2: Set access token directly in .env:');
    console.log('  ATLASSIAN_ACCESS_TOKEN=your_token_here');
    console.log('\nTo get OAuth credentials:');
    console.log('1. Go to https://developer.atlassian.com/console/myapps/');
    console.log('2. Create an app → Enable OAuth 2.0 (3LO)');
    console.log('3. Set Callback URL: http://localhost:3000/callback');
    console.log('4. Copy Client ID to .env file');
    process.exit(1);
  }

  // If no access token but have CLIENT_ID, do OAuth flow
  if (!globalAccessToken && CLIENT_ID) {
    console.log('🔐 No access token found, starting OAuth flow...');
    try {
      globalAccessToken = await getAccessTokenViaOAuth();
      console.log('✅ OAuth authentication successful!');
    } catch (error) {
      console.error('❌ OAuth failed:', error.message);
      process.exit(1);
    }
  }

  console.log('🔌 Connecting to Atlassian MCP server...');
  console.log(`📍 URL: ${serverUrl}`);
  console.log('🔑 Using access token');

  return new Promise((resolve, reject) => {
    const url = new URL(serverUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${globalAccessToken}`,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    };

    const tools = [];
    let serverInfo = null;
    let buffer = '';
    let timeout;
    let eventCount = 0;

    const req = https.get(options, (res) => {
      console.log(`📡 Status: ${res.statusCode}`);

      if (res.statusCode === 401) {
        console.error('❌ Authentication failed. Please check your access token.');
        reject(new Error('Authentication failed'));
        return;
      }

      if (res.statusCode !== 200) {
        console.error(`❌ HTTP ${res.statusCode}: ${res.statusMessage}`);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      console.log('✅ Connected successfully');
      console.log('⏳ Receiving data...');

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          if (line.startsWith('event:')) {
            const eventType = line.substring(6).trim();
            eventCount++;
            console.log(`📥 Event ${eventCount}: ${eventType}`);
          }

          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            try {
              const json = JSON.parse(data);

              // Handle different response types
              if (json.result?.tools) {
                tools.push(...json.result.tools);
                console.log(`  → Received ${json.result.tools.length} tools`);
              } else if (json.tools) {
                tools.push(...json.tools);
                console.log(`  → Received ${json.tools.length} tools`);
              } else if (json.serverInfo) {
                serverInfo = json.serverInfo;
                console.log(`  → Server info: ${serverInfo.name} v${serverInfo.version}`);
              } else if (json.method === 'tools/list' && json.params?.tools) {
                tools.push(...json.params.tools);
                console.log(`  → Received ${json.params.tools.length} tools`);
              }
            } catch (e) {
              // Not JSON or parsing error - skip
            }
          }
        }

        buffer = lines[lines.length - 1];

        // Reset timeout on each data chunk
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          console.log('\n⏰ No more data received, processing results...');
          res.destroy();
          resolve({ tools, serverInfo });
        }, 3000);
      });

      res.on('end', () => {
        if (timeout) clearTimeout(timeout);
        console.log('\n✅ Connection closed');
        resolve({ tools, serverInfo });
      });

      res.on('error', (err) => {
        if (timeout) clearTimeout(timeout);
        console.error('❌ Connection error:', err.message);
        reject(err);
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err.message);
      reject(err);
    });

    req.end();
  });
}

/**
 * Save tools to JSON file with full specification
 */
async function saveToolsSpecification (tools, serverInfo) {
  const timestamp = new Date().toISOString();
  const date = new Date().toISOString().split('T')[0];

  // Create full specification object
  const specification = {
    metadata: {
      timestamp,
      serverUrl: 'https://mcp.atlassian.com/v1/sse',
      exportedBy: 'export-atlassian-mcp-info.js',
      serverInfo: serverInfo || { name: 'Atlassian MCP Server', version: 'unknown' }
    },
    statistics: {
      totalTools: tools.length,
      toolsByCategory: {}
    },
    tools: []
  };

  // Process and categorize tools
  const categories = {
    jira: [],
    confluence: [],
    bitbucket: [],
    trello: [],
    admin: [],
    other: []
  };

  tools.forEach(tool => {
    const name = tool.name.toLowerCase();
    const desc = (tool.description || '').toLowerCase();

    // Add complete tool specification
    const toolSpec = {
      name: tool.name,
      description: tool.description || 'No description provided',
      category: null,
      inputSchema: tool.inputSchema || {},
      parameters: {},
      required: [],
      examples: tool.examples || []
    };

    // Extract parameter details
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([param, schema]) => {
        toolSpec.parameters[param] = {
          type: schema.type || 'any',
          description: schema.description || 'No description',
          required: tool.inputSchema.required?.includes(param) || false,
          enum: schema.enum || null,
          default: schema.default || null,
          format: schema.format || null,
          items: schema.items || null,
          properties: schema.properties || null
        };
      });
      toolSpec.required = tool.inputSchema.required || [];
    }

    // Categorize tool
    if (name.includes('jira') || name.includes('issue') || name.includes('sprint') ||
        desc.includes('jira') || desc.includes('issue')) {
      toolSpec.category = 'jira';
      categories.jira.push(tool.name);
    } else if (name.includes('confluence') || name.includes('page') || name.includes('space') ||
               desc.includes('confluence') || desc.includes('page')) {
      toolSpec.category = 'confluence';
      categories.confluence.push(tool.name);
    } else if (name.includes('bitbucket') || name.includes('repository') || name.includes('pull') ||
               desc.includes('bitbucket')) {
      toolSpec.category = 'bitbucket';
      categories.bitbucket.push(tool.name);
    } else if (name.includes('trello') || name.includes('board') || name.includes('card') ||
               desc.includes('trello')) {
      toolSpec.category = 'trello';
      categories.trello.push(tool.name);
    } else if (name.includes('admin') || name.includes('user') || name.includes('permission') ||
               desc.includes('admin')) {
      toolSpec.category = 'admin';
      categories.admin.push(tool.name);
    } else {
      toolSpec.category = 'other';
      categories.other.push(tool.name);
    }

    specification.tools.push(toolSpec);
  });

  // Update statistics
  Object.entries(categories).forEach(([cat, toolNames]) => {
    if (toolNames.length > 0) {
      specification.statistics.toolsByCategory[cat] = toolNames.length;
    }
  });

  // Save JSON file
  const jsonFile = path.join(__dirname, `atlassian-mcp-tools-${date}.json`);
  await fs.writeFile(jsonFile, JSON.stringify(specification, null, 2), 'utf8');
  console.log(`\n✅ Full specification saved to: ${jsonFile}`);

  // Generate and save summary
  let summary = '# Atlassian MCP Tools Export Summary\n\n';
  summary += `**Generated:** ${timestamp}\n`;
  summary += `**Total Tools:** ${tools.length}\n\n`;
  summary += '## Tools by Category\n\n';

  Object.entries(categories).forEach(([cat, toolNames]) => {
    if (toolNames.length > 0) {
      summary += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${toolNames.length} tools)\n`;
      toolNames.forEach(name => {
        const tool = tools.find(t => t.name === name);
        summary += `- **${name}**: ${tool?.description || 'No description'}\n`;
      });
      summary += '\n';
    }
  });

  const summaryFile = path.join(__dirname, `atlassian-mcp-tools-summary-${date}.md`);
  await fs.writeFile(summaryFile, summary, 'utf8');
  console.log(`📄 Summary saved to: ${summaryFile}`);

  return { specification, jsonFile, summaryFile };
}

/**
 * Main execution
 */
async function main () {
  console.log('=' .repeat(60));
  console.log('🚀 Atlassian MCP Tools Export');
  console.log('=' .repeat(60));

  try {
    // Fetch tools from MCP server
    const { tools, serverInfo } = await exportAtlassianMCPInfo();

    if (tools && tools.length > 0) {
      console.log(`\n📊 Retrieved ${tools.length} tools from server`);

      // Save complete specification
      const { specification, jsonFile, summaryFile } = await saveToolsSpecification(tools, serverInfo);

      console.log('\n' + '=' .repeat(60));
      console.log('✅ Export completed successfully!');
      console.log('=' .repeat(60));
      console.log('\n📈 Statistics:');
      console.log(`   Total tools: ${specification.statistics.totalTools}`);

      Object.entries(specification.statistics.toolsByCategory).forEach(([cat, count]) => {
        console.log(`   ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count} tools`);
      });

      console.log('\n📦 Output files:');
      console.log(`   • Full specification: ${path.basename(jsonFile)}`);
      console.log(`   • Summary: ${path.basename(summaryFile)}`);

      console.log('\n🎯 Example tools:');
      specification.tools.slice(0, 5).forEach(tool => {
        console.log(`   • ${tool.name} [${tool.category}]`);
        console.log(`     ${tool.description.substring(0, 60)}...`);
      });

    } else {
      console.log('\n⚠️ No tools retrieved from the server.');
      console.log('Possible reasons:');
      console.log('  1. Invalid or expired access token');
      console.log('  2. No access to Atlassian organization');
      console.log('  3. MCP server endpoint has changed');
      console.log('\nPlease check your access token and try again.');
    }
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);

    if (error.message.includes('Authentication')) {
      console.log('\n💡 Authentication Help:');
      console.log('1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens');
      console.log('2. Create a new API token');
      console.log('3. Save it in orig/.env as:');
      console.log('   ATLASSIAN_ACCESS_TOKEN=your_token_here');
      console.log('\nFor OAuth2 authentication, see orig/README.md');
    }

    process.exit(1);
  }
}

// Run the export
main().catch(console.error);