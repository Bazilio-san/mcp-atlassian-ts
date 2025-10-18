/**
 * About page renderer with template substitution
 */

import { createLogger } from '../utils/logger.js';
import { appConfig } from '../../bootstrap/init-config.js';
import type { JCConfig, ServerConfig } from '../../types/index.js';
import type { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';

const logger = createLogger('about-renderer');

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
  resourcesCount: number;
  promptsCount: number;
  tools: Tool[];
  resources: Resource[];
  prompts: Prompt[];
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
  private htmlTemplate: string;
  private cssContent: string;
  private serverConfig: ServerConfig;
  private serviceConfig: JCConfig;
  private toolsCount: number;
  private resourcesCount: number;
  private promptsCount: number;
  private tools: Tool[];
  private resources: Resource[];
  private prompts: Prompt[];
  private startTime: Date;

  constructor (serverConfig: ServerConfig, serviceConfig: JCConfig, toolsCount: number = 0) {
    this.serverConfig = serverConfig;
    this.serviceConfig = serviceConfig;
    this.toolsCount = toolsCount;
    this.resourcesCount = 0;
    this.promptsCount = 0;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
    this.startTime = new Date();

    // Initialize templates
    this.htmlTemplate = this.getHtmlTemplate();
    this.cssContent = this.getCssTemplate();

    logger.info('About page templates initialized successfully');
  }

  private getHtmlTemplate (): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{SERVICE_TITLE}} MCP Server</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>{{SERVICE_ICON}}</text></svg>">
