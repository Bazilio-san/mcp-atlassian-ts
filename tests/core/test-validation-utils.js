/**
 * Test Validation Utils
 * Utilities for test result validation
 */

class TestValidationUtils {
  /**
   * Check for expected properties in object
   */
  static validateProperties(obj, expectedProps, testName, arrayElementProps = null) {
    if (!obj || typeof obj !== 'object') {
      return {
        success: false,
        message: `${testName}: Object is null or not an object`,
      };
    }

    const missing = expectedProps.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      return {
        success: false,
        message: `${testName}: Missing properties: ${missing.join(', ')}`,
      };
    }

    // Check array element properties if specified
    if (arrayElementProps) {
      const arrayPath = arrayElementProps.path;
      const arrayProps = arrayElementProps.props;

      if (obj[arrayPath] && Array.isArray(obj[arrayPath]) && obj[arrayPath].length > 0) {
        const firstElement = obj[arrayPath][0];
        const missingArrayProps = arrayProps.filter(prop => !(prop in firstElement));

        if (missingArrayProps.length > 0) {
          return {
            success: false,
            message: `${testName}: Missing properties in ${arrayPath}[0]: ${missingArrayProps.join(', ')}`,
          };
        }
      }
    }

    return {
      success: true,
      message: `${testName}: All expected properties present`,
    };
  }

  /**
   * Validate MCP response against expected format
   */
  static validateMcpResponse(response, testCase) {
    if (response.error) {
      return {
        success: false,
        message: `MCP Error: ${response.error.message || 'Unknown error'}`,
      };
    }

    if (!response.result) {
      return {
        success: false,
        message: 'No result in MCP response',
      };
    }

    const content = response.result?.content?.[0]?.text;
    if (!content) {
      return {
        success: false,
        message: 'No content returned from MCP tool',
      };
    }

    if (testCase.validation?.checkContent && !testCase.validation.checkContent(content)) {
      return {
        success: false,
        message: 'Content validation failed',
      };
    }

    return {
      success: true,
      message: 'MCP response validation passed',
      content,
    };
  }

  /**
   * Validate direct API response
   */
  static validateDirectApiResponse(response, testCase) {
    // First check custom validation if it exists
    if (testCase.validation?.checkResult) {
      if (!testCase.validation.checkResult(response.data, response)) {
        return {
          success: false,
          message: 'Result validation failed',
        };
      }
      // If custom validation passed, consider test successful
      return {
        success: true,
        message: 'Validation passed',
      };
    }

    // If no custom validation, use standard check
    if (!response.success) {
      return {
        success: false,
        message: `API Error: ${response.status} ${response.statusText || response.error}`,
      };
    }

    if (testCase.validation?.expectedProps && testCase.validation.expectedProps.length > 0) {
      // Skip property check for DELETE operations (usually no response.data)
      if (!response.data && response.status === 204) {
        // DELETE operations usually return 204 without data - this is normal
        return {
          success: true,
          message: 'DELETE operation completed successfully',
        };
      }

      const propCheck = this.validateProperties(
        response.data.length ? response.data[0] : response.data,
        testCase.validation.expectedProps,
        testCase.name,
        testCase.validation.arrayElementProps
      );
      if (!propCheck.success) {
        return propCheck;
      }
    }

    return {
      success: true,
      message: 'Direct API response validation passed',
      data: response.data,
    };
  }

  /**
   * Validate test case structure
   */
  static validateTestCaseStructure(testCase) {
    const errors = [];

    // Required fields
    if (!testCase.name) {
      errors.push('Test case must have a name');
    }

    if (!testCase.fullId && !testCase.id) {
      errors.push('Test case must have an id or fullId');
    }

    // Either MCP or direct API info should be present
    if (!testCase.mcpTool && !testCase.directApi) {
      errors.push('Test case must have either mcpTool or directApi configuration');
    }

    // Direct API validation
    if (testCase.directApi) {
      if (!testCase.directApi.method) {
        errors.push('Direct API must have a method');
      }
      if (!testCase.directApi.endpoint) {
        errors.push('Direct API must have an endpoint');
      }
    }

    // MCP tool validation
    if (testCase.mcpTool && !testCase.mcpArgs) {
      errors.push('MCP tool must have args');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Compare two responses for equality
   */
  static compareResponses(response1, response2, options = {}) {
    const {
      ignoreFields = ['timestamp', 'id', 'createdAt', 'updatedAt'],
      compareArrayOrder = false
    } = options;

    const clean = (obj) => {
      if (!obj) return obj;

      const cleaned = JSON.parse(JSON.stringify(obj));

      // Remove ignored fields
      const removeFields = (o) => {
        if (typeof o !== 'object' || !o) return;

        for (const field of ignoreFields) {
          delete o[field];
        }

        for (const key in o) {
          if (typeof o[key] === 'object') {
            removeFields(o[key]);
          }
        }
      };

      removeFields(cleaned);

      // Sort arrays if needed
      if (!compareArrayOrder) {
        const sortArrays = (o) => {
          if (Array.isArray(o)) {
            o.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
          } else if (typeof o === 'object' && o) {
            for (const key in o) {
              sortArrays(o[key]);
            }
          }
        };
        sortArrays(cleaned);
      }

      return cleaned;
    };

    const cleaned1 = clean(response1);
    const cleaned2 = clean(response2);

    return {
      equal: JSON.stringify(cleaned1) === JSON.stringify(cleaned2),
      response1: cleaned1,
      response2: cleaned2
    };
  }

  /**
   * Validate response status code
   */
  static validateStatusCode(response, expectedStatus) {
    const status = response.status || response.statusCode;

    if (!status) {
      return {
        success: false,
        message: 'No status code in response'
      };
    }

    if (Array.isArray(expectedStatus)) {
      if (!expectedStatus.includes(status)) {
        return {
          success: false,
          message: `Status ${status} not in expected list: [${expectedStatus.join(', ')}]`
        };
      }
    } else if (status !== expectedStatus) {
      return {
        success: false,
        message: `Expected status ${expectedStatus}, got ${status}`
      };
    }

    return {
      success: true,
      message: `Status code ${status} is valid`
    };
  }

  /**
   * Validate response time
   */
  static validateResponseTime(duration, maxTime) {
    if (duration > maxTime) {
      return {
        success: false,
        message: `Response time ${duration}ms exceeded maximum ${maxTime}ms`
      };
    }

    return {
      success: true,
      message: `Response time ${duration}ms is within limit`
    };
  }

  /**
   * Validate JSON structure
   */
  static validateJsonStructure(data, schema) {
    const validate = (obj, schemaObj, path = '') => {
      const errors = [];

      for (const key in schemaObj) {
        const fullPath = path ? `${path}.${key}` : key;
        const schemaValue = schemaObj[key];
        const objValue = obj?.[key];

        if (schemaValue.required && objValue === undefined) {
          errors.push(`Missing required field: ${fullPath}`);
          continue;
        }

        if (objValue === undefined) continue;

        if (schemaValue.type) {
          const actualType = Array.isArray(objValue) ? 'array' : typeof objValue;
          if (actualType !== schemaValue.type) {
            errors.push(`Type mismatch at ${fullPath}: expected ${schemaValue.type}, got ${actualType}`);
          }
        }

        if (schemaValue.minLength && objValue.length < schemaValue.minLength) {
          errors.push(`Length violation at ${fullPath}: minimum ${schemaValue.minLength}, got ${objValue.length}`);
        }

        if (schemaValue.maxLength && objValue.length > schemaValue.maxLength) {
          errors.push(`Length violation at ${fullPath}: maximum ${schemaValue.maxLength}, got ${objValue.length}`);
        }

        if (schemaValue.pattern && !new RegExp(schemaValue.pattern).test(objValue)) {
          errors.push(`Pattern violation at ${fullPath}: value doesn't match ${schemaValue.pattern}`);
        }

        if (schemaValue.enum && !schemaValue.enum.includes(objValue)) {
          errors.push(`Enum violation at ${fullPath}: value not in [${schemaValue.enum.join(', ')}]`);
        }

        if (schemaValue.properties && typeof objValue === 'object') {
          const nestedErrors = validate(objValue, schemaValue.properties, fullPath);
          errors.push(...nestedErrors.errors);
        }
      }

      return { errors };
    };

    const result = validate(data, schema);

    return {
      valid: result.errors.length === 0,
      errors: result.errors
    };
  }

  /**
   * Extract error message from various response formats
   */
  static extractErrorMessage(response) {
    // Try common error message locations
    if (response.errorMessages && Array.isArray(response.errorMessages)) {
      return response.errorMessages.join(', ');
    }

    if (response.errors && typeof response.errors === 'object') {
      return Object.entries(response.errors)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }

    if (response.error) {
      if (typeof response.error === 'string') {
        return response.error;
      }
      if (response.error.message) {
        return response.error.message;
      }
    }

    if (response.message) {
      return response.message;
    }

    if (typeof response === 'string') {
      return response;
    }

    return 'Unknown error';
  }

  /**
   * Validate array response
   */
  static validateArrayResponse(data, options = {}) {
    const {
      minLength = 0,
      maxLength = Infinity,
      itemValidator = null
    } = options;

    if (!Array.isArray(data)) {
      return {
        success: false,
        message: 'Response is not an array'
      };
    }

    if (data.length < minLength) {
      return {
        success: false,
        message: `Array length ${data.length} is less than minimum ${minLength}`
      };
    }

    if (data.length > maxLength) {
      return {
        success: false,
        message: `Array length ${data.length} exceeds maximum ${maxLength}`
      };
    }

    if (itemValidator) {
      const invalidItems = [];
      data.forEach((item, index) => {
        if (!itemValidator(item)) {
          invalidItems.push(index);
        }
      });

      if (invalidItems.length > 0) {
        return {
          success: false,
          message: `Invalid items at indices: ${invalidItems.join(', ')}`
        };
      }
    }

    return {
      success: true,
      message: 'Array validation passed',
      length: data.length
    };
  }
}

export default TestValidationUtils;