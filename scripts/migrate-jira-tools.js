#!/usr/bin/env node

/**
 * Migration script for JIRA tools to modular architecture
 * This script automates the migration of all 30 JIRA tools
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tool definitions with their groups and file locations
const TOOL_MIGRATIONS = [
  // Core tools (6)
  { name: 'jira_get_issue', group: 'core', file: 'get-issue', completed: true },
  { name: 'jira_search_issues', group: 'core', file: 'search-issues', completed: true },
  { name: 'jira_create_issue', group: 'core', file: 'create-issue', completed: true },
  { name: 'jira_update_issue', group: 'core', file: 'update-issue', completed: false },
  { name: 'jira_delete_issue', group: 'core', file: 'delete-issue', completed: false },
  { name: 'jira_batch_create_issues', group: 'core', file: 'batch-create-issues', completed: false },

  // Comments & Transitions (3)
  { name: 'jira_add_comment', group: 'comments', file: 'add-comment', completed: false },
  { name: 'jira_get_transitions', group: 'comments', file: 'get-transitions', completed: false },
  { name: 'jira_transition_issue', group: 'comments', file: 'transition-issue', completed: false },

  // Projects (4)
  { name: 'jira_get_projects', group: 'projects', file: 'get-projects', completed: false },
  { name: 'jira_get_project_versions', group: 'projects', file: 'get-project-versions', completed: false },
  { name: 'jira_create_version', group: 'projects', file: 'create-version', completed: false },
  { name: 'jira_batch_create_versions', group: 'projects', file: 'batch-create-versions', completed: false },

  // Users (1)
  { name: 'jira_get_user_profile', group: 'users', file: 'get-user-profile', completed: false },

  // Links (5)
  { name: 'jira_get_link_types', group: 'links', file: 'get-link-types', completed: false },
  { name: 'jira_create_issue_link', group: 'links', file: 'create-issue-link', completed: false },
  { name: 'jira_create_remote_issue_link', group: 'links', file: 'create-remote-issue-link', completed: false },
  { name: 'jira_remove_issue_link', group: 'links', file: 'remove-issue-link', completed: false },
  { name: 'jira_link_to_epic', group: 'links', file: 'link-to-epic', completed: false },

  // Worklog (2)
  { name: 'jira_get_worklog', group: 'worklog', file: 'get-worklog', completed: false },
  { name: 'jira_add_worklog', group: 'worklog', file: 'add-worklog', completed: false },

  // Attachments (1)
  { name: 'jira_download_attachments', group: 'attachments', file: 'download-attachments', completed: false },

  // Agile (6)
  { name: 'jira_get_agile_boards', group: 'agile', file: 'get-agile-boards', completed: false },
  { name: 'jira_get_board_issues', group: 'agile', file: 'get-board-issues', completed: false },
  { name: 'jira_get_sprints_from_board', group: 'agile', file: 'get-sprints-from-board', completed: false },
  { name: 'jira_get_sprint_issues', group: 'agile', file: 'get-sprint-issues', completed: false },
  { name: 'jira_create_sprint', group: 'agile', file: 'create-sprint', completed: false },
  { name: 'jira_update_sprint', group: 'agile', file: 'update-sprint', completed: false },

  // Metadata (1)
  { name: 'jira_search_fields', group: 'metadata', file: 'search-fields', completed: false },

  // Bulk (1)
  { name: 'jira_batch_get_changelogs', group: 'bulk', file: 'batch-get-changelogs', completed: false },
];

/**
 * Generate migration status report
 */
