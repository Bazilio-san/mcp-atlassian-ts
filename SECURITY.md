# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in the MCP Atlassian TypeScript Server, please report it responsibly:

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Send an email to: security@example.com
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if available)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 24 hours
- **Initial Assessment**: We will provide an initial assessment within 72 hours
- **Updates**: We will keep you informed of our progress at least every 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 90 days

### Security Measures

Our security approach includes:

#### Authentication & Authorization
- Multi-method authentication support (Basic Auth, PAT, OAuth 2.0)
- Secure credential storage and transmission
- Input validation and sanitization
- Rate limiting to prevent abuse

#### Data Protection
- PII masking in logs and error messages
- Secure HTTP client configuration
- No sensitive data caching
- Proper error handling without information leakage

#### Infrastructure Security
- Non-root Docker containers
- Resource limits and health checks
- Secure default configurations
- Regular dependency updates

#### Code Security
- Static code analysis with ESLint security rules
- Type safety with strict TypeScript
- Comprehensive test coverage
- Automated vulnerability scanning

### Security Best Practices

When deploying the MCP Atlassian TypeScript Server:

#### Environment Security
```bash
# Use strong, unique credentials
ATLASSIAN_API_TOKEN="use-a-strong-unique-token"

# Enable SSL/TLS verification
NODE_TLS_REJECT_UNAUTHORIZED=1
SSL_VERIFY_PEER=true

# Use secure session secrets
SESSION_SECRET="use-a-cryptographically-secure-random-string"
```

#### Network Security
- Deploy behind a reverse proxy (nginx, Apache)
- Use HTTPS in production
- Implement proper firewall rules
- Consider VPN or IP allowlisting

#### Operational Security
- Regularly update dependencies
- Monitor logs for suspicious activity
- Implement proper backup strategies
- Use dedicated service accounts

### Known Security Considerations

#### Rate Limiting
The server implements rate limiting, but you should also implement additional protection at the infrastructure level:

```yaml
# Example nginx rate limiting
location /mcp {
    limit_req zone=api burst=10 nodelay;
    proxy_pass http://localhost:3000;
}
```

#### OAuth 2.0 Security
When using OAuth 2.0:
- Store tokens securely
- Implement proper token rotation
- Use appropriate scopes
- Monitor token usage

#### Docker Security
When using Docker:
```dockerfile
# Good: Non-root user
USER mcp

# Good: Read-only filesystem where possible
--read-only --tmpfs /tmp

# Good: Resource limits
--memory=512m --cpus=0.5
```

### Vulnerability Response Process

1. **Triage** (24 hours)
   - Acknowledge receipt
   - Initial risk assessment
   - Assign severity level

2. **Investigation** (72 hours)
   - Reproduce the vulnerability
   - Assess impact and scope
   - Develop remediation plan

3. **Development** (varies by severity)
   - Implement fix
   - Test thoroughly
   - Prepare security advisory

4. **Release** (coordinated disclosure)
   - Release patched version
   - Publish security advisory
   - Credit reporter (if desired)

### Security Contacts

- **Security Team**: security@example.com
- **General Inquiries**: contact@example.com
- **GitHub Security**: Use GitHub's private vulnerability reporting

### Attribution

We believe in responsible disclosure and will credit researchers who report vulnerabilities responsibly, unless they prefer to remain anonymous.

### Legal

This security policy is subject to our [Terms of Service](https://example.com/terms) and [Privacy Policy](https://example.com/privacy).

---

**Last Updated**: January 1, 2024
**Version**: 2.0.0