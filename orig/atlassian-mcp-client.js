#!/usr/bin/env node

import EventSource from 'eventsource';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Atlassian MCP Server SSE Client
 * Connects to the Atlassian MCP server and retrieves tool specifications
 */
class AtlassianMCPClient {
  constructor(serverUrl = 'https://mcp.atlassian.com/v1/sse') {
    this.serverUrl = serverUrl;
    this.eventSource = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * Generate a unique message ID
   */
  generateId() {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  /**
   * Connect to the MCP server via SSE
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to Atlassian MCP server at ${this.serverUrl}...`);

      this.eventSource = new EventSource(this.serverUrl, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      this.eventSource.onopen = () => {
        console.log('Connected to Atlassian MCP server');
        resolve();
      };

      this.eventSource.onerror = (error) => {
        console.error('Connection error:', error);
        reject(error);
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      // Handle specific event types
      this.eventSource.addEventListener('message', (event) => {
        this.handleMessage(event);
      });

      this.eventSource.addEventListener('endpoint', (event) => {
        console.log('Received endpoint event:', event.data);
      });
    });
  }

  /**
   * Handle incoming messages from the server
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data.jsonrpc ? `${data.method || 'response'}` : 'data');

      // Handle JSON-RPC responses
      if (data.id && this.pendingRequests.has(data.id)) {
        const { resolve, reject } = this.pendingRequests.get(data.id);
        this.pendingRequests.delete(data.id);

        if (data.error) {
          reject(new Error(data.error.message));
        } else {
          resolve(data.result);
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Send a JSON-RPC request to the server
   */
  async sendRequest(method, params = {}) {
    const id = this.generateId();
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    console.log(`Sending request: ${method}`);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // For SSE, we need to send requests via a different mechanism
      // The Atlassian MCP server expects requests to be sent via POST to a different endpoint
      // We'll use fetch for this
      fetch(this.serverUrl.replace('/sse', '/messages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      }).catch(error => {
        this.pendingRequests.delete(id);
        reject(error);
      });

      // Set timeout for the request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Initialize the MCP session
   */
  async initialize() {
    console.log('Initializing MCP session...');

    try {
      const result = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        },
        clientInfo: {
          name: 'atlassian-mcp-client',
          version: '1.0.0'
        }
      });

      console.log('Initialization complete');
      console.log('Server info:', result.serverInfo);
      console.log('Server capabilities:', result.capabilities);

      // Send initialized notification
      await this.sendRequest('notifications/initialized', {});

      return result;
    } catch (error) {
      console.error('Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * List all available tools
   */
  async listTools() {
    console.log('Fetching tool list...');

    try {
      const result = await this.sendRequest('tools/list', {});
      console.log(`Found ${result.tools?.length || 0} tools`);
      return result.tools || [];
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Save tools to JSON file
   */
  async saveToolsToFile(tools, filename = 'atlassian-mcp-tools.json') {
    const filePath = path.join(__dirname, filename);

    const output = {
      timestamp: new Date().toISOString(),
      serverUrl: this.serverUrl,
      toolCount: tools.length,
      tools: tools
    };

    await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Tools saved to ${filePath}`);

    // Also save a summary
    const summaryPath = path.join(__dirname, 'atlassian-mcp-tools-summary.txt');
    const summary = this.generateToolsSummary(tools);
    await fs.writeFile(summaryPath, summary, 'utf8');
    console.log(`Summary saved to ${summaryPath}`);
  }

  /**
   * Generate a human-readable summary of tools
   */
  generateToolsSummary(tools) {
    let summary = `Atlassian MCP Tools Summary
Generated: ${new Date().toISOString()}
Total Tools: ${tools.length}

Tools by Category:
`;

    // Group tools by prefix/category
    const categories = {};
    tools.forEach(tool => {
      const category = tool.name.split('_')[0] || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tool);
    });

    // Generate summary for each category
    Object.keys(categories).sort().forEach(category => {
      summary += `\n${category.toUpperCase()} (${categories[category].length} tools):\n`;
      categories[category].forEach(tool => {
        summary += `  - ${tool.name}: ${tool.description || 'No description'}\n`;
        if (tool.inputSchema?.properties) {
          const params = Object.keys(tool.inputSchema.properties).join(', ');
          summary += `    Parameters: ${params || 'none'}\n`;
        }
      });
    });

    return summary;
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.eventSource) {
      console.log('Disconnecting from server...');
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Main function
 */
async function main() {
  const client = new AtlassianMCPClient();

  try {
    // Connect to the server
    await client.connect();

    // Initialize the session
    const initResult = await client.initialize();

    // List all tools
    const tools = await client.listTools();

    // Save tools to file
    await client.saveToolsToFile(tools);

    console.log('\n✅ Successfully retrieved and saved Atlassian MCP tools specification');
    console.log(`Total tools: ${tools.length}`);

    // Print first few tools as example
    if (tools.length > 0) {
      console.log('\nExample tools:');
      tools.slice(0, 3).forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Always disconnect
    client.disconnect();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AtlassianMCPClient };