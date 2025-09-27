/**
 * Enhanced Resource Manager
 * Tracks and cleans up test resources
 */

class ResourceManager {
  constructor(config = {}) {
    this.resources = {
      issues: [],
      projects: [],
      sprints: [],
      boards: [],
      components: [],
      versions: [],
      users: [],
      pages: [],
      spaces: [],
      links: [],
      workflowSchemes: [],
      other: [],
    };
    this.cleanupFunctions = [];
    this.verbose = config.verbose || false;
    this.dryRun = config.dryRun || false;
    this.source = config.source || 'unknown';
  }

  /**
   * Track a created resource
   */
  track(type, id, metadata = {}) {
    if (!this.resources[type]) {
      this.resources[type] = [];
    }

    const resource = {
      id,
      type,
      createdAt: new Date().toISOString(),
      source: this.source,
      ...metadata,
    };

    this.resources[type].push(resource);

    if (this.verbose) {
      console.log(`📌 Tracked ${type}: ${id}`);
    }

    return resource;
  }

  /**
   * Track a JIRA issue
   */
  trackIssue(issueKey, projectKey = null) {
    return this.track('issues', issueKey, { projectKey });
  }

  /**
   * Track a JIRA project
   */
  trackProject(projectKey, projectId = null) {
    return this.track('projects', projectKey, { projectId });
  }

  /**
   * Track a sprint
   */
  trackSprint(sprintId, boardId = null) {
    return this.track('sprints', sprintId, { boardId });
  }

  /**
   * Track a board
   */
  trackBoard(boardId, projectKey = null) {
    return this.track('boards', boardId, { projectKey });
  }

  /**
   * Track a version
   */
  trackVersion(versionId, projectId = null) {
    return this.track('versions', versionId, { projectId });
  }

  /**
   * Track an issue link
   */
  trackLink(linkId) {
    return this.track('links', linkId);
  }

  /**
   * Track a workflow scheme
   */
  trackWorkflowScheme(schemeId, schemeName = null) {
    return this.track('workflowSchemes', schemeId, { schemeName });
  }

  /**
   * Track a Confluence page
   */
  trackPage(pageId, spaceKey = null) {
    return this.track('pages', pageId, { spaceKey });
  }

  /**
   * Track a Confluence space
   */
  trackSpace(spaceKey, spaceId = null) {
    return this.track('spaces', spaceKey, { spaceId });
  }

  /**
   * Register a cleanup function
   */
  registerCleanup(fn, description = '') {
    this.cleanupFunctions.push({
      fn,
      description,
      registered: new Date().toISOString(),
    });

    if (this.verbose) {
      console.log(`🧹 Registered cleanup: ${description || 'Custom cleanup function'}`);
    }
  }

  /**
   * Get resource count
   */
  getResourceCount() {
    let total = 0;
    for (const type in this.resources) {
      total += this.resources[type].length;
    }
    return total;
  }

  /**
   * Get resource summary
   */
  getResourceSummary() {
    const summary = {};
    for (const type in this.resources) {
      if (this.resources[type].length > 0) {
        summary[type] = this.resources[type].length;
      }
    }
    return summary;
  }

  /**
   * Get all tracked resources
   */
  getAllResources() {
    const all = [];
    for (const type in this.resources) {
      for (const resource of this.resources[type]) {
        all.push({ ...resource, resourceType: type });
      }
    }
    return all;
  }

  /**
   * Clear resources of a specific type
   */
  clearType(type) {
    if (this.resources[type]) {
      const count = this.resources[type].length;
      this.resources[type] = [];
      if (this.verbose && count) {
        console.log(`🗑️ Cleared ${count} ${type} resources`);
      }
      return count;
    }
    return 0;
  }

  /**
   * Clear all resources
   */
  clearAll() {
    let total = 0;
    for (const type in this.resources) {
      total += this.clearType(type);
    }
    this.cleanupFunctions = [];
    return total;
  }

