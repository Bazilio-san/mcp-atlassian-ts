// In-memory search using string similarity

import { phraseSimilarity } from '../../../../../core/utils/string-similarity.js';
import { getProjectsCache, type IProjectCacheEntry } from './projects-cache.js';
import type { AxiosInstance } from 'axios';
import { TKeyName } from '../../../../../types';


interface TKeyNameScore extends TKeyName {
  score?: number;  // String similarity (1.0 = perfect match)
}

const exactSearch = (normalizedQuery: string, cache: { [key: string]: IProjectCacheEntry }): TKeyNameScore[] => {
  const matches: TKeyNameScore[] = [];

  for (const entry of Object.values(cache)) {
    // Check for exact match among all variants
    const hasExactMatch = entry.variants.some(variant =>
      variant.toLowerCase() === normalizedQuery,
    );

    if (hasExactMatch) {
      matches.push({
        key: entry.project.key,
        name: entry.project.name,
        score: 1.0, // Exact match
      });
    }
  }

  return matches;
};


/**
 * Calculate maximum similarity of query with project variations
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

  // Search by string proximity for all projects
  const results: Array<{ key: string; name: string; score: number }> = [];

  for (const entry of Object.values(cache)) {
    const maxSimilarity = calculateSimilarities(normalizedQuery, entry.variants);
    if (maxSimilarity > 0.33) { // Similarity threshold
      results.push({
        key: entry.project.key,
        name: entry.project.name,
        score: maxSimilarity,
      });
    }
  }

  // Sort by score (descending) and limit quantity
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

