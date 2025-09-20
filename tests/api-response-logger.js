import fs from 'fs';
import path from 'path';

/**
 * API Response Logger
 * Logs API responses during testing when TEST_LOG_API_RESPONSES=true
 */
class ApiResponseLogger {
  constructor () {
    this.enabled = process.env.TEST_LOG_API_RESPONSES === 'true';
    this.logDir = path.join(process.cwd(), '_api_responses');

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

    return `${testId}-${cleanName}.json`;
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
      const logData = {
        testId,
        testName,
        timestamp: new Date().toISOString(),
        url,
        method,
        data: this.sanitizeData(data),
        httpStatusCode,
        responseBody: this.sanitizeResponseBody(responseBody),
        headers: this.sanitizeHeaders(headers),
      };

      const filename = this.generateFilename(testId, testName);
      const filepath = path.join(this.logDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(logData, null, 2), 'utf8');
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
   */
  logDirectApiResponse(testId, testName, method, endpoint, httpStatusCode, responseBody) {
    if (!this.enabled) {
      return;
    }

    const url = `/rest/api/2${endpoint}`;
    this.logResponse(
      testId,
      testName,
      url,
      null,
      httpStatusCode,
      responseBody,
      method
    );
  }

  /**
   * Log MCP response to file
   * @param {string} testId - Test ID
   * @param {string} testName - Test name
   * @param {string} toolName - MCP tool name
   * @param {object} toolArgs - Tool arguments
   * @param {number} httpStatusCode - HTTP status code
   * @param {object} mcpResponse - MCP response
   */
  logMcpResponse (testId, testName, toolName, toolArgs, httpStatusCode, mcpResponse) {
    if (!this.enabled) {
      return;
    }

    const url = `/mcp/call/${toolName}`;
    this.logResponse(
      testId,
      testName,
      url,
      { tool: toolName, arguments: toolArgs },
      httpStatusCode,
      mcpResponse,
      'POST',
      { 'Content-Type': 'application/json' },
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
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize response body for logging
   * @param {*} responseBody - Response body
   * @returns {*} Sanitized response body
   */
  sanitizeResponseBody (responseBody) {
    if (!responseBody) {
      return null;
    }

    if (typeof responseBody === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(responseBody);
        this.removeSensitiveFields(parsed);
        return parsed;
      } catch {
        // Return as string if not JSON
        return responseBody;
      }
    }

    if (typeof responseBody === 'object') {
      const sanitized = JSON.parse(JSON.stringify(responseBody));
      this.removeSensitiveFields(sanitized);
      return sanitized;
    }

    return responseBody;
  }

  /**
   * Sanitize headers for logging
   * @param {object} headers - Request headers
   * @returns {object} Sanitized headers
   */
  sanitizeHeaders (headers) {
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    sensitiveHeaders.forEach(header => {
      const lowerHeader = header.toLowerCase();
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '[REDACTED]';
        }
      });
    });

    return sanitized;
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
          if (file.endsWith('.json')) {
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
      return files.filter(file => file.endsWith('.json')).length;
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
}

// Export singleton instance
const apiResponseLogger = new ApiResponseLogger();

export {
  ApiResponseLogger,
  apiResponseLogger,
};