  /**
   * Execute cleanup
   */
  async cleanup() {
    const totalResources = this.getResourceCount();
    const totalFunctions = this.cleanupFunctions.length;

    if (totalResources === 0 && totalFunctions === 0) {
      if (this.verbose) {
        console.log('✨  No resources to clean up');
      }
      return { cleaned: 0, errors: [] };
    }

    console.log(`\n🧹 Starting cleanup (${totalResources} resources, ${totalFunctions} functions)`);

    if (this.dryRun) {
      console.log('🔍 DRY RUN - No actual cleanup will be performed');
      console.log('Resources that would be cleaned:');
      console.log(JSON.stringify(this.getResourceSummary(), null, 2));
      return { cleaned: 0, errors: [], dryRun: true };
    }

    const errors = [];
    let cleaned = 0;

    // Execute cleanup functions first
    for (const cleanup of this.cleanupFunctions) {
      try {
        if (this.verbose) {
          console.log(`  Executing: ${cleanup.description || 'Cleanup function'}`);
        }
        await cleanup.fn();
        cleaned++;
      } catch (error) {
        errors.push({
          type: 'function',
          description: cleanup.description,
          error: error.message,
        });
        if (this.verbose) {
          console.error(`  ❌ Failed: ${error.message}`);
        }
      }
    }

    // Resource-specific cleanup (can be extended with actual API calls)
    // This is a placeholder for resource cleanup logic
    // In a real implementation, this would call the appropriate APIs

    if (this.verbose && this.resources.issues.length > 0) {
      console.log(`  📝 Would delete issues: ${this.resources.issues.map(i => i.id).join(', ')}`);
    }

    if (this.verbose && this.resources.projects.length > 0) {
      console.log(`  📁 Would delete projects: ${this.resources.projects.map(p => p.id).join(', ')}`);
    }

    // Clear tracked resources
    const cleared = this.clearAll();

    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} cleanup errors occurred`);
      if (this.verbose) {
        errors.forEach(err => {
          console.log(`  - ${err.type}: ${err.description} - ${err.error}`);
        });
      }
    }

    return { cleaned, errors };
  }

  /**
   * Export resource tracking data
   */
  exportData() {
    return {
      source: this.source,
      timestamp: new Date().toISOString(),
      resources: this.resources,
      cleanupFunctions: this.cleanupFunctions.map(f => ({
        description: f.description,
        registered: f.registered,
      })),
      summary: this.getResourceSummary(),
      totalResources: this.getResourceCount(),
    };
  }

  /**
   * Import resource tracking data
   */
  importData(data) {
    if (data.resources) {
      // Merge resources properly
      Object.entries(data.resources).forEach(([type, items]) => {
        if (Array.isArray(items)) {
          if (!this.resources[type]) {
            this.resources[type] = [];
          }
          this.resources[type].push(...items);
        }
      });
    }
    if (data.source) {
      this.source = data.source;
    }
    return this.getResourceCount();
  }

  /**
   * Check if resource exists
   */
  hasResource(type, id) {
    if (!this.resources[type]) {
      return false;
    }
    return this.resources[type].some(r => r.id === id);
  }

  /**
   * Remove a specific resource from tracking
   */
  untrack(type, id) {
    if (!this.resources[type]) {
      return false;
    }

    const index = this.resources[type].findIndex(r => r.id === id);
    if (index !== -1) {
      this.resources[type].splice(index, 1);
      if (this.verbose) {
        console.log(`📌 Untracked ${type}: ${id}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Get resources created within a time range
   */
  getResourcesByTimeRange(startTime, endTime = null) {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();

    const filtered = [];
    for (const type in this.resources) {
      for (const resource of this.resources[type]) {
        const createdAt = new Date(resource.createdAt);
        if (createdAt >= start && createdAt <= end) {
          filtered.push({ ...resource, resourceType: type });
        }
      }
    }
    return filtered;
  }

  /**
   * Generate cleanup report
   */
  generateCleanupReport() {
    const report = {
      title: 'Resource Cleanup Report',
      source: this.source,
      timestamp: new Date().toISOString(),
      summary: this.getResourceSummary(),
      totalResources: this.getResourceCount(),
      totalCleanupFunctions: this.cleanupFunctions.length,
      resources: {},
    };

    // Add detailed resource information
    for (const type in this.resources) {
      if (this.resources[type].length > 0) {
        report.resources[type] = this.resources[type].map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          metadata: Object.keys(r).filter(k => !['id', 'type', 'createdAt', 'source'].includes(k))
            .reduce((obj, key) => ({ ...obj, [key]: r[key] }), {}),
        }));
      }
    }

    // Add cleanup function information
    report.cleanupFunctions = this.cleanupFunctions.map(f => ({
      description: f.description,
      registered: f.registered,
    }));

    return report;
  }
}

export default ResourceManager;
