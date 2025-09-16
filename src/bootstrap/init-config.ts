import './dotenv.js';  // Load environment variables first
import config from 'config';
import { IConfig } from '../types/config';

// Convert config object to typed interface
export const appConfig: IConfig = config.util.toObject() as IConfig;

const { confluence, jira } = appConfig;
// Optional: Validate required configuration
const validateConfig = () => {
  const serviceMode = appConfig.server.serviceMode;

  // Validate service-specific configuration based on MCP_SERVICE
  if (serviceMode === 'jira' || !serviceMode) {
    // Validate JIRA configuration
    if (!jira.url) {
      throw new Error('JIRA URL configuration is missing. Please provide JIRA_URL or set it in config.');
    }

    // Validate JIRA authentication is configured
    const hasBasicAuth = jira.auth?.basic?.username && jira.auth?.basic?.password;
    const hasPat = jira.auth?.pat;
    const hasOAuth = jira.auth?.oauth2?.clientId;

    if (!hasBasicAuth && !hasPat && !hasOAuth) {
      throw new Error('No JIRA authentication method configured. Please provide Basic Auth (username/password), PAT, or OAuth2 credentials');
    }
  }

  if (serviceMode === 'confluence') {
    // Validate Confluence configuration
    if (!confluence.url) {
      throw new Error('Confluence URL configuration is missing. Please provide CONFLUENCE_URL or set it in config.');
    }

    // Validate Confluence authentication is configured
    const hasBasicAuth = confluence.auth?.basic?.username && confluence.auth?.basic?.password;
    const hasPat = confluence.auth?.pat;
    const hasOAuth = confluence.auth?.oauth2?.clientId;

    if (!hasBasicAuth && !hasPat && !hasOAuth) {
      throw new Error('No Confluence authentication method configured. Please provide Basic Auth (username/password), PAT, or OAuth2 credentials');
    }
  }
};

validateConfig();
