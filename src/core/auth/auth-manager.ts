import { Request, Response, NextFunction } from 'express';
import { appConfig } from '../../bootstrap/init-config.js';
import { logger as lgr } from '../utils/logger.js';
import { ServiceModeJC } from '../../types/config';

const logger = lgr.getSubLogger({ name: 'auth-manager' });


export interface AuthContext {
  mode: 'system' | 'headers';
  headers: Record<string, string>;
}

/**
 * Authentication Manager for flexible authentication system
 *
 * Supports two modes:
 * 1. System mode - uses server token + system credentials from config
 * 2. Headers mode - uses per-request authentication headers
 */
export class AuthenticationManager {
  private serverToken: string | undefined;

  constructor () {
    // Load server token from config
    this.serverToken = appConfig.server.token;

    if (this.serverToken) {
      logger.info('Server token authentication enabled');
    } else {
      logger.warn('No server token configured - only header-based authentication available');
    }
  }

  /**
   * Middleware for authentication that determines the mode and sets auth context
   */
  authenticationMiddleware () {
    return (req: Request, res: Response, next: NextFunction) => {
      const providedToken = req.headers['x-server-token'] as string;

      try {
        const authContext = this.createAuthContext(providedToken, req.headers);

        // Attach auth context to request
        (req as any).authContext = authContext;

        logger.info(`${authContext.mode} mode for ${req.method} ${req.path}`);
        next();
      } catch (error) {
        logger.error('Authentication failed:', error); // VVA ERROR

        res.status(401).json({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32001,
            message: 'Authentication failed',
          },
        });
      }
    };
  }

  /**
   * Create authentication context based on provided token and headers
   */
  private createAuthContext (providedToken: string | undefined, headers: any): AuthContext {
    if (this.isValidServerToken(providedToken)) {
      // System mode: use configuration credentials
      logger.debug('Using system authentication mode');
      return {
        mode: 'system',
        headers: this.getSystemAuthHeaders(),
      };
    } else {
      // Header mode: use request headers
      logger.debug('Using header-based authentication mode');
      return {
        mode: 'headers',
        headers: this.extractAuthHeaders(headers),
      };
    }
  }

  /**
   * Validate server token
   */
  private isValidServerToken (token?: string): boolean {
    if (!this.serverToken) {
      return false; // No server token configured
    }

    return !!(token && token === this.serverToken);
  }

  /**
   * Get system authentication headers from configuration
   */
  private getSystemAuthHeaders (): Record<string, string> {
    const headers: Record<string, string> = {};

    // JIRA authentication from config
    const jiraAuth = appConfig.jira.auth;
    if (jiraAuth?.pat) {
      headers['x-jira-token'] = jiraAuth.pat;
    }
    if (jiraAuth?.basic?.username) {
      headers['x-jira-username'] = jiraAuth.basic.username;
    }
    if (jiraAuth?.basic?.password) {
      headers['x-jira-password'] = jiraAuth.basic.password;
    }

    // Confluence authentication from config
    const confluenceAuth = appConfig.confluence.auth;
    if (confluenceAuth?.pat) {
      headers['x-confluence-token'] = confluenceAuth.pat;
    }
    if (confluenceAuth?.basic?.username) {
      headers['x-confluence-username'] = confluenceAuth.basic.username;
    }
    if (confluenceAuth?.basic?.password) {
      headers['x-confluence-password'] = confluenceAuth.basic.password;
    }

    return headers;
  }

  /**
   * Extract authentication headers from request headers
   */
  private extractAuthHeaders (headers: any): Record<string, string> {
    const authHeaders: Record<string, string> = {};

    // Extract only x- headers for authentication (excluding server-token)
    Object.keys(headers).forEach(headerName => {
      const lowerHeaderName = headerName.toLowerCase();
      if (lowerHeaderName.startsWith('x-') &&
        !lowerHeaderName.includes('server-token')) {
        const headerValue = headers[headerName];
        if (typeof headerValue === 'string') {
          authHeaders[lowerHeaderName] = headerValue;
        }
      }
    });

    return authHeaders;
  }

  /**
   * Get authentication context from request
   */
  static getAuthContext (req: Request): AuthContext | undefined {
    return (req as any).authContext;
  }

  /**
   * Check if request is authenticated
   */
  static isAuthenticated (req: Request): boolean {
    const authContext = this.getAuthContext(req);
    return !!(authContext && authContext.headers && Object.keys(authContext.headers).length > 0);
  }

  /**
   * Get service-specific authentication headers
   */
  static getServiceAuthHeaders (req: Request, service: ServiceModeJC): Record<string, string> {
    const authContext = this.getAuthContext(req);
    if (!authContext) {
      return {};
    }

    const serviceHeaders: Record<string, string> = {};
    const prefix = service === 'jira' ? 'x-jira-' : 'x-confluence-';

    Object.keys(authContext.headers).forEach(key => {
      if (key.startsWith(prefix)) {
        const value = authContext.headers[key];
        if (value) {
          serviceHeaders[key] = value;
        }
      }
    });

    return serviceHeaders;
  }
}
