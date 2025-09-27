#!/usr/bin/env node

import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Fetch Atlassian MCP tools with authentication
 */
class AuthenticatedMCPFetcher {
  constructor() {
    this.serverUrl = 'https://mcp.atlassian.com/v1/sse';
    this.accessToken = process.env.ATLASSIAN_ACCESS_TOKEN || '';
  }

  /**
   * Get access token from user or environment
   */
  async getAccessToken() {
    if (this.accessToken) {
      console.log('Using access token from environment variable ATLASSIAN_ACCESS_TOKEN');
      return this.accessToken;
    }

    const rl = readline.createInterface({ input, output });

    console.log('\n📋 To get an access token:');
    console.log('1. Go to https://id.atlassian.com/manage-profile/security/api-tokens');
    console.log('2. Create a new API token');
    console.log('3. Or use OAuth2 flow as described in the documentation\n');

    const token = await rl.question('Enter your Atlassian access token: ');
    rl.close();

    this.accessToken = token.trim();
    return this.accessToken;
  }

  /**
   * Fetch tools with authentication
   */
  async fetchTools() {
    const token = await this.getAccessToken();

    if (!token) {
      throw new Error('Access token is required');
    }

    return new Promise((resolve, reject) => {
      console.log('Connecting to Atlassian MCP server with authentication...');

      const url = new URL(this.serverUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      };

      const req = https.get(options, (res) => {
        console.log('Status:', res.statusCode);

        if (res.statusCode === 401) {
          reject(new Error('Authentication failed. Please check your access token.'));
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let buffer = '';
        const tools = [];
        let serverInfo = null;
        let timeout;

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();

            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const json = JSON.parse(data);

                // Handle different response types
                if (json.result?.tools) {
                  tools.push(...json.result.tools);
                  console.log(`Received ${json.result.tools.length} tools`);
                } else if (json.tools) {
                  tools.push(...json.tools);
                  console.log(`Received ${json.tools.length} tools`);
                } else if (json.serverInfo) {
                  serverInfo = json.serverInfo;
                  console.log('Server info:', serverInfo);
                } else if (json.method === 'tools/list' && json.params?.tools) {
                  tools.push(...json.params.tools);
                  console.log(`Received ${json.params.tools.length} tools`);
                }
              } catch (e) {
                // Not JSON or parsing error
              }
            }
          }

          buffer = lines[lines.length - 1];

          // Reset timeout on each data chunk
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            console.log('No more data received, processing results...');
            res.destroy();
            resolve({ tools, serverInfo });
          }, 3000);
        });

        res.on('end', () => {
          if (timeout) clearTimeout(timeout);
          resolve({ tools, serverInfo });
        });

        res.on('error', (err) => {
          if (timeout) clearTimeout(timeout);
          reject(err);
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Save tools to files
   */
  async saveTools(tools, serverInfo) {
    const timestamp = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];

    // Save full JSON
    const jsonFile = path.join(__dirname, `atlassian-mcp-tools-${date}.json`);
    const jsonData = {
      timestamp,
      serverUrl: this.serverUrl,
      serverInfo,
      toolCount: tools.length,
      tools
    };

    await fs.writeFile(jsonFile, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`\n✅ Full specification saved to: ${jsonFile}`);

    // Save markdown documentation
    const mdFile = path.join(__dirname, `atlassian-mcp-tools-${date}.md`);
    const mdContent = this.generateDocumentation(tools, serverInfo);
    await fs.writeFile(mdFile, mdContent, 'utf8');
    console.log(`📄 Documentation saved to: ${mdFile}`);

    // Save TypeScript types
    const tsFile = path.join(__dirname, `atlassian-mcp-tools-${date}.d.ts`);
    const tsContent = this.generateTypeScript(tools);
    await fs.writeFile(tsFile, tsContent, 'utf8');
    console.log(`🔷 TypeScript types saved to: ${tsFile}`);

    return { jsonFile, mdFile, tsFile };
  }

  /**
   * Generate markdown documentation
   */
  generateDocumentation(tools, serverInfo) {
    let md = `# Atlassian MCP Tools Specification

**Generated:** ${new Date().toISOString()}
**Server URL:** ${this.serverUrl}
**Total Tools:** ${tools.length}

`;

    if (serverInfo) {
      md += `## Server Information
- **Name:** ${serverInfo.name || 'Unknown'}
- **Version:** ${serverInfo.version || 'Unknown'}

`;
    }

    // Group tools by service/category
    const categories = this.categorizeTools(tools);

    md += `## Tools by Category\n\n`;

    Object.entries(categories).forEach(([category, categoryTools]) => {
      md += `### ${category} (${categoryTools.length} tools)\n\n`;

      categoryTools.forEach(tool => {
        md += `#### \`${tool.name}\`\n\n`;
        md += `${tool.description || 'No description provided'}\n\n`;

        if (tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0) {
          md += `**Parameters:**\n\n`;
          md += '| Parameter | Type | Required | Description |\n';
          md += '|-----------|------|----------|-------------|\n';

          Object.entries(tool.inputSchema.properties).forEach(([param, schema]) => {
            const required = tool.inputSchema.required?.includes(param) ? '✅' : '❌';
            const type = schema.type || 'any';
            const description = schema.description || '-';
            md += `| \`${param}\` | ${type} | ${required} | ${description} |\n`;
          });
          md += '\n';
        } else {
          md += '**No parameters required**\n\n';
        }

        // Add example if available
        if (tool.examples) {
          md += `**Examples:**\n\`\`\`json\n${JSON.stringify(tool.examples, null, 2)}\n\`\`\`\n\n`;
        }
      });
    });

    return md;
  }

  /**
   * Generate TypeScript types
   */
  generateTypeScript(tools) {
    let ts = `// Atlassian MCP Tools TypeScript Definitions
// Generated: ${new Date().toISOString()}

export interface AtlassianMCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export type AtlassianMCPTools = {
`;

    tools.forEach(tool => {
      const safeName = tool.name.replace(/[^a-zA-Z0-9_]/g, '_');
      ts += `  '${tool.name}': {\n`;
      ts += `    name: '${tool.name}';\n`;
      if (tool.description) {
        ts += `    description: '${tool.description.replace(/'/g, "\\'")}';\n`;
      }
      if (tool.inputSchema?.properties) {
        ts += `    params: {\n`;
        Object.entries(tool.inputSchema.properties).forEach(([param, schema]) => {
          const required = tool.inputSchema.required?.includes(param) ? '' : '?';
          const type = this.schemaToTypeScript(schema);
          ts += `      ${param}${required}: ${type};\n`;
        });
        ts += `    };\n`;
      }
      ts += `  };\n`;
    });

    ts += `};\n\n`;

    // Add tool names as a type
    ts += `export type AtlassianMCPToolName = \n`;
    tools.forEach((tool, index) => {
      ts += `  | '${tool.name}'`;
      if (index < tools.length - 1) ts += '\n';
    });
    ts += ';\n';

    return ts;
  }

  /**
   * Convert JSON schema to TypeScript type
   */
  schemaToTypeScript(schema) {
    if (!schema) return 'any';

    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return schema.enum.map(v => `'${v}'`).join(' | ');
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        const itemType = this.schemaToTypeScript(schema.items);
        return `${itemType}[]`;
      case 'object':
        if (schema.properties) {
          const props = Object.entries(schema.properties)
            .map(([k, v]) => `${k}: ${this.schemaToTypeScript(v)}`)
            .join('; ');
          return `{ ${props} }`;
        }
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  /**
   * Categorize tools by service
   */
  categorizeTools(tools) {
    const categories = {
      'JIRA': [],
      'Confluence': [],
      'Bitbucket': [],
      'Trello': [],
      'Admin': [],
      'Other': []
    };

    tools.forEach(tool => {
      const name = tool.name.toLowerCase();
      const desc = (tool.description || '').toLowerCase();

      if (name.includes('jira') || name.includes('issue') || name.includes('sprint') ||
          desc.includes('jira') || desc.includes('issue')) {
        categories['JIRA'].push(tool);
      } else if (name.includes('confluence') || name.includes('page') || name.includes('space') ||
                 desc.includes('confluence') || desc.includes('page')) {
        categories['Confluence'].push(tool);
      } else if (name.includes('bitbucket') || name.includes('repository') || name.includes('pull') ||
                 desc.includes('bitbucket') || desc.includes('repository')) {
        categories['Bitbucket'].push(tool);
      } else if (name.includes('trello') || name.includes('board') || name.includes('card') ||
                 desc.includes('trello')) {
        categories['Trello'].push(tool);
      } else if (name.includes('admin') || name.includes('user') || name.includes('permission') ||
                 desc.includes('admin')) {
        categories['Admin'].push(tool);
      } else {
        categories['Other'].push(tool);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      } else {
        // Sort tools in each category
        categories[key].sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    return categories;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Atlassian MCP Tools Fetcher (with Authentication)');
  console.log('='.repeat(60));

  const fetcher = new AuthenticatedMCPFetcher();

  try {
    const { tools, serverInfo } = await fetcher.fetchTools();

    if (tools && tools.length > 0) {
      const files = await fetcher.saveTools(tools, serverInfo);

      console.log('\n📊 Summary:');
      console.log(`  • Total tools: ${tools.length}`);

      const categories = fetcher.categorizeTools(tools);
      Object.entries(categories).forEach(([cat, catTools]) => {
        console.log(`  • ${cat}: ${catTools.length} tools`);
      });

      console.log('\n🎯 Example tools:');
      tools.slice(0, 5).forEach(tool => {
        console.log(`  • ${tool.name}`);
        if (tool.description) {
          console.log(`    ${tool.description.substring(0, 60)}...`);
        }
      });

      console.log('\n✅ Success! Check the generated files for full details.');
    } else {
      console.log('\n⚠️ No tools retrieved from the server.');
      console.log('This might indicate:');
      console.log('  1. The server requires different authentication');
      console.log('  2. The API endpoint has changed');
      console.log('  3. You need to be part of an Atlassian organization');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('401') || error.message.includes('Authentication')) {
      console.log('\n💡 Authentication Tips:');
      console.log('  1. Create an API token at: https://id.atlassian.com/manage-profile/security/api-tokens');
      console.log('  2. Set environment variable: export ATLASSIAN_ACCESS_TOKEN=your_token_here');
      console.log('  3. Or follow OAuth2 flow as described in the documentation');
    }

    process.exit(1);
  }
}
main().catch(console.error);

// // Run if executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
// }
//
// export { AuthenticatedMCPFetcher };
