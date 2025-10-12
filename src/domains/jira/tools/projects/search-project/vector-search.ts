// Векторный поиск для проектов JIRA

import { transliterate, transliterateRU } from './transliterate.js';
import { fillEmbeddingsCore, estimateTokens, type TEmbeddingArray } from './embeddings.js';
import {
  type TKeyNameScore,
  type ProjectEmbeddingRecord,
  type JiraProjectWithSymbols,
  SYM_KEY_LC,
  SYM_NAME_LC,
  SYM_TR_RU_KEY_LC,
  SYM_TR_RU_KEY_UC,
  SYM_TR_RU_NAME_LC,
  SYM_TR_NAME_UC,
} from './types.js';
import { TKeyName } from '../../../../../types';

// Интерфейс для векторной БД
export interface IVectorDB {
  // Сохранение записей с эмбеддингами
  upsertRecords (records: ProjectEmbeddingRecord[]): Promise<void>;

  // Векторный поиск
  search (embedding: number[], limit: number, threshold: number): Promise<Array<{
    key: string;
    name: string;
    searchText: string;
    score: number;
  }>>;

  // Получение всех ключей проектов
  getAllProjectKeys (): Promise<string[]>;

  // Удаление проектов по ключам
  deleteByKeys (keys: string[]): Promise<void>;

  // Очистка всей БД
  clear (): Promise<void>;
}

/**
 * Класс для управления векторным поиском проектов
 */
export class ProjectVectorSearch {
  private projectsCache: Map<string, JiraProjectWithSymbols> = new Map();
  private cacheExpireTime = 0;
  private readonly cacheTTL = 60 * 60 * 1000; // 1 час

  private restorePromise: Promise<void> | null = null;

  constructor (
    private vectorDB: IVectorDB,
    private getEmbeddingsFn: (texts: string[]) => Promise<(TEmbeddingArray | null)[]>,
  ) {
    // Сохраняем промис восстановления, чтобы можно было дождаться его
    this.restorePromise = this.restoreCacheFromDB().catch(error => {
      console.debug('Could not restore cache from DB:', error.message);
    });
  }

  /**
   * Обновление кеша проектов без векторного поиска (только для fallback режима)
   * Используется когда OpenAI недоступен, но нужны свежие данные для точного поиска
   */
  async updateCacheOnlyForFallback (projects: TKeyName[]): Promise<void> {
    console.log('📥  Updating project cache for fallback search...');
    console.log(`   Loading ${projects.length} projects from JIRA API`);

    // Создаем проекты с символами для точного поиска
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

    // Обновляем только кеш в памяти (без векторной БД)
    this.projectsCache.clear();
    projectsWithSymbols.forEach(p => {
      this.projectsCache.set(p.key, p);
    });
    this.cacheExpireTime = Date.now() + this.cacheTTL;

    console.log('✅  Project cache updated successfully for fallback search');
    console.log(`   📊  Projects loaded: ${projectsWithSymbols.length}`);
    console.log('   🔍  Exact/substring search available for all projects\n');
  }

  /**
   * Ожидание завершения восстановления кеша
   */
  async waitForRestore (): Promise<void> {
    if (this.restorePromise) {
      await this.restorePromise;
      this.restorePromise = null;
    }
  }

  /**
   * Восстановление кеша проектов из векторной БД
   */
  private async restoreCacheFromDB (): Promise<void> {
    try {
      // Получаем все ключи проектов из БД
      const projectKeys = await this.vectorDB.getAllProjectKeys();

      if (projectKeys.length === 0) {
        console.debug('No projects found in vector DB cache');
        return;
      }

      console.debug(`Restoring ${projectKeys.length} projects from vector DB cache...`);

      // Получаем проект по первому результату поиска для восстановления имени
      // Используем небольшой хак - ищем по ключу проекта чтобы получить его имя
      let restoredCount = 0;
      for (const key of projectKeys) {
        try {
          // Ищем записи для этого проекта
          const results = await this.vectorDB.search([0], 100, 10);
          const projectResult = results.find(r => r.key === key);

          const name = projectResult?.name || key;

          const projectWithSymbols: JiraProjectWithSymbols = {
            key,
            name,
            [SYM_KEY_LC]: key.toLowerCase(),
            [SYM_NAME_LC]: name.toLowerCase(),
            [SYM_TR_RU_KEY_LC]: transliterate(key).toLowerCase(),
            [SYM_TR_RU_KEY_UC]: transliterate(key).toUpperCase(),
            [SYM_TR_RU_NAME_LC]: transliterate(name).toLowerCase(),
            [SYM_TR_NAME_UC]: transliterate(name).toUpperCase(),
          };

          this.projectsCache.set(key, projectWithSymbols);
          restoredCount++;
        } catch (error) {
          console.debug(`Failed to restore project ${key}:`, error);
          // Продолжаем с другими проектами
        }
      }

      this.cacheExpireTime = Date.now() + this.cacheTTL;

      if (restoredCount > 0) {
        console.debug(`✅  Restored ${restoredCount}/${projectKeys.length} projects from vector DB cache`);
      } else {
        console.debug('❌  Failed to restore any projects from vector DB cache');
      }
    } catch (error) {
      console.debug('Failed to restore cache from DB:', error);
      // Не блокируем работу, просто кеш будет пустой
    }
  }