</head>
<body>
  <div class="simple-container">
    <!-- Header -->
    <header class="simple-header">
      <div class="header-row">
        <h1>{{SERVICE_TITLE}} MCP Server</h1>
        <div class="status {{STATUS_CLASS}}">{{STATUS_TEXT}}</div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="simple-main">
      <!-- Basic Info -->
      <section class="info-section">
        <div class="info-row">
          <span class="label">Service:</span>
          <span class="value">{{SERVICE_DESCRIPTION}}</span>
        </div>
        <div class="info-row">
          <span class="label">Mode:</span>
          <span class="value">{{SERVICE_MODE}}</span>
        </div>
        <div class="info-row">
          <span class="label">Version:</span>
          <span class="value">{{SERVICE_VERSION}}</span>
        </div>
        <div class="info-row">
          <span class="label">Tools:</span>
          <span class="value clickable" onclick="openModal('tools')">{{TOOLS_COUNT}} available</span>
        </div>
        <div class="info-row">
          <span class="label">Resources:</span>
          <span class="value clickable" onclick="openModal('resources')">{{RESOURCES_COUNT}} available</span>
        </div>
        <div class="info-row">
          <span class="label">Prompts:</span>
          <span class="value clickable" onclick="openModal('prompts')">{{PROMPTS_COUNT}} available</span>
        </div>
        <div class="info-row">
          <span class="label">Uptime:</span>
          <span class="value">{{UPTIME}}</span>
        </div>
        <div class="info-row">
          <span class="label">Service URL:</span>
          {{SERVICE_URL}}
        </div>
      </section>

      <!-- Transport Info -->
      <section class="info-section">
        <div class="info-row">
          <span class="label">HTTP Transport:</span>
          <span class="value"><code>GET /sse</code> • <code>POST /mcp</code></span>
        </div>
      </section>

      <!-- Health Check -->
      <section class="info-section">
        <div class="info-row">
          <span class="label">Health Check:</span>
          <a href="/health" class="value link">Check Server Health</a>
        </div>
      </section>

      </main>

    <!-- Modal Overlays -->
    <!-- Tools Modal -->
    <div id="tools-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Available Tools ({{TOOLS_COUNT}})</h3>
          <button class="modal-close" onclick="closeModal('tools')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="table-container">
            <table class="details-table" id="tools-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Content will be dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Resources Modal -->
    <div id="resources-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Available Resources ({{RESOURCES_COUNT}})</h3>
          <button class="modal-close" onclick="closeModal('resources')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="table-container">
            <table class="details-table" id="resources-table">
              <thead>
                <tr>
                  <th>URI</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>MIME Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Content will be dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompts Modal -->
    <div id="prompts-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Available Prompts ({{PROMPTS_COUNT}})</h3>
          <button class="modal-close" onclick="closeModal('prompts')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="table-container">
            <table class="details-table" id="prompts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Content will be dynamically loaded -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="simple-footer">
      <p>
        Server: {{SERVER_NAME}} v{{SERVICE_VERSION}} • Started: {{START_TIME}} •
        <a href="https://github.com/Bazilio-san/mcp-atlassian-ts#configuration" target="_blank" rel="noopener">
          Configure headers in README
        </a>
      </p>
    </footer>
  </div>

  <script>
    // Store data globally
    let toolsData = [];
    let resourcesData = [];
    let promptsData = [];

    // Initialize data when page loads
    document.addEventListener('DOMContentLoaded', function() {
      try {
        toolsData = {{TOOLS_JSON}};
        resourcesData = {{RESOURCES_JSON}};
        promptsData = {{PROMPTS_JSON}};
      } catch (error) {
        console.error('Error parsing data:', error);
        toolsData = [];
        resourcesData = [];
        promptsData = [];
      }
    });

    function openModal(sectionName) {
      const modal = document.getElementById(sectionName + '-modal');
      const tableBody = document.getElementById(sectionName + '-table').querySelector('tbody');

      // Show loading state
      tableBody.innerHTML = '<tr><td colspan="100%" class="loading-cell"><div class="loading-spinner"></div> Loading...</td></tr>';
      modal.style.display = 'flex';

      // Load data with small delay to show loading animation
      setTimeout(function() {
        loadTableData(sectionName);
      }, 300);
    }

    function closeModal(sectionName) {
      const modal = document.getElementById(sectionName + '-modal');
      modal.style.display = 'none';
    }

    function loadTableData(sectionName) {
      const tableBody = document.getElementById(sectionName + '-table').querySelector('tbody');
      let data, html;

      switch(sectionName) {
        case 'tools':
          data = toolsData;
          html = generateToolsTableRows(data);
          break;
        case 'resources':
          data = resourcesData;
          html = generateResourcesTableRows(data);
          break;
        case 'prompts':
          data = promptsData;
          html = generatePromptsTableRows(data);
          break;
      }

      tableBody.innerHTML = html;
    }

    function generateToolsTableRows(tools) {
      return tools.map((tool, index) =>
        '<tr>' +
          '<td><code>' + tool.name + '</code></td>' +
          '<td>' + (tool.annotations?.title || tool.description) + '</td>' +
          '<td>' +
            '<a class="detail-link" id="tools-toggle-' + index + '" onclick="toggleDetails(\\\'tools\\\', ' + index + ')">подробнее</a>' +
          '</td>' +
        '</tr>' +
        '<tr id="tools-detail-' + index + '" class="detail-row" style="display: none;">' +
          '<td colspan="3">' +
            '<div class="detail-content">' +
              '<div class="loading-spinner" style="display: none;"></div>' +
              '<pre class="json-content" style="display: none;"></pre>' +
            '</div>' +
          '</td>' +
        '</tr>'
      ).join('');
    }

    function generateResourcesTableRows(resources) {
      return resources.map((resource, index) =>
        '<tr>' +
          '<td><code>' + resource.uri + '</code></td>' +
          '<td>' + resource.name + '</td>' +
          '<td>' + resource.description + '</td>' +
          '<td><code>' + resource.mimeType + '</code></td>' +
          '<td>' +
            '<a class="detail-link" id="resources-toggle-' + index + '" onclick="toggleDetails(\\\'resources\\\', ' + index + ')">подробнее</a>' +
          '</td>' +
        '</tr>' +
        '<tr id="resources-detail-' + index + '" class="detail-row" style="display: none;">' +
          '<td colspan="5">' +
            '<div class="detail-content">' +
              '<div class="loading-spinner"></div>' +
              '<pre class="json-content" style="display: none;"></pre>' +
            '</div>' +
          '</td>' +
        '</tr>'
      ).join('');
    }

    function generatePromptsTableRows(prompts) {
      return prompts.map((prompt, index) =>
        '<tr>' +
          '<td><code>' + prompt.name + '</code></td>' +
          '<td>' +
            '<a class="detail-link" id="prompts-toggle-' + index + '" onclick="toggleDetails(\\\'prompts\\\', ' + index + ')">подробнее</a>' +
          '</td>' +
        '</tr>' +
        '<tr id="prompts-detail-' + index + '" class="detail-row" style="display: none;">' +
          '<td colspan="2">' +
            '<div class="detail-content">' +
              '<div class="loading-spinner"></div>' +
              '<pre class="json-content" style="display: none;"></pre>' +
            '</div>' +
          '</td>' +
        '</tr>'
      ).join('');
    }

    function toggleDetails(sectionName, index) {
      const detailRow = document.getElementById(sectionName + '-detail-' + index);
      const toggleLink = document.getElementById(sectionName + '-toggle-' + index);
      const loadingSpinner = detailRow.querySelector('.loading-spinner');
      const jsonContent = detailRow.querySelector('.json-content');

      if (detailRow.style.display === 'none') {
        // Show the detail row with loading state
        detailRow.style.display = 'table-row';
        toggleLink.textContent = 'скрыть';
        loadingSpinner.style.display = 'block';
        jsonContent.style.display = 'none';

        // Simulate loading delay and show content
        setTimeout(() => {
          let data;
          switch(sectionName) {
            case 'tools':
              data = {
                name: toolsData[index].name,
                description: toolsData[index].description,
                inputSchema: toolsData[index].inputSchema,
                annotations: toolsData[index].annotations
              };
              break;
            case 'resources':
              data = resourcesData[index].content || resourcesData[index];
              // Try to parse JSON from contents[0]?.text and add explanation
              if (data && data.contents && data.contents[0] && data.contents[0].text) {
                try {
                  const parsedJson = JSON.parse(data.contents[0].text);
                  data = Object.assign({}, data, {
                    contents: [Object.assign({}, data.contents[0], {
                      text: 'Text field - deserialized data:\\n\\n' + JSON.stringify(parsedJson, null, 2)
                    })]
                  });
                } catch (e) {
                  // If parsing fails, keep original data
                }
              }
              break;
            case 'prompts':
              data = promptsData[index];
              break;
          }

          loadingSpinner.style.display = 'none';
          jsonContent.style.display = 'block';
          jsonContent.textContent = JSON.stringify(data, null, 2);
        }, 500);
      } else {
        // Hide the detail row
        detailRow.style.display = 'none';
        toggleLink.textContent = 'подробнее';
      }
    }

    // Close modal when clicking outside
    document.addEventListener('click', function(event) {
      if (event.target.classList.contains('modal-overlay')) {
        const modalId = event.target.id;
        const sectionName = modalId.replace('-modal', '');
        closeModal(sectionName);
      }
    });
  </script>
