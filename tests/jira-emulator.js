#!/usr/bin/env node

/**
 * JIRA API Emulator
 * Простой эмулятор JIRA REST API для тестирования MCP сервера
 */

import express from 'express';
import chalk from 'chalk';

// Тестовые данные
const MOCK_USER = {
  self: 'https://test.atlassian.net/rest/api/2/user/12345',
  accountId: '12345',
  displayName: 'Test User',
  emailAddress: 'test@example.com',
  active: true,
  timeZone: 'UTC',
  avatarUrls: {
    '48x48': 'https://avatar.example.com/48x48.png',
    '24x24': 'https://avatar.example.com/24x24.png',
    '16x16': 'https://avatar.example.com/16x16.png',
    '32x32': 'https://avatar.example.com/32x32.png',
  },
};

const MOCK_PROJECT = {
  id: '10000',
  key: 'TEST',
  name: 'Test Project',
  description: 'A test project for MCP server validation',
  projectTypeKey: 'software',
  lead: MOCK_USER,
  avatarUrls: {
    '48x48': 'https://avatar.example.com/project/48x48.png',
    '24x24': 'https://avatar.example.com/project/24x24.png',
    '16x16': 'https://avatar.example.com/project/16x16.png',
    '32x32': 'https://avatar.example.com/project/32x32.png',
  },
};

const MOCK_STATUS = {
  id: '3',
  name: 'In Progress',
  description: 'This issue is being actively worked on at the moment by the assignee.',
  iconUrl: 'https://test.atlassian.net/images/icons/statuses/inprogress.png',
  statusCategory: {
    id: 4,
    key: 'indeterminate',
    colorName: 'yellow',
    name: 'In Progress',
  },
};

const MOCK_PRIORITY = {
  id: '3',
  name: 'Medium',
  iconUrl: 'https://test.atlassian.net/images/icons/priorities/medium.svg',
};

const MOCK_ISSUE_TYPE = {
  id: '10001',
  name: 'Task',
  description: 'A task that needs to be completed',
  iconUrl: 'https://test.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318',
  subtask: false,
};

// База данных в памяти для эмулятора
const issues = new Map();
const comments = new Map();
const versions = new Map();
const components = new Map();
const boards = new Map();
const sprints = new Map();
const issueLinks = new Map();
const remoteLinks = new Map();
const worklogs = new Map();
const attachments = new Map();
const filters = new Map();
const dashboards = new Map();

let issueCounter = 1;
let commentCounter = 1;
let versionCounter = 1;
let componentCounter = 1;
let boardCounter = 1;
let sprintCounter = 1;
let linkCounter = 1;
let worklogCounter = 1;
let attachmentCounter = 1;
let filterCounter = 1;
let dashboardCounter = 1;

// Дополнительные моковые данные
const MOCK_ISSUE_TYPES = [
  {
    id: '10001',
    name: 'Task',
    description: 'A task that needs to be completed',
    iconUrl: 'https://test.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318',
    subtask: false,
  },
  {
    id: '10002',
    name: 'Bug',
    description: 'A problem that impairs or prevents the functions',
    iconUrl: 'https://test.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10303',
    subtask: false,
  },
  {
    id: '10003',
    name: 'Epic',
    description: 'A large user story',
    iconUrl: 'https://test.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10307',
    subtask: false,
  },
  {
    id: '10004',
    name: 'Sub-task',
    description: 'A subtask',
    iconUrl: 'https://test.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10316',
    subtask: true,
  },
];

const MOCK_PRIORITIES = [
  { id: '1', name: 'Highest', iconUrl: 'https://test.atlassian.net/images/icons/priorities/highest.svg' },
  { id: '2', name: 'High', iconUrl: 'https://test.atlassian.net/images/icons/priorities/high.svg' },
  { id: '3', name: 'Medium', iconUrl: 'https://test.atlassian.net/images/icons/priorities/medium.svg' },
  { id: '4', name: 'Low', iconUrl: 'https://test.atlassian.net/images/icons/priorities/low.svg' },
  { id: '5', name: 'Lowest', iconUrl: 'https://test.atlassian.net/images/icons/priorities/lowest.svg' },
];

const MOCK_STATUSES = [
  {
    id: '1',
    name: 'To Do',
    description: 'The issue is open and ready for work',
    iconUrl: 'https://test.atlassian.net/images/icons/statuses/open.png',
    statusCategory: { id: 2, key: 'new', colorName: 'blue-gray', name: 'To Do' },
  },
  {
    id: '3',
    name: 'In Progress',
    description: 'This issue is being actively worked on',
    iconUrl: 'https://test.atlassian.net/images/icons/statuses/inprogress.png',
    statusCategory: { id: 4, key: 'indeterminate', colorName: 'yellow', name: 'In Progress' },
  },
  {
    id: '10001',
    name: 'Done',
    description: 'The issue is closed and completed',
    iconUrl: 'https://test.atlassian.net/images/icons/statuses/closed.png',
    statusCategory: { id: 3, key: 'done', colorName: 'green', name: 'Done' },
  },
];

const MOCK_RESOLUTIONS = [
  { id: '1', name: 'Fixed', description: 'A fix for this issue is checked into the tree and tested.' },
  { id: '2', name: "Won't Fix", description: 'The problem described is an issue which will never be fixed.' },
  { id: '3', name: 'Duplicate', description: 'The problem is a duplicate of an existing issue.' },
  { id: '4', name: 'Incomplete', description: 'The problem is not completely described.' },
  { id: '5', name: 'Cannot Reproduce', description: 'All attempts at reproducing this issue failed.' },
];

