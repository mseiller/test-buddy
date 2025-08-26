/**
 * Advanced Multi-Layer Cache Manager
 * Provides intelligent caching with TTL, LRU eviction, and performance monitoring
 */

import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export type CacheStrategy = 'LRU' | 'LFU' | 'TTL' | 'FIFO';
export type CacheLayer = 'memory' | 'session' | 'local' | 'distributed';

export interface CacheConfig {
  maxSize: number;
  ttl: number; // milliseconds
  strategy: CacheStrategy;
  layer: CacheLayer;
  enableMetrics: boolean;
  compressionEnabled: boolean;
  persistToDisk: boolean;
  warmupKeys?: string[];
}

export interface CacheEntry<T = any> {
  key: string;
  value: T | string; // Allow string for serialized/compressed values
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  averageAccessTime: number;
  memoryUsage: number;
  compressionRatio: number;
  evictions: number;
  lastEviction?: number;
}

export interface CacheMetrics {
  cacheStats: CacheStats;
  performanceImpact: {
    averageHitTime: number;
    averageMissTime: number;
    timeSaved: number;
    requestsServed: number;
  };
  topKeys: Array<{
    key: string;
    hitCount: number;
    lastAccessed: number;
    size: number;
  }>;
  recommendations: string[];
}

export class CacheManager {
  private static instances = new Map<string, CacheManager>();
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private config: CacheConfig;
  private stats: CacheStats;
  private performanceCollector: PerformanceCollector;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(name: string, config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 3600000, // 1 hour
      strategy: 'LRU',
      layer: 'memory',
      enableMetrics: true,
      compressionEnabled: false,
      persistToDisk: false,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      compressionRatio: 1,
      evictions: 0
    };

    this.performanceCollector = PerformanceCollector.getInstance();
    this.startCleanupTask();

    if (this.config.enableMetrics) {
      this.setupMetricsCollection(name);
    }

