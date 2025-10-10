#!/usr/bin/env node

/**
 * Automatic migration tool for individual JIRA tool
 * Extracts code from original files and populates the template
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract tool definition from tools.ts
 */
function extractToolDefinition(toolsContent, toolName) {
  // Find the tool definition
  const regex = new RegExp(`name: '${toolName}'[^}]*?annotations:[^}]*?}[^}]*?}`, 's');
  const match = toolsContent.match(regex);

  if (!match) {
    console.error(`Could not find tool definition for ${toolName}`);
    return null;
  }

  // Extract the full tool object
  let braceCount = 0;
  let startIndex = toolsContent.indexOf(match[0]);
  let endIndex = startIndex;
  let inString = false;
  let stringChar = null;

  // Move back to find the opening brace of the tool object
  while (startIndex > 0 && toolsContent[startIndex] !== '{') {
    startIndex--;
  }

  // Find the closing brace
  for (let i = startIndex; i < toolsContent.length; i++) {
    const char = toolsContent[i];
    const prevChar = i > 0 ? toolsContent[i - 1] : '';

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    // Count braces only outside strings
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  return toolsContent.substring(startIndex, endIndex);
}

/**
 * Extract handler implementation from tools.ts
 */
function extractHandlerImplementation(toolsContent, toolName) {
  // Map tool name to handler method name
  const methodName = toolName.replace('jira_', '').split('_').map((part, index) =>
    index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');

  // Find the private method
  const methodRegex = new RegExp(`private async ${methodName}\\s*\\([^)]*\\)[^{]*{`, 's');
  const methodMatch = toolsContent.match(methodRegex);

  if (!methodMatch) {
    console.error(`Could not find handler method for ${toolName}`);
    return null;
  }

  // Extract the full method
  let braceCount = 0;
  let startIndex = toolsContent.indexOf(methodMatch[0]);
  let endIndex = startIndex + methodMatch[0].length;
  braceCount = 1; // We're already inside the first brace

  for (let i = endIndex; i < toolsContent.length; i++) {
    const char = toolsContent[i];
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  // Get the method body only (without the signature)
  const fullMethod = toolsContent.substring(startIndex, endIndex);
  const bodyStart = fullMethod.indexOf('{') + 1;
  const bodyEnd = fullMethod.lastIndexOf('}');
  return fullMethod.substring(bodyStart, bodyEnd);
}

/**
 * Extract client method if exists
 */
function extractClientMethod(clientContent, methodName) {
  const methodRegex = new RegExp(`async ${methodName}\\([^)]*\\)[^{]*{`, 's');
  const methodMatch = clientContent.match(methodRegex);

  if (!methodMatch) {
    return null;
  }

  // Extract the full method
  let braceCount = 0;
  let startIndex = clientContent.indexOf(methodMatch[0]);
  let endIndex = startIndex + methodMatch[0].length;
  braceCount = 1;

  for (let i = endIndex; i < clientContent.length; i++) {
    const char = clientContent[i];
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  return clientContent.substring(startIndex, endIndex);
}

/**
 * Generate the migrated tool module
 */
function generateMigratedModule(toolName, toolDef, handlerBody, clientMethod) {
  const fileName = toolName.replace('jira_', '').replace(/_/g, '-');
  const camelCase = fileName.split('-').map((part, index) =>
    index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');

  // Clean up the tool definition
  let cleanedToolDef = toolDef
    .replace(/^\s*{\s*/, '')  // Remove opening brace
    .replace(/\s*}\s*$/, '')  // Remove closing brace
    .replace(/,\s*$/, '');    // Remove trailing comma

  // Clean up the handler body
  let cleanedHandler = handlerBody
    .replace(/this\.client\./g, '')  // Remove this.client.
    .replace(/this\./g, 'context.')  // Replace this. with context.
    .replace(/headers\??: Record<string, string>/g, '') // Remove headers parameter
    .replace(/, headers\)/g, ')')  // Remove headers from calls
    .trim();

  // If there's a client method, we need to inline it
  if (clientMethod && !cleanedHandler.includes('httpClient')) {
    // Extract the client method name
    const clientMethodName = clientMethod.match(/async (\w+)/)?.[1];
    if (clientMethodName) {
      // Replace calls to client method with inline implementation
      const clientBody = clientMethod
        .substring(clientMethod.indexOf('{') + 1, clientMethod.lastIndexOf('}'))
        .replace(/this\.makeRequest/g, 'httpClient.request')
        .replace(/this\./g, '')
        .trim();

      // For simple client calls, inline the HTTP request
      if (clientBody.includes('httpClient') || clientBody.includes('makeRequest')) {
        cleanedHandler = cleanedHandler.replace(
          new RegExp(`await ${clientMethodName}\\([^)]*\\)`, 'g'),
          `await (async () => {
            ${clientBody}
          })()`
        );
      }
    }
  }

  const template = `/**
 * JIRA tool module: ${toolName.replace('jira_', '').replace(/_/g, ' ')}
 * Auto-migrated from original implementation
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling, ValidationError, NotFoundError, ToolExecutionError } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for ${toolName}
 */
export const ${camelCase}Tool: Tool = {
  ${cleanedToolDef}
};

/**
 * Handler function for ${toolName}
 */
export async function ${camelCase}Handler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, config, logger, normalizeToArray, invalidateIssueCache, formatDescription } = context;

    ${cleanedHandler}
  });
}`;

  return template;
}

/**
 * Migrate a single tool
 */
async function migrateTool(toolName, group, fileName) {
  console.log(`\n🔄 Migrating ${toolName}...`);

  const srcDir = path.join(__dirname, '..', 'src', 'domains', 'jira');
  const toolsPath = path.join(srcDir, 'tools.ts');
  const clientPath = path.join(srcDir, 'client.ts');
  const outputPath = path.join(srcDir, 'tools', group, `${fileName}.ts`);

  // Check if already migrated properly
  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath, 'utf-8');
    if (!content.includes('TODO')) {
      console.log(`✅ Already migrated: ${toolName}`);
      return true;
    }
  }

  try {
    // Read source files
    const toolsContent = fs.readFileSync(toolsPath, 'utf-8');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');

    // Extract components
    const toolDef = extractToolDefinition(toolsContent, toolName);
    if (!toolDef) {
      console.error(`❌ Failed to extract tool definition for ${toolName}`);
      return false;
    }

    const handlerBody = extractHandlerImplementation(toolsContent, toolName);
    if (!handlerBody) {
      console.error(`❌ Failed to extract handler for ${toolName}`);
      return false;
    }

    // Try to find related client method
    const methodName = toolName.replace('jira_', '').split('_').map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
    const clientMethod = extractClientMethod(clientContent, methodName);

    // Generate the migrated module
    const migratedCode = generateMigratedModule(toolName, toolDef, handlerBody, clientMethod);

    // Write the file
    fs.writeFileSync(outputPath, migratedCode);
    console.log(`✅ Migrated ${toolName} to ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`❌ Error migrating ${toolName}:`, error.message);
    return false;
  }
}

// Get tool to migrate from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/auto-migrate-tool.js <tool-name>');
  console.log('Example: node scripts/auto-migrate-tool.js jira_update_issue');
  process.exit(1);
}

const toolName = args[0];

// Find tool info
const TOOL_INFO = {
  'jira_update_issue': { group: 'core', file: 'update-issue' },
  'jira_delete_issue': { group: 'core', file: 'delete-issue' },
  'jira_batch_create_issues': { group: 'core', file: 'batch-create-issues' },
  'jira_add_comment': { group: 'comments', file: 'add-comment' },
  'jira_get_transitions': { group: 'comments', file: 'get-transitions' },
  'jira_transition_issue': { group: 'comments', file: 'transition-issue' },
  'jira_get_projects': { group: 'projects', file: 'get-projects' },
  // Add more as needed
};

const toolInfo = TOOL_INFO[toolName];
if (!toolInfo) {
  console.error(`Unknown tool: ${toolName}`);
  process.exit(1);
}

migrateTool(toolName, toolInfo.group, toolInfo.file);