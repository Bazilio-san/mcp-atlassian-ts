import type { AxiosInstance } from 'axios';
import { IJiraCreateMetaResponse, IJiraProject, TKeyName } from '../../../../../types/index.js';
import { createLogger } from '../../../../../core/utils/logger.js';
import { transliterate, transliterateRU, enToRuVariants } from '../../../../../core/utils/transliterate.js';
import chalk from 'chalk';

const logger = createLogger('JIRA_PROJECTS', chalk.bgYellow);

// New optimized cache structure
interface IProjectCacheEntry {
  project: TKeyName;
  variants: string[];
}

interface IProjectCache {
  [key: string]: IProjectCacheEntry;
}

const projectsCache: {
  cache: IProjectCache | null;
  expire: number;
  cachePromise: Promise<IProjectCache> | null;
} = {
  cache: null,
  expire: 0,
  cachePromise: null,
};

const PROJECTS_TTL_MS = 60 * 60 * 1000; // 1 hour

// Get all Jira projects (spaces) (with caching)
export const getProjectsCache = async (httpClient: AxiosInstance, restPath: string): Promise<IProjectCache> => {
  const now = Date.now();
  // Return cached if not expired
  if (projectsCache.cache && now < projectsCache.expire) {
    const cachedProjects = Object.values(projectsCache.cache).map(entry => entry.project);
    const hash: { [key: string]: TKeyName } = {};
    cachedProjects.forEach(p => {
      hash[p.key] = p;
    });
    return projectsCache.cache;
  }
  // If a request is already in flight, reuse it
  if (projectsCache.cachePromise) {
    return projectsCache.cachePromise;
  }
  // Otherwise, fetch and populate cache
  projectsCache.cachePromise = (async () => {
    try {
      if (!httpClient) {
        throw new Error('httpClient is not provided');
      }

      const res = await httpClient.get<IJiraCreateMetaResponse>(`${restPath}/project`, {
        params: { expand: 'description,projectKeys' },
      });
      const projects = res.data;

      // Create new cache structure with variants
      const cacheEntries: { [key: string]: IProjectCacheEntry } = {};

      if (Array.isArray(projects)) {
        projects.forEach(({ key, name, description = '' }: IJiraProject) => {
          const project: TKeyName = { key, name };
          // Create all variants for search
          const keyLC = key.toLowerCase();
          const nameLC = name.toLowerCase();
          const keyRuVariants = enToRuVariants(keyLC);
          const nameRuVariants = enToRuVariants(nameLC, 5);

          const variants = [
            // Original
            key, name,
            // Lowercase
            keyLC, nameLC,
            // Transliteration
            transliterate(key), transliterate(name),
            transliterateRU(keyLC), transliterateRU(nameLC),
            // All Russian variants
            ...keyRuVariants,
            ...nameRuVariants,
            description,
          ].filter(Boolean); // remove empty

          cacheEntries[key] = {
            project,
            variants: [...new Set(variants)], // remove duplicates
          };
        });
      }

      projectsCache.cache = cacheEntries;
      projectsCache.expire = Date.now() + PROJECTS_TTL_MS;
      return cacheEntries;
    } catch (err) {
      throw err;
    } finally {
      projectsCache.cachePromise = null;
    }
  })();
  return projectsCache.cachePromise!;
};

// Clear projects cache (useful for testing or manual refresh)
export const clearProjectsCache = (): void => {
  projectsCache.cache = null;
  projectsCache.expire = 0;
  projectsCache.cachePromise = null;
  logger.debug('Projects cache cleared');
};

// Export ProjectCacheEntry type for use in text-search
export type { IProjectCacheEntry };