  /**
   * Обновление кеша проектов и их вариаций
   */
  async updateProjectsCache (projects: TKeyName[]): Promise<void> {
    const now = Date.now();

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
    this.cacheExpireTime = now + this.cacheTTL;

    // Обновляем векторную БД
    await this.updateVectorDB(projectsWithSymbols);
  }

  /**
   * Обновление векторной БД с новыми проектами
   */
  private async updateVectorDB (projects: JiraProjectWithSymbols[]): Promise<void> {
    // Получаем существующие ключи
    const existingKeys = await this.vectorDB.getAllProjectKeys();
    const existingKeysSet = new Set(existingKeys);

    // Определяем что добавить/обновить и что удалить
    const newProjectsMap = new Map(projects.map(p => [p.key, p]));
    const keysToDelete = existingKeys.filter(key => !newProjectsMap.has(key));
    const projectsToUpdate: JiraProjectWithSymbols[] = [];

    // Проверяем изменения и новые проекты
    for (const project of projects) {
      const isNew = !existingKeysSet.has(project.key);
      const existingProject = this.projectsCache.get(project.key);

      // Обновляем если:
      // - Проект новый
      // - Изменилось имя проекта
      if (isNew || !existingProject || existingProject.name !== project.name) {
        projectsToUpdate.push(project);
      }
    }

    // Удаляем устаревшие проекты
    if (keysToDelete.length > 0) {
      console.log(`Deleting ${keysToDelete.length} obsolete projects from vector index`);
      await this.vectorDB.deleteByKeys(keysToDelete);
    }

    // Если нет проектов для обновления, выходим
    if (projectsToUpdate.length === 0) {
      console.log(`Vector DB is up to date. Total projects: ${projects.length}`);
      return;
    }

    console.log(`🔄  Updating vector index: ${projectsToUpdate.length} projects to process...`);

    // Создаем вариации для каждого проекта
    const variations: ProjectEmbeddingRecord[] = [];
    const updatedAt = Date.now();

    for (const project of projectsToUpdate) {
      // Удаляем старые записи этого проекта только если он обновляется
      if (existingKeysSet.has(project.key) && projectsToUpdate.includes(project)) {
        await this.vectorDB.deleteByKeys([project.key]);
      }

      // Создаем вариации текста для поиска
      const searchTexts = new Set([
        project.key,
        project.name,
        project[SYM_KEY_LC],
        project[SYM_NAME_LC],
        project[SYM_TR_RU_KEY_LC],
        project[SYM_TR_RU_KEY_UC],
        project[SYM_TR_RU_NAME_LC],
        project[SYM_TR_NAME_UC],
      ]);

      searchTexts.forEach(searchText => {
        if (searchText) {
          variations.push({
            key: project.key,
            name: project.name,
            searchText: searchText,
            embedding: null,
            updatedAt: updatedAt,
          });
        }
      });
    }

    console.log(`   📝 Generating embeddings for ${variations.length} text variations...`);

    // Генерируем эмбеддинги пакетами
    const batchTokenLimit = 8000; // Лимит токенов на батч
    const fillEmbeddings = fillEmbeddingsCore<ProjectEmbeddingRecord>({
      getEmbeddingsFn: this.getEmbeddingsFn,
      batchTokenLimit,
      tokenCounter: estimateTokens,
      textField: 'searchText',
    });

    const recordsWithEmbeddings: ProjectEmbeddingRecord[] = [];
    let processedCount = 0;
    const startTime = Date.now();

    for await (const record of fillEmbeddings(variations)) {
      recordsWithEmbeddings.push(record);
      processedCount++;

      // Выводим прогресс с откатом каретки (\r) - числа меняются в одной строке
      const progress = Math.round((processedCount / variations.length) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const estimatedTotal = variations.length > 0 ? Math.round(((Date.now() - startTime) / processedCount) * variations.length / 1000) : 0;

      // Прогресс-бар: ⬛ для выполненного, ⬜ для оставшегося
      const barLength = 20;
      const filled = Math.floor((progress / 100) * barLength);
      const progressBar = '⬛'.repeat(filled) + '⬜'.repeat(barLength - filled);

      process.stdout.write(`\r   ⚡ [${progressBar}] ${progress}% | ${processedCount}/${variations.length} | ⏱️ ${elapsed}s / ~${estimatedTotal}s total`);
    }

    // Переход на новую строку после завершения с очисткой
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r   ✅  Embeddings generated successfully in ${totalTime}s${' '.repeat(30)}\n`);

    // Сохраняем в БД
    if (recordsWithEmbeddings.length > 0) {
      console.log('   💾 Saving to vector database...');
      await this.vectorDB.upsertRecords(recordsWithEmbeddings);

      // Краткая статистика об обновленных данных
      const insertedProjects = new Set(recordsWithEmbeddings.map(r => r.key));
      const avgRecordsPerProject = Math.round(recordsWithEmbeddings.length / insertedProjects.size);

      console.log('\n✅  Vector index update completed successfully!');
      console.log(`   📊  Updated projects: ${insertedProjects.size}`);
      console.log(`   📝  Total records: ${recordsWithEmbeddings.length} (~${avgRecordsPerProject} per project)`);

      // Попробуем получить общую статистику из БД (общее количество)
      try {
        const allKeys = await this.vectorDB.getAllProjectKeys();
        const uniqueProjects = new Set(allKeys);
        console.log(`   🗄️  Total projects in index: ${uniqueProjects.size}`);

        // Показываем примеры обновленных проектов (первые 3)
        const projectSamples = Array.from(insertedProjects).slice(0, 3);
        if (projectSamples.length > 0) {
          const sampleText = projectSamples.join(', ') + (insertedProjects.size > 3 ? `... +${insertedProjects.size - 3} more` : '');
          console.log(`   🔄  Updated: ${sampleText}`);
        }
      } catch (error) {
        console.debug('Could not retrieve total DB stats:', error);
        // Если не можем получить общую статистику, показываем что знаем точно
        console.log(`   ✅  Successfully updated ${insertedProjects.size} projects`);
      }
    } else {
      console.log('\n✅  No records to update - all projects are up to date');
    }
  }

  /**
   * Поиск проектов по запросу
   */
  async searchProjects (
    query: string,
    limit = 5,
    threshold = 0.7,
  ): Promise<TKeyNameScore[]> {
    // Ждем завершения восстановления кеша
    await this.waitForRestore();

    if (!query || !query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Сначала всегда проверяем точное совпадение в кеше
    const exactMatches = this.exactSearch(normalizedQuery, limit);
    if (exactMatches.length > 0) {
      // Если нашли точные совпадения, возвращаем их
      return exactMatches;
    }

    // Попробуем векторный поиск
    try {
      // Создаем эмбеддинг для запроса
      const [embedding] = await this.getEmbeddingsFn([query]);
      if (!embedding) {
        console.debug('Failed to create embedding for query, falling back to substring search');
        return this.substringSearch(normalizedQuery, limit);
      }

      // Выполняем векторный поиск
      const results = await this.vectorDB.search(embedding, limit, threshold);

      // Дополняем результаты данными из кеша
      const projectResults: TKeyNameScore[] = [];
      const addedKeys = new Set<string>();

      for (const result of results) {
        if (addedKeys.has(result.key)) continue;

        const project = this.projectsCache.get(result.key);
        if (project) {
          projectResults.push({
            key: result.key,
            name: result.name,
            score: Math.round(result.score * 10000) / 10000, // Округляем до 4 знаков
          });
          addedKeys.add(result.key);
        }
      }

      // Если векторный поиск не дал результатов, пробуем substring поиск
      if (projectResults.length === 0) {
        console.debug('Vector search returned no results, falling back to substring search');
        return this.substringSearch(normalizedQuery, limit);
      }

      return projectResults;
    } catch (error) {
      console.debug('Vector search failed, falling back to substring search:', error);
      return this.substringSearch(normalizedQuery, limit);
    }
  }

  /**
   * Точный поиск по всем вариациям проекта
   */
  private exactSearch (normalizedQuery: string, _limit: number): TKeyNameScore[] {
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
        return [{
          key: project.key,
          name: project.name,
          score: 1, // Точное совпадение
        }];
      }
    }
    return [];
  }

  /**
   * Поиск подстрок (fallback когда векторный поиск недоступен)
   */
  private substringSearch (normalizedQuery: string, limit: number): TKeyNameScore[] {
    const matches: TKeyNameScore[] = [];

    for (const project of this.projectsCache.values()) {
      const keyMatch = project[SYM_KEY_LC].includes(normalizedQuery);
      const nameMatch = project[SYM_NAME_LC].includes(normalizedQuery);

      if (keyMatch || nameMatch) {
        matches.push({
          key: project.key,
          name: project.name,
          score: keyMatch ? 0.9 : 0.8, // Приоритет для совпадений по ключу
        });
      }
    }

    // Сортируем по score (ключи проекта выше) и ограничиваем количество
    return matches
      .sort((a, b) => (b.score || 0) - (a.score || 0) || a.key.localeCompare(b.key))
      .slice(0, limit);
  }

  /**
   * Получение всех проектов (для wildcard поиска)
   */
  async getAllProjects (): Promise<TKeyNameScore[]> {
    // Ждем завершения восстановления кеша
    await this.waitForRestore();

    const projects = Array.from(this.projectsCache.values());
    return projects
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(p => ({
        key: p.key,
        name: p.name,
        score: 0,
      }));
  }

  /**
   * Проверка актуальности кеша
   */
  isCacheValid (): boolean {
    return Date.now() < this.cacheExpireTime && this.projectsCache.size > 0;
  }

  /**
   * Очистка кеша и БД
   */
  async clear (): Promise<void> {
    this.projectsCache.clear();
    this.cacheExpireTime = 0;
    await this.vectorDB.clear();
  }
}
