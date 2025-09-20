/**
 * MCP Tool Mappings Registry - FULL COVERAGE
 * Complete mapping of ALL test cases to MCP tools
 */

/**
 * Maps test case IDs to MCP tool configurations
 * This registry provides COMPLETE MCP tool coverage
 */
const MCP_TOOL_MAPPINGS = {
  // System tests (Group 1)
  '1-1': {
    tool: 'health_check',
    args: (testCase) => ({ detailed: true }),
  },
  '1-2': {
    tool: 'cache_stats',
    args: (testCase) => ({}),
  },
  '1-3': {
    tool: 'jira_get_projects',
    args: (testCase) => ({ permissions: ['BROWSE_PROJECTS'] }),
  },
  '1-4': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ expandSchema: false }),
  },

  // Informational tests (Group 2)
  '2-1': {
    tool: 'jira_get_issue',
    args: (testCase) => ({
      issueKey: testCase.testIssueKey || 'TEST-1',
      expand: 'names,schema,operations,editmeta,changelog,renderedFields',
    }),
  },
  '2-2': {
    tool: 'jira_search_issues',
    args: (testCase) => ({
      jql: testCase.jql || 'project = TEST',
      maxResults: 10,
      startAt: 0,
    }),
  },
  '2-3': {
    tool: 'jira_get_projects',
    args: (testCase) => ({ expand: 'lead,issueTypes,permissions' }),
  },
  '2-4': {
    tool: 'jira_get_projects',
    args: (testCase) => ({
      projectKeys: [testCase.projectKey || 'TEST'],
      expand: 'lead,issueTypes,url,projectKeys,permissions'
    }),
  },
  '2-5': {
    tool: 'jira_get_transitions',
    args: (testCase) => ({
      issueKey: testCase.testIssueKey || 'TEST-1',
    }),
  },
  '2-6': {
    tool: 'jira_batch_get_changelogs',
    args: (testCase) => ({
      issueKeys: [testCase.testIssueKey || 'TEST-1'],
    }),
  },
  '2-7': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ expandSchema: true }),
  },
  '2-8': {
    tool: 'jira_get_user_profile',
    args: (testCase) => ({ accountId: testCase.accountId || 'self' }),
  },

  // Issue Detailed tests (Group 3)
  '3-1': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'priority' }),
  },
  '3-2': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'status' }),
  },
  '3-3': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'issuetype' }),
  },
  '3-4': {
    tool: 'jira_get_link_types',
    args: (testCase) => ({}),
  },
  '3-5': {
    tool: 'jira_get_worklog',
    args: (testCase) => ({
      issueKey: testCase.testIssueKey || 'TEST-1',
    }),
  },
  '3-6': {
    tool: 'jira_search_fields',
    args: (testCase) => ({
      projectKeys: [testCase.projectKey || 'TEST'],
      expand: 'projects.issuetypes.fields',
    }),
  },

  // Search Detailed tests (Group 4)
  '4-1': {
    tool: 'jira_search_issues',
    args: (testCase) => ({
      jql: testCase.jql || 'project = TEST AND issuetype = Bug',
      maxResults: 10,
      startAt: 0,
      fields: ['summary', 'status', 'assignee'],
    }),
  },
  '4-2': {
    tool: 'jira_get_projects',
    args: (testCase) => ({
      expand: 'description,lead,issueTypes,url,projectKeys,permissions',
      recent: 10,
    }),
  },
  '4-3': {
    tool: 'jira_get_projects',
    args: (testCase) => ({
      projectKeys: [testCase.projectKey || 'TEST'],
      expand: 'roles',
    }),
  },

  // User Detailed tests (Group 5)
  '5-1': {
    tool: 'jira_get_user_profile',
    args: (testCase) => ({
      accountId: testCase.accountId || testCase.testUsername,
      expand: 'groups,applicationRoles',
    }),
  },
  '5-2': {
    tool: 'jira_search_users',
    args: (testCase) => ({
      query: testCase.query || 'admin',
      maxResults: 10,
    }),
  },
  '5-3': {
    tool: 'jira_get_user_profile',
    args: (testCase) => ({
      accountId: testCase.accountId || 'self',
      expand: 'groups',
    }),
  },

  // Metadata Detailed tests (Group 6)
  '6-1': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ expand: 'all' }),
  },
  '6-2': {
    tool: 'jira_search_fields',
    args: (testCase) => ({
      projectKeys: [testCase.projectKey || 'TEST'],
      expand: 'projects.issuetypes.fields',
    }),
  },
  '6-3': {
    tool: 'jira_get_project_versions',
    args: (testCase) => ({
      projectIdOrKey: testCase.projectKey || 'TEST',
    }),
  },
  '6-4': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'screen' }),
  },
  '6-5': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'workflow' }),
  },

  // Modifying tests (Group 8)
  '8-1': {
    tool: 'jira_create_issue',
    args: (testCase) => ({
      projectKey: testCase.projectKey || 'TEST',
      issueType: testCase.issueType || 'Task',
      summary: testCase.summary || 'Test Issue Created',
      description: testCase.description || 'Test Description',
    }),
  },
  '8-2': {
    tool: 'jira_update_issue',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      fields: {
        summary: testCase.summary || 'Updated Summary',
        description: testCase.description || 'Updated Description',
      },
    }),
  },
  '8-3': {
    tool: 'jira_delete_issue',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-999',
      deleteSubtasks: true,
    }),
  },
  '8-4': {
    tool: 'jira_add_comment',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      body: testCase.comment || 'Test comment added',
    }),
  },
  '8-5': {
    tool: 'jira_create_version',
    args: (testCase) => ({
      projectId: testCase.projectId || 10000,
      name: testCase.versionName || 'Test Version',
      description: testCase.description || 'Test Version Description',
      releaseDate: testCase.releaseDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    }),
  },
  '8-6': {
    tool: 'jira_transition_issue',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      transitionId: testCase.transitionId || '31',
    }),
  },
  '8-7': {
    tool: 'jira_add_worklog',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      timeSpentSeconds: testCase.timeSpent || 3600,
      comment: testCase.comment || 'Worked on task',
      started: testCase.started || new Date(Date.now() - 60*60*1000).toISOString(),
    }),
  },
  '8-9': {
    tool: 'jira_create_issue_link',
    args: (testCase) => ({
      type: testCase.linkType || 'Relates',
      inwardIssue: testCase.inwardIssue || 'TEST-1',
      outwardIssue: testCase.outwardIssue || 'TEST-2',
      comment: testCase.comment || 'Linked issues',
    }),
  },
  '8-10': {
    tool: 'jira_remove_issue_link',
    args: (testCase) => ({
      linkId: testCase.linkId || '10000',
    }),
  },
  '8-11': {
    tool: 'jira_batch_create_issues',
    args: (testCase) => ({
      issues: testCase.issues || [
        {
          projectKey: 'TEST',
          issueType: 'Task',
          summary: 'Batch Issue 1',
        },
        {
          projectKey: 'TEST',
          issueType: 'Task',
          summary: 'Batch Issue 2',
        }
      ],
    }),
  },

  // Agile tests (Group 9)
  '9-1': {
    tool: 'jira_get_agile_boards',
    args: (testCase) => ({
      projectKeyOrId: testCase.projectKey || 'TEST',
      type: 'scrum',
    }),
  },
  '9-2': {
    tool: 'jira_get_sprints_from_board',
    args: (testCase) => ({
      boardId: testCase.boardId || 1,
      state: 'active,closed',
    }),
  },
  '9-3': {
    tool: 'jira_get_sprint_issues',
    args: (testCase) => ({
      sprintId: testCase.sprintId || 1,
      jql: testCase.jql || '',
      maxResults: 50,
    }),
  },
  '9-4': {
    tool: 'jira_get_board_issues',
    args: (testCase) => ({
      boardId: testCase.boardId || 1,
      jql: testCase.jql || '',
      maxResults: 50,
    }),
  },
  '9-5': {
    tool: 'jira_create_sprint',
    args: (testCase) => ({
      originBoardId: testCase.boardId || 1,
      name: testCase.sprintName || 'Test Sprint',
      goal: testCase.goal || 'Test Sprint Goal',
      startDate: testCase.startDate || new Date().toISOString(),
      endDate: testCase.endDate || new Date(Date.now() + 14*24*60*60*1000).toISOString(),
    }),
  },
  '9-6': {
    tool: 'jira_update_sprint',
    args: (testCase) => ({
      sprintId: testCase.sprintId || 1,
      name: testCase.sprintName || 'Updated Sprint',
      goal: testCase.goal || 'Updated Sprint Goal',
      state: testCase.state || 'active',
    }),
  },
  '9-7': {
    tool: 'jira_link_to_epic',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      epicKey: testCase.epicKey || 'TEST-100',
    }),
  },

  // Additional tests (Group 10)
  '10-1': {
    tool: 'jira_download_attachments',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      downloadPath: testCase.downloadPath || './downloads',
    }),
  },
  '10-2': {
    tool: 'jira_create_remote_issue_link',
    args: (testCase) => ({
      issueKey: testCase.issueKey || 'TEST-1',
      url: testCase.url || 'https://example.com',
      title: testCase.title || 'External Link',
      summary: testCase.summary || 'Link to external resource',
    }),
  },
  '10-3': {
    tool: 'jira_batch_create_versions',
    args: (testCase) => ({
      projectId: testCase.projectId || 10000,
      versions: testCase.versions || [
        {
          name: 'v1.0.0',
          description: 'First release',
          releaseDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        },
        {
          name: 'v2.0.0',
          description: 'Major update',
          releaseDate: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
        }
      ],
    }),
  },

  // Workflow Schemes tests (Group 11)
  '11-1': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'workflowscheme' }),
  },
  '11-2': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'workflowscheme', expand: 'mappings' }),
  },
  '11-3': {
    tool: 'jira_search_fields',
    args: (testCase) => ({ type: 'workflowscheme', projectId: testCase.projectId || 10000 }),
  },

  // Extended tests (Group 12)
  '12-1': {
    tool: 'cache_clear',
    args: (testCase) => ({ pattern: testCase.pattern || '*' }),
  },
  '12-2': {
    tool: 'cache_stats',
    args: (testCase) => ({ detailed: true }),
  },
  '12-3': {
    tool: 'health_check',
    args: (testCase) => ({ includeMetrics: true }),
  },

  // Cascade tests (Group 13) - Complex workflow operations
  '13-1': {
    tool: 'jira_create_issue',
    args: (testCase) => ({
      projectKey: 'TEST',
      issueType: 'Task',
      summary: 'Cascade Test Issue',
      description: 'Issue for cascade testing',
    }),
  },
  '13-2': {
    tool: 'jira_update_issue',
    args: (testCase) => ({
      issueKey: testCase.createdIssueKey,
      fields: {
        priority: { name: 'High' },
      },
    }),
  },
  '13-3': {
    tool: 'jira_add_comment',
    args: (testCase) => ({
      issueKey: testCase.createdIssueKey,
      body: 'Cascade test comment',
    }),
  },
  '13-4': {
    tool: 'jira_transition_issue',
    args: (testCase) => ({
      issueKey: testCase.createdIssueKey,
      transitionId: '31',
    }),
  },
  '13-5': {
    tool: 'jira_delete_issue',
    args: (testCase) => ({
      issueKey: testCase.createdIssueKey,
      deleteSubtasks: true,
    }),
  },
};

