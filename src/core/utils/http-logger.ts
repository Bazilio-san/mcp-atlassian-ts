/**
 * HTTP Request/Response Logger for API debugging
 */

import fs from 'fs';
import path from 'path';
import { getDebug } from './logger.js';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const debug = getDebug('api-http');

// Ensure logs directory exists
const LOGS_DIR = path.join(process.cwd(), '_tmp/_logs');

/**
 * Format headers for logging
 */
function formatHeaders (headers: any): string {
  if (!headers) return 'No headers';

  const entries = Object.entries(headers)
    .filter(([_k, v]) => v !== undefined)
    .map(([k, v]) => `  ${k}: ${String(v)}`);

  return entries.length > 0 ? entries.join('\n') : 'No headers';
}

/**
 * Markdown formatting helpers
 */
const t = '```';
const mdText = (s: string) => `${t}\n${s}\n${t}`;
const mdJson = (v: any) => {
  if (!v) return `${t}json\nnull\n${t}`;

  // Try to parse if it's a JSON string
  let parsed = v;
  if (typeof v === 'string') {
    try {
      parsed = JSON.parse(v);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  return `${t}json\n${JSON.stringify(parsed, null, 2)}\n${t}`;
};

/**
 * Format request/response data as Markdown
 */
function formatHttpLogAsMarkdown (
  toolName: string,
  request: AxiosRequestConfig,
  response?: AxiosResponse,
  error?: AxiosError,
): string {
  const timestamp = new Date().toISOString();
  let markdown = `# HTTP Log: ${toolName}\n\n`;
  markdown += `**Timestamp:** ${timestamp}\n\n`;

  // Request section
  markdown += '## Request\n\n';
  markdown += `**Method:** ${request.method?.toUpperCase() || 'GET'}\n`;
  markdown += `**URL:** ${request.url || request.baseURL || 'Unknown URL'}\n`;

  if (request.params && Object.keys(request.params).length > 0) {
    markdown += `**Query Parameters:**\n${mdJson(request.params)}\n`;
  }

  markdown += `\n**Headers:**\n${mdText(formatHeaders(request.headers))}\n`;

  if (request.data) {
    markdown += `\n**Body:**\n${mdJson(request.data)}\n`;
  }

  // Response section
  markdown += '\n## Response\n\n';

  if (response) {
    markdown += `**Status:** ${response.status} ${response.statusText || ''}\n`;
    markdown += `\n**Headers:**\n${mdText(formatHeaders(response.headers))}\n`;

    if (response.data) {
      markdown += `\n**Body:**\n${mdJson(response.data)}\n`;
    }
  } else if (error) {
    markdown += '**Status:** ERROR\n';
    markdown += `**Error Message:** ${error.message}\n`;

    if (error.response) {
      markdown += `\n**Error Status:** ${error.response.status} ${error.response.statusText || ''}\n`;
      markdown += `\n**Error Headers:**\n${mdText(formatHeaders(error.response.headers))}\n`;

      if (error.response.data) {
        markdown += `\n**Error Body:**\n${mdJson(error.response.data)}\n`;
      }
    }

    if (error.code) {
      markdown += `\n**Error Code:** ${error.code}\n`;
    }
  } else {
    markdown += '**Status:** No response received\n';
  }

  markdown += '\n---\n\n';
  return markdown;
}

/**
 * Log HTTP request and response to file
 */
export function logHttpTransaction (
  toolName: string,
  request: AxiosRequestConfig,
  response?: AxiosResponse,
  error?: AxiosError,
): void {
  if (!debug.enabled) {
    return;
  }

  try {
    const logFileName = `HTTP_${toolName}.md`;
    const logFilePath = path.join(LOGS_DIR, logFileName);

    const logContent = formatHttpLogAsMarkdown(toolName, request, response, error);

    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Append to existing log file or create new one
    fs.appendFileSync(logFilePath, logContent, 'utf-8');

    // Also log to console for immediate feedback
    if (debug.enabled) {
      console.log(`[api-http] HTTP transaction logged to ${logFilePath}`);
    }
  } catch (logError) {
    if (debug.enabled) {
      console.log(`[api-http] Failed to log HTTP transaction: ${logError}`);
    }
  }
}

/**
 * Clear log file for a specific tool
 */
export function clearHttpLog (toolName: string): void {
  if (!debug.enabled) {
    return;
  }

  try {
    const logFileName = `HTTP_${toolName}.md`;
    const logFilePath = path.join(LOGS_DIR, logFileName);

    if (fs.existsSync(logFilePath)) {
      fs.unlinkSync(logFilePath);
      if (debug.enabled) {
        console.log(`[api-http] Cleared HTTP log for ${toolName}`);
      }
    }
  } catch (error) {
    if (debug.enabled) {
      console.log(`[api-http] Failed to clear HTTP log: ${error}`);
    }
  }
}

/**
 * Get current tool name from the call stack or context
 */
export function getCurrentToolName (): string {
  // This will be set by the tool execution context
  return (global as any).__currentToolName || 'unknown';
}

/**
 * Set current tool name for logging context
 */
export function setCurrentToolName (toolName: string): void {
  (global as any).__currentToolName = toolName;
}