const MOCK_FIELDS = [
  { id: 'summary', name: 'Summary', custom: false, orderable: true, navigable: true, searchable: true },
  { id: 'status', name: 'Status', custom: false, orderable: true, navigable: true, searchable: true },
  { id: 'priority', name: 'Priority', custom: false, orderable: true, navigable: true, searchable: true },
  { id: 'assignee', name: 'Assignee', custom: false, orderable: true, navigable: true, searchable: true },
  { id: 'reporter', name: 'Reporter', custom: false, orderable: true, navigable: true, searchable: true },
  { id: 'created', name: 'Created', custom: false, orderable: true, navigable: false, searchable: true },
  { id: 'updated', name: 'Updated', custom: false, orderable: true, navigable: false, searchable: true },
  { id: 'description', name: 'Description', custom: false, orderable: false, navigable: false, searchable: true },
  { id: 'customfield_10001', name: 'Epic Link', custom: true, orderable: true, navigable: true, searchable: true },
  { id: 'customfield_10002', name: 'Story Points', custom: true, orderable: true, navigable: false, searchable: true },
];

const MOCK_LINK_TYPES = [
  {
    id: '10000',
    name: 'Blocks',
    inward: 'is blocked by',
    outward: 'blocks',
    self: 'https://test.atlassian.net/rest/api/2/issueLinkType/10000',
  },
  {
    id: '10001',
    name: 'Relates',
    inward: 'relates to',
    outward: 'relates to',
    self: 'https://test.atlassian.net/rest/api/2/issueLinkType/10001',
  },
  {
    id: '10002',
    name: 'Duplicate',
    inward: 'is duplicated by',
    outward: 'duplicates',
    self: 'https://test.atlassian.net/rest/api/2/issueLinkType/10002',
  },
];

// Создание начальных тестовых задач
function initializeTestData() {
  const issue1 = {
    id: '10001',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/2/issue/10001',
    fields: {
      summary: 'Test MCP Server Integration',
      description: 'This is a test issue to verify MCP server functionality',
      status: MOCK_STATUS,
      priority: MOCK_PRIORITY,
      assignee: MOCK_USER,
      reporter: MOCK_USER,
      created: '2024-01-01T10:00:00.000+0000',
      updated: '2024-01-01T12:00:00.000+0000',
      issuetype: MOCK_ISSUE_TYPE,
      project: MOCK_PROJECT,
      labels: ['mcp-test', 'integration'],
      components: [],
      fixVersions: [],
      versions: [],
    },
  };

  const issue2 = {
    id: '10002',
    key: 'TEST-2',
    self: 'https://test.atlassian.net/rest/api/2/issue/10002',
    fields: {
      summary: 'Second Test Issue',
      description: 'Another test issue for search functionality',
      status: { ...MOCK_STATUS, name: 'To Do', id: '1' },
      priority: MOCK_PRIORITY,
      assignee: null,
      reporter: MOCK_USER,
      created: '2024-01-02T09:00:00.000+0000',
      updated: '2024-01-02T09:00:00.000+0000',
      issuetype: MOCK_ISSUE_TYPE,
      project: MOCK_PROJECT,
      labels: ['mcp-test'],
      components: [],
      fixVersions: [],
      versions: [],
    },
  };

  issues.set('TEST-1', issue1);
  issues.set('TEST-2', issue2);
  issues.set('10001', issue1);
  issues.set('10002', issue2);

  // Добавить комментарии
  comments.set('10001', [
    {
      id: '10100',
      author: MOCK_USER,
      body: 'This is a test comment for MCP validation',
      created: '2024-01-01T11:00:00.000+0000',
      updated: '2024-01-01T11:00:00.000+0000',
    },
  ]);

  comments.set('10002', []);

  // Добавить версии
  const version1 = {
    id: '10000',
    name: 'Version 1.0',
    description: 'Initial release',
    archived: false,
    released: false,
    projectId: 10000,
  };
  versions.set('10000', version1);

  // Добавить компоненты
  const component1 = {
    id: '10000',
    name: 'Backend',
    description: 'Backend components',
    lead: MOCK_USER,
    project: 'TEST',
    projectId: 10000,
  };
  components.set('10000', component1);

  // Добавить доски Agile
  const board1 = {
    id: 1,
    name: 'TEST Board',
    type: 'scrum',
    location: {
      projectId: 10000,
      projectKey: 'TEST',
      projectName: 'Test Project',
      projectTypeKey: 'software',
    },
  };
  boards.set('1', board1);

  // Добавить спринты
  const sprint1 = {
    id: 1,
    name: 'Sprint 1',
    state: 'active',
    originBoardId: 1,
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-14T23:59:59.999Z',
    goal: 'Complete initial features',
  };
  sprints.set('1', sprint1);

  // Добавить фильтры
  const filter1 = {
    id: '10000',
    name: 'My Open Issues',
    jql: 'assignee = currentUser() AND resolution = Unresolved',
    owner: MOCK_USER,
    favourite: true,
  };
  filters.set('10000', filter1);

  // Добавить дашборды
  const dashboard1 = {
    id: '10000',
    name: 'System Dashboard',
    owner: MOCK_USER,
    sharePermissions: [],
    popularity: 1,
  };
  dashboards.set('10000', dashboard1);
}

