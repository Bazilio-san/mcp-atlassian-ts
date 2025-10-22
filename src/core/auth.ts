/**
 * Authentication system for Atlassian APIs
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosRequestHeaders } from 'axios';

import { AuthenticationError } from './errors.js';
import { createLogger, getDebug } from './utils/logger.js';
import { logHttpTransaction, getCurrentToolName, setCurrentToolName } from './utils/http-logger.js';
import { appConfig } from '../bootstrap/init-config.js';

import type { AuthConfig, HttpClientConfig } from '../types';

const logger = createLogger('auth');
const debug = getDebug('headers-to-api');

/**
 * Authentication manager for different auth methods
 */
export class AuthenticationManager {
  private authConfig: AuthConfig;
  private httpClient: AxiosInstance;

  constructor (authConfig: AuthConfig, httpConfig: HttpClientConfig) {
    this.authConfig = authConfig;
    this.httpClient = this.createHttpClient(httpConfig);
  }

  /**
   * Create configured HTTP client
   */
  private createHttpClient (config: HttpClientConfig): AxiosInstance {
    const client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `${appConfig.name}/${appConfig.version}`,
        ...config.headers,
      },
    });

    // Add request interceptor for authentication
    client.interceptors.request.use(
      requestConfig => {
        const configWithAuth = this.addAuthenticationHeaders(requestConfig);
        if (debug.enabled) {
          const headers = `\nheaders-to-api:\n${Object.entries(configWithAuth.headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
          console.log(headers);
        }
        return configWithAuth;
      },
      error => Promise.reject(error),
    );

    // Add response interceptor for error handling and logging
    client.interceptors.response.use(
      response => {
        // Log successful HTTP transaction
        logHttpTransaction(getCurrentToolName(), response.config, response);
        return response;
      },
      async error => {
        // Log failed HTTP transaction
        logHttpTransaction(getCurrentToolName(), error.config, undefined, error);

        // Handle 401 errors by attempting token refresh if using OAuth
        if (error.response?.status === 401 && this.authConfig.type === 'oauth2') {
          try {
            await this.refreshOAuthToken();
            // Retry the original request
            return client.request(error.config);
          } catch (refreshError) {
            logger.error('Failed to refresh OAuth token', refreshError instanceof Error ? refreshError : new Error(String(refreshError)));
            throw new AuthenticationError('Authentication failed - token refresh failed');
          }
        }
        return Promise.reject(error);
      },
    );

    return client;
  }

  /**
   * Add authentication headers based on auth type
   */
  private addAuthenticationHeaders (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }

    switch (this.authConfig.type) {
      case 'basic':
        const basicAuth = Buffer.from(`${this.authConfig.username}:${this.authConfig.password}`).toString('base64');
        config.headers.Authorization = `Basic ${basicAuth}`;
        break;

      case 'pat':
        config.headers.Authorization = `Bearer ${this.authConfig.token}`;
        break;

      case 'oauth2':
        config.headers.Authorization = `Bearer ${this.authConfig.accessToken}`;
        break;

      default:
        throw new AuthenticationError('Unsupported authentication type');
    }

    return config;
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  private async refreshOAuthToken (): Promise<void> {
    if (this.authConfig.type !== 'oauth2' || !this.authConfig.refreshToken) {
      throw new AuthenticationError('OAuth refresh token not available');
    }

    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'refresh_token',
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret,
          refresh_token: this.authConfig.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const { access_token, refresh_token } = response.data;

      // Update the auth config with new tokens
      this.authConfig.accessToken = access_token;
      if (refresh_token) {
        this.authConfig.refreshToken = refresh_token;
      }

      logger.info('OAuth token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh OAuth token', error instanceof Error ? error : new Error(String(error)));
      throw new AuthenticationError('Failed to refresh OAuth token');
    }
  }

  /**
   * Test authentication by making a simple API call
   */
  async testAuthentication (baseUrl: string): Promise<boolean> {
    try {
      logger.info('Testing authentication...');
      setCurrentToolName('serverInfo');

      // Test with a simple API call
      const response = await this.httpClient.get('/rest/api/2/serverInfo', {
        baseURL: baseUrl,
      });

      if (response.status === 200) {
        logger.info('Authentication test successful');
        return true;
      }

      return false;
    } catch (error: Error | any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Authentication test failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get the configured HTTP client
   */
  getHttpClient (): AxiosInstance {
    return this.httpClient;
  }

  /**
   * Get current auth configuration (without sensitive data)
   */
  getAuthInfo () {
    const { type } = this.authConfig;

    switch (type) {
      case 'basic':
        return {
          type,
          username: this.authConfig.username,
          hasPassword: !!this.authConfig.password,
        };
      case 'pat':
        return {
          type,
          hasToken: !!this.authConfig.token,
        };
      case 'oauth2':
        return {
          type,
          clientId: this.authConfig.clientId,
          hasAccessToken: !!this.authConfig.accessToken,
          hasRefreshToken: !!this.authConfig.refreshToken,
        };
      default:
        return { type: 'unknown' };
    }
  }

  /**
   * Update authentication configuration
   */
  updateAuthConfig (newConfig: AuthConfig): void {
    this.authConfig = newConfig;
    logger.info('Authentication configuration updated', { type: newConfig.type });
  }
}

/**
 * OAuth authorization flow helpers
 */
export class OAuthFlowManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];

  constructor (clientId: string, clientSecret: string, redirectUri: string, scopes: string[] = []) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.scopes =
      scopes.length > 0
        ? scopes
        : [
          'read:jira-work',
          'write:jira-work',
          'read:confluence-content.summary',
          'write:confluence-content',
          'read:confluence-space.summary',
        ];
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl (state?: string): string {
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId,
      scope: this.scopes.join(' '),
      redirect_uri: this.redirectUri,
      state: state || Math.random().toString(36).substring(7),
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken (code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.post(
        'https://auth.atlassian.com/oauth/token',
        {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      logger.info('OAuth token exchange successful');

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      };
    } catch (error) {
      logger.error('OAuth token exchange failed', error instanceof Error ? error : new Error(String(error)));
      throw new AuthenticationError('Failed to exchange authorization code for token');
    }
  }

  /**
   * Get accessible resources (cloud instances) for the user
   */
  async getAccessibleResources (accessToken: string): Promise<
    Array<{
      id: string;
      url: string;
      name: string;
      scopes: string[];
    }>
  > {
    try {
      const response = await axios.get(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      );

      return response.data.map((resource: any) => ({
        id: resource.id,
        url: resource.url,
        name: resource.name,
        scopes: resource.scopes || [],
      }));
    } catch (error) {
      logger.error('Failed to get accessible resources', error instanceof Error ? error : new Error(String(error)));
      throw new AuthenticationError('Failed to get accessible resources');
    }
  }
}

/**
 * Create authentication manager from configuration
 */
export function createAuthenticationManager (
  authConfig: AuthConfig,
  baseUrl: string,
  timeout: number = 30000,
): AuthenticationManager {
  const httpConfig: HttpClientConfig = {
    baseURL: baseUrl,
    timeout,
    headers: {},
    maxRetries: 3,
    retryDelay: 1000,
  };

  return new AuthenticationManager(authConfig, httpConfig);
}

/**
 * Create authentication manager from custom headers
 * Used for header-based authentication mode
 */
export function createAuthenticationManagerFromHeaders (
  customHeaders: Record<string, string>,
  baseUrl: string,
  timeout: number = 30000,
): AuthenticationManager {
  // Convert custom headers to auth config
  const authConfig = buildAuthConfigFromHeaders(customHeaders);

  const httpConfig: HttpClientConfig = {
    baseURL: baseUrl,
    timeout,
    headers: {},
    maxRetries: 3,
    retryDelay: 1000,
  };

  return new AuthenticationManager(authConfig, httpConfig);
}

/**
 * Build authentication config from custom headers
 */
function buildAuthConfigFromHeaders (headers: Record<string, string>): AuthConfig {
  // Check for PAT token
  const patToken = headers['x-jira-token'] || headers['x-confluence-token'];
  if (patToken) {
    return {
      type: 'pat',
      token: patToken,
    };
  }

  // Check for Basic Auth credentials
  const username = headers['x-jira-username'] || headers['x-confluence-username'];
  const password = headers['x-jira-password'] || headers['x-confluence-password'];
  if (username && password) {
    return {
      type: 'basic',
      username,
      password,
    };
  }

  throw new Error('No valid authentication headers found');
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig (authConfig: AuthConfig): void {
  switch (authConfig.type) {
    case 'basic':
      if (!authConfig.username || !authConfig.password) {
        throw new AuthenticationError('Basic auth requires both username and password');
      }
      break;
    case 'pat':
      if (!authConfig.token) {
        throw new AuthenticationError('PAT auth requires token');
      }
      break;
    case 'oauth2':
      if (!authConfig.clientId || !authConfig.clientSecret || !authConfig.accessToken) {
        throw new AuthenticationError(
          'OAuth2 auth requires clientId, clientSecret, and accessToken',
        );
      }
      break;
    default:
      throw new AuthenticationError('Invalid authentication type');
  }
}
