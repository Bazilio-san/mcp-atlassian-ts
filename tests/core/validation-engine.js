/**
 * Unified Validation Engine
 * Combines validation logic for Direct API and MCP responses
 */

class ValidationEngine {
  /**
   * Validate response based on source type
   */
  static validateResponse(response, testCase, source) {
    if (source === 'mcp') {
      return this.validateMcpResponse(response, testCase);
    } else if (source === 'direct' || source === 'test') {
      return this.validateDirectApiResponse(response, testCase);
    } else {
      throw new Error(`Unknown source type: ${source}`);
    }
  }

  /**
   * Validate Direct API response
   */
  static validateDirectApiResponse(response, testCase) {
    const result = {
      passed: true,
      details: {},
      error: null,
    };

    // Check HTTP status code
    if (testCase.expectedStatus && response.status !== testCase.expectedStatus) {
      result.passed = false;
      result.error = `Status mismatch: expected ${testCase.expectedStatus}, got ${response.status}`;
      result.details.statusMismatch = true;
      return result;
    }

    // Check if response has data
    if (testCase.requiresData && (!response.data || Object.keys(response.data).length === 0)) {
      result.passed = false;
      result.error = 'Response has no data';
      result.details.noData = true;
      return result;
    }

    // Validate response structure
    if (testCase.expectedProperties) {
      const validation = this.validateProperties(response.data, testCase.expectedProperties);
      if (!validation.valid) {
        result.passed = false;
        result.error = validation.error;
        result.details.propertyValidation = validation;
        return result;
      }
    }

    // Custom validation function
    if (testCase.validate && typeof testCase.validate === 'function') {
      try {
        const customValidation = testCase.validate(response.data);
        if (!customValidation) {
          result.passed = false;
          result.error = 'Custom validation failed';
          result.details.customValidation = false;
        } else if (typeof customValidation === 'object') {
          result.passed = customValidation.valid !== false;
          result.error = customValidation.error;
          result.details.customValidation = customValidation;
        }
      } catch (error) {
        result.passed = false;
        result.error = `Custom validation error: ${error.message}`;
        result.details.customValidationError = error.message;
      }
    }

    // Array validation
    if (testCase.isArray && !Array.isArray(response.data)) {
      result.passed = false;
      result.error = 'Expected array response';
      result.details.notArray = true;
      return result;
    }

    // Minimum array length validation
    if (testCase.minArrayLength && Array.isArray(response.data)) {
      if (response.data.length < testCase.minArrayLength) {
        result.passed = false;
        result.error = `Array length ${response.data.length} is less than minimum ${testCase.minArrayLength}`;
        result.details.arrayLengthInsufficient = true;
        return result;
      }
    }

    return result;
  }

  /**
   * Validate MCP response
   */
  static validateMcpResponse(response, testCase) {
    const result = {
      passed: true,
      details: {},
      error: null,
    };

    // Check for MCP error
    if (response && response.error) {
      result.passed = false;
      result.error = `MCP error: ${response.error}`;
      result.details.mcpError = response.error;
      return result;
    }

    // Extract result from MCP response structure
    const data = response && response.result ? response.result : response;

    // Check if response has required content
    if (testCase.requiresData && !data) {
      result.passed = false;
      result.error = 'MCP response has no result';
      result.details.noResult = true;
      return result;
    }

    // Validate response structure
    if (testCase.expectedProperties) {
      const validation = this.validateProperties(data, testCase.expectedProperties);
      if (!validation.valid) {
        result.passed = false;
        result.error = validation.error;
        result.details.propertyValidation = validation;
        return result;
      }
    }

    // Custom validation function
    if (testCase.validate && typeof testCase.validate === 'function') {
      try {
        const customValidation = testCase.validate(data);
        if (!customValidation) {
          result.passed = false;
          result.error = 'Custom validation failed';
          result.details.customValidation = false;
        } else if (typeof customValidation === 'object') {
          result.passed = customValidation.valid !== false;
          result.error = customValidation.error;
          result.details.customValidation = customValidation;
        }
      } catch (error) {
        result.passed = false;
        result.error = `Custom validation error: ${error.message}`;
        result.details.customValidationError = error.message;
      }
    }

    // Array validation for MCP responses
    if (testCase.isArray) {
      // MCP might wrap arrays in a result object
      const arrayData = data.items || data.results || data;

      if (!Array.isArray(arrayData)) {
        result.passed = false;
        result.error = 'Expected array in MCP response';
        result.details.notArray = true;
        return result;
      }

      // Minimum array length validation
      if (testCase.minArrayLength && arrayData.length < testCase.minArrayLength) {
        result.passed = false;
        result.error = `Array length ${arrayData.length} is less than minimum ${testCase.minArrayLength}`;
        result.details.arrayLengthInsufficient = true;
        return result;
      }
    }

    // MCP-specific validations
    if (testCase.mcpValidation) {
      const mcpValidation = this.validateMcpSpecific(data, testCase.mcpValidation);
      if (!mcpValidation.valid) {
        result.passed = false;
        result.error = mcpValidation.error;
        result.details.mcpSpecific = mcpValidation;
        return result;
      }
    }

    return result;
  }

