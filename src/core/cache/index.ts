/**
 * Caching system for API responses and computed data
 */

import NodeCache from 'node-cache';
import type { CacheEntry } from '../../types/index.js';
import { createLogger } from '../utils/logger.js';
import { CacheError } from '../errors/index.js';

const logger = createLogger('cache');

/**
 * Enhanced cache manager with TTL support and statistics
 */
export class CacheManager {
  private cache: NodeCache;
  private defaultTtl: number;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  };

  constructor(options: {
    ttlSeconds?: number;
    maxItems?: number;
    checkPeriod?: number;
  } = {}) {
    const {
      ttlSeconds = 300,
      maxItems = 1000,
      checkPeriod = 120
    } = options;

    this.defaultTtl = ttlSeconds;
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      maxKeys: maxItems,
      checkperiod: checkPeriod,
      useClones: false, // For better performance
      deleteOnExpire: true,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    // Set up event listeners
    this.setupEventListeners();

    logger.info('Cache manager initialized', {
      ttlSeconds,
      maxItems,
      checkPeriod,
    });
  }

  /**
   * Setup cache event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.cache.on('set', (key, value) => {
      logger.debug('Cache set', { key, hasValue: !!value });
    });

    this.cache.on('del', (key, value) => {
      logger.debug('Cache delete', { key, hasValue: !!value });
    });

    this.cache.on('expired', (key, value) => {
      logger.debug('Cache expired', { key, hasValue: !!value });
    });

    this.cache.on('flush', () => {
      logger.debug('Cache flushed');
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      
      if (value !== undefined) {
        this.stats.hits++;
        logger.debug('Cache hit', { key });
        return value;
      } else {
        this.stats.misses++;
        logger.debug('Cache miss', { key });
        return undefined;
      }
    } catch (error) {
      logger.error('Cache get error', error, { key });
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    try {
      const ttl = ttlSeconds || this.defaultTtl;
      const success = this.cache.set(key, value, ttl);
      
      if (success) {
        this.stats.sets++;
        logger.debug('Cache set successful', { key, ttl });
      } else {
        logger.warn('Cache set failed', { key, ttl });
      }
      
      return success;
    } catch (error) {
      logger.error('Cache set error', error, { key });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  del(key: string): number {
    try {
      const deleted = this.cache.del(key);
      this.stats.deletes += deleted;
      logger.debug('Cache delete', { key, deleted });
      return deleted;
    } catch (error) {
      logger.error('Cache delete error', error, { key });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    try {
      return this.cache.has(key);
    } catch (error) {
      logger.error('Cache has error', error, { key });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  mget<T>(keys: string[]): Record<string, T> {
    try {
      const result: Record<string, T> = {};
      
      for (const key of keys) {
        const value = this.get<T>(key);
        if (value !== undefined) {
          result[key] = value;
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Cache mget error', error, { keys });
      return {};
    }
  }

  /**
   * Set multiple values in cache
   */
  mset<T>(obj: Array<{ key: string; val: T; ttl?: number }>): boolean {
    try {
      let allSuccess = true;
      
      for (const item of obj) {
        const success = this.set(item.key, item.val, item.ttl);
        if (!success) {
          allSuccess = false;
        }
      }
      
      return allSuccess;
    } catch (error) {
      logger.error('Cache mset error', error);
      return false;
    }
  }

  /**
   * Get or set pattern - execute function if key doesn't exist
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = this.get<T>(key);
      if (cached !== undefined) {
        return cached;
      }

      // Execute factory function
      logger.debug('Cache miss - executing factory function', { key });
      const value = await factory();
      
      // Store result in cache
      this.set(key, value, ttlSeconds);
      
      return value;
    } catch (error) {
      logger.error('Cache getOrSet error', error, { key });
      throw new CacheError(`Failed to get or set cache value for key: ${key}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      ...this.stats,
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    try {
      return this.cache.keys();
    } catch (error) {
      logger.error('Cache keys error', error);
      return [];
    }
  }

  /**
   * Clear all cache entries
   */
  flush(): void {
    try {
      this.cache.flushAll();
      this.resetStats();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', error);
    }
  }

  /**
   * Reset cache statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get cache entries with metadata
   */
  getEntries<T>(): Array<{ key: string; value: T; ttl: number }> {
    try {
      const keys = this.cache.keys();
      const entries: Array<{ key: string; value: T; ttl: number }> = [];
      
      for (const key of keys) {
        const value = this.cache.get<T>(key);
        const ttl = this.cache.getTtl(key);
        
        if (value !== undefined) {
          entries.push({
            key,
            value,
            ttl: ttl ? (ttl - Date.now()) / 1000 : 0,
          });
        }
      }
      
      return entries;
    } catch (error) {
      logger.error('Cache getEntries error', error);
      return [];
    }
  }

  /**
   * Set TTL for existing key
   */
  setTtl(key: string, ttlSeconds: number): boolean {
    try {
      return this.cache.ttl(key, ttlSeconds);
    } catch (error) {
      logger.error('Cache setTtl error', error, { key, ttlSeconds });
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  getTtl(key: string): number {
    try {
      const ttl = this.cache.getTtl(key);
      return ttl ? Math.floor((ttl - Date.now()) / 1000) : 0;
    } catch (error) {
      logger.error('Cache getTtl error', error, { key });
      return 0;
    }
  }

  /**
   * Cleanup expired entries manually
   */
  cleanup(): void {
    try {
      // NodeCache handles this automatically, but we can force it
      logger.debug('Manual cache cleanup triggered');
    } catch (error) {
      logger.error('Cache cleanup error', error);
    }
  }

  /**
   * Close cache and cleanup resources
   */
  close(): void {
    try {
      this.cache.close();
      logger.info('Cache manager closed');
    } catch (error) {
      logger.error('Cache close error', error);
    }
  }
}

/**
 * Generate cache key for API requests
 */
export function generateCacheKey(
  service: 'jira' | 'confluence',
  endpoint: string,
  params?: Record<string, any>
): string {
  const baseKey = `${service}:${endpoint}`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }
  
  // Sort parameters for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  
  return `${baseKey}:${Buffer.from(sortedParams).toString('base64')}`;
}

/**
 * Global cache instance
 */
let globalCache: CacheManager | null = null;

/**
 * Get or create global cache instance
 */
export function getCache(options?: {
  ttlSeconds?: number;
  maxItems?: number;
  checkPeriod?: number;
}): CacheManager {
  if (!globalCache) {
    globalCache = new CacheManager(options);
  }
  return globalCache;
}

/**
 * Initialize cache with configuration
 */
export function initializeCache(options: {
  ttlSeconds?: number;
  maxItems?: number;
  checkPeriod?: number;
}): CacheManager {
  if (globalCache) {
    globalCache.close();
  }
  
  globalCache = new CacheManager(options);
  return globalCache;
}

/**
 * Close global cache
 */
export function closeCache(): void {
  if (globalCache) {
    globalCache.close();
    globalCache = null;
  }
}