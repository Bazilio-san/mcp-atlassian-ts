// Главный модуль для векторного поиска проектов JIRA
// Интеграция с MCP инструментом

import { appConfig } from '../../../../../bootstrap/init-config.js';
import { createOpenAIClient, getEmbeddings, EMBEDDING_MODELS } from './openai-client.js';
import { ProjectVectorSearch } from './vector-search.js';
import { InMemoryVectorStore } from './in-memory-store.js';
import { PROJECT_DB_PATH } from '../../../constants.js';
import { TKeyName } from '../../../../../types';

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
    console.warn('\n🚫 OpenAI API key not configured');
    console.warn('   Vector search is DISABLED. Using exact match search only.');
    console.warn('   To enable vector search, set OPENAI_API_KEY in .env or config.yaml');
    console.warn('   Project search will work with exact matching, no semantic/fuzzy search.\n');
    return null;
  }

  console.log('\n🔧 Initializing vector search...');
  console.log('   Checking OpenAI connectivity...');

  try {
    // Создаем OpenAI клиент
    openaiClient = createOpenAIClient(
      appConfig.openai.apiKey,
      appConfig.openai.baseURL,
    );

    // Тестируем подключение к OpenAI небольшим запросом
    console.log('   Testing OpenAI API connection...');
    const testModel = appConfig.openai?.model || EMBEDDING_MODELS.DEFAULT.model;
    const testDimensions = appConfig.openai?.dimensions || EMBEDDING_MODELS.DEFAULT.dimensions;

    try {
      const testResult = await getEmbeddings(openaiClient, ['test'], testModel, testDimensions);
      if (!testResult.embeddings || testResult.embeddings.length === 0) {
        throw new Error('Empty response from OpenAI API');
      }
      console.log('   ✅  OpenAI API is accessible');
    } catch (testError: any) {
      console.error(`   ❌  OpenAI API test failed: ${testError?.message || testError}`);
      throw testError;
    }

    // Создаем векторное хранилище
    console.log('   Initializing vector database...');
    const vectorDB = new InMemoryVectorStore(PROJECT_DB_PATH);

    // Создаем функцию для получения эмбеддингов
    const getEmbeddingsFn = async (texts: string[]) => {
      const model = appConfig.openai?.model || EMBEDDING_MODELS.DEFAULT.model;
      const dimensions = appConfig.openai?.dimensions || EMBEDDING_MODELS.DEFAULT.dimensions;

      const result = await getEmbeddings(openaiClient, texts, model, dimensions);
      return result.embeddings;
    };

    // Создаем экземпляр векторного поиска
    projectSearch = new ProjectVectorSearch(vectorDB, getEmbeddingsFn);

    console.log('\n✅  Vector search initialized successfully');
    console.log(`   Model: ${appConfig.openai?.model || EMBEDDING_MODELS.DEFAULT.model}`);
    console.log(`   Dimensions: ${appConfig.openai?.dimensions || EMBEDDING_MODELS.DEFAULT.dimensions}`);
    console.log(`   Vector DB path: ${PROJECT_DB_PATH}`);
    console.log('   Semantic search: ENABLED\n');
    return projectSearch;
  } catch (error: any) {
    console.error('\n❌  Failed to initialize vector search');
    if (error?.response?.status === 401) {
      console.error('   Invalid OpenAI API key. Please check your credentials.');
      console.error('   Make sure OPENAI_API_KEY is set correctly in .env or config.yaml');
    } else if (error?.response?.status === 429) {
      console.error('   OpenAI API rate limit exceeded. Please try again later.');
    } else if (error?.response?.status === 503 || error?.response?.status === 502) {
      console.error('   OpenAI API is temporarily unavailable. Please try again later.');
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to OpenAI API. Please check your network connection.');
    } else if (error?.code === 'ETIMEDOUT') {
      console.error('   OpenAI API request timed out. Please check your network connection.');
    } else {
      console.error('   Error:', error?.message || error);
    }
    console.warn('   Falling back to exact match search only.');
    console.warn('   Project search will work but without semantic/fuzzy capabilities.\n');
    return null;
  }
}

/**
 * Обновление кеша проектов для fallback поиска (когда векторный поиск недоступен)
 */
export async function updateProjectsCacheForFallback (
  projects: TKeyName[],
): Promise<void> {
  if (!projectSearch) {
    console.warn('⚠️  Vector search not available. Creating fallback cache...');

    // Создаем минимальный векторный поиск только для кеширования проектов
    // Без OpenAI, только для точного поиска
    const { InMemoryVectorStore } = await import('./in-memory-store.js');
    const vectorDB = new InMemoryVectorStore(PROJECT_DB_PATH);

    // Создаем dummy функцию для эмбеддингов (не будет вызываться)
    const dummyEmbeddingsFn = async () => [null];

    const { ProjectVectorSearch } = await import('./vector-search.js');
    projectSearch = new ProjectVectorSearch(vectorDB, dummyEmbeddingsFn);

    console.log('📦 Created fallback project cache instance');
  }

  // Обновляем кеш без векторного поиска
  if (projectSearch) {
    await (projectSearch as any).updateCacheOnlyForFallback(projects);
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
    console.debug('Vector search not available, using fallback cache update');
    await updateProjectsCacheForFallback(projects);
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
    console.log('🔄  Starting vector index update...');
    console.log(`   Processing ${projects.length} projects from JIRA`);

    const updateStartTime = Date.now();
    await projectSearch.updateProjectsCache(projects);
    const updateDuration = Math.round((Date.now() - updateStartTime) / 1000);

    lastUpdateTime = now;

    // Логируем итоговую статистику обновления
    const nextUpdateTime = new Date(lastUpdateTime + UPDATE_INTERVAL_MS);
    const nextUpdateMinutes = Math.round(UPDATE_INTERVAL_MS / 60000);

    console.log(`🎉  Vector index update completed in ${updateDuration}s`);
    console.log(`   ⏰  Next automatic update: in ${nextUpdateMinutes} minutes (${nextUpdateTime.toLocaleTimeString()})`);
    console.log('   🔍  Project search is ready with semantic capabilities!\n');
  } catch (error: any) {
    console.error('❌  Failed to update projects index');
    if (error?.response?.status === 401) {
      console.error('   OpenAI API authentication failed. Check your API key.');
    } else if (error?.response?.status === 429) {
      console.error('   OpenAI API rate limit exceeded. Will retry later.');
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      console.error('   Network connection to OpenAI failed.');
    } else {
      console.error(`   Error: ${error?.message || error}`);
    }
    console.warn('   Will retry on next search request or manual update.\n');
  }
}

/**
 * Поиск проектов с использованием векторного поиска
 */
export async function searchProjects (
  query: string,
  limit = 5,
): Promise<TKeyName[]> {
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

/**
 * Сброс синглтона для переинициализации (для тестов)
 */
export function resetVectorSearchSingleton (): void {
  projectSearch = null;
  openaiClient = null;
  lastUpdateTime = 0;
}