</body>
</html>`;
  }

  private getCssTemplate (): string {
    return `/* Atlassian Design System Colors and Variables */
:root {
  /* Primary Colors - Atlassian Blue */
  --color-primary-600: #0052cc;
  --color-primary-500: #0065ff;
  --color-primary-400: #2684ff;
  --color-primary-300: #4c9aff;
  --color-primary-200: #b3d4ff;
  --color-primary-100: #deecff;

  /* Secondary Colors - Atlassian Green */
  --color-success-600: #006644;
  --color-success-500: #00875a;
  --color-success-400: #36b37e;
  --color-success-300: #57d9a3;

  /* Warning Colors */
  --color-warning-600: #ff8b00;
  --color-warning-500: #ffab00;
  --color-warning-400: #ffc400;

  /* Danger Colors */
  --color-danger-600: #bf2600;
  --color-danger-500: #de350b;
  --color-danger-400: #ff5630;

  /* Neutral Colors */
  --color-neutral-1100: #091e42;
  --color-neutral-1000: #172b4d;
  --color-neutral-900: #253858;
  --color-neutral-800: #344563;
  --color-neutral-700: #42526e;
  --color-neutral-600: #505f79;
  --color-neutral-500: #6b778c;
  --color-neutral-400: #8993a4;
  --color-neutral-300: #a5adba;
  --color-neutral-200: #c1c7d0;
  --color-neutral-100: #dfe1e6;
  --color-neutral-90: #ebecf0;
  --color-neutral-40: #f4f5f7;
  --color-neutral-20: #fafbfc;
  --color-neutral-10: #ffffff;

  /* Spacing - Atlassian 8px grid */
  --space-025: 2px;
  --space-050: 4px;
  --space-075: 6px;
  --space-100: 8px;
  --space-150: 12px;
  --space-200: 16px;
  --space-250: 20px;
  --space-300: 24px;
  --space-400: 32px;
  --space-500: 40px;
  --space-600: 48px;
  --space-800: 64px;
  --space-1000: 80px;

  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-family-mono: ui-monospace, 'SF Mono', 'Consolas', 'Roboto Mono', 'Ubuntu Mono', monospace;

  /* Font sizes */
  --font-size-050: 11px;
  --font-size-075: 12px;
  --font-size-100: 14px;
  --font-size-200: 16px;
  --font-size-300: 20px;
  --font-size-400: 24px;
  --font-size-500: 29px;
  --font-size-600: 35px;

  /* Border radius */
  --border-radius-050: 2px;
  --border-radius-100: 3px;
  --border-radius-200: 6px;
  --border-radius-300: 8px;
  --border-radius-400: 12px;

  /* Shadows */
  --shadow-raised: 0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31);
  --shadow-overlay: 0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31);
  --shadow-card: 0 1px 3px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31);
}

