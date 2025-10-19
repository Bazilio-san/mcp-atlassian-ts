// Главный модуль для текстового поиска проектов JIRA
// Интеграция с MCP инструментом

import { ProjectTextSearch } from './text-search.js';
import { TKeyName } from '../../../../../types';
import type { TKeyNameScore } from './types.js';

// Singleton для текстового поиска
let projectSearch: ProjectTextSearch | null = null;
let lastUpdateTime = 0;
const UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 минут

/**
 * Инициализация текстового поиска
 */
export async function initializeVectorSearch (): Promise<ProjectTextSearch | null> {
  // Если уже инициализировано, возвращаем существующий экземпляр
  if (projectSearch !== null) {
    return projectSearch;
  }

  console.log('\n🔧 Initializing text search...');
  console.log('   String similarity-based search (no external dependencies)');

  try {
    // Создаем экземпляр текстового поиска
    projectSearch = new ProjectTextSearch();

    console.log('\n✅  Text search initialized successfully');
    console.log('   Similarity metric: phrase similarity with typo tolerance');
    console.log('   Search variations: original, lowercase, transliterated');
    console.log('   In-memory storage only');
    console.log('   Semantic search: ENABLED via string similarity\n');
    return projectSearch;
  } catch (error: any) {
    console.error('\n❌  Failed to initialize text search');
    console.error('   Error:', error?.message || error);
    console.warn('   Falling back to exact match search only.');
    console.warn('   Project search will work but without fuzzy matching capabilities.\n');
    return null;
  }
}

/**
 * Обновление кеша проектов
 */
export async function updateProjectsCacheForFallback (
  projects: TKeyName[],
): Promise<void> {
  if (!projectSearch) {
    projectSearch = new ProjectTextSearch();
    console.log('📦 Created text search instance for fallback');
  }

  // Обновляем кеш
  if (projectSearch) {
    await projectSearch.updateProjectsCache(projects);
  }
}

/**
 * Обновление индекса проектов с throttling
 * Обновляет не чаще чем раз в 10 минут
 */
export async function updateProjectsIndex (
  projects: TKeyName[],
  forceUpdate = false,
): Promise<void> {
  if (!projectSearch) {
    console.debug('Text search not available, creating fallback cache');
    await updateProjectsCacheForFallback(projects);
    return;
  }

  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

  // Проверяем, нужно ли обновлять
  if (!forceUpdate && timeSinceLastUpdate < UPDATE_INTERVAL_MS) {
    const remainingTime = Math.ceil((UPDATE_INTERVAL_MS - timeSinceLastUpdate) / 1000);
    console.debug(`Skipping text index update (next update in ${remainingTime}s)`);
    return;
  }

  try {
    console.log('🔄  Starting text index update...');
    console.log(`   Processing ${projects.length} projects from JIRA`);

    const updateStartTime = Date.now();
    await projectSearch.updateProjectsCache(projects);
    const updateDuration = Math.round((Date.now() - updateStartTime) / 1000);

    lastUpdateTime = now;

    // Логируем итоговую статистику обновления
    const nextUpdateTime = new Date(lastUpdateTime + UPDATE_INTERVAL_MS);
    const nextUpdateMinutes = Math.round(UPDATE_INTERVAL_MS / 60000);

    console.log(`🎉  Text index update completed in ${updateDuration}s`);
    console.log(`   ⏰  Next automatic update: in ${nextUpdateMinutes} minutes (${nextUpdateTime.toLocaleTimeString()})`);
    console.log('   🔍  Project search is ready with fuzzy matching capabilities!\n');
  } catch (error: any) {
    console.error('❌  Failed to update projects index');
    console.error(`   Error: ${error?.message || error}`);
    console.warn('   Will retry on next search request or manual update.\n');
  }
}

/**
 * Поиск проектов с использованием текстового поиска
 */
export async function searchProjects (
  query: string,
  limit = 5,
): Promise<TKeyNameScore[]> {
  if (!projectSearch) {
    console.debug('Text search not available');
    return [];
  }

  // Обработка wildcard поиска
  if (query === '*') {
    const allProjects = await projectSearch.getAllProjects();
    return allProjects.map(p => ({ key: p.key, name: p.name }));
  }

  try {
    const results = await projectSearch.searchProjects(query, limit);
    return results.map(r => ({ key: r.key, name: r.name, score: r.score || 0.0 }));
  } catch (error) {
    console.error('Text search failed:', error);
    return [];
  }
}

/**
 * Проверка доступности текстового поиска
 */
export function isVectorSearchAvailable (): boolean {
  return projectSearch !== null;
}

/**
 * Проверка необходимости обновления индекса
 */
export function shouldUpdateIndex (): boolean {
  if (!projectSearch) {
    return false;
  }
  const now = Date.now();
  return (now - lastUpdateTime) >= UPDATE_INTERVAL_MS;
}

/**
 * Получение времени до следующего обновления (в секундах)
 */
export function getTimeToNextUpdate (): number {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  if (timeSinceLastUpdate >= UPDATE_INTERVAL_MS) {
    return 0;
  }
  return Math.ceil((UPDATE_INTERVAL_MS - timeSinceLastUpdate) / 1000);
}
