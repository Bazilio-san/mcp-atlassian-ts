// Векторный поиск для проектов JIRA
// Адаптировано из multi-bot проекта

import { transliterate, transliterateRU } from './transliterate.js';
import { fillEmbeddingsCore, estimateTokens, type TEmbeddingArray } from './embeddings.js';
import {
  type JiraProjectWithIssueTypes,
  type JiraProjectSearchResult,
  type ProjectEmbeddingRecord,
  type JiraProjectWithSymbols,
  SYM_KEY_LC,
  SYM_NAME_LC,
  SYM_TR_RU_KEY_LC,
  SYM_TR_RU_KEY_UC,
  SYM_TR_RU_NAME_LC,
  SYM_TR_NAME_UC,
} from './types.js';

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
    // Получаем все ключи проектов из БД
    const projectKeys = await this.vectorDB.getAllProjectKeys();

    if (projectKeys.length === 0) {
      return;
    }

    // Получаем проект по первому результату поиска для восстановления имени
    // Используем небольшой хак - ищем по ключу проекта чтобы получить его имя
    for (const key of projectKeys) {
      // Ищем записи для этого проекта
      const results = await this.vectorDB.search([0], 100, 10);
      const projectResult = results.find(r => r.key === key);

      const name = projectResult?.name || key;

      const projectWithSymbols: JiraProjectWithSymbols = {
        key,
        name,
        issueTypes: ['Task', 'Bug', 'Story'] as any[], // Стандартные типы
        [SYM_KEY_LC]: key.toLowerCase(),
        [SYM_NAME_LC]: name.toLowerCase(),
        [SYM_TR_RU_KEY_LC]: transliterate(key).toLowerCase(),
        [SYM_TR_RU_KEY_UC]: transliterate(key).toUpperCase(),
        [SYM_TR_RU_NAME_LC]: transliterate(name).toLowerCase(),
        [SYM_TR_NAME_UC]: transliterate(name).toUpperCase(),
      };

      this.projectsCache.set(key, projectWithSymbols);
    }

    this.cacheExpireTime = Date.now() + this.cacheTTL;
    console.debug(`Restored ${projectKeys.length} projects from vector DB`);
  }

  /**
   * Обновление кеша проектов и их вариаций
   */
  async updateProjectsCache (projects: JiraProjectWithIssueTypes[]): Promise<void> {
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
      // - Изменился список issueTypes
      if (isNew ||
        !existingProject ||
        existingProject.name !== project.name ||
        JSON.stringify(existingProject.issueTypes) !== JSON.stringify(project.issueTypes)) {
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

    console.log(`\n📊 Updating vector DB: ${projectsToUpdate.length} projects to process`);

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

    console.log(`📝 Total variations to embed: ${variations.length}`);

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

      // Выводим прогресс с откатом каретки
      const progress = Math.round((processedCount / variations.length) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⚡ Embedding progress: ${processedCount}/${variations.length} (${progress}%) - ${elapsed}s`);
    }

    // Переход на новую строку после завершения
    console.log('');

    // Сохраняем в БД
    if (recordsWithEmbeddings.length > 0) {
      await this.vectorDB.upsertRecords(recordsWithEmbeddings);

      // Выводим диагностику
      // Сначала выведем то, что мы точно знаем
      const insertedProjects = new Set(recordsWithEmbeddings.map(r => r.key));
      console.log('\n✅ Vector DB updated successfully:');
      console.log(`   📊 Records inserted: ${recordsWithEmbeddings.length}`);
      console.log(`   🏢 Unique projects inserted: ${insertedProjects.size}`);
      console.log(`   📝 Records per project: ~${Math.round(recordsWithEmbeddings.length / insertedProjects.size)}`);

      // Попробуем получить общую статистику из БД
      try {
        const allKeys = await this.vectorDB.getAllProjectKeys();
        if (allKeys.length > 0) {
          const uniqueProjects = new Set(allKeys);
          console.log('\n   📈 Total in DB after update:');
          console.log(`      Total unique projects: ${uniqueProjects.size}`);
          console.log(`      Projects: ${Array.from(uniqueProjects).slice(0, 5).join(', ')}${uniqueProjects.size > 5 ? '...' : ''}`);
        }
      } catch (error) {
        console.debug('Could not retrieve total DB stats:', error);
      }
    }
  }

  /**
   * Поиск проектов по запросу
   */
  async searchProjects (
    query: string,
    limit = 5,
    threshold = 0.7,
  ): Promise<JiraProjectSearchResult[]> {
    // Ждем завершения восстановления кеша
    await this.waitForRestore();

    if (!query || !query.trim()) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Проверяем точное совпадение в кеше
    for (const project of this.projectsCache.values()) {
      const variations = [
        project.key,
        project.name,
        project[SYM_KEY_LC],
        project[SYM_NAME_LC],
        project[SYM_TR_RU_KEY_LC],
        project[SYM_TR_RU_KEY_UC],
        project[SYM_TR_RU_NAME_LC],
        project[SYM_TR_NAME_UC],
      ];

      if (variations.some(v => v === normalizedQuery)) {
        return [{
          key: project.key,
          name: project.name,
          issueTypes: project.issueTypes,
          score: 0, // Точное совпадение
        }];
      }
    }

    // Векторный поиск
    // Создаем эмбеддинг для запроса
    const [embedding] = await this.getEmbeddingsFn([query]);
    if (!embedding) {
      console.error('Failed to create embedding for query:', query);
      return [];
    }

    // Выполняем поиск
    const results = await this.vectorDB.search(embedding, limit, threshold);

    // Дополняем результаты данными из кеша
    const projectResults: JiraProjectSearchResult[] = [];
    const addedKeys = new Set<string>();

    for (const result of results) {
      if (addedKeys.has(result.key)) continue;

      const project = this.projectsCache.get(result.key);
      if (project) {
        projectResults.push({
          key: result.key,
          name: result.name,
          issueTypes: project.issueTypes,
          score: Math.round(result.score * 10000) / 10000, // Округляем до 4 знаков
        });
        addedKeys.add(result.key);
      }
    }

    return projectResults;
  }

  /**
   * Получение всех проектов (для wildcard поиска)
   */
  async getAllProjects (): Promise<JiraProjectSearchResult[]> {
    // Ждем завершения восстановления кеша
    await this.waitForRestore();

    const projects = Array.from(this.projectsCache.values());
    return projects
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(p => ({
        key: p.key,
        name: p.name,
        issueTypes: p.issueTypes,
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
