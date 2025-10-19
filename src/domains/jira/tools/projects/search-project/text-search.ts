// In-memory текстовый поиск с использованием string similarity
// Использует оптимизированную структуру кеша с предвычисленными вариантами

import { phraseSimilarity } from '../../../../../core/utils/string-similarity.js';
import { type TKeyNameScore } from './types.js';
import { type TKeyName } from '../../../../../types';
import { getOptimizedProjectsCache, type ProjectCacheEntry } from './projects-cache.js';

/**
 * Класс для управления текстовым поиском проектов на основе string similarity
 * Теперь использует оптимизированный кеш с предвычисленными вариантами
 */
export class ProjectTextSearch {
  constructor () {
    // Кеш теперь управляется в projects-cache.ts
  }

  /**
   * Обновление кеша проектов - больше не требуется,
   * кеш управляется централизованно в projects-cache.ts
   */
  async updateProjectsCache (projects: TKeyName[]): Promise<void> {
    console.log('📥  Text search now uses optimized centralized cache...');
    console.log(`   ${projects.length} projects available for search`);
    console.log('✅  Text similarity search ready\n');
  }

  /**
   * Поиск проектов по запросу с использованием string similarity
   */
  async searchProjects (query: string, limit = 5): Promise<TKeyNameScore[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const cache = getOptimizedProjectsCache();
    if (!cache) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Сначала проверяем точное совпадение
    const exactMatches = this.exactSearch(normalizedQuery, cache);
    if (exactMatches.length > 0) {
      return exactMatches.slice(0, limit);
    }

    // Ищем по близости строк для всех проектов
    const results: Array<{ key: string; name: string; score: number }> = [];

    for (const entry of Object.values(cache)) {
      const maxSimilarity = this.calculateSimilarities(normalizedQuery, entry.variants);

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
  }

  /**
   * Точный поиск по всем вариациям проекта
   */
  private exactSearch (normalizedQuery: string, cache: { [key: string]: ProjectCacheEntry }): TKeyNameScore[] {
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
  }

  /**
   * Вычисление максимальной схожести запроса с вариациями проекта
   */
  private calculateSimilarities (query: string, variants: string[]): number {
    const similarities = variants.map(variant =>
      phraseSimilarity(query, variant.toLowerCase()),
    );
    return Math.max(...similarities);
  }

  /**
   * Получение всех проектов (для wildcard поиска)
   */
  async getAllProjects (): Promise<TKeyNameScore[]> {
    const cache = getOptimizedProjectsCache();
    if (!cache) {
      return [];
    }

    const projects = Object.values(cache).map(entry => entry.project);
    return projects
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(p => ({
        key: p.key,
        name: p.name,
        score: 1.0,
      }));
  }
}
