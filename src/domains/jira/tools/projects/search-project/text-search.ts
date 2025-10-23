// In-memory поиск с использованием string similarity

import { phraseSimilarity } from '../../../../../core/utils/string-similarity.js';
import { getProjectsCache, type IProjectCacheEntry } from './projects-cache.js';
import type { AxiosInstance } from 'axios';
import { TKeyName } from '../../../../../types';


interface TKeyNameScore extends TKeyName {
  score?: number;  // Схожесть строк (1.0 = идеальное совпадение)
}

const exactSearch = (normalizedQuery: string, cache: { [key: string]: IProjectCacheEntry }): TKeyNameScore[] => {
  const matches: TKeyNameScore[] = [];

  for (const entry of Object.values(cache)) {
    // Проверяем точное совпадение среди всех вариантов
    const hasExactMatch = entry.variants.some(variant =>
      variant.toLowerCase() === normalizedQuery,
    );

    if (hasExactMatch) {
      matches.push({
        key: entry.project.key,
        name: entry.project.name,
        score: 1.0, // Точное совпадение
      });
    }
  }

  return matches;
};


/**
 * Вычисление максимальной схожести запроса с вариациями проекта
 */
const calculateSimilarities = (query: string, variants: string[]): number => {
  const similarities = variants.map(variant =>
    phraseSimilarity(query, variant.toLowerCase()),
  );
  return Math.max(...similarities);
};

export const searchProjects = async (
  query: string,
  limit = 5,
  httpClient: AxiosInstance,
  restPath: string,
): Promise<TKeyNameScore[]> => {
  const q = String(query || '').trim();

  if (!q) {
    return [];
  }

  const cache = await getProjectsCache(httpClient, restPath);
  if (!cache) {
    return [];
  }
  const projects = Object.values(cache).map(entry => entry.project);
  if (q === '*') {
    return projects
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, limit);
  }
  const normalizedQuery = query.toLowerCase();
  const matches = exactSearch(normalizedQuery, cache);
  if (matches.length) {
    return matches;
  }

  // Ищем по близости строк для всех проектов
  const results: Array<{ key: string; name: string; score: number }> = [];

  for (const entry of Object.values(cache)) {
    const maxSimilarity = calculateSimilarities(normalizedQuery, entry.variants);
    if (maxSimilarity > 0.33) { // Порог схожести
      results.push({
        key: entry.project.key,
        name: entry.project.name,
        score: maxSimilarity,
      });
    }
  }

  // Сортируем по score (убывание) и ограничиваем количество
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

