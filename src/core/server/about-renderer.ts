/**
 * About page renderer with template substitution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import { appConfig } from '../../bootstrap/init-config.js';
import type { JCConfig, ServerConfig } from '../../types/index.js';

const logger = createLogger('about-renderer');

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AboutPageData {
  serviceTitle: string;
  serviceIcon: string;
  serviceDescription: string;
  serviceMode: string;
  serviceVersion: string;
  serviceUrl: string;
  serviceUrlLabel: string;
  externalServiceUrl: string;
  toolsCount: number;
  authStatus: string;
  authStatusClass: string;
  statusText: string;
  statusClass: string;
  uptime: string;
  serverName: string;
  startTime: string;
  additionalLinks?: Array<{ title: string; url: string }>;
}

export class AboutPageRenderer {
  private htmlTemplate!: string;
  private cssContent!: string;
  private serverConfig: ServerConfig;
  private serviceConfig: JCConfig;
  private toolsCount: number;
  private startTime: Date;

  constructor(serverConfig: ServerConfig, serviceConfig: JCConfig, toolsCount: number = 0) {
    this.serverConfig = serverConfig;
    this.serviceConfig = serviceConfig;
    this.toolsCount = toolsCount;
    this.startTime = new Date();

    // Load templates
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      const htmlPath = path.join(__dirname, 'about-page.html');
      const cssPath = path.join(__dirname, 'about-page.css');

      this.htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
      this.cssContent = fs.readFileSync(cssPath, 'utf8');

      logger.info('About page templates loaded successfully');
    } catch (error) {
      logger.error('Failed to load about page templates', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to load about page templates');
    }
  }

  private getServiceInfo(): { title: string; icon: string; description: string; mode: string } {
    const mcpService = process.env.MCP_SERVICE?.toLowerCase();

    if (mcpService === 'jira') {
      return {
        title: 'JIRA',
        icon: '🎫',
        description: 'Atlassian JIRA project management and issue tracking',
        mode: 'jira'
      };
    } else if (mcpService === 'confluence') {
      return {
        title: 'Confluence',
        icon: '📖',
        description: 'Atlassian Confluence knowledge management and documentation',
        mode: 'confluence'
      };
    } else {
      return {
        title: 'Atlassian',
        icon: '🏢',
        description: 'Atlassian JIRA and Confluence integration',
        mode: 'combined'
      };
    }
  }

  private getServiceUrl(): { url: string; label: string; externalUrl: string } {
    const mcpService = process.env.MCP_SERVICE?.toLowerCase();

    if (mcpService === 'jira') {
      const uiUrl = process.env.UI_JIRA_URL || process.env.JIRA_URL;
      return {
        url: uiUrl || this.serviceConfig.url || 'Not configured',
        label: 'JIRA URL',
        externalUrl: uiUrl || this.serviceConfig.url || '#'
      };
    } else if (mcpService === 'confluence') {
      const uiUrl = process.env.UI_CONFLUENCE_URL || process.env.CONFLUENCE_URL;
      return {
        url: uiUrl || this.serviceConfig.url || 'Not configured',
        label: 'Confluence URL',
        externalUrl: uiUrl || this.serviceConfig.url || '#'
      };
    } else {
      // Combined mode - show both URLs if available
      const jiraUrl = process.env.UI_JIRA_URL || process.env.JIRA_URL;
      const confluenceUrl = process.env.UI_CONFLUENCE_URL || process.env.CONFLUENCE_URL;

      if (jiraUrl && confluenceUrl) {
        return {
          url: `JIRA: ${jiraUrl}, Confluence: ${confluenceUrl}`,
          label: 'Service URLs',
          externalUrl: jiraUrl // Default to JIRA for external link
        };
      } else if (jiraUrl) {
        return {
          url: jiraUrl,
          label: 'JIRA URL',
          externalUrl: jiraUrl
        };
      } else if (confluenceUrl) {
        return {
          url: confluenceUrl,
          label: 'Confluence URL',
          externalUrl: confluenceUrl
        };
      } else {
        return {
          url: 'Not configured',
          label: 'Service URL',
          externalUrl: '#'
        };
      }
    }
  }

  private getAuthStatus(): { status: string; statusClass: string } {
    // Check if any authentication method is configured
    const auth = this.serviceConfig.auth;
    let hasAuth = false;

    if (auth) {
      switch (auth.type) {
        case 'basic':
          hasAuth = !!(auth.username && auth.password);
          break;
        case 'pat':
          hasAuth = !!auth.token;
          break;
        case 'oauth2':
          hasAuth = !!(auth.clientId && auth.clientSecret && auth.accessToken);
          break;
      }
    }

    return {
      status: hasAuth ? 'Configured' : 'Missing',
      statusClass: hasAuth ? 'configured' : 'missing'
    };
  }

  private getUptime(): string {
    const uptimeMs = Date.now() - this.startTime.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private substitutePlaceholders(template: string, data: AboutPageData): string {
    return template
      .replace(/\{\{SERVICE_TITLE\}\}/g, data.serviceTitle)
      .replace(/\{\{SERVICE_ICON\}\}/g, data.serviceIcon)
      .replace(/\{\{SERVICE_DESCRIPTION\}\}/g, data.serviceDescription)
      .replace(/\{\{SERVICE_MODE\}\}/g, data.serviceMode)
      .replace(/\{\{SERVICE_VERSION\}\}/g, data.serviceVersion)
      .replace(/\{\{SERVICE_URL\}\}/g, data.serviceUrl)
      .replace(/\{\{SERVICE_URL_LABEL\}\}/g, data.serviceUrlLabel)
      .replace(/\{\{EXTERNAL_SERVICE_URL\}\}/g, data.externalServiceUrl)
      .replace(/\{\{TOOLS_COUNT\}\}/g, data.toolsCount.toString())
      .replace(/\{\{AUTH_STATUS\}\}/g, data.authStatus)
      .replace(/\{\{AUTH_STATUS_CLASS\}\}/g, data.authStatusClass)
      .replace(/\{\{STATUS_TEXT\}\}/g, data.statusText)
      .replace(/\{\{STATUS_CLASS\}\}/g, data.statusClass)
      .replace(/\{\{UPTIME\}\}/g, data.uptime)
      .replace(/\{\{SERVER_NAME\}\}/g, data.serverName)
      .replace(/\{\{START_TIME\}\}/g, data.startTime)
      // Handle conditional sections for additional links
      .replace(/\{\{#ADDITIONAL_LINKS\}\}[\s\S]*?\{\{\/ADDITIONAL_LINKS\}\}/g,
        data.additionalLinks && data.additionalLinks.length > 0
          ? data.additionalLinks.map(link =>
              `<a href="${link.url}" target="_blank" rel="noopener" class="link-button tertiary">
                <svg class="link-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                ${link.title}
              </a>`
            ).join('')
          : ''
      );
  }

  public setToolsCount(count: number): void {
    this.toolsCount = count;
  }

  public renderHtml(): string {
    const serviceInfo = this.getServiceInfo();
    const serviceUrls = this.getServiceUrl();
    const authStatus = this.getAuthStatus();

    const data: AboutPageData = {
      serviceTitle: serviceInfo.title,
      serviceIcon: serviceInfo.icon,
      serviceDescription: serviceInfo.description,
      serviceMode: serviceInfo.mode,
      serviceVersion: appConfig.version,
      serviceUrl: serviceUrls.url,
      serviceUrlLabel: serviceUrls.label,
      externalServiceUrl: serviceUrls.externalUrl,
      toolsCount: this.toolsCount,
      authStatus: authStatus.status,
      authStatusClass: authStatus.statusClass,
      statusText: 'Server Online',
      statusClass: 'online',
      uptime: this.getUptime(),
      serverName: appConfig.name,
      startTime: this.startTime.toISOString(),
      additionalLinks: [
        {
          title: 'GitHub Repository',
          url: 'https://github.com/anthropics/mcp'
        }
      ]
    };

    return this.substitutePlaceholders(this.htmlTemplate, data);
  }

  public renderCss(): string {
    return this.cssContent;
  }

  public renderFullPage(): string {
    const html = this.renderHtml();
    const css = this.renderCss();

    // Inject CSS into HTML
    return html.replace('<link rel="stylesheet" href="/about.css">', `<style>${css}</style>`);
  }
}

export function createAboutPageRenderer(
  serverConfig: ServerConfig,
  serviceConfig: JCConfig,
  toolsCount: number = 0
): AboutPageRenderer {
  return new AboutPageRenderer(serverConfig, serviceConfig, toolsCount);
}