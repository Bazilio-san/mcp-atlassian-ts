// noinspection UnnecessaryLocalVariableJS

/**
 * Cascade Executor
 * Utilities for executing cascade operations (multi-step test workflows)
 */

class CascadeExecutor {
  constructor (resourceManager) {
    this.resourceManager = resourceManager;
    this.executionResults = new Map();
  }

  /**
   * Execute cascade operation
   */
  async executeCascade (cascadeTestCase, testRunner) {
    const results = [];

    for (const step of cascadeTestCase.steps) {
      try {
        console.log(`  🔄 Executing step: ${step.action} - ${step.testCase}`);
        const testCase = this.findTestCase(step.testCase, testRunner);
        if (!testCase) {
          throw new Error(`Test case '${step.testCase}' not found`);
        }

        // Prepare test case with resource substitution
        const preparedTestCase = this.prepareTestCase(testCase, step);

        // Execute test
        const result = await testRunner.runTestCase(preparedTestCase);
        console.log(`    → Result: status=${result.status}, success=${result.success}`);

        // Save result
        if (step.storeAs && result.success && result.data) {
          const resourceId = this.extractResourceId(result.data, step.testCase);
          console.log(`    → Storing resource: ${step.storeAs} = ${resourceId}`);

          const resourceType = this.getResourceType(step.testCase);
          this.resourceManager.track(resourceType, resourceId, {
            name: step.storeAs,
            testCase: step.testCase
          });
        } else if (step.storeAs) {
          console.log(`    → Failed to store resource: ${step.storeAs}, success=${result.success}, has data=${!!result.data}`);
        }

        results.push({
          step: step.action,
          testCase: step.testCase,
          success: result.success,
          result,
        });

      } catch (error) {
        results.push({
          step: step.action,
          testCase: step.testCase,
          success: false,
          error: error.message,
        });
        break; // break cascade on error
      }
    }

    return {
      name: cascadeTestCase.name,
      type: 'cascade',
      success: results.every(r => r.success),
      steps: results,
    };
  }

  /**
   * Find test case by name
   */
  findTestCase (name, testRunner) {
    return testRunner.sharedTestCases.getTestCasesByNames([name])[0];
  }

  /**
   * Prepare test case with resource substitution
   */
  prepareTestCase (testCase, step) {
    const prepared = JSON.parse(JSON.stringify(testCase)); // deep clone

    if (step.useResource) {
      const resources = this.resourceManager.getAllResources();
      const resource = resources.find(r => r.name === step.useResource);

      if (resource) {
        // Replace placeholders in endpoint and data
        prepared.directApi.endpoint = prepared.directApi.endpoint
          .replace(`{${step.useResource}}`, resource.id)
          .replace(`{${resource.resourceType}Id}`, resource.id)
          .replace('{issueKey}', resource.id)
          .replace('{linkId}', resource.id)
          .replace('{versionId}', resource.id)
          .replace('{tempIssueKey}', resource.id)
          .replace('{remoteLinkId}', resource.id)
          .replace('{attachmentId}', resource.id)
          .replace('{workflowSchemeId}', resource.id)
          .replace('{boardId}', resource.id);

        if (prepared.directApi.data) {
          prepared.directApi.data = this.replacePlaceholders(
            prepared.directApi.data,
            step.useResource,
            resource.id
          );
        }
      }
    }

    if (step.useResources) {
      // For cases with multiple resources (e.g., issue linking)
      const resources = this.resourceManager.getAllResources();

      step.useResources.forEach((resourceName) => {
        const resource = resources.find(r => r.name === resourceName);
        if (resource) {
          if (prepared.directApi.data) {
            prepared.directApi.data = this.replacePlaceholders(
              prepared.directApi.data,
              resourceName,
              resource.id
            );
          }
        }
      });
    }

    return prepared;
  }

