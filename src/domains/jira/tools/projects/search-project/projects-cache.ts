/* eslint-disable camelcase */
import type { AxiosInstance } from 'axios';
import {
  TErrorProjKeyNameResult,
  IJiraCreateMetaResponse, IJiraProject, TKeyName,
} from '../../../../../types/index.js';
import { createLogger } from '../../../../../core/utils/logger.js';
import { createAuthenticationManager } from '../../../../../core/auth/index.js';
import { appConfig } from '../../../../../bootstrap/init-config.js';
import type { AuthConfig } from '../../../../../types/index.js';
import { transliterate, transliterateRU } from '../../../../../core/utils/transliterate.js';
// Lazy import для избежания циклических зависимостей
let updateProjectsIndex: any;

// Standalone power HTTP client
let powerHttpClient: AxiosInstance | null = null;

const logger = createLogger('JIRA_PROJECTS');

const SYM_KEY_LC = Symbol('SYM_KEY_LC');
const SYM_NAME_LC = Symbol('SYM_NAME_LC');
const SYM_TR_RU_KEY_LC = Symbol('SYM_TR_RU_KEY_LC');
const SYM_TR_RU_KEY_UC = Symbol('SYM_TR_RU_KEY_UC');
const SYM_TR_RU_NAME_LC = Symbol('SYM_TR_RU_NAME_LC');
const SYM_TR_NAME_UC = Symbol('SYM_TR_NAME_UC');


const projectsCache: {
  cache: TKeyName[] | null;
  hash: { [key: string]: TKeyName } | null;
  expire: number;
  cachePromise: Promise<TErrorProjKeyNameResult> | null;
} = {
  cache: null,
  hash: null,
  expire: 0,
  cachePromise: null,
};

const PROJECTS_TTL_MS = 60 * 60 * 1000; // 1 hour

// Initialize power HTTP client or fallback to regular auth
const initializePowerHttpClient = (): void => {
  // Try power endpoint first
  if (!powerHttpClient && appConfig.jira?.powerEndpoint?.baseUrl && appConfig.jira?.powerEndpoint?.auth) {
    const powerAuth = appConfig.jira.powerEndpoint.auth;

    // Transform config auth to AuthConfig format
    let authConfig: AuthConfig;
    if (powerAuth.basic?.username && powerAuth.basic?.password) {
      authConfig = {
        type: 'basic' as const,
        username: powerAuth.basic.username,
        password: powerAuth.basic.password,
      };
    } else if (powerAuth.pat) {
      authConfig = {
        type: 'pat' as const,
        token: powerAuth.pat,
      };
    } else if (powerAuth.oauth2) {
      authConfig = {
        ...powerAuth.oauth2,
        type: 'oauth2' as const,
      };
    } else {
      throw new Error('No valid power endpoint authentication configured');
    }

    const authManager = createAuthenticationManager(
      authConfig,
      appConfig.jira.powerEndpoint.baseUrl,
    );
    powerHttpClient = authManager.getHttpClient();
    logger.info('Power HTTP client initialized for JIRA projects');
  }
  // Fallback to regular JIRA auth if no power endpoint configured
  else if (!powerHttpClient && appConfig.jira?.url && appConfig.jira?.auth) {
    logger.info('Power endpoint not configured, using regular JIRA auth for projects');

    // Transform regular config auth to AuthConfig format
    let authConfig: AuthConfig;
    const jiraAuth = appConfig.jira.auth;

    if (jiraAuth.basic?.username && jiraAuth.basic?.password) {
      authConfig = {
        type: 'basic' as const,
        username: jiraAuth.basic.username,
        password: jiraAuth.basic.password,
      };
    } else if (jiraAuth.pat) {
      authConfig = {
        type: 'pat' as const,
        token: jiraAuth.pat,
      };
    } else if (jiraAuth.oauth2) {
      authConfig = {
        ...jiraAuth.oauth2,
        type: 'oauth2' as const,
      };
    } else {
      throw new Error('No valid JIRA authentication configured');
    }

    const authManager = createAuthenticationManager(authConfig, appConfig.jira.url);
    powerHttpClient = authManager.getHttpClient();
    logger.info('Fallback HTTP client initialized for JIRA projects');
  }
};

// Получить все проекты (пространства) Jira (с кешированием)
export const getJiraProjects = async (): Promise<TErrorProjKeyNameResult> => {
  const now = Date.now();
  // Return cached if not expired
  if (projectsCache.cache && now < projectsCache.expire) {
    return { error: null, result: projectsCache.cache, hash: projectsCache.hash! };
  }
  // If a request is already in flight, reuse it
  if (projectsCache.cachePromise) {
    return projectsCache.cachePromise;
  }
  // Otherwise, fetch and populate cache
  projectsCache.cachePromise = (async () => {
    try {
      // Initialize power HTTP client if needed
      initializePowerHttpClient();

      if (!powerHttpClient) {
        throw new Error('HTTP client not available for JIRA projects - check authentication configuration');
      }

      const res = await powerHttpClient.get<IJiraCreateMetaResponse>('/rest/api/2/project');
      const projects = res.data;
      const result = Array.isArray(projects)
        ? projects.map(({ key, name }: IJiraProject) => {
          const keyLC = key.toLowerCase();
          const nameLC = name.toLowerCase();
          const keyRuLC = transliterateRU(keyLC);
          return {
            key,
            name,
            [SYM_KEY_LC]: keyLC,
            [SYM_NAME_LC]: nameLC,
            [SYM_TR_RU_KEY_LC]: keyRuLC,
            [SYM_TR_RU_KEY_UC]: keyRuLC.toUpperCase(),
            [SYM_TR_NAME_UC]: transliterate(name).toUpperCase(),
            [SYM_TR_RU_NAME_LC]: transliterateRU(nameLC),
          };
        })
        : [];
      // Обновляем индекс векторного поиска если он доступен
      if (typeof updateProjectsIndex === 'function') {
        const projectsForIndex = result.map(({ key, name }) => ({ key, name }));
        updateProjectsIndex(projectsForIndex).catch((err: any) => {
          logger.error('Failed to update vector index', err);
        });
      }
      projectsCache.cache = result;
      projectsCache.hash = {};
      result.forEach((item) => {
        projectsCache.hash![item.key] = item;
      });
      projectsCache.expire = Date.now() + PROJECTS_TTL_MS;
      return { error: null, result, hash: projectsCache.hash };
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
  projectsCache.hash = null;
  projectsCache.expire = 0;
  projectsCache.cachePromise = null;
  logger.debug('Projects cache cleared');
};

// Set the function to update vector index (to avoid circular dependencies)
export const setUpdateProjectsIndexFunction = (fn: any): void => {
  updateProjectsIndex = fn;
};