  /**
   * Validate object properties
   */
  static validateProperties(data, expectedProperties) {
    const result = {
      valid: true,
      missingProperties: [],
      typeErrors: [],
      error: null,
    };

    if (!data || typeof data !== 'object') {
      result.valid = false;
      result.error = 'Data is not an object';
      return result;
    }

    for (const prop of expectedProperties) {
      if (typeof prop === 'string') {
        // Simple property existence check
        if (!(prop in data)) {
          result.missingProperties.push(prop);
          result.valid = false;
        }
      } else if (typeof prop === 'object') {
        // Advanced property validation with type checking
        const { name, type, required = true } = prop;

        if (required && !(name in data)) {
          result.missingProperties.push(name);
          result.valid = false;
        } else if (name in data && type) {
          const actualType = Array.isArray(data[name]) ? 'array' : typeof data[name];
          if (actualType !== type) {
            result.typeErrors.push({
              property: name,
              expected: type,
              actual: actualType,
            });
            result.valid = false;
          }
        }
      }
    }

    if (!result.valid) {
      const errors = [];
      if (result.missingProperties.length > 0) {
        errors.push(`Missing properties: ${result.missingProperties.join(', ')}`);
      }
      if (result.typeErrors.length > 0) {
        const typeErrorsStr = result.typeErrors
          .map(e => `${e.property} (expected ${e.expected}, got ${e.actual})`)
          .join(', ');
        errors.push(`Type errors: ${typeErrorsStr}`);
      }
      result.error = errors.join('; ');
    }

    return result;
  }

  /**
   * MCP-specific validation
   */
  static validateMcpSpecific(data, mcpValidation) {
    const result = {
      valid: true,
      error: null,
    };

    // Validate tool response format
    if (mcpValidation.toolResponseFormat) {
      if (!data || typeof data !== 'object') {
        result.valid = false;
        result.error = 'Invalid MCP tool response format';
        return result;
      }
    }

    // Validate pagination
    if (mcpValidation.pagination) {
      if ('startAt' in data && typeof data.startAt !== 'number') {
        result.valid = false;
        result.error = 'Invalid pagination: startAt must be a number';
        return result;
      }
      if ('maxResults' in data && typeof data.maxResults !== 'number') {
        result.valid = false;
        result.error = 'Invalid pagination: maxResults must be a number';
        return result;
      }
    }

    // Validate resource identifiers
    if (mcpValidation.resourceId) {
      const idField = mcpValidation.resourceId;
      if (!data[idField]) {
        result.valid = false;
        result.error = `Missing resource identifier: ${idField}`;
        return result;
      }
    }

    return result;
  }

  /**
   * Compare responses between Direct API and MCP
   */
  static compareResponses(directResponse, mcpResponse, comparisonRules = {}) {
    const comparison = {
      equivalent: true,
      differences: [],
      details: {},
    };

    // Extract data from responses
    const directData = directResponse.data || directResponse;
    const mcpData = mcpResponse.result || mcpResponse;

    // Compare basic structure
    if (comparisonRules.structure) {
      const directKeys = Object.keys(directData).sort();
      const mcpKeys = Object.keys(mcpData).sort();

      if (JSON.stringify(directKeys) !== JSON.stringify(mcpKeys)) {
        comparison.equivalent = false;
        comparison.differences.push('Different object structure');
        comparison.details.structureDiff = {
          direct: directKeys,
          mcp: mcpKeys,
        };
      }
    }

    // Compare values
    if (comparisonRules.values) {
      for (const key of comparisonRules.values) {
        if (directData[key] !== mcpData[key]) {
          comparison.equivalent = false;
          comparison.differences.push(`Value mismatch for ${key}`);
          comparison.details[key] = {
            direct: directData[key],
            mcp: mcpData[key],
          };
        }
      }
    }

    // Compare array lengths
    if (comparisonRules.arrayLength) {
      const directArray = directData.items || directData.results || directData;
      const mcpArray = mcpData.items || mcpData.results || mcpData;

      if (Array.isArray(directArray) && Array.isArray(mcpArray)) {
        if (directArray.length !== mcpArray.length) {
          comparison.equivalent = false;
          comparison.differences.push('Different array lengths');
          comparison.details.arrayLength = {
            direct: directArray.length,
            mcp: mcpArray.length,
          };
        }
      }
    }

    return comparison;
  }
}

export default ValidationEngine;