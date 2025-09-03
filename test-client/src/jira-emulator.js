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
let issueCounter = 1;
let commentCounter = 1;

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