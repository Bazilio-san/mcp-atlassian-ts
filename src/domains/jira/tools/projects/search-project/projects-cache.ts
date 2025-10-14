/* eslint-disable camelcase */
import type { AxiosInstance } from 'axios';
import {
  TErrorProjKeyNameResult,
  IJiraCreateMetaResponse, IJiraProject, TKeyName,
} from '../../../../../types/index.js';
import { createLogger } from '../../../../../core/utils/logger.js';
import { transliterate, transliterateRU, enToRuVariants } from '../../../../../core/utils/transliterate.js';
import type { ToolContext } from '../../../shared/tool-context.js';
import { powerHttpClient } from '../../../../../core/server/jira-server.js';

// Lazy import для избежания циклических зависимостей
let updateProjectsIndex: any;

// HTTP client from ToolContext (passed via initialization)
let httpClient: AxiosInstance | null = null;

const logger = createLogger('JIRA_PROJECTS');

// Новая оптимизированная структура кеша
interface ProjectCacheEntry {
  project: TKeyName;
  variants: string[];
}

const projectsCache: {
  cache: {
    [key: string]: ProjectCacheEntry;
  } | null;
  expire: number;
  cachePromise: Promise<TErrorProjKeyNameResult> | null;
} = {
  cache: null,
  expire: 0,
  cachePromise: null,
};

const PROJECTS_TTL_MS = 60 * 60 * 1000; // 1 hour

// Initialize projects cache with ToolContext
export const initializeProjectsCache = (context: ToolContext): void => {
  // Use powerHttpClient if available, otherwise use regular httpClient
  httpClient = powerHttpClient || context.httpClient;
  logger.info('Projects cache initialized with HTTP client', { usingPowerEndpoint: !!powerHttpClient });
};

// Получить все проекты (пространства) Jira (с кешированием)
export const getJiraProjects = async (): Promise<TErrorProjKeyNameResult> => {
  const now = Date.now();
  // Return cached if not expired
  if (projectsCache.cache && now < projectsCache.expire) {
    const cachedProjects = Object.values(projectsCache.cache).map(entry => entry.project);
    const hash: { [key: string]: TKeyName } = {};
    cachedProjects.forEach(p => {
      hash[p.key] = p;
    });
    return { error: null, result: cachedProjects, hash };
  }
  // If a request is already in flight, reuse it
  if (projectsCache.cachePromise) {
    return projectsCache.cachePromise;
  }
  // Otherwise, fetch and populate cache
  projectsCache.cachePromise = (async () => {
    try {
      if (!httpClient) {
        throw new Error('Projects cache not initialized - call initializeProjectsCache() first');
      }

      const res = await httpClient.get<IJiraCreateMetaResponse>('/rest/api/2/project');
      const projects = res.data;

      // Создаем новую структуру кеша с вариантами
      const cacheEntries: { [key: string]: ProjectCacheEntry } = {};
      const result: TKeyName[] = [];

      if (Array.isArray(projects)) {
        projects.forEach(({ key, name }: IJiraProject) => {
          const project: TKeyName = { key, name };
          result.push(project);

          // Создаем все варианты для поиска
          const keyLC = key.toLowerCase();
          const nameLC = name.toLowerCase();
          const keyRuVariants = enToRuVariants(keyLC);
          const nameRuVariants = enToRuVariants(nameLC, 5);

          const variants = [
            // Оригинальные
            key, name,
            // Lowercase
            keyLC, nameLC,
            // Транслитерация
            transliterate(key), transliterate(name),
            transliterateRU(keyLC), transliterateRU(nameLC),
            // Все русские варианты
            ...keyRuVariants,
            ...nameRuVariants,
          ].filter(Boolean); // убираем пустые

          cacheEntries[key] = {
            project,
            variants: [...new Set(variants)], // убираем дубликаты
          };
        });
      }

      // Обновляем индекс векторного поиска если он доступен
      if (typeof updateProjectsIndex === 'function') {
        updateProjectsIndex(result).catch((err: any) => {
          logger.error('Failed to update vector index', err);
        });
      }
      projectsCache.cache = cacheEntries;
      projectsCache.expire = Date.now() + PROJECTS_TTL_MS;

      // Создаем hash для обратной совместимости
      const hash: { [key: string]: TKeyName } = {};
      result.forEach(p => {
        hash[p.key] = p;
      });

      return { error: null, result, hash };
    } catch (err) {
      logger.error('Failed to fetch JIRA projects', err as Error);
      return { error: err, result: [], hash: {} };
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

// Set the function to update vector index (to avoid circular dependencies)
export const setUpdateProjectsIndexFunction = (fn: any): void => {
  updateProjectsIndex = fn;
};

// Get optimized projects cache for search
export const getOptimizedProjectsCache = (): { [key: string]: ProjectCacheEntry } | null => {
  return projectsCache.cache;
};

// Export ProjectCacheEntry type for use in text-search
export type { ProjectCacheEntry };