export class JiraEmulator {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
    initializeTestData();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Логирование запросов
    this.app.use((req, res, next) => {
      console.log(chalk.blue(`[JIRA EMULATOR] ${req.method} ${req.path}`));
      next();
    });

    // Простая аутентификация (принимаем любые credentials)
    this.app.use('/rest/api/2', (req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        service: 'jira-emulator',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // Get current user
    this.app.get('/rest/api/2/myself', (req, res) => {
      res.json(MOCK_USER);
    });

    // Get issue by key or ID
    this.app.get('/rest/api/2/issue/:issueKey', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: [`Issue Does Not Exist`],
          errors: {},
        });
        return;
      }

      // Обработка параметров expand и fields
      const expand = req.query.expand;
      const fields = req.query.fields;

      let responseIssue = { ...issue };

      // Добавить комментарии если запрашиваются
      if (expand && expand.includes('comment')) {
        const issueComments = comments.get(issue.id) || [];
        responseIssue.fields.comment = {
          comments: issueComments,
          total: issueComments.length,
        };
      }

      // Фильтрация полей
      if (fields) {
        const requestedFields = fields.split(',').map(f => f.trim());
        const filteredFields = {};
        for (const field of requestedFields) {
          if (responseIssue.fields[field] !== undefined) {
            filteredFields[field] = responseIssue.fields[field];
          }
        }
        responseIssue.fields = filteredFields;
      }

