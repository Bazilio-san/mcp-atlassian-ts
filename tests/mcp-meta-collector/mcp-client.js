import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

/**
 * MCP Client for extracting server metadata
 * Supports both STDIO and HTTP/SSE transports
 */
export class MCPClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.transport = null;
  }

  /**
   * Connect to MCP server using STDIO transport
   */
  async connectStdio() {
    const { command, args = [], env = {} } = this.config.stdio;

    console.log(`Connecting to MCP server via STDIO: ${command} ${args.join(' ')}`);

    this.transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env }
    });

    this.client = new Client({
      name: 'mcp-metadata-extractor',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);
    console.log('✅ Connected via STDIO');
  }

  /**
   * Connect to MCP server using HTTP/SSE transport
   */
  async connectSSE() {
    const { url, headers = {} } = this.config.sse;

    console.log(`Connecting to MCP server via SSE: ${url}`);

    this.transport = new SSEClientTransport(
      new URL(url),
      {
        requestInit: {
          headers: headers
        }
      }
    );

    this.client = new Client({
      name: 'mcp-metadata-extractor',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);
    console.log('✅ Connected via SSE');
  }

  /**
   * Connect to MCP server (auto-detect transport type)
   */
  async connect() {
    if (this.config.stdio) {
      await this.connectStdio();
    } else if (this.config.sse) {
      await this.connectSSE();
    } else {
      throw new Error('No transport configuration provided. Use either "stdio" or "sse"');
    }
  }

  /**
   * Extract all metadata from MCP server
   */
  async extractMetadata() {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first');
    }

    console.log('📊 Extracting server metadata...');

    const metadata = {
      serverInfo: null,
      tools: [],
      prompts: [],
      resources: [],
      extractedAt: new Date().toISOString()
    };

    try {
      // Get server info
      metadata.serverInfo = await this.client.getServerVersion();
      console.log(`Server: ${metadata.serverInfo.name} v${metadata.serverInfo.version}`);

      // List tools
      const toolsResult = await this.client.listTools();
      metadata.tools = toolsResult.tools || [];
      console.log(`📦 Found ${metadata.tools.length} tools`);

      // List prompts
      try {
        const promptsResult = await this.client.listPrompts();
        metadata.prompts = promptsResult.prompts || [];
        console.log(`📝 Found ${metadata.prompts.length} prompts`);
      } catch (err) {
        console.log(`ℹ️  Prompts not supported: ${err.message}`);
      }

      // List resources
      try {
        const resourcesResult = await this.client.listResources();
        metadata.resources = resourcesResult.resources || [];
        console.log(`📂 Found ${metadata.resources.length} resources`);
      } catch (err) {
        console.log(`ℹ️  Resources not supported: ${err.message}`);
      }

      return metadata;
    } catch (error) {
      console.error('❌ Error extracting metadata:', error.message);
      throw error;
    }
  }

  /**
   * Save metadata to JSON file
   */
  async saveMetadata(metadata) {
    const fileName = `meta/mcp-${this.config.name || 'server'}-meta.json`;
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fullPath = path.join(__dirname, fileName);

    await fs.writeFile(
      fullPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    console.log(`💾 Metadata saved to: ${fullPath}`);
    return fullPath;
  }

  /**
   * Disconnect from server
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MCP server');
    }
  }

  /**
   * Run complete extraction workflow
   */
  async run() {
    try {
      await this.connect();
      const metadata = await this.extractMetadata();
      const filePath = await this.saveMetadata(metadata);
      return { metadata, filePath };
    } finally {
      await this.disconnect();
    }
  }
}

/**
 * Helper function to create and run MCP client
 */
export async function extractMCPMetadata(config) {
  const client = new MCPClient(config);
  return await client.run();
}