/**
 * Get MCP tool configuration for a test case
 */
export function getMcpToolConfig(testCaseId) {
  return MCP_TOOL_MAPPINGS[testCaseId] || null;
}

/**
 * Get coverage statistics
 */
export function getMcpCoverageStats() {
  const totalTests = Object.keys(MCP_TOOL_MAPPINGS).length;
  const withTools = Object.values(MCP_TOOL_MAPPINGS).filter(v => v !== null).length;
  const withoutTools = totalTests - withTools;
  const coverage = totalTests > 0 ? `${Math.round((withTools / totalTests) * 100)}%` : '0%';

  return {
    total: totalTests,
    withTools,
    withoutTools,
    coverage,
  };
}

/**
 * Get list of unique MCP tools used
 */
export function getUniqueMcpTools() {
  const tools = new Set();
  Object.values(MCP_TOOL_MAPPINGS).forEach(mapping => {
    if (mapping && mapping.tool) {
      tools.add(mapping.tool);
    }
  });
  return Array.from(tools).sort();
}

/**
 * Check if test case has MCP tool mapping
 */
export function hasMcpTool(testCaseId) {
  return MCP_TOOL_MAPPINGS[testCaseId] !== null;
}

/**
 * Get all test cases with MCP tools
 */
export function getTestsWithMcpTools() {
  return Object.entries(MCP_TOOL_MAPPINGS)
    .filter(([_, mapping]) => mapping !== null)
    .map(([id, mapping]) => ({ id, tool: mapping.tool }));
}

/**
 * Get all test cases without MCP tools
 */
export function getTestsWithoutMcpTools() {
  return Object.entries(MCP_TOOL_MAPPINGS)
    .filter(([_, mapping]) => mapping === null)
    .map(([id]) => id);
}

export default MCP_TOOL_MAPPINGS;