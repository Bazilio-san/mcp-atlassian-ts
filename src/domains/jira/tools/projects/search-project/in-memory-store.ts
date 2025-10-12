// In-memory векторное хранилище с персистентностью на диск
// Формат файла: <projectKey>|<projName>|<projId>|<[vector]>

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { IVectorDB } from './vector-search.js';
import type { ProjectEmbeddingRecord } from './types.js';
import { PROJECT_DB_PATH } from '../../../constants.js';

interface InMemoryRecord {
  key: string;
  name: string;
  searchText: string;
  vector: Float32Array;
  updatedAt: number;
}

/**
 * In-memory векторное хранилище с файловой персистентностью
 */
export class InMemoryVectorStore implements IVectorDB {
  private cache: Map<string, InMemoryRecord[]> = new Map();
  private readonly dataFile: string;

  constructor (basePath = PROJECT_DB_PATH) {
    this.dataFile = join(basePath, 'vectors.txt');

    // Создаем директорию если её нет
    const dir = dirname(this.dataFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Загружаем данные при инициализации
    this.loadFromDisk();
  }

  /**
   * Загрузка данных с диска
   */
  private loadFromDisk (): void {
    if (!existsSync(this.dataFile)) {
      console.debug('Vector store file not found, starting fresh');
      return;
    }

    try {
      const content = readFileSync(this.dataFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          // Формат: <projectKey>|<projName>|<searchText>|<[vector]>
          const parts = line.split('|');
          if (parts.length !== 4) continue;

          const [key, name, searchText, vectorStr] = parts;
          if (!key || !name || !searchText || !vectorStr) continue;

          const vector = new Float32Array(JSON.parse(vectorStr));

          const record: InMemoryRecord = {
            key,
            name,
            searchText: searchText,
            vector,
            updatedAt: Date.now(),
          };

          // Группируем по ключу проекта
          if (!this.cache.has(key)) {
            this.cache.set(key, []);
          }
          this.cache.get(key)!.push(record);
        } catch (lineError) {
          console.debug(`Error parsing line: ${line}`, lineError);
          // Пропускаем битые строки
        }
      }

      console.debug(`Loaded ${this.cache.size} projects from disk`);
    } catch (error) {
      console.error('Error loading vector store, resetting:', error);
      // При ошибке чтения удаляем файл и начинаем заново
      try {
        unlinkSync(this.dataFile);
      } catch {
        // Игнорируем ошибку удаления
      }
      this.cache.clear();
    }
  }

  /**
   * Сохранение данных на диск
   */
  private saveToDisk (): void {
    try {
      const lines: string[] = [];

      // Сохраняем каждую запись в формате строки
      for (const records of this.cache.values()) {
        for (const record of records) {
          // Формат: <projectKey>|<projName>|<searchText>|<[vector]>
          const vectorJson = JSON.stringify(Array.from(record.vector));
          const line = `${record.key}|${record.name}|${record.searchText}|${vectorJson}`;
          lines.push(line);
        }
      }

      writeFileSync(this.dataFile, lines.join('\n'), 'utf-8');
      console.debug(`Saved ${lines.length} vectors to disk`);
    } catch (error) {
      console.error('Error saving vector store to disk:', error);
    }
  }

  /**
   * Вычисление косинусного сходства между векторами
   */
  private cosineSimilarity (a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Сохранение записей с эмбеддингами
   */
  async upsertRecords (records: ProjectEmbeddingRecord[]): Promise<void> {
    if (records.length === 0) return;

    // Преобразуем и добавляем записи
    for (const record of records) {
      if (!record.embedding) continue;

      const inMemoryRecord: InMemoryRecord = {
        key: record.key,
        name: record.name,
        searchText: record.searchText,
        vector: new Float32Array(record.embedding),
        updatedAt: record.updatedAt,
      };

      // Группируем по ключу проекта
      if (!this.cache.has(record.key)) {
        this.cache.set(record.key, []);
      }

      // Проверяем, есть ли уже такая запись
      const projectRecords = this.cache.get(record.key)!;
      const existingIndex = projectRecords.findIndex(
        r => r.searchText === record.searchText,
      );

      if (existingIndex >= 0) {
        // Обновляем существующую
        projectRecords[existingIndex] = inMemoryRecord;
      } else {
        // Добавляем новую
        projectRecords.push(inMemoryRecord);
      }
    }

    // Сохраняем на диск после каждого обновления
    this.saveToDisk();
  }

  /**
   * Векторный поиск
   */
  async search (
    embedding: number[],
    limit: number,
    threshold: number,
  ): Promise<Array<{ key: string; name: string; searchText: string; score: number }>> {
    const queryVector = new Float32Array(embedding);
    const results: Array<{ key: string; name: string; searchText: string; score: number }> = [];

    // Ищем по всем записям
    for (const [_projectKey, projectRecords] of this.cache.entries()) {
      let bestScore = Infinity;
      let bestRecord: InMemoryRecord | null = null;

      // Находим лучшее совпадение для проекта
      for (const record of projectRecords) {
        const similarity = this.cosineSimilarity(queryVector, record.vector);
        const distance = 1 - similarity; // Преобразуем в расстояние

        if (distance < bestScore && distance <= threshold) {
          bestScore = distance;
          bestRecord = record;
        }
      }

      if (bestRecord) {
        results.push({
          key: bestRecord.key,
          name: bestRecord.name,
          searchText: bestRecord.searchText,
          score: 1 - (Math.min(bestScore, 2) / 2),
        });
      }
    }

    // Сортируем по близости и возвращаем топ N
    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
  }

  /**
   * Получение всех ключей проектов
   */
  async getAllProjectKeys (): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Удаление проектов по ключам
   */
  async deleteByKeys (keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    let changed = false;
    for (const key of keys) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.saveToDisk();
    }
  }

  /**
   * Очистка всей БД
   */
  async clear (): Promise<void> {
    this.cache.clear();

    // Удаляем файл с диска
    if (existsSync(this.dataFile)) {
      try {
        unlinkSync(this.dataFile);
      } catch (error) {
        console.error('Error deleting vector store file:', error);
      }
    }
  }

  /**
   * Закрытие соединения (для совместимости с интерфейсом)
   */
  async close (): Promise<void> {
    // Сохраняем финальное состояние
    this.saveToDisk();
    this.cache.clear();
  }
}
