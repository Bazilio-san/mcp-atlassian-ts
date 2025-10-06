import { extractMCPMetadata } from './mcp-client.js';

/**
 * Example: Extract metadata from local Atlassian MCP server
 *
 * Prerequisites:
 * 1. Build the main project: npm run build (from root)
 * 2. Start JIRA emulator: node tests/jira-emulator.js (from root)
 * 3. Run this script: node example-local.js
 */

const localConfig = {
  name: 'local-atlassian',
  stdio: {
    command: 'node',
    args: ['../dist/src/index.js'],
    env: {
      ...process.env,
      // JIRA Configuration
      JIRA_URL: 'http://localhost:80',
      JIRA_USERNAME: 'admin',
      JIRA_PASSWORD: 'admin',

      // MCP Configuration
      MCP_SERVICE: 'jira',
      TRANSPORT_TYPE: 'stdio',
      LOG_LEVEL: 'error',

      // Suppress config warnings
      SUPPRESS_NO_CONFIG_WARNING: 'true',
      NODE_CONFIG_DIR: '../config'
    }
  }
};

async function main() {
  console.log('🚀 Extracting metadata from local Atlassian MCP server...\n');

  try {
    const { metadata, filePath } = await extractMCPMetadata(localConfig);

    console.log('\n✅ Success!');
    console.log(`📄 Metadata saved to: ${filePath}`);
    console.log(`\n📊 Server Info:`);
    console.log(`   Name: ${metadata.serverInfo.name}`);
    console.log(`   Version: ${metadata.serverInfo.version}`);
    console.log(`\n📦 Statistics:`);
    console.log(`   Tools: ${metadata.tools.length}`);
    console.log(`   Prompts: ${metadata.prompts.length}`);
    console.log(`   Resources: ${metadata.resources.length}`);

    console.log(`\n🔧 Available Tools:`);
    metadata.tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