      res.json(responseIssue);
    });

    // Search issues
    this.app.post('/rest/api/2/search', (req, res) => {
      const { jql, startAt = 0, maxResults = 50 } = req.body;

      console.log(chalk.yellow(`[JIRA EMULATOR] Search JQL: ${jql}`));

      // Простая имитация поиска - возвращаем все или фильтруем по проекту
      let allIssues = Array.from(issues.values());

      if (jql.includes('TEST')) {
        // Фильтруем по проекту TEST
        allIssues = allIssues.filter(issue => issue.key.startsWith('TEST'));
      }

      if (jql.includes('status = "To Do"')) {
        allIssues = allIssues.filter(issue => issue.fields.status.name === 'To Do');
      }

      if (jql.includes('status = "In Progress"')) {
        allIssues = allIssues.filter(issue => issue.fields.status.name === 'In Progress');
      }

      const total = allIssues.length;
      const paginatedIssues = allIssues.slice(startAt, startAt + maxResults);

      res.json({
        expand: 'schema,names',
        startAt,
        maxResults,
        total,
        issues: paginatedIssues,
      });
    });

    // Create issue
    this.app.post('/rest/api/2/issue', (req, res) => {
      const { fields } = req.body;

      if (!fields || !fields.summary || !fields.project || !fields.issuetype) {
        res.status(400).json({
          errorMessages: ['Summary, project and issue type are required'],
          errors: {},
        });
        return;
      }

      const newIssueId = (10000 + issueCounter).toString();
      const newIssueKey = `TEST-${++issueCounter}`;

      const newIssue = {
        id: newIssueId,
        key: newIssueKey,
        self: `https://test.atlassian.net/rest/api/2/issue/${newIssueId}`,
        fields: {
          summary: fields.summary,
          description: fields.description || '',
          status: { ...MOCK_STATUS, name: 'To Do', id: '1' },
          priority: MOCK_PRIORITY,
          assignee: fields.assignee ? MOCK_USER : null,
          reporter: MOCK_USER,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          issuetype: MOCK_ISSUE_TYPE,
          project: MOCK_PROJECT,
          labels: fields.labels || [],
          components: fields.components || [],
          fixVersions: [],
          versions: [],
        },
      };

      issues.set(newIssueKey, newIssue);
      issues.set(newIssueId, newIssue);
      comments.set(newIssueId, []);

      console.log(chalk.green(`[JIRA EMULATOR] Created issue: ${newIssueKey}`));

      res.status(201).json({
        id: newIssueId,
        key: newIssueKey,
        self: newIssue.self,
      });
    });

    // Get projects
    this.app.get('/rest/api/2/project', (req, res) => {
      res.json([MOCK_PROJECT]);
    });

    // Get specific project
    this.app.get('/rest/api/2/project/:projectIdOrKey', (req, res) => {
      const { projectIdOrKey } = req.params;
      if (projectIdOrKey === 'TEST' || projectIdOrKey === '10000') {
        res.json(MOCK_PROJECT);
      } else {
        res.status(404).json({
          errorMessages: ['Project Does Not Exist'],
          errors: {},
        });
      }
    });

    // Get project statuses
    this.app.get('/rest/api/2/project/:projectIdOrKey/statuses', (req, res) => {
      const { projectIdOrKey } = req.params;
      if (projectIdOrKey === 'TEST' || projectIdOrKey === '10000') {
        res.json([
          {
            name: 'Task',
            id: '10001',
            statuses: MOCK_STATUSES,
          },
          {
            name: 'Bug',
            id: '10002',
            statuses: MOCK_STATUSES,
          },
        ]);
      } else {
        res.status(404).json({
          errorMessages: ['Project Does Not Exist'],
          errors: {},
        });
      }
    });

    // Get project versions
    this.app.get('/rest/api/2/project/:projectIdOrKey/versions', (req, res) => {
      const { projectIdOrKey } = req.params;
      if (projectIdOrKey === 'TEST' || projectIdOrKey === '10000') {
        res.json(Array.from(versions.values()));
      } else {
        res.status(404).json({
          errorMessages: ['Project Does Not Exist'],
          errors: {},
        });
      }
    });

    // Get project components
    this.app.get('/rest/api/2/project/:projectIdOrKey/components', (req, res) => {
      const { projectIdOrKey } = req.params;
      if (projectIdOrKey === 'TEST' || projectIdOrKey === '10000') {
        res.json(Array.from(components.values()));
      } else {
        res.status(404).json({
          errorMessages: ['Project Does Not Exist'],
          errors: {},
        });
      }
    });

    // Get version
    this.app.get('/rest/api/2/version/:id', (req, res) => {
      const { id } = req.params;
      const version = versions.get(id);

      if (!version) {
        res.status(404).json({
          errorMessages: ['Version Does Not Exist'],
          errors: {},
        });
        return;
      }

      res.json(version);
    });

    // Create version
    this.app.post('/rest/api/2/version', (req, res) => {
      const newVersion = {
        id: (10000 + versionCounter++).toString(),
        name: req.body.name,
        description: req.body.description || '',
        archived: req.body.archived || false,
        released: req.body.released || false,
        releaseDate: req.body.releaseDate,
        projectId: req.body.projectId || 10000,
      };

      versions.set(newVersion.id, newVersion);

      console.log(chalk.green(`[JIRA EMULATOR] Created version: ${newVersion.name}`));
      res.status(201).json(newVersion);
    });

    // Update version
    this.app.put('/rest/api/2/version/:id', (req, res) => {
      const { id } = req.params;
      const version = versions.get(id);

      if (!version) {
        res.status(404).json({
          errorMessages: ['Version Does Not Exist'],
          errors: {},
        });
        return;
      }

      Object.assign(version, req.body);

      console.log(chalk.green(`[JIRA EMULATOR] Updated version: ${version.name}`));
      res.json(version);
    });

    // Delete version
    this.app.delete('/rest/api/2/version/:id', (req, res) => {
      const { id } = req.params;
      const version = versions.get(id);

      if (!version) {
        res.status(404).json({
          errorMessages: ['Version Does Not Exist'],
          errors: {},
        });
        return;
      }

      versions.delete(id);

      console.log(chalk.red(`[JIRA EMULATOR] Deleted version: ${version.name}`));
      res.status(204).send();
    });

    // Add comment to issue
    this.app.post('/rest/api/2/issue/:issueKey/comment', (req, res) => {
      const { issueKey } = req.params;
      const { body } = req.body;

      const issue = issues.get(issueKey);
      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const newComment = {
        id: (10100 + commentCounter++).toString(),
        author: MOCK_USER,
        body: body || '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      const issueComments = comments.get(issue.id) || [];
      issueComments.push(newComment);
      comments.set(issue.id, issueComments);

      console.log(chalk.green(`[JIRA EMULATOR] Added comment to ${issueKey}`));

      res.status(201).json(newComment);
    });

    // Update issue
    this.app.put('/rest/api/2/issue/:issueKey', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const { fields, update } = req.body;

      // Apply field updates
      if (fields) {
        Object.keys(fields).forEach(field => {
          issue.fields[field] = fields[field];
        });
      }

      // Apply update operations
      if (update) {
        Object.keys(update).forEach(field => {
          const operations = update[field];
          operations.forEach(op => {
            if (op.set !== undefined) {
              issue.fields[field] = op.set;
            }
            if (op.add !== undefined && Array.isArray(issue.fields[field])) {
              issue.fields[field].push(op.add);
            }
            if (op.remove !== undefined && Array.isArray(issue.fields[field])) {
              issue.fields[field] = issue.fields[field].filter(item => item !== op.remove);
            }
          });
        });
      }

      issue.fields.updated = new Date().toISOString();

      console.log(chalk.green(`[JIRA EMULATOR] Updated issue: ${issueKey}`));
      res.status(204).send();
    });

    // Delete issue
    this.app.delete('/rest/api/2/issue/:issueKey', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      issues.delete(issueKey);
      issues.delete(issue.id);
      comments.delete(issue.id);
      worklogs.delete(issue.id);

      console.log(chalk.red(`[JIRA EMULATOR] Deleted issue: ${issueKey}`));
      res.status(204).send();
    });

    // Update comment
    this.app.put('/rest/api/2/issue/:issueKey/comment/:commentId', (req, res) => {
      const { issueKey, commentId } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueComments = comments.get(issue.id) || [];
      const comment = issueComments.find(c => c.id === commentId);

      if (!comment) {
        res.status(404).json({
          errorMessages: ['Comment Does Not Exist'],
          errors: {},
        });
        return;
      }

      comment.body = req.body.body || comment.body;
      comment.updated = new Date().toISOString();

      console.log(chalk.green(`[JIRA EMULATOR] Updated comment ${commentId} on ${issueKey}`));
      res.json(comment);
    });

    // Delete comment
    this.app.delete('/rest/api/2/issue/:issueKey/comment/:commentId', (req, res) => {
      const { issueKey, commentId } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueComments = comments.get(issue.id) || [];
      const index = issueComments.findIndex(c => c.id === commentId);

      if (index === -1) {
        res.status(404).json({
          errorMessages: ['Comment Does Not Exist'],
          errors: {},
        });
        return;
      }

      issueComments.splice(index, 1);
      comments.set(issue.id, issueComments);

      console.log(chalk.red(`[JIRA EMULATOR] Deleted comment ${commentId} from ${issueKey}`));
      res.status(204).send();
    });

    // Get issue transitions
    this.app.get('/rest/api/2/issue/:issueKey/transitions', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const currentStatus = issue.fields.status.name;
      let availableTransitions = [];

      if (currentStatus === 'To Do') {
        availableTransitions = [
          {
            id: '11',
            name: 'Start Progress',
            to: {
              id: '3',
              name: 'In Progress',
              description: 'This issue is being actively worked on.',
            },
            hasScreen: false,
            isGlobal: false,
            isInitial: false,
            isConditional: false,
          },
        ];
      } else if (currentStatus === 'In Progress') {
        availableTransitions = [
          {
            id: '21',
            name: 'Stop Progress',
            to: {
              id: '1',
              name: 'To Do',
              description: 'The issue is open and ready for work.',
            },
            hasScreen: false,
            isGlobal: false,
            isInitial: false,
            isConditional: false,
          },
          {
            id: '31',
            name: 'Done',
            to: {
              id: '10001',
              name: 'Done',
              description: 'The issue is closed and completed.',
            },
            hasScreen: false,
            isGlobal: false,
            isInitial: false,
            isConditional: false,
          },
        ];
      }

      res.json({ transitions: availableTransitions });
    });

    // Perform issue transition
    this.app.post('/rest/api/2/issue/:issueKey/transitions', (req, res) => {
      const { issueKey } = req.params;
      const { transition } = req.body;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      // Update issue status based on transition
      if (transition.id === '11') {
        issue.fields.status = MOCK_STATUSES.find(s => s.name === 'In Progress');
      } else if (transition.id === '21') {
        issue.fields.status = MOCK_STATUSES.find(s => s.name === 'To Do');
      } else if (transition.id === '31') {
        issue.fields.status = MOCK_STATUSES.find(s => s.name === 'Done');
      }

      issue.fields.updated = new Date().toISOString();

      console.log(chalk.green(`[JIRA EMULATOR] Transitioned issue ${issueKey} to ${issue.fields.status.name}`));
      res.status(204).send();
    });

    // Get issue worklogs
    this.app.get('/rest/api/2/issue/:issueKey/worklog', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueWorklogs = worklogs.get(issue.id) || [];
      res.json({
        startAt: 0,
        maxResults: issueWorklogs.length,
        total: issueWorklogs.length,
        worklogs: issueWorklogs,
      });
    });

    // Add worklog to issue
    this.app.post('/rest/api/2/issue/:issueKey/worklog', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const newWorklog = {
        id: (10000 + worklogCounter++).toString(),
        author: MOCK_USER,
        comment: req.body.comment || '',
        timeSpent: req.body.timeSpent || '1h',
        timeSpentSeconds: req.body.timeSpentSeconds || 3600,
        started: req.body.started || new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      const issueWorklogs = worklogs.get(issue.id) || [];
      issueWorklogs.push(newWorklog);
      worklogs.set(issue.id, issueWorklogs);

      console.log(chalk.green(`[JIRA EMULATOR] Added worklog to ${issueKey}`));
      res.status(201).json(newWorklog);
    });

    // Update worklog
    this.app.put('/rest/api/2/issue/:issueKey/worklog/:worklogId', (req, res) => {
      const { issueKey, worklogId } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueWorklogs = worklogs.get(issue.id) || [];
      const worklog = issueWorklogs.find(w => w.id === worklogId);

      if (!worklog) {
        res.status(404).json({
          errorMessages: ['Worklog Does Not Exist'],
          errors: {},
        });
        return;
      }

      if (req.body.comment !== undefined) worklog.comment = req.body.comment;
      if (req.body.timeSpent !== undefined) worklog.timeSpent = req.body.timeSpent;
      if (req.body.timeSpentSeconds !== undefined) worklog.timeSpentSeconds = req.body.timeSpentSeconds;
      worklog.updated = new Date().toISOString();

      console.log(chalk.green(`[JIRA EMULATOR] Updated worklog ${worklogId} for ${issueKey}`));
      res.json(worklog);
    });

    // Delete worklog
    this.app.delete('/rest/api/2/issue/:issueKey/worklog/:worklogId', (req, res) => {
      const { issueKey, worklogId } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueWorklogs = worklogs.get(issue.id) || [];
      const index = issueWorklogs.findIndex(w => w.id === worklogId);

      if (index === -1) {
        res.status(404).json({
          errorMessages: ['Worklog Does Not Exist'],
          errors: {},
        });
        return;
      }

      issueWorklogs.splice(index, 1);
      worklogs.set(issue.id, issueWorklogs);

      console.log(chalk.red(`[JIRA EMULATOR] Deleted worklog ${worklogId} from ${issueKey}`));
      res.status(204).send();
    });

    // Get issue edit metadata
    this.app.get('/rest/api/2/issue/:issueKey/editmeta', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      res.json({
        fields: {
          summary: {
            required: true,
            schema: { type: 'string', system: 'summary' },
            name: 'Summary',
            operations: ['set'],
          },
          description: {
            required: false,
            schema: { type: 'string', system: 'description' },
            name: 'Description',
            operations: ['set'],
          },
          priority: {
            required: false,
            schema: { type: 'priority', system: 'priority' },
            name: 'Priority',
            operations: ['set'],
            allowedValues: MOCK_PRIORITIES,
          },
          labels: {
            required: false,
            schema: { type: 'array', items: 'string', system: 'labels' },
            name: 'Labels',
            operations: ['add', 'remove', 'set'],
          },
        },
      });
    });

    // Get issue create metadata
    this.app.get('/rest/api/2/issue/createmeta', (req, res) => {
      res.json({
        expand: 'projects',
        projects: [
          {
            id: '10000',
            key: 'TEST',
            name: 'Test Project',
            issuetypes: MOCK_ISSUE_TYPES.map(type => ({
              ...type,
              fields: {
                summary: {
                  required: true,
                  schema: { type: 'string', system: 'summary' },
                  name: 'Summary',
                  operations: ['set'],
                },
                description: {
                  required: false,
                  schema: { type: 'string', system: 'description' },
                  name: 'Description',
                  operations: ['set'],
                },
                issuetype: {
                  required: true,
                  schema: { type: 'issuetype', system: 'issuetype' },
                  name: 'Issue Type',
                  operations: ['set'],
                  allowedValues: MOCK_ISSUE_TYPES,
                },
                priority: {
                  required: false,
                  schema: { type: 'priority', system: 'priority' },
                  name: 'Priority',
                  operations: ['set'],
                  allowedValues: MOCK_PRIORITIES,
                },
              },
            })),
          },
        ],
      });
    });

    // Get issue changelog
    this.app.post('/rest/api/2/issue/changelog/list', (req, res) => {
      const { issueIds } = req.body;
      const histories = issueIds.map(id => ({
        issueId: id,
        histories: [
          {
            id: '10000',
            author: MOCK_USER,
            created: '2024-01-01T10:00:00.000+0000',
            items: [
              {
                field: 'status',
                fieldtype: 'jira',
                from: '1',
                fromString: 'To Do',
                to: '3',
                toString: 'In Progress',
              },
            ],
          },
        ],
      }));

      res.json({ values: histories });
    });

    // Create bulk issues
    this.app.post('/rest/api/2/issue/bulk', (req, res) => {
      const { issueUpdates } = req.body;
      const createdIssues = [];

      for (const issueData of issueUpdates) {
        const newIssueId = (10000 + issueCounter).toString();
        const newIssueKey = `TEST-${++issueCounter}`;

        const newIssue = {
          id: newIssueId,
          key: newIssueKey,
          self: `https://test.atlassian.net/rest/api/2/issue/${newIssueId}`,
          fields: {
            summary: issueData.fields.summary,
            description: issueData.fields.description || '',
            status: MOCK_STATUSES[0],
            priority: MOCK_PRIORITIES[2],
            assignee: issueData.fields.assignee ? MOCK_USER : null,
            reporter: MOCK_USER,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            issuetype: MOCK_ISSUE_TYPES[0],
            project: MOCK_PROJECT,
            labels: issueData.fields.labels || [],
            components: issueData.fields.components || [],
            fixVersions: [],
            versions: [],
          },
        };

        issues.set(newIssueKey, newIssue);
        issues.set(newIssueId, newIssue);
        comments.set(newIssueId, []);
        worklogs.set(newIssueId, []);

        createdIssues.push({
          id: newIssueId,
          key: newIssueKey,
          self: newIssue.self,
        });
      }

      console.log(chalk.green(`[JIRA EMULATOR] Created ${createdIssues.length} issues in bulk`));
      res.status(201).json({
        issues: createdIssues,
        errors: [],
      });
    });

    // Issue links endpoints
    this.app.get('/rest/api/2/issueLinkType', (req, res) => {
      res.json({ issueLinkTypes: MOCK_LINK_TYPES });
    });

    this.app.post('/rest/api/2/issueLink', (req, res) => {
      const { type, inwardIssue, outwardIssue } = req.body;
      
      const newLink = {
        id: (10000 + linkCounter++).toString(),
        type: MOCK_LINK_TYPES.find(t => t.id === type.id) || MOCK_LINK_TYPES[0],
        inwardIssue: { key: inwardIssue.key, id: inwardIssue.id },
        outwardIssue: { key: outwardIssue.key, id: outwardIssue.id },
      };

      issueLinks.set(newLink.id, newLink);

      console.log(chalk.green(`[JIRA EMULATOR] Created issue link: ${inwardIssue.key} -> ${outwardIssue.key}`));
      res.status(201).json(newLink);
    });

    this.app.delete('/rest/api/2/issueLink/:linkId', (req, res) => {
      const { linkId } = req.params;
      
      if (!issueLinks.has(linkId)) {
        res.status(404).json({
          errorMessages: ['Issue Link Does Not Exist'],
          errors: {},
        });
        return;
      }

      issueLinks.delete(linkId);
      console.log(chalk.red(`[JIRA EMULATOR] Deleted issue link: ${linkId}`));
      res.status(204).send();
    });

    // Remote links
    this.app.post('/rest/api/2/issue/:issueKey/remotelink', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const newRemoteLink = {
        id: (10000 + linkCounter++).toString(),
        self: `https://test.atlassian.net/rest/api/2/issue/${issueKey}/remotelink/${linkCounter}`,
        ...req.body,
      };

      const issueRemoteLinks = remoteLinks.get(issue.id) || [];
      issueRemoteLinks.push(newRemoteLink);
      remoteLinks.set(issue.id, issueRemoteLinks);

      console.log(chalk.green(`[JIRA EMULATOR] Added remote link to ${issueKey}`));
      res.status(201).json(newRemoteLink);
    });

    this.app.get('/rest/api/2/issue/:issueKey/remotelink', (req, res) => {
      const { issueKey } = req.params;
      const issue = issues.get(issueKey);

      if (!issue) {
        res.status(404).json({
          errorMessages: ['Issue Does Not Exist'],
          errors: {},
        });
        return;
      }

      const issueRemoteLinks = remoteLinks.get(issue.id) || [];
      res.json(issueRemoteLinks);
    });

    // User endpoints
    this.app.get('/rest/api/2/user', (req, res) => {
      res.json(MOCK_USER);
    });

    this.app.get('/rest/api/2/user/search', (req, res) => {
      res.json([MOCK_USER]);
    });

    this.app.get('/rest/api/2/user/assignable/search', (req, res) => {
      res.json([MOCK_USER]);
    });

    // Metadata endpoints
    this.app.get('/rest/api/2/priority', (req, res) => {
      res.json(MOCK_PRIORITIES);
    });

    this.app.get('/rest/api/2/status', (req, res) => {
      res.json(MOCK_STATUSES);
    });

    this.app.get('/rest/api/2/issuetype', (req, res) => {
      res.json(MOCK_ISSUE_TYPES);
    });

    this.app.get('/rest/api/2/field', (req, res) => {
      res.json(MOCK_FIELDS);
    });

    this.app.get('/rest/api/2/resolution', (req, res) => {
      res.json(MOCK_RESOLUTIONS);
    });

    this.app.get('/rest/api/2/role', (req, res) => {
      res.json([
        { id: '10002', name: 'Administrators' },
        { id: '10003', name: 'Developers' },
        { id: '10004', name: 'Users' },
      ]);
    });

    // Server info
    this.app.get('/rest/api/2/serverInfo', (req, res) => {
      res.json({
        baseUrl: `http://localhost:${this.port}`,
        version: '9.0.0',
        versionNumbers: [9, 0, 0],
        deploymentType: 'Server',
        buildNumber: 900000,
        buildDate: '2024-01-01T00:00:00.000+0000',
        serverTime: new Date().toISOString(),
        scmInfo: 'test-scm-info',
        serverTitle: 'JIRA Emulator',
      });
    });

    // Configuration
    this.app.get('/rest/api/2/configuration', (req, res) => {
      res.json({
        votingEnabled: true,
        watchingEnabled: true,
        unassignedIssuesAllowed: true,
        subTasksEnabled: true,
        issueLinkingEnabled: true,
        timeTrackingEnabled: true,
        attachmentsEnabled: true,
        timeTrackingConfiguration: {
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          timeFormat: 'pretty',
          defaultUnit: 'hour',
        },
      });
    });

    // Application roles
    this.app.get('/rest/api/2/applicationrole', (req, res) => {
      res.json([
        { key: 'jira-software', name: 'JIRA Software' },
        { key: 'jira-core', name: 'JIRA Core' },
      ]);
    });

    // Attachment (mock)
    this.app.get('/rest/api/2/attachment/:id', (req, res) => {
      const { id } = req.params;
      res.json({
        id,
        filename: 'test-attachment.txt',
        author: MOCK_USER,
        created: '2024-01-01T10:00:00.000+0000',
        size: 1024,
        mimeType: 'text/plain',
        content: `http://localhost:${this.port}/rest/api/2/attachment/content/${id}`,
      });
    });

    // Dashboards
    this.app.get('/rest/api/2/dashboard', (req, res) => {
      res.json({
        startAt: 0,
        maxResults: 50,
        total: 1,
        dashboards: Array.from(dashboards.values()),
      });
    });

    // Filters
    this.app.get('/rest/api/2/filter/favourite', (req, res) => {
      res.json(Array.from(filters.values()));
    });

    // Groups
    this.app.get('/rest/api/2/groups/picker', (req, res) => {
      res.json({
        groups: [
          { name: 'jira-administrators' },
          { name: 'jira-users' },
          { name: 'jira-developers' },
        ],
      });
    });

    // Notification schemes
    this.app.get('/rest/api/2/notificationscheme', (req, res) => {
      res.json({
        startAt: 0,
        maxResults: 50,
        total: 1,
        values: [
          {
            id: '10000',
            name: 'Default Notification Scheme',
            description: 'Default notification scheme',
          },
        ],
      });
    });

    // Permission schemes
    this.app.get('/rest/api/2/permissionscheme', (req, res) => {
      res.json({
        permissionSchemes: [
          {
            id: '10000',
            name: 'Default Permission Scheme',
            description: 'Default permission scheme',
          },
        ],
      });
    });

    // Permissions
    this.app.get('/rest/api/2/permissions', (req, res) => {
      res.json({
        permissions: {
          ADMINISTER: { key: 'ADMINISTER', name: 'Administer JIRA' },
          BROWSE_PROJECTS: { key: 'BROWSE_PROJECTS', name: 'Browse Projects' },
          CREATE_ISSUES: { key: 'CREATE_ISSUES', name: 'Create Issues' },
          EDIT_ISSUES: { key: 'EDIT_ISSUES', name: 'Edit Issues' },
        },
      });
    });

    // Workflows
    this.app.get('/rest/api/2/workflow', (req, res) => {
      res.json([
        {
          name: 'jira',
          description: 'Default JIRA workflow',
          lastModifiedDate: '2024-01-01T00:00:00.000+0000',
          lastModifiedUser: 'admin',
        },
      ]);
    });

    // Workflow schemes
    this.app.get('/rest/api/2/workflowscheme', (req, res) => {
      res.json({
        startAt: 0,
        maxResults: 50,
        total: 1,
        values: [
          {
            id: '10000',
            name: 'Default Workflow Scheme',
            description: 'Default workflow scheme',
            defaultWorkflow: 'jira',
          },
        ],
      });
    });

    // Search GET endpoint
    this.app.get('/rest/api/2/search', (req, res) => {
      const { jql, startAt = 0, maxResults = 50 } = req.query;

      console.log(chalk.yellow(`[JIRA EMULATOR] Search JQL (GET): ${jql}`));

      let allIssues = Array.from(issues.values()).filter(issue => issue.key);

      if (jql && jql.includes('TEST')) {
        allIssues = allIssues.filter(issue => issue.key.startsWith('TEST'));
      }

      const total = allIssues.length;
      const paginatedIssues = allIssues.slice(Number(startAt), Number(startAt) + Number(maxResults));

      res.json({
        expand: 'schema,names',
        startAt: Number(startAt),
        maxResults: Number(maxResults),
        total,
        issues: paginatedIssues,
      });
    });

    // Agile endpoints
    this.app.get('/rest/agile/1.0/board', (req, res) => {
      res.json({
        maxResults: 50,
        startAt: 0,
        total: boards.size,
        values: Array.from(boards.values()),
      });
    });

    this.app.get('/rest/agile/1.0/board/:boardId/sprint', (req, res) => {
      const { boardId } = req.params;
      
      if (!boards.has(boardId)) {
        res.status(404).json({
          errorMessages: ['Board Does Not Exist'],
          errors: {},
        });
        return;
      }

      const boardSprints = Array.from(sprints.values()).filter(s => s.originBoardId == boardId);
      
      res.json({
        maxResults: 50,
        startAt: 0,
        total: boardSprints.length,
        values: boardSprints,
      });
    });

    this.app.get('/rest/agile/1.0/board/:boardId/issue', (req, res) => {
      const { boardId } = req.params;
      
      if (!boards.has(boardId)) {
        res.status(404).json({
          errorMessages: ['Board Does Not Exist'],
          errors: {},
        });
        return;
      }

      const boardIssues = Array.from(issues.values()).filter(issue => issue.key && issue.key.startsWith('TEST'));
      
      res.json({
        maxResults: 50,
        startAt: 0,
        total: boardIssues.length,
        issues: boardIssues,
      });
    });

    this.app.get('/rest/agile/1.0/sprint/:sprintId/issue', (req, res) => {
      const { sprintId } = req.params;
      
      if (!sprints.has(sprintId)) {
        res.status(404).json({
          errorMessages: ['Sprint Does Not Exist'],
          errors: {},
        });
        return;
      }

      const sprintIssues = Array.from(issues.values()).filter(issue => issue.key && issue.key.startsWith('TEST'));
      
      res.json({
        maxResults: 50,
        startAt: 0,
        total: sprintIssues.length,
        issues: sprintIssues,
      });
    });

    this.app.post('/rest/agile/1.0/sprint', (req, res) => {
      const newSprint = {
        id: ++sprintCounter,
        name: req.body.name,
        state: req.body.state || 'future',
        originBoardId: req.body.originBoardId,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        goal: req.body.goal,
      };

      sprints.set(newSprint.id.toString(), newSprint);

      console.log(chalk.green(`[JIRA EMULATOR] Created sprint: ${newSprint.name}`));
      res.status(201).json(newSprint);
    });

    this.app.put('/rest/agile/1.0/sprint/:sprintId', (req, res) => {
      const { sprintId } = req.params;
      const sprint = sprints.get(sprintId);

      if (!sprint) {
        res.status(404).json({
          errorMessages: ['Sprint Does Not Exist'],
          errors: {},
        });
        return;
      }

      Object.assign(sprint, req.body);

      console.log(chalk.green(`[JIRA EMULATOR] Updated sprint: ${sprint.name}`));
      res.json(sprint);
    });

    // Fallback для неподдерживаемых эндпоинтов
    this.app.use((req, res) => {
      if (req.path.startsWith('/rest/api/2/')) {
        console.log(chalk.red(`[JIRA EMULATOR] Unsupported endpoint: ${req.method} ${req.path}`));
        res.status(404).json({
          errorMessages: ['Endpoint not implemented in emulator'],
          errors: {},
        });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(chalk.green(`🚀 JIRA Emulator started on port ${this.port}`));
        console.log(chalk.blue(`📍 Base URL: http://localhost:${this.port}`));
        console.log(chalk.yellow(`🔐 Use any credentials for authentication`));
        resolve();
      });
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log(chalk.red('🛑 JIRA Emulator stopped'));
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getBaseUrl() {
    return `http://localhost:${this.port}`;
  }
}

// Если запущен напрямую, запускаем эмулятор
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('jira-emulator.js')) {
  async function runStandaloneEmulator() {
    console.log('🚀 Starting JIRA Emulator...');

    const emulator = new JiraEmulator(8080);

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down emulator...');
      await emulator.stop();
      process.exit(0);
    });

    await emulator.start();

    // Keep the process alive
    try {
      process.stdin.setRawMode(true);
    } catch (e) {
      // setRawMode might not be available in some environments
    }
    process.stdin.resume();
    process.stdin.on('data', () => {}); // Keep alive
  }

  runStandaloneEmulator().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}