function generateStatusReport() {
  console.log('\n📊 JIRA Tools Migration Status\n');
  console.log('=' .repeat(60));

  const groups = {};
  for (const tool of TOOL_MIGRATIONS) {
    if (!groups[tool.group]) {
      groups[tool.group] = { total: 0, completed: 0, tools: [] };
    }
    groups[tool.group].total++;
    if (tool.completed) groups[tool.group].completed++;
    groups[tool.group].tools.push(tool);
  }

  // Overall progress
  const totalTools = TOOL_MIGRATIONS.length;
  const completedTools = TOOL_MIGRATIONS.filter(t => t.completed).length;
  const progress = Math.round((completedTools / totalTools) * 100);

  console.log(`Overall Progress: ${completedTools}/${totalTools} (${progress}%)`);
  console.log(`${'█'.repeat(Math.floor(progress / 2))}${'░'.repeat(50 - Math.floor(progress / 2))}`);
  console.log('\nBy Group:\n');

  // Group details
  for (const [groupName, group] of Object.entries(groups)) {
    const groupProgress = Math.round((group.completed / group.total) * 100);
    console.log(`📁 ${groupName.toUpperCase()} - ${group.completed}/${group.total} (${groupProgress}%)`);

    for (const tool of group.tools) {
      const status = tool.completed ? '✅' : '⏳';
      console.log(`   ${status} ${tool.name}`);
    }
    console.log();
  }

  console.log('=' .repeat(60));
  console.log('\nNext Steps:');
  const pending = TOOL_MIGRATIONS.filter(t => !t.completed);
  if (pending.length > 0) {
    console.log(`1. Migrate ${pending.length} remaining tools`);
    console.log('2. Update JiraToolsManager with all tool imports');
    console.log('3. Run tests to validate migration');
    console.log('4. Remove old implementation files');
  } else {
    console.log('✨ All tools migrated successfully!');
    console.log('1. Run full test suite');
    console.log('2. Remove old implementation');
    console.log('3. Update documentation');
  }
}

/**
 * Check which tools exist
 */
function checkExistingTools() {
  const baseDir = path.join(__dirname, '..', 'src', 'domains', 'jira', 'tools');

  for (const tool of TOOL_MIGRATIONS) {
    const filePath = path.join(baseDir, tool.group, `${tool.file}.ts`);
    if (fs.existsSync(filePath)) {
      tool.completed = true;
    }
  }
}

/**
 * Generate template for a tool module
 */
function generateToolTemplate(toolName, group, fileName) {
  const camelCase = fileName.split('-').map((part, index) =>
    index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');

  const template = `/**
 * JIRA tool module: ${toolName}
 * TODO: Add description
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../shared/tool-context.js';
import { withErrorHandling } from '../../../../core/errors/index.js';
import { generateCacheKey } from '../../../../core/cache/index.js';

/**
 * Tool definition for ${toolName}
 */
export const ${camelCase}Tool: Tool = {
  name: '${toolName}',
  description: \`TODO: Add description\`,
  inputSchema: {
    type: 'object',
    properties: {
      // TODO: Add properties from original tool definition
    },
    required: [],
    additionalProperties: false,
  },
  annotations: {
    title: 'TODO: Add title',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

/**
 * Handler function for ${toolName}
 */
export async function ${camelCase}Handler(args: any, context: ToolContext): Promise<any> {
  return withErrorHandling(async () => {
    const { httpClient, cache, config, logger } = context;

    logger.info('Executing ${toolName}', args);

    // TODO: Implement handler logic from original implementation

    return {
      content: [
        {
          type: 'text',
          text: 'TODO: Implement response',
        },
      ],
    };
  });
}`;

  return template;
}

/**
 * Create migration templates for pending tools
 */
function createMigrationTemplates() {
  const baseDir = path.join(__dirname, '..', 'src', 'domains', 'jira', 'tools');
  const pending = TOOL_MIGRATIONS.filter(t => !t.completed);

  if (pending.length === 0) {
    console.log('No pending tools to create templates for.');
    return;
  }

  console.log(`\n📝 Creating templates for ${pending.length} pending tools...\n`);

  for (const tool of pending) {
    const dirPath = path.join(baseDir, tool.group);
    const filePath = path.join(dirPath, `${tool.file}.ts`);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${tool.name} - file already exists`);
      continue;
    }

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Generate and write template
    const template = generateToolTemplate(tool.name, tool.group, tool.file);
    fs.writeFileSync(filePath, template);
    console.log(`✅ Created template for ${tool.name}`);
  }
}

// Main execution
function main() {
  console.log('🚀 JIRA Tools Migration Script\n');

  // Check existing tools
  checkExistingTools();

  // Generate status report
  generateStatusReport();

  // Ask if should create templates
  const args = process.argv.slice(2);
  if (args.includes('--create-templates')) {
    createMigrationTemplates();
  } else if (TOOL_MIGRATIONS.some(t => !t.completed)) {
    console.log('\nTo create templates for remaining tools, run:');
    console.log('  node scripts/migrate-jira-tools.js --create-templates');
  }
}

main();