  /**
   * Replace placeholders in data object
   */
  replacePlaceholders (obj, resourceName, resourceId) {
    const jsonStr = JSON.stringify(obj);
    const replaced = jsonStr
      .replace(new RegExp(`{${resourceName}}`, 'g'), resourceId)
      .replace(new RegExp(`{${resourceName}Key}`, 'g'), resourceId)
      .replace(new RegExp(`{${resourceName}Id}`, 'g'), resourceId);
    return JSON.parse(replaced);
  }

  /**
   * Extract resource ID from result
   */
  extractResourceId (data, testCaseName) {
    // Check common ID fields
    if (data.key) {return data.key;}
    if (data.id) {return data.id;}

    // Handle specific test case types
    if (testCaseName.includes('Issue')) {
      return data.key || data.id;
    }
    if (testCaseName.includes('Version')) {
      return data.id;
    }
    if (testCaseName.includes('Comment')) {
      return data.id;
    }
    if (testCaseName.includes('Worklog')) {
      return data.id;
    }
    if (testCaseName.includes('Link')) {
      return data.id;
    }

    return data.id || data.key || null;
  }

  /**
   * Determine resource type by test case name
   */
  getResourceType (testCaseName) {
    if (testCaseName.includes('Issue')) {return 'issues';}
    if (testCaseName.includes('Version')) {return 'versions';}
    if (testCaseName.includes('Comment')) {return 'comments';}
    if (testCaseName.includes('Worklog')) {return 'worklogs';}
    if (testCaseName.includes('Link')) {return 'links';}
    if (testCaseName.includes('Attachment')) {return 'attachments';}
    if (testCaseName.includes('Sprint')) {return 'sprints';}
    if (testCaseName.includes('Board')) {return 'boards';}
    if (testCaseName.includes('Project')) {return 'projects';}
    if (testCaseName.includes('WorkflowScheme')) {return 'workflowSchemes';}
    return 'other';
  }

  /**
   * Execute multiple cascades in sequence
   */
  async executeCascades (cascadeTestCases, testRunner) {
    const results = [];

    for (const cascadeCase of cascadeTestCases) {
      console.log(`\n📊 Starting cascade: ${cascadeCase.name}`);
      console.log('─'.repeat(80));

      const result = await this.executeCascade(cascadeCase, testRunner);
      results.push(result);

      const statusIcon = result.success ? '✅' : '❌';
      console.log(`${statusIcon} Cascade ${cascadeCase.name}: ${result.success ? 'PASSED' : 'FAILED'}`);

      if (!result.success) {
        const failedStep = result.steps.find(s => !s.success);
        if (failedStep) {
          console.log(`  └─ Failed at: ${failedStep.testCase} - ${failedStep.error || 'Unknown error'}`);
        }
      }
    }

    return results;
  }

  /**
   * Validate cascade definition
   */
  validateCascade (cascadeTestCase) {
    const errors = [];

    if (!cascadeTestCase.name) {
      errors.push('Cascade must have a name');
    }

    if (!cascadeTestCase.steps || !Array.isArray(cascadeTestCase.steps)) {
      errors.push('Cascade must have steps array');
    } else {
      cascadeTestCase.steps.forEach((step, index) => {
        if (!step.action) {
          errors.push(`Step ${index + 1} must have an action`);
        }
        if (!step.testCase) {
          errors.push(`Step ${index + 1} must have a testCase`);
        }
        if (step.useResource && step.useResources) {
          errors.push(`Step ${index + 1} cannot have both useResource and useResources`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate cascade execution report
   */
  generateReport (cascadeResults) {
    const total = cascadeResults.length;
    const passed = cascadeResults.filter(r => r.success).length;
    const failed = total - passed;

    const report = {
      summary: {
        total,
        passed,
        failed,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : 'N/A'
      },
      cascades: cascadeResults.map(result => ({
        name: result.name,
        success: result.success,
        totalSteps: result.steps.length,
        passedSteps: result.steps.filter(s => s.success).length,
        failedSteps: result.steps.filter(s => !s.success).length,
        steps: result.steps.map(s => ({
          action: s.action,
          testCase: s.testCase,
          success: s.success,
          error: s.error
        }))
      }))
    };

    return report;
  }
}

export default CascadeExecutor;
