// Главный модуль для векторного поиска проектов JIRA
// Интеграция с MCP инструментом

import { appConfig } from '../../../../../bootstrap/init-config.js';
import { createOpenAIClient, getEmbeddings, EMBEDDING_MODELS } from './openai-client.js';
import { ProjectVectorSearch } from './vector-search.js';
import { InMemoryVectorStore } from './in-memory-store.js';
import type {
  JiraProjectWithIssueTypes,
  JiraProjectSearchResult,
} from './types.js';

// Singleton для векторного поиска
let projectSearch: ProjectVectorSearch | null = null;
let openaiClient: any = null;
let lastUpdateTime = 0;
const UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 минут

/**
 * Инициализация векторного поиска
 */
export async function initializeVectorSearch (): Promise<ProjectVectorSearch | null> {
  // Если уже инициализировано, возвращаем существующий экземпляр
  if (projectSearch !== null) {
    return projectSearch;
  }

  // Проверяем наличие конфигурации OpenAI
  if (!appConfig.openai?.apiKey) {
    console.warn('OpenAI API key not configured. Vector search will be disabled.');
    return null;
  }

  try {
    // Создаем OpenAI клиент
    openaiClient = createOpenAIClient(
      appConfig.openai.apiKey,
      appConfig.openai.baseURL,
    );

    // Создаем векторное хранилище
    const vectorDB = new InMemoryVectorStore('./data/vector-store');

    // Создаем функцию для получения эмбеддингов
    const getEmbeddingsFn = async (texts: string[]) => {
      const model = appConfig.openai?.model || EMBEDDING_MODELS.SMALL.model;
      const dimensions = appConfig.openai?.dimensions || EMBEDDING_MODELS.SMALL.dimensions;

      const result = await getEmbeddings(openaiClient, texts, model, dimensions);
      return result.embeddings;
    };

    // Создаем экземпляр векторного поиска
    projectSearch = new ProjectVectorSearch(vectorDB, getEmbeddingsFn);

    console.info('Vector search initialized successfully');
    return projectSearch;
  } catch (error) {
    console.error('Failed to initialize vector search:', error);
    return null;
  }
}

/**
 * Обновление индекса проектов с throttling
 * Обновляет не чаще чем раз в 10 минут
 */
export async function updateProjectsIndex (
  projects: JiraProjectWithIssueTypes[],
  forceUpdate = false,
): Promise<void> {
  if (!projectSearch) {
    console.debug('Vector search not available, skipping index update');
    return;
  }

  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;

  // Проверяем, нужно ли обновлять
  if (!forceUpdate && timeSinceLastUpdate < UPDATE_INTERVAL_MS) {
    const remainingTime = Math.ceil((UPDATE_INTERVAL_MS - timeSinceLastUpdate) / 1000);
    console.debug(`Skipping vector index update (next update in ${remainingTime}s)`);
    return;
  }

  try {
    console.log(`Updating vector index with ${projects.length} projects`);
    await projectSearch.updateProjectsCache(projects);
    lastUpdateTime = now;

    // Логируем статистику
    const stats = {
      projectsCount: projects.length,
      lastUpdate: new Date(lastUpdateTime).toISOString(),
      nextUpdate: new Date(lastUpdateTime + UPDATE_INTERVAL_MS).toISOString(),
    };
    console.debug('Vector index updated:', stats);
  } catch (error) {
    console.error('Failed to update projects index:', error);
  }
}

/**
 * Поиск проектов с использованием векторного поиска
 */
export async function searchProjects (
  query: string,
  limit = 5,
): Promise<JiraProjectSearchResult[]> {
  if (!projectSearch) {
    console.debug('Vector search not available');
    return [];
  }

  // Обработка wildcard поиска
  if (query === '*') {
    return projectSearch.getAllProjects();
  }

  try {
    return await projectSearch.searchProjects(query, limit);
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * Проверка доступности векторного поиска
 */
export function isVectorSearchAvailable (): boolean {
  return projectSearch !== null;
}

/**
 * Проверка необходимости обновления индекса
 */
export function shouldUpdateIndex (): boolean {
  if (!projectSearch) return false;
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

/**
 * Очистка векторного индекса
 */
export async function clearVectorIndex (): Promise<void> {
  if (!projectSearch) {
    return;
  }

  try {
    await projectSearch.clear();
    console.debug('Vector index cleared');
  } catch (error) {
    console.error('Failed to clear vector index:', error);
  }
}

// Экспортируем все необходимое для использования в инструменте
export {
  type JiraProjectWithIssueTypes,
  type JiraProjectSearchResult,
} from './types.js';

/**
 * Сброс синглтона для переинициализации (для тестов)
 */
export function resetVectorSearchSingleton (): void {
  projectSearch = null;
  openaiClient = null;
  lastUpdateTime = 0;
}

export { ProjectVectorSearch } from './vector-search.js';
export { InMemoryVectorStore } from './in-memory-store.js';

// Экспорт clearVectorIndex с альтернативным именем для тестов
export { clearVectorIndex as clearVectorDB } from './index.js';
