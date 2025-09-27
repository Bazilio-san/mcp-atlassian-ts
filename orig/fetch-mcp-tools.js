#!/usr/bin/env node

import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Simple MCP client to fetch Atlassian tools via SSE
 */
class MCPToolsFetcher {
  constructor() {
    this.serverUrl = 'https://mcp.atlassian.com/v1/sse';
    this.messageBuffer = '';
    this.tools = [];
    this.serverInfo = null;
  }

  /**
   * Parse SSE data
   */
  parseSSEData(chunk) {
    this.messageBuffer += chunk;
    const lines = this.messageBuffer.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      if (line.startsWith('data: ')) {
        const data = line.substring(6);
        try {
          const json = JSON.parse(data);
          this.handleMessage(json);
        } catch (e) {
          // Not JSON, might be a different format
        }
      }
    }

    // Keep the last incomplete line in the buffer
    this.messageBuffer = lines[lines.length - 1];
  }

  /**
   * Handle parsed messages
   */
  handleMessage(message) {
    console.log('Received message type:', message.method || message.jsonrpc || 'unknown');

    // Handle different message types
    if (message.method === 'tools/list') {
      if (message.result?.tools) {
        this.tools = message.result.tools;
        console.log(`Received ${this.tools.length} tools`);
      }
    } else if (message.serverInfo) {
      this.serverInfo = message.serverInfo;
      console.log('Server info:', this.serverInfo);
    } else if (message.result?.tools) {
      this.tools = message.result.tools;
      console.log(`Received ${this.tools.length} tools`);
    }
  }

  /**
   * Connect and fetch tools
   */
  async fetchTools() {
    return new Promise((resolve, reject) => {
      console.log('Connecting to Atlassian MCP server...');

      const options = {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      };

      const req = https.get(this.serverUrl, options, (res) => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let dataReceived = false;
        let timeout;

        res.on('data', (chunk) => {
          if (!dataReceived) {
            console.log('Started receiving data...');
            dataReceived = true;
          }

          this.parseSSEData(chunk.toString());

          // Reset timeout on each data chunk
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            console.log('No more data received, closing connection...');
            res.destroy();
            resolve(this.tools);
          }, 5000); // Wait 5 seconds after last data
        });

        res.on('end', () => {
          console.log('Connection closed');
          if (timeout) clearTimeout(timeout);
          resolve(this.tools);
        });

        res.on('error', (err) => {
          console.error('Response error:', err);
          if (timeout) clearTimeout(timeout);
          reject(err);
        });

        // Send initial request after connection
        setTimeout(() => {
          console.log('Sending initialization request...');
          // For SSE, we might need to send the request differently
          // The server should automatically send the tools list
        }, 1000);
      });

      req.on('error', (err) => {
        console.error('Request error:', err);
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Save tools to file
   */
  async saveTools(tools) {
    const timestamp = new Date().toISOString();
    const filename = `atlassian-mcp-tools-${Date.now()}.json`;
    const filepath = path.join(__dirname, filename);

    const output = {
      timestamp,
      serverUrl: this.serverUrl,
      serverInfo: this.serverInfo,
      toolCount: tools.length,
      tools: tools
    };

    await fs.writeFile(filepath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`\n✅ Tools saved to ${filepath}`);

    // Create a summary file
    const summaryFile = path.join(__dirname, 'atlassian-tools-summary.md');
    const summary = this.generateMarkdownSummary(tools);
    await fs.writeFile(summaryFile, summary, 'utf8');
    console.log(`📄 Summary saved to ${summaryFile}`);

    return filepath;
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(tools) {
    let md = `# Atlassian MCP Tools

**Generated:** ${new Date().toISOString()}
**Total Tools:** ${tools.length}
**Server:** ${this.serverUrl}

## Tools by Service

`;

    // Group by service (jira, confluence, bitbucket, etc.)
    const services = {};

    tools.forEach(tool => {
      let service = 'Other';
      const name = tool.name.toLowerCase();

      if (name.includes('jira') || name.includes('issue') || name.includes('project')) {
        service = 'JIRA';
      } else if (name.includes('confluence') || name.includes('page') || name.includes('space')) {
        service = 'Confluence';
      } else if (name.includes('bitbucket') || name.includes('repo') || name.includes('pull')) {
        service = 'Bitbucket';
      }

      if (!services[service]) {
        services[service] = [];
      }
      services[service].push(tool);
    });

    // Generate sections for each service
    Object.keys(services).sort().forEach(service => {
      md += `### ${service} (${services[service].length} tools)\n\n`;

      services[service].sort((a, b) => a.name.localeCompare(b.name)).forEach(tool => {
        md += `#### \`${tool.name}\`\n`;
        md += `${tool.description || 'No description provided'}\n\n`;

        if (tool.inputSchema?.properties) {
          md += `**Parameters:**\n`;
          Object.entries(tool.inputSchema.properties).forEach(([param, schema]) => {
            const required = tool.inputSchema.required?.includes(param) ? ' *(required)*' : '';
            md += `- \`${param}\`${required}: ${schema.description || schema.type || 'unknown'}\n`;
          });
          md += '\n';
        }
      });
    });

    return md;
  }
}

/**
 * Alternative approach using fetch
 */
async function fetchWithFetch() {
  console.log('Attempting to fetch tools using fetch API...');

  try {
    const response = await fetch('https://mcp.atlassian.com/v1/sse', {
      headers: {
        'Accept': 'text/event-stream',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const tools = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.result?.tools) {
              tools.push(...data.result.tools);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      buffer = lines[lines.length - 1];
    }

    return tools;
  } catch (error) {
    console.error('Fetch failed:', error);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  const fetcher = new MCPToolsFetcher();

  try {
    console.log('='.repeat(60));
    console.log('Atlassian MCP Tools Fetcher');
    console.log('='.repeat(60));

    // Try the SSE approach
    let tools = await fetcher.fetchTools();

    // If no tools retrieved, try alternative approach
    if (!tools || tools.length === 0) {
      console.log('\nTrying alternative fetch approach...');
      tools = await fetchWithFetch();
    }

    if (tools && tools.length > 0) {
      await fetcher.saveTools(tools);

      console.log(`\n📊 Summary:`);
      console.log(`  Total tools: ${tools.length}`);

      // Show first 5 tools as examples
      console.log(`\n📦 Example tools:`);
      tools.slice(0, 5).forEach(tool => {
        console.log(`  - ${tool.name}`);
        if (tool.description) {
          console.log(`    ${tool.description.substring(0, 80)}...`);
        }
      });
    } else {
      console.log('\n⚠️ No tools retrieved. The server might require authentication or specific headers.');
      console.log('Check the Atlassian documentation for authentication requirements.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);