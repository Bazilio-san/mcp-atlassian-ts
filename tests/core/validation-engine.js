/**
 * Unified Validation Engine
 */

class ValidationEngine {
  /**
   * Validate response based on source type
   */
  static validateResponse(response, testCase) {
    return this.validateDirectApiResponse(response, testCase);
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
      let errorMsg = `Status mismatch: expected ${testCase.expectedStatus}, got ${response.status}`;

      // Check for JIRA API error messages in error responses
      if (response.data && response.data.errorMessages && Array.isArray(response.data.errorMessages) && response.data.errorMessages.length > 0) {
        errorMsg += ` - ${response.data.errorMessages.join(', ')}`;
        result.details.errorMessages = response.data.errorMessages;
        if (response.data.errors) {
          result.details.errors = response.data.errors;
        }
      }

      result.error = errorMsg;
      result.details.statusMismatch = true;
      return result;
    }

    // Check for JIRA API error messages even in successful responses
    if (response.data && response.data.errorMessages && Array.isArray(response.data.errorMessages) && response.data.errorMessages.length > 0) {
      result.passed = false;
      result.error = `JIRA API Error: ${response.data.errorMessages.join(', ')}`;
      result.details.apiError = true;
      result.details.errorMessages = response.data.errorMessages;
      if (response.data.errors) {
        result.details.errors = response.data.errors;
      }
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
}

export default ValidationEngine;
