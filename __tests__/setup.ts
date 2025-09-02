/**
 * Jest test setup file
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit to prevent tests from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
  throw new Error(`Process.exit called with code: ${code}`);
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJiraKey(): R;
      toBeValidConfluencePageId(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidJiraKey(received: string) {
    const jiraKeyPattern = /^[A-Z][A-Z0-9_]*-[0-9]+$/;
    const pass = jiraKeyPattern.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JIRA key`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JIRA key (format: PROJ-123)`,
        pass: false,
      };
    }
  },
  
  toBeValidConfluencePageId(received: string) {
    const pageIdPattern = /^[0-9]+$/;
    const pass = pageIdPattern.test(received) && received.length > 0;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Confluence page ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Confluence page ID (numeric string)`,
        pass: false,
      };
    }
  },
});

// Cleanup after all tests
afterAll(() => {
  mockExit.mockRestore();
});

// Export utilities for use in tests
export const testUtils = {
  mockJiraIssue: {
    id: '10001',
    key: 'TEST-123',
    self: 'https://test.atlassian.net/rest/api/2/issue/10001',
    fields: {
      summary: 'Test Issue Summary',
      description: 'Test issue description',
      status: {
        id: '1',
        name: 'Open',
        description: 'Issue is open',
        iconUrl: 'https://test.atlassian.net/images/icons/statuses/open.png',
        statusCategory: {
          id: 2,
          key: 'new',
          colorName: 'blue-gray',
          name: 'New',
        },
      },
      priority: {
        id: '3',
        name: 'Medium',
        iconUrl: 'https://test.atlassian.net/images/icons/priorities/medium.svg',
      },
      assignee: {
        self: 'https://test.atlassian.net/rest/api/2/user?accountId=123456',
        accountId: '123456',
        displayName: 'Test User',
        active: true,
        avatarUrls: {
          '48x48': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/48x48.png',
          '24x24': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/24x24.png',
          '16x16': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/16x16.png',
          '32x32': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/32x32.png',
        },
      },
      reporter: {
        self: 'https://test.atlassian.net/rest/api/2/user?accountId=123456',
        accountId: '123456',
        displayName: 'Test User',
        active: true,
        avatarUrls: {
          '48x48': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/48x48.png',
          '24x24': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/24x24.png',
          '16x16': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/16x16.png',
          '32x32': 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/123456/32x32.png',
        },
      },
      created: '2024-01-01T12:00:00.000+0000',
      updated: '2024-01-01T12:30:00.000+0000',
      issuetype: {
        id: '1',
        name: 'Task',
        description: 'A task that needs to be done.',
        iconUrl: 'https://test.atlassian.net/images/icons/issuetypes/task.svg',
        subtask: false,
      },
      project: {
        id: '10000',
        key: 'TEST',
        name: 'Test Project',
        projectTypeKey: 'software',
        avatarUrls: {
          '48x48': 'https://test.atlassian.net/secure/projectavatar?avatarId=10324',
          '24x24': 'https://test.atlassian.net/secure/projectavatar?size=small&avatarId=10324',
          '16x16': 'https://test.atlassian.net/secure/projectavatar?size=xsmall&avatarId=10324',
          '32x32': 'https://test.atlassian.net/secure/projectavatar?size=medium&avatarId=10324',
        },
      },
      labels: ['test', 'example'],
    },
  },
  
  mockConfluencePage: {
    id: '123456',
    type: 'page' as const,
    status: 'current' as const,
    title: 'Test Confluence Page',
    space: {
      id: 98304,
      key: 'TEST',
      name: 'Test Space',
      type: 'global' as const,
      status: 'current' as const,
      _links: {
        webui: '/wiki/spaces/TEST',
        self: 'https://test.atlassian.net/wiki/rest/api/space/TEST',
        base: 'https://test.atlassian.net/wiki',
        context: '/wiki',
      },
    },
    history: {
      latest: true,
      createdBy: {
        type: 'known' as const,
        accountId: '123456',
        displayName: 'Test User',
        profilePicture: {
          path: '/wiki/aa-avatar/123456',
          width: 48,
          height: 48,
          isDefault: false,
        },
      },
      createdDate: '2024-01-01T12:00:00.000Z',
    },
    version: {
      by: {
        type: 'known' as const,
        accountId: '123456',
        displayName: 'Test User',
        profilePicture: {
          path: '/wiki/aa-avatar/123456',
          width: 48,
          height: 48,
          isDefault: false,
        },
      },
      when: '2024-01-01T12:00:00.000Z',
      friendlyWhen: 'January 01, 2024',
      message: 'Initial version',
      number: 1,
      minorEdit: false,
    },
    body: {
      storage: {
        value: '<p>This is test content</p>',
        representation: 'storage' as const,
      },
    },
    _links: {
      webui: '/wiki/spaces/TEST/pages/123456',
      edit: '/wiki/pages/resumedraft.action?draftId=123456',
      tinyui: '/wiki/x/123456',
      self: 'https://test.atlassian.net/wiki/rest/api/content/123456',
      base: 'https://test.atlassian.net/wiki',
      context: '/wiki',
    },
  },
  
  // Helper to create mock HTTP responses
  createMockResponse: (data: any, status = 200) => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
    config: {},
  }),
  
  // Helper to create mock error responses
  createMockError: (status: number, message: string) => {
    const error = new Error(message) as any;
    error.response = {
      status,
      data: { errorMessages: [message] },
      statusText: message,
    };
    return error;
  },
};