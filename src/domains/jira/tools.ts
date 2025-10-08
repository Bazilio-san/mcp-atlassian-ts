/**
 * JIRA MCP tools implementation
 */

import { withErrorHandling, ToolExecutionError } from '../../core/errors/index.js';
import { createLogger } from '../../core/utils/logger.js';

import { JiraClient } from './client.js';

import type { JCConfig } from '../../types/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const logger = createLogger('jira-tools');

/**
 * JIRA tools manager
 */
export class JiraToolsManager {
  private client: JiraClient;
  private config: JCConfig;

  constructor(config: JCConfig) {
    this.config = config;
    this.client = new JiraClient(config);
  }

  /**
   * Initialize the tools manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing JIRA tools manager');
    // Any async initialization can go here
  }

  /**
   * Normalize string or array parameter to array
   * Allows flexible input: single string or array of strings
   */
  private normalizeToArray(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  /**
   * Get all available JIRA tools
   */
  getAvailableTools(): Tool[] {
    return [
      // Issue management
      {
        name: 'jira_get_issue', // TODO расширить функционал
        description: `Get detailed information about a JIRA issue by key or ID`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { // TODO замениь на issueIdOrKey
              type: 'string',
              description: `
Issue id or key can be used to uniquely identify an existing issue.
Issue id is a numerical identifier (e.g. 123).
Issue key is formatted as <project key>-<id> (e.g. ISSUE-123).
An example issue key is ISSUE-1.`,
            },
            expand: {
              type: 'array',
              items: {type: 'string'},
              description: `Additional fields to expand. e.g.: ["changelog", "transitions"]`,
              default: [],
            },
            fields: {
              type: 'array',
              items: {type: 'string'},
              description: `Specific fields to return. e.g.: ["summary", "status", "assignee"]`,
              default: [],
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve JIRA issue',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_search_issues',
        description: `Search for JIRA issues using JQL (JIRA Query Language)`,
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: `JQL query string (e.g., "project = PROJ AND status = Open")`,
            },
            startAt: {
              type: 'number',
              description: `Starting index for results`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum number of results to return`,
              default: 50,
            },
            fields: {
              type: 'array',
              items: {type: 'string'},
              description: `Specific fields to return. e.g.: ["summary", "status", "assignee"]`,
            },
            expand: {
              type: 'array',
              items: {type: 'string'},
              description: `Additional fields to expand. e.g.: ["changelog", "transitions"]`,
              default: [],
            },
          },
          required: ['jql'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Search JIRA issues using JQL',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_create_issue',
        description: `Create a new JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: `Project key or ID`,
            },
            issueType: {
              type: 'string',
              description: `Issue type name or ID (e.g., "Task", "Bug", "Story")`,
            },
            summary: {
              type: 'string',
              description: `Issue summary/title`,
            },
            description: {
              type: 'string',
              description: `Issue description`,
            },
            assignee: {
              type: 'string',
              description: `Assignee account ID or email`,
            },
            priority: {
              type: 'string',
              description: `Priority name or ID`,
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: `Labels to add to the issue (e.g.: ["bug", "urgent"])`,
              default: [],
            },
            components: {
              type: 'array',
              items: { type: 'string' },
              description: `Component names or IDs, e.g.: ["Backend", "API"]`,
              default: [],
            },
            customFields: {
              type: 'object',
              description: `Custom field values (field ID as key)`,
              additionalProperties: true,
            },
          },
          required: ['project', 'issueType', 'summary'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create new JIRA issue',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_update_issue',
        description: `Update an existing JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123) or ID`,
            },
            summary: {
              type: 'string',
              description: `Updated summary/title`,
            },
            description: {
              type: 'string',
              description: `Updated description`,
            },
            assignee: {
              type: 'string',
              description: `New assignee account ID or email`,
            },
            priority: {
              type: 'string',
              description: `New priority name or ID`,
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: `Labels to set (replaces existing). e.g.: ["bug", "urgent"]`,
              default: [],
            },
            customFields: {
              type: 'object',
              description: `Custom field values to update`,
              additionalProperties: true,
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Update existing JIRA issue',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_add_comment',
        description: `Add a comment to a JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123) or ID`,
            },
            body: {
              type: 'string',
              description: `Comment text`,
            },
            visibility: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['group', 'role'],
                },
                value: {
                  type: 'string',
                  description: `Group name or role name`,
                },
              },
              description: `Comment visibility restrictions`,
            },
          },
          required: ['issueKey', 'body'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Add comment to JIRA issue',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_get_transitions',
        description: `Get available transitions for a JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123) or ID`,
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve available JIRA issue transitions',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_transition_issue',
        description: `Transition a JIRA issue to a new status`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123) or ID`,
            },
            transitionId: {
              type: 'string',
              description: `Transition ID to execute`,
            },
            comment: {
              type: 'string',
              description: `Optional comment to add with the transition`,
            },
            fields: {
              type: 'object',
              description: `Field values required for the transition`,
              additionalProperties: true,
            },
          },
          required: ['issueKey', 'transitionId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Transition JIRA issue to new status',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      {
        name: 'jira_get_projects',
        description: `Get all JIRA projects accessible to the user`,
        inputSchema: {
          type: 'object',
          properties: {
            expand: {
              type: 'array',
              items: { type: 'string' },
              description: 'Additional fields to expand',
              default: [],
            },
            recent: {
              type: 'number',
              description: `Number of recent projects to return`,
            },
          },
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve all JIRA projects',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === User Management ===
      {
        name: 'jira_get_user_profile',
        description: `Get detailed user profile information by account ID or email`,
        inputSchema: {
          type: 'object',
          properties: {
            userIdOrEmail: {
              type: 'string',
              description: `User account ID or email address`,
            },
          },
          required: ['userIdOrEmail'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve JIRA user profile',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === Issue Management Extended ===
      {
        name: 'jira_delete_issue',
        description: `Delete a JIRA issue permanently`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123) or ID`,
            },
            deleteSubtasks: {
              type: 'boolean',
              description: `Whether to delete subtasks as well`,
              default: false,
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Delete JIRA issue permanently',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_batch_create_issues',
        description: `Create multiple JIRA issues in a single request`,
        inputSchema: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  project: { type: 'string' },
                  issueType: { type: 'string' },
                  summary: { type: 'string' },
                  description: { type: 'string' },
                  assignee: { type: 'string' },
                  priority: { type: 'string' },
                  labels: { type: 'array', items: { type: 'string' } },
                  customFields: { type: 'object' },
                },
                required: ['project', 'issueType', 'summary'],
              },
              description: `Array of issues to create`,
            },
          },
          required: ['issues'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create multiple JIRA issues in batch',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      // === Fields and Metadata ===
      {
        name: 'jira_search_fields',
        description: `Search for JIRA fields (including custom fields)`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: `Search query to filter fields by name or key`,
            },
          },
          additionalProperties: false,
        },
        annotations: {
          title: 'Search JIRA fields including custom fields',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === Project Versions ===
      {
        name: 'jira_get_project_versions',
        description: `Get all versions for a JIRA project`,
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: `Project key or ID`,
            },
          },
          required: ['projectKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve JIRA project versions',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_create_version',
        description: `Create a new version in a JIRA project`,
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: `Project ID`,
            },
            name: {
              type: 'string',
              description: `Version name`,
            },
            description: {
              type: 'string',
              description: `Version description`,
            },
            releaseDate: {
              type: 'string',
              description: `Release date (YYYY-MM-DD)`,
            },
            startDate: {
              type: 'string',
              description: `Start date (YYYY-MM-DD)`,
            },
            archived: {
              type: 'boolean',
              description: `Whether version is archived`,
              default: false,
            },
            released: {
              type: 'boolean',
              description: `Whether version is released`,
              default: false,
            },
          },
          required: ['projectId', 'name'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create new JIRA project version',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_batch_create_versions',
        description: `Create multiple versions in JIRA projects`,
        inputSchema: {
          type: 'object',
          properties: {
            versions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  projectId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  releaseDate: { type: 'string' },
                  startDate: { type: 'string' },
                },
                required: ['projectId', 'name'],
              },
              description: `Array of versions to create`,
            },
          },
          required: ['versions'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create multiple JIRA versions in batch',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      // === Issue Links ===
      {
        name: 'jira_get_link_types',
        description: `Get all available JIRA issue link types`,
        inputSchema: {
          type: 'object',
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve all JIRA issue link types',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_create_issue_link',
        description: `Create a link between two JIRA issues`,
        inputSchema: {
          type: 'object',
          properties: {
            linkType: {
              type: 'string',
              description: `Link type name (e.g., "Blocks", "Relates")`,
            },
            inwardIssue: {
              type: 'string',
              description: `Key of the inward issue`,
            },
            outwardIssue: {
              type: 'string',
              description: `Key of the outward issue`,
            },
            comment: {
              type: 'string',
              description: `Optional comment for the link`,
            },
          },
          required: ['linkType', 'inwardIssue', 'outwardIssue'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create link between two JIRA issues',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_create_remote_issue_link',
        description: `Create a remote link from a JIRA issue to external URL`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123)`,
            },
            url: {
              type: 'string',
              description: `External URL to link to`,
            },
            title: {
              type: 'string',
              description: `Link title`,
            },
            summary: {
              type: 'string',
              description: `Link summary`,
            },
            iconUrl: {
              type: 'string',
              description: `URL to link icon`,
            },
          },
          required: ['issueKey', 'url', 'title'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create remote link to external URL',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_remove_issue_link',
        description: `Remove a link between JIRA issues`,
        inputSchema: {
          type: 'object',
          properties: {
            linkId: {
              type: 'string',
              description: `Link ID to remove`,
            },
          },
          required: ['linkId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Remove link between JIRA issues',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === Epics ===
      {
        name: 'jira_link_to_epic',
        description: `Link a JIRA issue to an epic`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `Issue key to link to epic`,
            },
            epicKey: {
              type: 'string',
              description: `Epic issue key`,
            },
          },
          required: ['issueKey', 'epicKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Link JIRA issue to epic',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      // === Worklog ===
      {
        name: 'jira_get_worklog',
        description: `Get worklog entries for a JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123)`,
            },
            startAt: {
              type: 'number',
              description: `Starting index`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum results to return`,
              default: 50,
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve JIRA issue worklog entries',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_add_worklog',
        description: `Add a worklog entry to a JIRA issue`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123)`,
            },
            timeSpent: {
              type: 'string',
              description: `Time spent (e.g., "1h 30m", "2d 4h")`,
            },
            comment: {
              type: 'string',
              description: `Worklog comment`,
            },
            started: {
              type: 'string',
              description: `When work started (ISO format)`,
            },
            visibility: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['group', 'role'],
                },
                value: {
                  type: 'string',
                },
              },
              description: `Worklog visibility restrictions`,
            },
          },
          required: ['issueKey', 'timeSpent'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Add worklog entry to JIRA issue',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      // === Attachments ===
      {
        name: 'jira_download_attachments',
        description: `Get metadata and download links for JIRA issue attachments`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: `The issue key (e.g., PROJ-123)`,
            },
          },
          required: ['issueKey'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve JIRA issue attachments metadata',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === Agile ===
      {
        name: 'jira_get_agile_boards',
        description: `Get all agile boards (Scrum/Kanban)`,
        inputSchema: {
          type: 'object',
          properties: {
            startAt: {
              type: 'number',
              description: `Starting index`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum results`,
              default: 50,
            },
            type: {
              type: 'string',
              description: `Board type filter`,
            },
            name: {
              type: 'string',
              description: `Board name filter`,
            },
            projectKeyOrId: {
              type: 'string',
              description: `Filter by project`,
            },
          },
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve all agile boards',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_get_board_issues',
        description: `Get issues from an agile board`,
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: `Board ID`,
            },
            startAt: {
              type: 'number',
              description: `Starting index`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum results`,
              default: 50,
            },
            jql: {
              type: 'string',
              description: `Additional JQL filter`,
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to include',
            },
          },
          required: ['boardId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve issues from agile board',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_get_sprints_from_board',
        description: `Get sprints from an agile board`,
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: `Board ID`,
            },
            startAt: {
              type: 'number',
              description: `Starting index`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum results`,
              default: 50,
            },
            state: {
              type: 'string',
              enum: ['active', 'closed', 'future'],
              description: `Sprint state filter`,
            },
          },
          required: ['boardId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve sprints from agile board',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_get_sprint_issues',
        description: `Get issues from a specific sprint`,
        inputSchema: {
          type: 'object',
          properties: {
            sprintId: {
              type: 'string',
              description: `Sprint ID`,
            },
            startAt: {
              type: 'number',
              description: `Starting index`,
              default: 0,
            },
            maxResults: {
              type: 'number',
              description: `Maximum results`,
              default: 50,
            },
            jql: {
              type: 'string',
              description: `Additional JQL filter`,
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Fields to include',
            },
          },
          required: ['sprintId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve issues from specific sprint',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_create_sprint',
        description: `Create a new sprint on an agile board`,
        inputSchema: {
          type: 'object',
          properties: {
            boardId: {
              type: 'string',
              description: `Board ID where sprint will be created`,
            },
            name: {
              type: 'string',
              description: `Sprint name`,
            },
            goal: {
              type: 'string',
              description: `Sprint goal`,
            },
            startDate: {
              type: 'string',
              description: `Sprint start date (ISO format)`,
            },
            endDate: {
              type: 'string',
              description: `Sprint end date (ISO format)`,
            },
          },
          required: ['boardId', 'name'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Create new sprint on agile board',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },

      {
        name: 'jira_update_sprint',
        description: `Update an existing sprint`,
        inputSchema: {
          type: 'object',
          properties: {
            sprintId: {
              type: 'string',
              description: `Sprint ID to update`,
            },
            name: {
              type: 'string',
              description: `New sprint name`,
            },
            goal: {
              type: 'string',
              description: `New sprint goal`,
            },
            state: {
              type: 'string',
              enum: ['active', 'closed', 'future'],
              description: `Sprint state`,
            },
            startDate: {
              type: 'string',
              description: `Sprint start date (ISO format)`,
            },
            endDate: {
              type: 'string',
              description: `Sprint end date (ISO format)`,
            },
          },
          required: ['sprintId'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Update existing sprint',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },

      // === Bulk Operations ===
      {
        name: 'jira_batch_get_changelogs',
        description: `Get changelogs for multiple issues (Cloud only)`,
        inputSchema: {
          type: 'object',
          properties: {
            issueKeys: {
              type: 'array',
              items: { type: 'string' },
              description: `Array of issue keys`,
            },
          },
          required: ['issueKeys'],
          additionalProperties: false,
        },
        annotations: {
          title: 'Retrieve changelogs for multiple issues',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
    ];
  }

  /**
   * Execute a JIRA tool
   */
  async executeTool(toolName: string, args: Record<string, any>, customHeaders?: Record<string, string>): Promise<any> {
    return withErrorHandling(async () => {
      logger.info('Executing JIRA tool', { toolName, hasCustomHeaders: !!customHeaders });

      // Set custom headers in the client if provided
      if (customHeaders && Object.keys(customHeaders).length > 0) {
        this.client.setCustomHeaders(customHeaders);
      }

      switch (toolName) {
        // Basic operations
        case 'jira_get_issue':
          return this.getIssue(args);
        case 'jira_search_issues':
          return this.searchIssues(args);
        case 'jira_create_issue':
          return this.createIssue(args);
        case 'jira_update_issue':
          return this.updateIssue(args);
        case 'jira_delete_issue':
          return this.deleteIssue(args);
        case 'jira_batch_create_issues':
          return this.batchCreateIssues(args);
        case 'jira_add_comment':
          return this.addComment(args);
        case 'jira_get_transitions':
          return this.getTransitions(args);
        case 'jira_transition_issue':
          return this.transitionIssue(args);
        case 'jira_get_projects':
          return this.getProjects(args);

        // User management
        case 'jira_get_user_profile':
          return this.getUserProfile(args);

        // Fields and metadata
        case 'jira_search_fields':
          return this.searchFields(args);

        // Project versions
        case 'jira_get_project_versions':
          return this.getProjectVersions(args);
        case 'jira_create_version':
          return this.createVersion(args);
        case 'jira_batch_create_versions':
          return this.batchCreateVersions(args);

        // Issue links
        case 'jira_get_link_types':
          return this.getLinkTypes();
        case 'jira_create_issue_link':
          return this.createIssueLink(args);
        case 'jira_create_remote_issue_link':
          return this.createRemoteIssueLink(args);
        case 'jira_remove_issue_link':
          return this.removeIssueLink(args);
        case 'jira_link_to_epic':
          return this.linkToEpic(args);

        // Worklog
        case 'jira_get_worklog':
          return this.getWorklog(args);
        case 'jira_add_worklog':
          return this.addWorklog(args);

        // Attachments
        case 'jira_download_attachments':
          return this.downloadAttachments(args);

        // Agile
        case 'jira_get_agile_boards':
          return this.getAgileBoards(args);
        case 'jira_get_board_issues':
          return this.getBoardIssues(args);
        case 'jira_get_sprints_from_board':
          return this.getSprintsFromBoard(args);
        case 'jira_get_sprint_issues':
          return this.getSprintIssues(args);
        case 'jira_create_sprint':
          return this.createSprint(args);
        case 'jira_update_sprint':
          return this.updateSprint(args);

        // Bulk operations
        case 'jira_batch_get_changelogs':
          return this.batchGetChangelogs(args);

        default:
          throw new ToolExecutionError(toolName, `Unknown JIRA tool: ${toolName}`);
      }
    });
  }

  /**
   * Health check for JIRA connectivity
   */
  async healthCheck(): Promise<any> {
    return this.client.healthCheck();
  }

  // === Tool Implementations ===

  private async getIssue(args: any) {
    const { issueKey, expand = [], fields } = args;

    const options: any = {
      expand: this.normalizeToArray(expand)
    };
    if (fields) {
      options.fields = this.normalizeToArray(fields);
    }

    const issue = await this.client.getIssue(issueKey, options);

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue: ${issue.key}**\n\n` +
            `**Summary:** ${issue.fields.summary}\n` +
            `**Status:** ${issue.fields.status.name}\n` +
            `**Assignee:** ${issue.fields.assignee?.displayName || 'Unassigned'}\n` +
            `**Reporter:** ${issue.fields.reporter.displayName}\n` +
            `**Created:** ${new Date(issue.fields.created).toLocaleString()}\n` +
            `**Updated:** ${new Date(issue.fields.updated).toLocaleString()}\n` +
            `**Priority:** ${issue.fields.priority?.name || 'None'}\n` +
            `**Issue Type:** ${issue.fields.issuetype.name}\n` +
            `**Project:** ${issue.fields.project.name} (${issue.fields.project.key})\n${
              issue.fields.labels?.length ? `**Labels:** ${issue.fields.labels.join(', ')}\n` : ''
            }${
              issue.fields.description
                ? `\n**Description:**\n${this.formatDescription(issue.fields.description)}\n`
                : ''
            }\n**Direct Link:** ${this.config.url}/browse/${issue.key}`,
        },
      ],
    };
  }

  private async searchIssues(args: any) {
    const { jql, startAt = 0, maxResults = 50, fields, expand } = args;

    const searchRequest: any = {
      jql,
      startAt,
      maxResults,
      expand: this.normalizeToArray(expand),
    };
    if (fields) {
      searchRequest.fields = this.normalizeToArray(fields);
    }

    const searchResult = await this.client.searchIssues(searchRequest);

    if (searchResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No issues found for JQL: ${jql}`,
          },
        ],
      };
    }

    const issuesList = searchResult.issues
      .map(issue => `• **${issue.key}**: ${issue.fields.summary} (${issue.fields.status.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Search Results**\n\n` +
            `**JQL:** ${jql}\n` +
            `**Found:** ${searchResult.total} issues (showing ${searchResult.issues.length})\n\n` +
            `${issuesList}\n\n` +
            `**Search URL:** ${this.config.url}/issues/?jql=${encodeURIComponent(jql)}`,
        },
      ],
    };
  }

  private async createIssue(args: any) {
    const {
      project,
      issueType,
      summary,
      description,
      assignee,
      priority,
      labels,
      components,
      customFields = {},
    } = args;

    // Normalize labels and components
    const normalizedLabels = this.normalizeToArray(labels);
    const normalizedComponents = this.normalizeToArray(components);

    // Build the issue input
    const issueInput: any = {
      fields: {
        project: { key: project },
        issuetype: { name: issueType },
        summary,
        ...customFields,
      },
    };

    if (description) issueInput.fields.description = description;
    if (assignee) issueInput.fields.assignee = { accountId: assignee };
    if (priority) issueInput.fields.priority = { name: priority };
    if (normalizedLabels.length > 0) issueInput.fields.labels = normalizedLabels;
    if (normalizedComponents.length > 0)
      issueInput.fields.components = normalizedComponents.map((c: string) => ({ name: c }));

    const createdIssue = await this.client.createIssue(issueInput);

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Created Successfully**\n\n` +
            `**Key:** ${createdIssue.key}\n` +
            `**Summary:** ${summary}\n` +
            `**Project:** ${project}\n` +
            `**Issue Type:** ${issueType}\n` +
            `\n**Direct Link:** ${this.config.url}/browse/${createdIssue.key}`,
        },
      ],
    };
  }

  private async updateIssue(args: any) {
    const { issueKey, summary, description, assignee, priority, labels, customFields = {} } = args;

    const updateData: any = { fields: { ...customFields } };

    if (summary) updateData.fields.summary = summary;
    if (description) updateData.fields.description = description;
    if (assignee) updateData.fields.assignee = { accountId: assignee };
    if (priority) updateData.fields.priority = { name: priority };
    if (labels) updateData.fields.labels = this.normalizeToArray(labels);

    await this.client.updateIssue(issueKey, updateData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Updated Successfully**\n\n` +
            `**Key:** ${issueKey}\n` +
            `Updated fields: ${Object.keys(updateData.fields).join(', ')}\n` +
            `\n**Direct Link:** ${this.config.url}/browse/${issueKey}`,
        },
      ],
    };
  }

  private async addComment(args: any) {
    const { issueKey, body, visibility } = args;

    const commentInput: any = { body };
    if (visibility) commentInput.visibility = visibility;

    const comment = await this.client.addComment(issueKey, commentInput);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Comment Added Successfully**\n\n` +
            `**Issue:** ${issueKey}\n` +
            `**Author:** ${comment.author.displayName}\n` +
            `**Created:** ${new Date(comment.created).toLocaleString()}\n` +
            `**Comment:** ${body}\n` +
            `\n**Direct Link:** ${this.config.url}/browse/${issueKey}`,
        },
      ],
    };
  }

  private async getTransitions(args: any) {
    const { issueKey } = args;

    const transitions = await this.client.getTransitions(issueKey);

    if (transitions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No transitions available for issue ${issueKey}**`,
          },
        ],
      };
    }

    const transitionsList = transitions
      .map(t => `• **${t.name}** (ID: ${t.id}) → ${t.to.name}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Available Transitions for ${issueKey}**\n\n${transitionsList}`,
        },
      ],
    };
  }

  private async transitionIssue(args: any) {
    const { issueKey, transitionId, comment, fields = {} } = args;

    const transitionData: any = { id: transitionId, fields };
    if (comment) transitionData.comment = { body: comment };

    await this.client.transitionIssue(issueKey, transitionData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Issue Transitioned Successfully**\n\n` +
            `**Issue:** ${issueKey}\n` +
            `**Transition ID:** ${transitionId}\n${
              comment ? `**Comment:** ${comment}\n` : ''
            }\n**Direct Link:** ${this.config.url}/browse/${issueKey}`,
        },
      ],
    };
  }

  private async getProjects(args: any) {
    const { expand, recent } = args;

    const projects = await this.client.getProjects({
      expand: this.normalizeToArray(expand),
      recent
    });

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No JIRA projects found**`,
          },
        ],
      };
    }

    const projectsList = projects
      .map(p => `• **${p.name}** (${p.key}) - ${p.projectTypeKey}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**JIRA Projects (${projects.length} found)**\n\n${projectsList}`,
        },
      ],
    };
  }

  // === Extended Tool Implementations ===

  private async getUserProfile(args: any) {
    const { userIdOrEmail } = args;

    const user = await this.client.getUserProfile(userIdOrEmail);

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA User Profile**\n\n` +
            `**Display Name:** ${user.displayName}\n` +
            `**Account ID:** ${user.accountId}\n` +
            `**Email:** ${user.emailAddress || 'Not available'}\n` +
            `**Active:** ${user.active ? 'Yes' : 'No'}\n` +
            `**Time Zone:** ${user.timeZone || 'Not set'}\n${
              user.avatarUrls ? `**Avatar:** ${user.avatarUrls['48x48']}\n` : ''
            }`,
        },
      ],
    };
  }

  private async deleteIssue(args: any) {
    const { issueKey, deleteSubtasks = false } = args;

    await this.client.deleteIssue(issueKey, deleteSubtasks);

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Issue Deleted Successfully**\n\n` +
            `**Key:** ${issueKey}\n` +
            `**Subtasks Deleted:** ${deleteSubtasks ? 'Yes' : 'No'}`,
        },
      ],
    };
  }

  private async batchCreateIssues(args: any) {
    const { issues } = args;

    // Convert to the format expected by the client
    const issueInputs = issues.map((issue: any) => ({
      fields: {
        project: { key: issue.project },
        issuetype: { name: issue.issueType },
        summary: issue.summary,
        description: issue.description,
        assignee: issue.assignee ? { accountId: issue.assignee } : undefined,
        priority: issue.priority ? { name: issue.priority } : undefined,
        labels: issue.labels || [],
        components: issue.components?.map((c: string) => ({ name: c })) || [],
        ...issue.customFields,
      },
    }));

    const result = await this.client.batchCreateIssues(issueInputs);

    const successCount = result.issues?.length || 0;
    const errorCount = result.errors?.length || 0;

    let resultText =
      `**Batch Issue Creation Results**\n\n` +
      `**Total Issues:** ${issues.length}\n` +
      `**Successfully Created:** ${successCount}\n` +
      `**Errors:** ${errorCount}\n\n`;

    if (result.issues?.length > 0) {
      resultText += `**Created Issues:**\n`;
      result.issues.forEach((issue: any) => {
        resultText += `• **${issue.key}**: ${issue.summary || 'No summary'}\n`;
      });
    }

    if (result.errors?.length > 0) {
      resultText += `\n**Errors:**\n`;
      result.errors.forEach((error: any, index: number) => {
        resultText += `• Issue ${index + 1}: ${error.elementErrors?.errorMessages?.[0] || error.status}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  private async searchFields(args: any) {
    const { query } = args;

    const fields = await this.client.searchFields(query);

    if (fields.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: query ? `No fields found matching "${query}"` : 'No fields found',
          },
        ],
      };
    }

    const fieldsList = fields
      .map(field => `• **${field.name}** (${field.key}) - ${field.schema?.type || 'unknown type'}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**JIRA Fields ${query ? `matching "${query}"` : ''}**\n\n` +
            `**Found:** ${fields.length} fields\n\n${fieldsList}`,
        },
      ],
    };
  }

  private async getProjectVersions(args: any) {
    const { projectKey } = args;

    const versions = await this.client.getProjectVersions(projectKey);

    if (versions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No versions found for project ${projectKey}**`,
          },
        ],
      };
    }

    const versionsList = versions
      .map(
        v =>
          `• **${v.name}** ${v.released ? '(Released)' : '(Unreleased)'} ${v.archived ? '[Archived]' : ''}`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Project Versions for ${projectKey}**\n\n${versionsList}`,
        },
      ],
    };
  }

  private async createVersion(args: any) {
    const versionData = args;

    const version = await this.client.createVersion(versionData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Version Created Successfully**\n\n` +
            `**Name:** ${version.name}\n` +
            `**ID:** ${version.id}\n` +
            `**Project:** ${versionData.projectId}\n${
              versionData.description ? `**Description:** ${versionData.description}\n` : ''
            }${versionData.releaseDate ? `**Release Date:** ${versionData.releaseDate}\n` : ''}`,
        },
      ],
    };
  }

  private async batchCreateVersions(args: any) {
    const { versions } = args;

    const results = await this.client.batchCreateVersions(versions);

    const successResults = results.filter(r => !r.error);
    const errorResults = results.filter(r => r.error);

    let resultText =
      `**Batch Version Creation Results**\n\n` +
      `**Total Versions:** ${versions.length}\n` +
      `**Successfully Created:** ${successResults.length}\n` +
      `**Errors:** ${errorResults.length}\n\n`;

    if (successResults.length > 0) {
      resultText += `**Created Versions:**\n`;
      successResults.forEach(version => {
        resultText += `• **${version.name}** (ID: ${version.id})\n`;
      });
    }

    if (errorResults.length > 0) {
      resultText += `\n**Errors:**\n`;
      errorResults.forEach(error => {
        resultText += `• **${error.version}**: ${error.error}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  private async getLinkTypes() {
    const linkTypes = await this.client.getLinkTypes();

    if (linkTypes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issue link types found**`,
          },
        ],
      };
    }

    const linkTypesList = linkTypes
      .map(lt => `• **${lt.name}**: ${lt.inward} ↔ ${lt.outward}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `**Available Issue Link Types**\n\n${linkTypesList}`,
        },
      ],
    };
  }

  private async createIssueLink(args: any) {
    const { linkType, inwardIssue, outwardIssue, comment } = args;

    const linkData: any = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    };

    if (comment) {
      linkData.comment = { body: comment };
    }

    await this.client.createIssueLink(linkData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Issue Link Created Successfully**\n\n` +
            `**Link Type:** ${linkType}\n` +
            `**From:** ${inwardIssue}\n` +
            `**To:** ${outwardIssue}\n${comment ? `**Comment:** ${comment}\n` : ''}`,
        },
      ],
    };
  }

  private async createRemoteIssueLink(args: any) {
    const { issueKey, url, title, summary, iconUrl } = args;

    const linkData: any = { url, title };
    if (summary) linkData.summary = summary;
    if (iconUrl) linkData.icon = { url16x16: iconUrl, title };

    const link = await this.client.createRemoteIssueLink(issueKey, linkData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Remote Issue Link Created Successfully**\n\n` +
            `**Issue:** ${issueKey}\n` +
            `**Link Title:** ${title}\n` +
            `**URL:** ${url}\n` +
            `**Link ID:** ${link.id}\n` +
            `\n**Direct Link:** ${this.config.url}/browse/${issueKey}`,
        },
      ],
    };
  }

  private async removeIssueLink(args: any) {
    const { linkId } = args;

    await this.client.removeIssueLink(linkId);

    return {
      content: [
        {
          type: 'text',
          text: `**Issue Link Removed Successfully**\n\n**Link ID:** ${linkId}`,
        },
      ],
    };
  }

  private async linkToEpic(args: any) {
    const { issueKey, epicKey } = args;

    await this.client.linkToEpic(issueKey, epicKey);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Issue Linked to Epic Successfully**\n\n` +
            `**Issue:** ${issueKey}\n` +
            `**Epic:** ${epicKey}\n` +
            `\n**Direct Links:**\n` +
            `• Issue: ${this.config.url}/browse/${issueKey}\n` +
            `• Epic: ${this.config.url}/browse/${epicKey}`,
        },
      ],
    };
  }

  private async getWorklog(args: any) {
    const { issueKey, startAt = 0, maxResults = 50 } = args;

    const worklogResult = await this.client.getWorklogs(issueKey, { startAt, maxResults });

    if (worklogResult.worklogs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No worklog entries found for ${issueKey}**`,
          },
        ],
      };
    }

    const worklogList = worklogResult.worklogs
      .map(
        w =>
          `• **${w.author.displayName}**: ${w.timeSpent} on ${new Date(w.started).toLocaleDateString()}\n${
            w.comment ? `  Comment: ${w.comment}\n` : ''
          }`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Worklog Entries for ${issueKey}**\n\n` +
            `**Total:** ${worklogResult.total} entries (showing ${worklogResult.worklogs.length})\n\n` +
            `${worklogList}`,
        },
      ],
    };
  }

  private async addWorklog(args: any) {
    const { issueKey, timeSpent, comment, started, visibility } = args;

    const worklogInput: any = { timeSpent };
    if (comment) worklogInput.comment = comment;
    if (started) worklogInput.started = started;
    if (visibility) worklogInput.visibility = visibility;

    const worklog = await this.client.addWorklog(issueKey, worklogInput);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Worklog Added Successfully**\n\n` +
            `**Issue:** ${issueKey}\n` +
            `**Time Spent:** ${timeSpent}\n` +
            `**Author:** ${worklog.author.displayName}\n` +
            `**Started:** ${new Date(worklog.started).toLocaleString()}\n${
              comment ? `**Comment:** ${comment}\n` : ''
            }\n**Direct Link:** ${this.config.url}/browse/${issueKey}`,
        },
      ],
    };
  }

  private async downloadAttachments(args: any) {
    const { issueKey } = args;

    const attachments = await this.client.getAttachments(issueKey);

    if (attachments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No attachments found for ${issueKey}**`,
          },
        ],
      };
    }

    const attachmentsList = attachments
      .map(
        a =>
          `• **${a.filename}** (${Math.round(a.size / 1024)}KB) - ${new Date(a.created).toLocaleDateString()}\n` +
          `  Download: ${a.content}\n` +
          `  Author: ${a.author.displayName}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Attachments for ${issueKey}**\n\n` +
            `**Total:** ${attachments.length} files\n\n` +
            `${attachmentsList}`,
        },
      ],
    };
  }

  private async getAgileBoards(args: any) {
    const options = args;

    const boardsResult = await this.client.getAgileBoards(options);

    if (boardsResult.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No agile boards found**`,
          },
        ],
      };
    }

    const boardsList = boardsResult.values
      .map((b: any) => `• **${b.name}** (ID: ${b.id}) - ${b.type}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Agile Boards**\n\n` +
            `**Total:** ${boardsResult.total} boards (showing ${boardsResult.values.length})\n\n` +
            `${boardsList}`,
        },
      ],
    };
  }

  private async getBoardIssues(args: any) {
    const { boardId, fields, ...options } = args;

    const requestOptions: any = { ...options };
    if (fields) {
      requestOptions.fields = this.normalizeToArray(fields);
    }

    const issuesResult = await this.client.getBoardIssues(boardId, requestOptions);

    if (issuesResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issues found on board ${boardId}**`,
          },
        ],
      };
    }

    const issuesList = issuesResult.issues
      .map((issue: any) => `• **${issue.key}**: ${issue.fields.summary} (${issue.fields.status.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Board Issues (Board ID: ${boardId})**\n\n` +
            `**Total:** ${issuesResult.total} issues (showing ${issuesResult.issues.length})\n\n` +
            `${issuesList}`,
        },
      ],
    };
  }

  private async getSprintsFromBoard(args: any) {
    const { boardId, ...options } = args;

    const sprintsResult = await this.client.getSprintsFromBoard(boardId, options);

    if (sprintsResult.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No sprints found on board ${boardId}**`,
          },
        ],
      };
    }

    const sprintsList = sprintsResult.values
      .map(
        (s: any) =>
          `• **${s.name}** (ID: ${s.id}) - ${s.state}${
            s.startDate && s.endDate
              ? ` (${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()})`
              : ''
          }`
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Sprints on Board ${boardId}**\n\n` +
            `**Total:** ${sprintsResult.total || sprintsResult.values.length} sprints\n\n` +
            `${sprintsList}`,
        },
      ],
    };
  }

  private async getSprintIssues(args: any) {
    const { sprintId, fields, ...options } = args;

    const requestOptions: any = { ...options };
    if (fields) {
      requestOptions.fields = this.normalizeToArray(fields);
    }

    const issuesResult = await this.client.getSprintIssues(sprintId, requestOptions);

    if (issuesResult.issues.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No issues found in sprint ${sprintId}**`,
          },
        ],
      };
    }

    const issuesList = issuesResult.issues
      .map((issue: any) => `• **${issue.key}**: ${issue.fields.summary} (${issue.fields.status.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text:
            `**Sprint Issues (Sprint ID: ${sprintId})**\n\n` +
            `**Total:** ${issuesResult.total} issues (showing ${issuesResult.issues.length})\n\n` +
            `${issuesList}`,
        },
      ],
    };
  }

  private async createSprint(args: any) {
    const { boardId, name, goal, startDate, endDate } = args;

    const sprintData = {
      name,
      originBoardId: boardId,
      goal,
      startDate,
      endDate,
    };

    const sprint = await this.client.createSprint(sprintData);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Sprint Created Successfully**\n\n` +
            `**Name:** ${sprint.name}\n` +
            `**ID:** ${sprint.id}\n` +
            `**Board ID:** ${boardId}\n` +
            `**State:** ${sprint.state}\n${goal ? `**Goal:** ${goal}\n` : ''}${
              startDate ? `**Start Date:** ${startDate}\n` : ''
            }${endDate ? `**End Date:** ${endDate}\n` : ''}`,
        },
      ],
    };
  }

  private async updateSprint(args: any) {
    const { sprintId, ...updateData } = args;

    const sprint = await this.client.updateSprint(sprintId, updateData);

    const updatedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);

    return {
      content: [
        {
          type: 'text',
          text:
            `**Sprint Updated Successfully**\n\n` +
            `**ID:** ${sprintId}\n` +
            `**Updated Fields:** ${updatedFields.join(', ')}\n` +
            `**Current State:** ${sprint.state}`,
        },
      ],
    };
  }

  private async batchGetChangelogs(args: any) {
    const { issueKeys } = args;

    const changelogs = await this.client.batchGetChangelogs(issueKeys);

    if (changelogs.values.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `**No changelogs found for the specified issues**`,
          },
        ],
      };
    }

    let resultText = `**Changelogs for ${issueKeys.length} Issues**\n\n`;

    changelogs.values.forEach((issueChangelog: any) => {
      const issueKey = issueChangelog.key;
      const histories = issueChangelog.changelog?.histories || [];

      resultText += `**${issueKey}** (${histories.length} changes)\n`;

      if (histories.length > 0) {
        const recentChanges = histories.slice(0, 3); // Show only recent changes
        recentChanges.forEach((history: any) => {
          const author = history.author?.displayName || 'Unknown';
          const date = new Date(history.created).toLocaleDateString();
          resultText += `  • ${date} by ${author}\n`;

          history.items?.forEach((item: any) => {
            resultText += `    - ${item.field}: ${item.fromString || 'None'} → ${item.toString || 'None'}\n`;
          });
        });
      }

      resultText += '\n';
    });

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  // === Utility Methods ===

  private formatDescription(description: any): string {
    if (typeof description === 'string') {
      return description;
    }

    // Handle ADF (Atlassian Document Format) or other structured content
    if (description && typeof description === 'object') {
      return JSON.stringify(description, null, 2);
    }

    return String(description);
  }
}
