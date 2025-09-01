# Contributing to MCP Atlassian TypeScript Server

Thank you for your interest in contributing to the MCP Atlassian TypeScript Server! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Implement features or fix bugs
- **Documentation**: Improve docs, examples, or tutorials
- **Testing**: Add test cases or improve test coverage
- **Performance**: Optimize code or reduce resource usage

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/mcp-atlassian-typescript.git
   cd mcp-atlassian-typescript
   ```

2. **Set Up Development Environment**
   ```bash
   npm install
   cp .env.example .env
   # Configure your .env file with test credentials
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

## 📋 Development Guidelines

### Code Style

We use strict TypeScript and comprehensive linting:

```bash
# Check code style
npm run lint
npm run typecheck

# Auto-fix issues
npm run lint:fix
npm run format
```

**Key Requirements**:
- Use TypeScript strict mode
- Follow ESLint rules
- Maintain type safety
- Write comprehensive JSDoc comments

### Testing

All contributions must include appropriate tests:

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- --testPathPattern=jira
```

**Testing Requirements**:
- Maintain >70% test coverage
- Include unit tests for new functions
- Add integration tests for new tools
- Test error conditions
- Mock external API calls

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

**Examples**:
```
feat(jira): add support for issue watchers
fix(auth): handle token refresh edge case
docs: update API reference for new tools
test(confluence): add integration tests for page creation
```

## 🐛 Bug Reports

### Before Submitting

1. **Search existing issues** to avoid duplicates
2. **Use the latest version** to ensure the bug hasn't been fixed
3. **Test with minimal configuration** to isolate the issue

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 18.17.0]
- Version: [e.g., 2.0.0]

## Configuration
```yaml
# Relevant parts of your .env file (redact sensitive info)
ATLASSIAN_URL=https://your-domain.atlassian.net
TRANSPORT_TYPE=http
LOG_LEVEL=debug
```

## Additional Context
Any other context about the problem.

## Logs
```
Relevant log output (with sensitive information redacted)
```
```

## 💡 Feature Requests

### Before Submitting

1. **Check existing requests** to avoid duplicates
2. **Consider the scope** - does it fit the project goals?
3. **Think about implementation** - is it technically feasible?

### Feature Request Template

```markdown
## Feature Summary
Brief description of the feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this feature work?

## Alternative Solutions
Other approaches considered.

## Use Cases
- As a [user type], I want [goal] so that [benefit]
- ...

## Implementation Notes
Technical considerations or suggestions.

## Breaking Changes
Would this introduce breaking changes?
```

## 🔧 Code Contributions

### Architecture Overview

```
src/
├── core/           # Core systems (auth, cache, config, etc.)
├── domains/        # Domain-specific logic (JIRA, Confluence)
├── types/          # TypeScript type definitions
└── index.ts        # Main entry point
```

### Adding New Tools

1. **Define Types** (if needed)
   ```typescript
   // src/types/jira.ts
   export interface NewJiraFeature {
     id: string;
     name: string;
     // ... other properties
   }
   ```

2. **Implement Client Method**
   ```typescript
   // src/domains/jira/client.ts
   async getNewFeature(id: string): Promise<NewJiraFeature> {
     return withErrorHandling(async () => {
       const response = await this.httpClient.get(`/rest/api/2/newfeature/${id}`);
       return response.data;
     });
   }
   ```

3. **Create MCP Tool**
   ```typescript
   // src/domains/jira/tools.ts
   {
     name: 'jira_get_new_feature',
     description: 'Get new JIRA feature by ID',
     inputSchema: {
       type: 'object',
       properties: {
         id: {
           type: 'string',
           description: 'Feature ID',
         },
       },
       required: ['id'],
     },
   }
   ```

4. **Add Tool Handler**
   ```typescript
   // src/domains/jira/tools.ts
   private async getNewFeature(args: any) {
     const { id } = args;
     const feature = await this.client.getNewFeature(id);
     
     return {
       content: [{
         type: 'text',
         text: `**Feature: ${feature.name}**\n\nID: ${feature.id}`
       }],
     };
   }
   ```

