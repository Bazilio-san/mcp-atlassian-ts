import { extractMCPMetadata } from './mcp-metadata-extractor.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get absolute path to the MCP server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const serverPath = path.join(projectRoot, 'dist', 'src', 'index.js');

/**
 * Test configuration for Atlassian MCP Server
 * Uses SSE transport for connection
 */
const atlassianConfig = {
  name: 'atlassian',
  sse: {
    url: 'https://mcp.atlassian.com/v1/sse',
    // OAuth authentication will be handled by mcp-remote proxy
    headers: {}
  }
};

/**
 * Atlassian using STDIO transport with npx mcp-remote proxy
 * This configuration uses the mcp-remote proxy tool to handle OAuth authentication
 */
const atlassianStdioConfig = {
  name: 'atlassian-mcp-remote',
  stdio: {
    command: 'npx',
    args: ['-y', 'mcp-remote@0.1.13', 'https://mcp.atlassian.com/v1/sse'],
    env: {
      ...process.env
    }
  }
};

/**
 * Test local Atlassian MCP server using STDIO
 * Uses the built server from the main project
 */
const localAtlassianConfig = {
  name: 'local-atlassian',
  stdio: {
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      JIRA_URL: 'http://localhost:80',
      JIRA_USERNAME: 'admin',
      JIRA_PASSWORD: 'admin',
      MCP_SERVICE_MODE: 'jira',
      TRANSPORT_TYPE: 'stdio',
      LOG_LEVEL: 'error'
    }
  }
};

/**
 * Run metadata extraction for multiple servers
 */
async function runTests () {
  console.log('🚀 Starting MCP metadata extraction tests\n');
  console.log('='.repeat(60));

  const results = [];
  /*
  // Test 1: Atlassian MCP via STDIO (using mcp-remote proxy)
  console.log('\n📡 Test 1: Atlassian MCP Server (STDIO with mcp-remote)');
  console.log('-'.repeat(60));
  try {
    const result = await extractMCPMetadata(atlassianStdioConfig);
    results.push({ name: 'Atlassian (STDIO)', success: true, ...result });
  } catch (error) {
    console.error(`❌  Failed: ${error.message}`);
    results.push({ name: 'Atlassian (STDIO)', success: false, error: error.message });
  }
  */
  // Test 3: Local Atlassian MCP Server via STDIO

  console.log('\n📡 Test 3: Local Atlassian MCP Server (STDIO)');
  console.log('-'.repeat(60));
  try {
    const result = await extractMCPMetadata(localAtlassianConfig);
    results.push({ name: 'Local Atlassian (STDIO)', success: true, ...result });
  } catch (error) {
    console.error(`❌  Failed: ${error.message}`);
    results.push({ name: 'Local Atlassian (STDIO)', success: false, error: error.message });
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}`);

    if (result.success) {
      console.log(`   📄 Metadata file: ${result.filePath}`);
      console.log(`   📦 Tools: ${result.metadata.tools?.length || 0}`);
      console.log(`   📝 Prompts: ${result.metadata.prompts?.length || 0}`);
      console.log(`   📂 Resources: ${result.metadata.resources?.length || 0}`);
    } else {
      console.log(`   ❌  Error: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Completed: ${successCount}/${totalCount} tests passed`);
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