/* Reset and base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
}

body {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-100);
  line-height: 1.5;
  color: var(--color-neutral-900);
  background: white;
  margin: 0;
  padding: 20px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

/* Simple Layout */
.simple-container {
  width: 100%;
  max-width: 695px;
  background: white;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--border-radius-200);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 40px;
}

/* Simple Header */
.simple-header {
  padding: 24px 32px 20px;
  border-bottom: 1px solid var(--color-neutral-200);
  background: var(--color-neutral-20);
  border-radius: var(--border-radius-200) var(--border-radius-200) 0 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.simple-header h1 {
  font-size: 30px;
  font-weight: 700;
  margin: 0;
  color: var(--color-primary-600);
}

.status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status.online {
  background: var(--color-success-100);
  color: var(--color-success-600);
}

.status.offline {
  background: var(--color-danger-100);
  color: var(--color-danger-600);
}

/* Simple Main Content */
.simple-main {
  padding: 20px 32px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(9, 30, 66, 0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-300);
  box-shadow: var(--shadow-overlay);
  max-width: 90vw;
  max-height: 90vh;
  width: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: var(--color-neutral-20);
  border-bottom: 1px solid var(--color-neutral-200);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-300);
  font-weight: 600;
  color: var(--color-primary-600);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  font-weight: 300;
  color: var(--color-neutral-600);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-100);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.table-container {
  overflow-x: auto;
  border-radius: var(--border-radius-100);
  border: 1px solid var(--color-neutral-200);
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: var(--font-size-075);
}

.details-table th {
  background: var(--color-neutral-100);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-neutral-900);
  border-bottom: 2px solid var(--color-neutral-200);
  white-space: nowrap;
}

.details-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-neutral-100);
  vertical-align: top;
}

.details-table tr:hover {
  background: var(--color-neutral-20);
}

.details-table tr:last-child td {
  border-bottom: none;
}

/* Detail row styles */
.detail-row {
  background: var(--color-neutral-20);
}

.detail-row td {
  padding: 0;
}

.detail-content {
  padding: 16px;
}

/* Loading spinner */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-neutral-200);
  border-top: 2px solid var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px auto;
}

.loading-cell {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-neutral-600);
  font-size: var(--font-size-100);
}

.loading-cell .loading-spinner {
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* JSON content styles */
.json-content {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-050);
  line-height: 1.4;
  color: var(--color-neutral-1000);
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  background: var(--color-neutral-90);
  padding: 16px;
  border-radius: var(--border-radius-100);
  border: 1px solid var(--color-neutral-200);
}

.clickable {
  color: var(--color-primary-500);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.clickable:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

.detail-link {
  color: var(--color-primary-500);
  text-decoration: none;
  font-size: var(--font-size-075);
  font-weight: 500;
  cursor: pointer;
}

.detail-link:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}


