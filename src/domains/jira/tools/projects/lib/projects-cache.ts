/* eslint-disable camelcase */
import type { AxiosInstance } from 'axios';
import {
  IJiraIssueType,
  TKeyNameIssues,
  TErrorKeyNameIssuesResult,
  IJiraCreateMetaResponse, IJiraProject,
} from '../../../../../types';
import { createLogger } from '../../../../../core/utils/logger';
import { transliterate, transliterateRU } from '../../../../../core/utils/text';

const logger = createLogger('JIRA_PROJECTS');

const SYM_KEY_LC = Symbol('SYM_KEY_LC');
const SYM_NAME_LC = Symbol('SYM_NAME_LC');
const SYM_TR_RU_KEY_LC = Symbol('SYM_TR_RU_KEY_LC');
const SYM_TR_RU_KEY_UC = Symbol('SYM_TR_RU_KEY_UC');
const SYM_TR_RU_NAME_LC = Symbol('SYM_TR_RU_NAME_LC');
const SYM_TR_NAME_UC = Symbol('SYM_TR_NAME_UC');


const projectsCache: {
  cache: TKeyNameIssues[] | null;
  hash: { [key: string]: TKeyNameIssues } | null;
  expire: number;
  cachePromise: Promise<TErrorKeyNameIssuesResult> | null;
} = {
  cache: null,
  hash: null,
  expire: 0,
  cachePromise: null,
};

const PROJECTS_TTL_MS = 60 * 60 * 1000; // 1 hour

// Получить все проекты (пространства) Jira (с кешированием)
export const getJiraProjects = async (httpClient: AxiosInstance): Promise<TErrorKeyNameIssuesResult> => {
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
      const res = await httpClient.get<IJiraCreateMetaResponse>('/rest/api/2/issue/createmeta');
      const { projects } = res.data;
      const result = Array.isArray(projects)
        ? projects.map(({ key, name, issuetypes }: IJiraProject) => {
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
            issueTypes: (issuetypes || []).map((it: IJiraIssueType) => ({ id: it.id, name: it.name })),
          };
        })
        : [];
      // updateJiraBlueProjectsRag(result).then(() => 0); VVA -------------------
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
