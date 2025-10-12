import axios from 'axios';
// import { TCreateIssueParams } from './types';
// import { getDebug } from '../../../../core/utils/logger';

// export const debugAgent = getDebug('debug-agent');

const JIRA_BASE_URL = 'https://jira.finam.ru';
const username = 'vpupkimn';
const password = '***';
const auth = Buffer.from(`${username}:${password}`).toString('base64');

export const jiraApi = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/2`,
  headers: {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Simple in-memory cache for Jira priorities
const PRIORITY_TTL_MS = 3 * 60 * 60 * 1000; // 3 часа

const priorityCache: {
  cache: { [name: string]: number } | null;
  expire: number;
  cachePromise: Promise<{ error: any, result: { [name: string]: number } }> | null;
} = {
  cache: null,
  expire: 0,
  cachePromise: null,
};

// Получить все возможные значения для поля Priority (с кешированием)
export const getPriorityHash = async (): Promise<{ error: any, result: { [name: string]: number } }> => {
  const now = Date.now();
  // Return cached if not expired
  if (priorityCache.cache && now < priorityCache.expire) {
    return { error: null, result: priorityCache.cache };
  }
  // If a request is already in flight, reuse it
  if (priorityCache.cachePromise) {
    return priorityCache.cachePromise;
  }
  const fn = async (): Promise<{ error: any, result: { [name: string]: number } }> => {
    try {
      const res = await jiraApi.get('/priority');
      const result = Array.isArray(res.data)
        ? res.data.reduce((accum, p: any) => {
          accum[p.name] = Number(p.id);
          return accum;
        }, {})
        : {};
      priorityCache.cache = result;
      priorityCache.expire = Date.now() + PRIORITY_TTL_MS;
      return { error: null, result };
    } catch (err) {
      return { error: err, result: {} };
    } finally {
      priorityCache.cachePromise = null;
    }
  };
  // Otherwise, fetch and populate cache
  priorityCache.cachePromise = fn();
  return priorityCache.cachePromise;
};