/* Info Section */
.info-section {
  margin-bottom: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-neutral-100);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--color-neutral-700);
  min-width: 100px;
}

.value {
  text-align: right;
  color: var(--color-neutral-1000);
  font-family: var(--font-family-mono);
  font-size: 14px;
}

.value.link {
  color: var(--color-primary-500);
  text-decoration: none;
}

.value.link:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}


/* Simple Footer */
.simple-footer {
  padding: 16px 32px;
  background: var(--color-neutral-20);
  border-top: 1px solid var(--color-neutral-200);
  border-radius: 0 0 var(--border-radius-200) var(--border-radius-200);
}

.simple-footer p {
  margin: 0;
  font-size: 12px;
  color: var(--color-neutral-600);
  text-align: center;
}

.simple-footer a {
  color: var(--color-primary-500);
  text-decoration: none;
}

.simple-footer a:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 640px) {
  body {
    padding: 16px;
  }

  .simple-container {
    margin-top: 20px;
    max-width: 600px;
  }

  .simple-header {
    padding: 20px 24px 16px;
  }

  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .simple-main {
    padding: 16px 24px;
  }

  .simple-footer {
    padding: 12px 24px;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 12px 0;
  }

  .label {
    min-width: auto;
  }

  .value {
    text-align: left;
  }
}`;
  }

  private getServiceInfo (): { title: string; icon: string; description: string; mode: string } {
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

  private getServiceUrl (): { url: string; label: string; externalUrl: string } {
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

  private getAuthStatus (): { status: string; statusClass: string } {
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

  private getUptime (): string {
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

  private escapeJsonForScript (data: any): string {
    // JSON.stringify already handles proper escaping for JavaScript
    // We just need to ensure it's safe for HTML context
    return JSON.stringify(data);
  }

  private substitutePlaceholders (template: string, data: AboutPageData): string {
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
      .replace(/\{\{RESOURCES_COUNT\}\}/g, data.resourcesCount.toString())
      .replace(/\{\{PROMPTS_COUNT\}\}/g, data.promptsCount.toString())
      .replace(/\{\{TOOLS_JSON\}\}/g, this.escapeJsonForScript(data.tools))
      .replace(/\{\{RESOURCES_JSON\}\}/g, this.escapeJsonForScript(data.resources))
      .replace(/\{\{PROMPTS_JSON\}\}/g, this.escapeJsonForScript(data.prompts))
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

  
  public setToolsCount (count: number): void {
    this.toolsCount = count;
  }

  public setToolsData (tools: Tool[]): void {
    this.tools = tools;
    this.toolsCount = tools.length;
  }

  public setResourcesData (resources: Resource[]): void {
    this.resources = resources;
    this.resourcesCount = resources.length;
  }

  public setPromptsData (prompts: Prompt[]): void {
    this.prompts = prompts;
    this.promptsCount = prompts.length;
  }

  public setAllData (tools: Tool[], resources: Resource[], prompts: Prompt[]): void {
    this.tools = tools;
    this.resources = resources;
    this.prompts = prompts;
    this.toolsCount = tools.length;
    this.resourcesCount = resources.length;
    this.promptsCount = prompts.length;
  }

  public renderHtml (): string {
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
      resourcesCount: this.resourcesCount,
      promptsCount: this.promptsCount,
      tools: this.tools,
      resources: this.resources,
      prompts: this.prompts,
      authStatus: authStatus.status,
      authStatusClass: authStatus.statusClass,
      statusText: 'Online',
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

  public renderCss (): string {
    return this.cssContent;
  }

  public renderFullPage (): string {
    const html = this.renderHtml();
    const css = this.renderCss();

    // Inject CSS into HTML head
    return html.replace('</head>', `  <style>${css}</style>\n</head>`);
  }
}

export function createAboutPageRenderer (
  serverConfig: ServerConfig,
  serviceConfig: JCConfig,
  toolsCount: number = 0
): AboutPageRenderer {
  return new AboutPageRenderer(serverConfig, serviceConfig, toolsCount);
}
