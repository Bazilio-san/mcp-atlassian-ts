// In-memory текстовый поиск с использованием string similarity
// Заменяет векторный поиск на поиск по близости строк

import { transliterate, transliterateRU } from '../../../../../core/utils/transliterate';
import { phraseSimilarity } from '../../../../../core/utils/string-similarity';
import {
  type TKeyNameScore,
  type JiraProjectWithSymbols,
  SYM_KEY_LC,
  SYM_NAME_LC,
  SYM_TR_RU_KEY_LC,
  SYM_TR_RU_KEY_UC,
  SYM_TR_RU_NAME_LC,
  SYM_TR_NAME_UC,
} from './types.js';
import { TKeyName } from '../../../../../types';

/**
 * Класс для управления текстовым поиском проектов на основе string similarity
 */
export class ProjectTextSearch {
  private projectsCache: Map<string, JiraProjectWithSymbols> = new Map();
  private cacheExpireTime = 0;
  private readonly cacheTTL = 60 * 60 * 1000; // 1 час

  constructor () {
    // Ничего не инициализируем, работаем только в памяти
  }

  /**
   * Обновление кеша проектов
   */
  async updateProjectsCache (projects: TKeyName[]): Promise<void> {
    console.log('📥  Updating project cache for text search...');
    console.log(`   Loading ${projects.length} projects from JIRA API`);

    // Создаем проекты с символами для вариаций
    const projectsWithSymbols: JiraProjectWithSymbols[] = projects.map(project => {
      const keyLC = project.key.toLowerCase();
      const nameLC = project.name.toLowerCase();
      const keyRuLC = transliterateRU(keyLC);

      return {
        ...project,
        [SYM_KEY_LC]: keyLC,
        [SYM_NAME_LC]: nameLC,
        [SYM_TR_RU_KEY_LC]: keyRuLC,
        [SYM_TR_RU_KEY_UC]: keyRuLC.toUpperCase(),
        [SYM_TR_NAME_UC]: transliterate(project.name).toUpperCase(),
        [SYM_TR_RU_NAME_LC]: transliterateRU(nameLC),
      };
    });

    // Обновляем кеш
    this.projectsCache.clear();
    projectsWithSymbols.forEach(p => {
      this.projectsCache.set(p.key, p);
    });
    this.cacheExpireTime = Date.now() + this.cacheTTL;

    console.log('✅  Project cache updated successfully for text search');
    console.log(`   📊  Projects loaded: ${projectsWithSymbols.length}`);
    console.log('   🔍  Text similarity search available for all projects\n');
  }

  /**
   * Проверка актуальности кеша
   */
  isCacheValid (): boolean {
    return Date.now() < this.cacheExpireTime && this.projectsCache.size > 0;
  }

  /**
   * Поиск проектов по запросу с использованием string similarity
   */
  async searchProjects (
    query: string,
    limit = 5,
  ): Promise<TKeyNameScore[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Сначала проверяем точное совпадение
    const exactMatches = this.exactSearch(normalizedQuery);
    if (exactMatches.length > 0) {
      return exactMatches.slice(0, limit);
    }

    // Ищем по близости строк для всех проектов
    const results: Array<{ key: string; name: string; score: number }> = [];

    for (const project of this.projectsCache.values()) {
      const similarities = this.calculateSimilarities(normalizedQuery, project);
      const maxSimilarity = Math.max(...similarities);

      if (maxSimilarity > 0.3) { // Порог схожести
        results.push({
          key: project.key,
          name: project.name,
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
  private exactSearch (normalizedQuery: string): TKeyNameScore[] {
    const matches: TKeyNameScore[] = [];

    for (const project of this.projectsCache.values()) {
      const variations = [
        project.key.toLowerCase(),
        project.name.toLowerCase(),
        project[SYM_KEY_LC],
        project[SYM_NAME_LC],
        project[SYM_TR_RU_KEY_LC],
        project[SYM_TR_RU_KEY_UC]?.toLowerCase(),
        project[SYM_TR_RU_NAME_LC],
        project[SYM_TR_NAME_UC]?.toLowerCase(),
      ];

      if (variations.some(v => v === normalizedQuery)) {
        matches.push({
          key: project.key,
          name: project.name,
          score: 1.0, // Точное совпадение
        });
      }
    }

    return matches;
  }

  /**
   * Вычисление схожести запроса с вариациями проекта
   */
  private calculateSimilarities (query: string, project: JiraProjectWithSymbols): number[] {
    const variations = [
      project.key.toLowerCase(),
      project.name.toLowerCase(),
      project[SYM_KEY_LC],
      project[SYM_NAME_LC],
      project[SYM_TR_RU_KEY_LC],
      project[SYM_TR_RU_KEY_UC]?.toLowerCase(),
      project[SYM_TR_RU_NAME_LC],
      project[SYM_TR_NAME_UC]?.toLowerCase(),
    ];

    return variations.map(variation => phraseSimilarity(query, variation));
  }

  /**
   * Получение всех проектов (для wildcard поиска)
   */
  async getAllProjects (): Promise<TKeyNameScore[]> {
    const projects = Array.from(this.projectsCache.values());
    return projects
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(p => ({
        key: p.key,
        name: p.name,
        score: 1.0,
      }));
  }

  /**
   * Очистка кеша
   */
  async clear (): Promise<void> {
    this.projectsCache.clear();
    this.cacheExpireTime = 0;
  }
}