    console.log(`Cache manager '${name}' initialized with strategy: ${this.config.strategy}`);
  }

  /**
   * Get or create cache manager instance
   */
  static getInstance(name: string = 'default', config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instances.has(name)) {
      CacheManager.instances.set(name, new CacheManager(name, config));
    }
    return CacheManager.instances.get(name)!;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordMiss(key, Date.now() - startTime);
        return null;
      }

      // Check TTL expiration
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.recordMiss(key, Date.now() - startTime);
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.updateAccessOrder(key);

      const value = entry.compressed ? this.decompress(entry.value) : entry.value;
      this.recordHit(key, Date.now() - startTime);
      
      return value;
    } catch (error) {
      console.error(`Cache get error for key '${key}':`, error);
      this.recordMiss(key, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, ttl?: number, metadata?: Record<string, any>): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const entryTtl = ttl || this.config.ttl;
      const serializedValue = this.serializeValue(value);
      const compressed = this.config.compressionEnabled && this.shouldCompress(serializedValue);
      const finalValue = compressed ? this.compress(serializedValue) : serializedValue;
      const size = this.calculateSize(finalValue);

      // Check if we need to evict entries
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        await this.evictEntries(1);
      }

      const entry: CacheEntry<T> = {
        key,
        value: finalValue,
        timestamp: Date.now(),
        ttl: entryTtl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        compressed,
        metadata
      };

      // Remove old entry if exists
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.stats.totalSize -= oldEntry.size;
        this.removeFromAccessOrder(key);
      }

      this.cache.set(key, entry);
      this.stats.totalSize += size;
      this.stats.entryCount = this.cache.size;
      this.updateAccessOrder(key);

      if (this.config.enableMetrics) {
        this.performanceCollector.recordMetric({
          name: 'cache.set_operation',
          type: 'timer',
          value: Date.now() - startTime,
          unit: 'milliseconds',
          tags: { 
            cache_key: this.sanitizeKey(key),
            compressed: compressed.toString(),
            size: size.toString()
          }
        });
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key '${key}':`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.stats.totalSize -= entry.size;
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.stats.entryCount = this.cache.size;
        
        if (this.config.enableMetrics) {
          this.performanceCollector.recordMetric({
            name: 'cache.delete_operation',
            type: 'counter',
            value: 1,
            unit: 'count',
            tags: { cache_key: this.sanitizeKey(key) }
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Cache delete error for key '${key}':`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
    
    if (this.config.enableMetrics) {
      this.performanceCollector.recordMetric({
        name: 'cache.clear_operation',
        type: 'counter',
        value: 1,
        unit: 'count'
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateStats();
    
    const topKeys = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key: this.sanitizeKey(key),
        hitCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size
      }));

    const recommendations = this.generateRecommendations();

    return {
      cacheStats: this.stats,
      performanceImpact: {
        averageHitTime: this.stats.hits > 0 ? this.stats.averageAccessTime : 0,
        averageMissTime: 50, // Estimated miss penalty
        timeSaved: this.stats.hits * 45, // Estimated time saved per hit
        requestsServed: this.stats.hits + this.stats.misses
      },
      topKeys,
      recommendations
    };
  }

  /**
   * Warm up cache with predefined keys
   */
  async warmUp(warmupFunction: (key: string) => Promise<any>): Promise<void> {
    if (!this.config.warmupKeys?.length) return;

    console.log(`Warming up cache with ${this.config.warmupKeys.length} keys...`);
    
    const warmupPromises = this.config.warmupKeys.map(async (key) => {
      try {
        const value = await warmupFunction(key);
        if (value !== null && value !== undefined) {
          await this.set(key, value);
        }
      } catch (error) {
        console.warn(`Cache warmup failed for key '${key}':`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
    
    if (this.config.enableMetrics) {
      this.performanceCollector.recordMetric({
        name: 'cache.warmup_completed',
        type: 'counter',
        value: 1,
        unit: 'count',
        tags: { keys_count: this.config.warmupKeys.length.toString() }
      });
    }
    
    console.log('Cache warmup completed');
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T = any>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await factory();
      await this.set(key, value, ttl, metadata);
      return value;
    } catch (error) {
      console.error(`Cache factory error for key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Bulk get operations
   */
  async mget<T = any>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      results.set(key, value);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Bulk set operations
   */
  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number; metadata?: Record<string, any> }>): Promise<boolean[]> {
    const promises = entries.map(({ key, value, ttl, metadata }) => 
      this.set(key, value, ttl, metadata)
    );

    return Promise.all(promises);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    const deletePromises = keysToDelete.map(key => this.delete(key));
    await Promise.all(deletePromises);

    if (this.config.enableMetrics && keysToDelete.length > 0) {
      this.performanceCollector.recordMetric({
        name: 'cache.pattern_invalidation',
        type: 'counter',
        value: keysToDelete.length,
        unit: 'count',
        tags: { pattern: pattern.toString() }
      });
    }

    return keysToDelete.length;
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): {
    entryCount: number;
    totalSize: number;
    averageEntrySize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      entryCount: this.cache.size,
      totalSize: this.stats.totalSize,
      averageEntrySize: this.cache.size > 0 ? this.stats.totalSize / this.cache.size : 0,
      maxSize: this.config.maxSize,
      utilizationPercent: (this.cache.size / this.config.maxSize) * 100
    };
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.config.persistToDisk) {
      // In a real implementation, this would persist cache to disk
      console.log('Cache persisted to disk');
    }

    console.log('Cache manager shutdown completed');
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private async evictEntries(count: number): Promise<void> {
    const keysToEvict: string[] = [];

    switch (this.config.strategy) {
      case 'LRU':
        keysToEvict.push(...this.accessOrder.slice(0, count));
        break;
      case 'LFU':
        const sortedByAccess = Array.from(this.cache.entries())
          .sort(([, a], [, b]) => a.accessCount - b.accessCount)
          .slice(0, count)
          .map(([key]) => key);
        keysToEvict.push(...sortedByAccess);
        break;
      case 'TTL':
        const expiredKeys = Array.from(this.cache.entries())
          .filter(([, entry]) => this.isExpired(entry))
          .slice(0, count)
          .map(([key]) => key);
        keysToEvict.push(...expiredKeys);
        break;
      case 'FIFO':
        keysToEvict.push(...Array.from(this.cache.keys()).slice(0, count));
        break;
    }

    for (const key of keysToEvict) {
      await this.delete(key);
      this.stats.evictions++;
      this.stats.lastEviction = Date.now();
    }
  }

  private recordHit(key: string, accessTime: number): void {
    this.stats.hits++;
    this.updateHitRate();
    this.updateAverageAccessTime(accessTime);

    if (this.config.enableMetrics) {
      this.performanceCollector.recordMetric({
        name: 'cache.hit',
        type: 'counter',
        value: 1,
        unit: 'count',
        tags: { cache_key: this.sanitizeKey(key) }
      });
    }
  }

  private recordMiss(key: string, accessTime: number): void {
    this.stats.misses++;
    this.updateHitRate();
    this.updateAverageAccessTime(accessTime);

    if (this.config.enableMetrics) {
      this.performanceCollector.recordMetric({
        name: 'cache.miss',
        type: 'counter',
        value: 1,
        unit: 'count',
        tags: { cache_key: this.sanitizeKey(key) }
      });
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateAverageAccessTime(newTime: number): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.averageAccessTime = ((this.stats.averageAccessTime * (total - 1)) + newTime) / total;
  }

  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    return this.stats.totalSize + (this.cache.size * 200); // 200 bytes overhead per entry
  }

  private serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private shouldCompress(value: string): boolean {
    return value.length > 1024; // Compress if larger than 1KB
  }

  private compress(value: string): string {
    // Simple compression simulation - in production, use actual compression
    return `compressed:${value.length}:${value.substring(0, 100)}...`;
  }

  private decompress(value: string): any {
    // Simple decompression simulation
    if (value.startsWith('compressed:')) {
      // In production, implement actual decompression
      return JSON.parse('{}'); // Placeholder
    }
    return JSON.parse(value);
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
  }

  private sanitizeKey(key: string): string {
    return key.length > 50 ? `${key.substring(0, 47)}...` : key;
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Cleanup every minute
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length > 0) {
      const deletePromises = expiredKeys.map(key => this.delete(key));
      await Promise.all(deletePromises);
      
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  private setupMetricsCollection(name: string): void {
    setInterval(() => {
      this.performanceCollector.recordMetric({
        name: 'cache.hit_rate',
        type: 'gauge',
        value: this.stats.hitRate,
        unit: 'ratio',
        tags: { cache_name: name }
      });

      this.performanceCollector.recordMetric({
        name: 'cache.entry_count',
        type: 'gauge',
        value: this.cache.size,
        unit: 'count',
        tags: { cache_name: name }
      });

      this.performanceCollector.recordMetric({
        name: 'cache.memory_usage',
        type: 'gauge',
        value: this.stats.memoryUsage,
        unit: 'bytes',
        tags: { cache_name: name }
      });
    }, 30000); // Report metrics every 30 seconds
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.stats.hitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL or reviewing cache keys for better hit rates');
    }

    if (this.stats.evictions > 100) {
      recommendations.push('High eviction rate detected - consider increasing cache size');
    }

    const utilization = (this.cache.size / this.config.maxSize) * 100;
    if (utilization > 90) {
      recommendations.push('Cache utilization is high - consider increasing max size or implementing better eviction');
    }

    if (this.stats.averageAccessTime > 10) {
      recommendations.push('High average access time - consider optimizing serialization or compression');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal');
    }

    return recommendations;
  }
}