5. **Add Tests**
   ```typescript
   // __tests__/domains/jira/tools.test.ts
   describe('jira_get_new_feature', () => {
     it('should return feature details', async () => {
       // Test implementation
     });
   });
   ```

### Performance Considerations

- **Use caching** for expensive operations
- **Implement pagination** for large datasets
- **Add proper error handling** with retries
- **Consider rate limiting** impacts

### Security Considerations

- **Validate all inputs** using schemas
- **Mask sensitive data** in logs
- **Follow least privilege** principle
- **Handle errors gracefully** without leaking information

## 🧪 Testing Guidelines

### Test Structure

```
__tests__/
├── setup.ts                    # Test configuration
├── core/                      # Core system tests
│   ├── auth/
│   ├── cache/
│   └── config/
├── domains/                   # Domain tests
│   ├── jira/
│   └── confluence/
└── integration/               # Integration tests
```

### Writing Tests

**Unit Tests**:
```typescript
import { JiraClient } from '../../../src/domains/jira/client.js';
import { testUtils } from '../../setup.js';

describe('JiraClient', () => {
  let client: JiraClient;

  beforeEach(() => {
    client = new JiraClient(testConfig);
  });

  it('should get issue by key', async () => {
    const mockIssue = testUtils.mockJiraIssue;
    jest.spyOn(client, 'getIssue').mockResolvedValue(mockIssue);

    const result = await client.getIssue('TEST-123');
    expect(result).toEqual(mockIssue);
    expect(result.key).toBeValidJiraKey();
  });
});
```

**Integration Tests**:
```typescript
import { McpAtlassianServer } from '../../src/core/server/index.js';

describe('Integration: JIRA Tools', () => {
  let server: McpAtlassianServer;

  beforeAll(async () => {
    server = createTestServer();
  });

  it('should execute jira_get_issue tool', async () => {
    const result = await server.executeTool('jira_get_issue', {
      issueKey: 'TEST-123'
    });
    
    expect(result.content[0].text).toContain('TEST-123');
  });
});
```

## 📖 Documentation

### Documentation Types

- **README.md**: Main project documentation
- **API Reference**: Tool specifications and examples
- **Code Comments**: JSDoc comments for functions/classes
- **Examples**: Usage examples and tutorials

### Writing Documentation

**JSDoc Example**:
```typescript
/**
 * Get a JIRA issue by key or ID with optional field expansion
 * 
 * @param issueIdOrKey - The issue key (e.g., 'PROJ-123') or numeric ID
 * @param options - Additional options for the request
 * @param options.expand - Fields to expand in the response
 * @param options.fields - Specific fields to return
 * @returns Promise resolving to the JIRA issue
 * 
 * @example
 * ```typescript
 * const issue = await client.getIssue('PROJ-123', {
 *   expand: ['changelog', 'transitions'],
 *   fields: ['summary', 'status']
 * });
 * ```
 */
async getIssue(
  issueIdOrKey: string, 
  options: GetIssueOptions = {}
): Promise<JiraIssue> {
  // Implementation...
}
```

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **Major** (X.y.z): Breaking changes
- **Minor** (x.Y.z): New features, backward compatible
- **Patch** (x.y.Z): Bug fixes, backward compatible

### Release Steps

1. **Prepare Release**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

2. **Update Version**
   ```bash
   npm version [major|minor|patch]
   ```

3. **Update Changelog**
   - Add new version section
   - List all changes since last release
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

4. **Create Release**
   - Create GitHub release
   - Include release notes
   - Attach built artifacts

## 🤔 Questions and Support

### Getting Help

- **GitHub Discussions**: For general questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Email**: contact@example.com for sensitive inquiries

### Community Guidelines

- **Be respectful** and professional
- **Search before asking** to avoid duplicates
- **Provide context** when asking questions
- **Help others** when you can

## 📜 Legal

### Contributor License Agreement

By contributing to this project, you agree that:

1. Your contributions will be licensed under the MIT License
2. You have the right to submit your contributions
3. Your contributions are your original work or you have permission to submit them

### Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

---

**Thank you for contributing to the MCP Atlassian TypeScript Server!** 🎉

Your contributions help make this project better for everyone in the community.
