import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { SJ } from './utils.js';

/**
 * API Response Logger (Markdown format)
 * Logs API responses during testing when TEST_LOG_API_RESPONSES=true
 */
class ApiResponseLogger {
  constructor () {
    this.enabled = process.env.TEST_LOG_API_RESPONSES === 'true';
    this.logDir = path.join(process.cwd(), 'tests/endpoints/_logs/jira');

    if (this.enabled) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Ensure the log directory exists
   */
  ensureLogDirectory () {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Generate a safe filename from test ID and name
   * @param {string} testId - Test ID (e.g., "1-1", "3-5")
   * @param {string} testName - Test name
   * @returns {string} Safe filename
   */
  generateFilename (testId, testName) {
    // Clean test name for filename
    const cleanName = testName
      .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .toLowerCase()
      .substring(0, 50); // Limit length

    return `${testId}-${cleanName}.md`;
  }

  /**
   * Log API response to file
   * @param {string} testId - Test ID
   * @param {string} testName - Test name
   * @param {string} url - Request URL
   * @param {string|object} data - Request data
   * @param {number} httpStatusCode - HTTP status code
   * @param {string|object} responseBody - Response body
   * @param {string} method - HTTP method (optional)
   * @param {object} headers - Request headers (optional)
   */
  logResponse (testId, testName, url, data, httpStatusCode, responseBody, method = 'GET', headers = {}) {
    if (!this.enabled) {
      return;
    }

    try {
      const sanitizedHeaders = this.sanitizeHeaders(headers);
      const triQ = '```';
      // Format as Markdown
      const mdContent = `
${new Date().toISOString()}

**test**: ${testId} / ${testName}  
${method} ${url}  

**httpStatusCode**: ${httpStatusCode}  

**headers**:
${triQ}json
${this.sanitizeHeaders(headers)}
${triQ}

**data**:   
${triQ}json
${this.sanitizeData(data)}
${triQ}

**responseBody**:
${triQ}json
${this.sanitizeResponseBody(responseBody)}
${triQ}
`;

      const filename = this.generateFilename(testId, testName);
      const filepath = path.join(this.logDir, filename);

      fs.writeFileSync(filepath, mdContent, 'utf8');
    } catch (error) {
      console.error(`❌ Failed to log API response for test ${testId}:`, error.message);
    }
  }

  /**
   * Log Direct API response to file
   * @param {string} testId - Test ID
   * @param {string} testName - Test name
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {number} httpStatusCode - HTTP status code
   * @param {object} responseBody - Response body
   * @param {object} headers - Request headers (optional)
   * @param {object} requestBody - Request body data (optional)
   */
  logDirectApiResponse (testId, testName, method, endpoint, httpStatusCode, responseBody, headers = {}, requestBody = null) {
    if (!this.enabled) {
      return;
    }

    const url = `/rest/api/2${endpoint}`;
    this.logResponse(
      testId,
      testName,
      url,
      requestBody,
      httpStatusCode,
      responseBody,
      method,
      headers
    );
  }

  /**
   * Sanitize request data for logging
   * @param {*} data - Request data
   * @returns {*} Sanitized data
   */
  sanitizeData (data) {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      // Create a copy and remove sensitive fields
      const sanitized = JSON.parse(JSON.stringify(data));
      this.removeSensitiveFields(sanitized);
      return SJ(sanitized);
    }

    return SJ(data);
  }

  /**
   * Sanitize response body for logging
   * @param {*} responseBody - Response body
   * @returns {*} Sanitized response body
   */
  sanitizeResponseBody (responseBody) {
    if (!responseBody) {
      return SJ(null);
    }

    if (typeof responseBody === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(responseBody);
        return SJ(parsed);
      } catch {
        // Return as string if not JSON
        return responseBody;
      }
    }

    if (typeof responseBody === 'object') {
      const sanitized = JSON.parse(JSON.stringify(responseBody));
      return SJ(sanitized);
    }

    return SJ(responseBody);
  }

  /**
   * Sanitize headers for logging
   * @param {object} headers - Request headers
   * @returns {object} Sanitized headers
   */
  sanitizeHeaders (headers) {
    if (!headers || typeof headers !== 'object') {
      return '{}';
    }
    return SJ(headers);
  }

  /**
   * Remove sensitive fields from object recursively
   * @param {object} obj - Object to sanitize
   */
  removeSensitiveFields (obj) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    const sensitiveFields = [
      'password',
      'token',
      'key',
      'secret',
      'auth',
      'authorization',
      'apikey',
      'api_key',
    ];

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeSensitiveFields(obj[key]);
      }
    });
  }

  /**
   * Clear all logged responses
   */
  clearLogs () {
    if (!this.enabled) {
      return;
    }

    try {
      if (fs.existsSync(this.logDir)) {
        const files = fs.readdirSync(this.logDir);
        files.forEach(file => {
          if (file.endsWith('.md')) {
            fs.unlinkSync(path.join(this.logDir, file));
          }
        });
        console.log(`🗑️ Cleared ${files.length} API response logs`);
      }
    } catch (error) {
      console.error('❌ Failed to clear API response logs:', error.message);
    }
  }

  /**
   * Get count of logged responses
   * @returns {number} Number of logged responses
   */
  getLogCount () {
    if (!this.enabled || !fs.existsSync(this.logDir)) {
      return 0;
    }

    try {
      const files = fs.readdirSync(this.logDir);
      return files.filter(file => file.endsWith('.md')).length;
    } catch (error) {
      console.error('❌ Failed to count API response logs:', error.message);
      return 0;
    }
  }

  /**
   * Check if logging is enabled
   * @returns {boolean} True if logging is enabled
   */
  isEnabled () {
    return this.enabled;
  }

  /**
   * Enable logging
   * @param {string} logFile - Optional log file name (not used in current implementation)
   */
  enable (logFile) {
    this.enabled = true;
    this.ensureLogDirectory();
    console.log(`📝 API response logging enabled to ${this.logDir}`);
  }
}

// Export singleton instance
const apiResponseLogger = new ApiResponseLogger();

export {
  ApiResponseLogger,
  apiResponseLogger,
};
