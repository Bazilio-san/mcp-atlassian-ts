import './dotenv';  // Load environment variables first
import config from 'config';
import { IConfig } from '../../_types_/config';

// Convert config object to typed interface
export const appConfig: IConfig = config.util.toObject() as IConfig;

// Optional: Validate required configuration
const validateConfig = () => {
  // Validate Atlassian URL is present
  if (!appConfig.atlassian.url) {
    throw new Error('ATLASSIAN_URL configuration is missing');
  }

  // Validate authentication is configured
  const hasApiToken = appConfig.atlassian.auth?.apiToken;
  const hasPat = appConfig.atlassian.auth?.pat;
  const hasOAuth = appConfig.atlassian.auth?.oauth2?.clientId;

  if (!hasApiToken && !hasPat && !hasOAuth) {
    throw new Error('No authentication method configured. Please provide API Token, PAT, or OAuth2 credentials');
  }
};

validateConfig();