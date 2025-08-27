/**
 * Unified Cache Service
 * Integrates cache management, invalidation, and warming with monitoring
 */

import { CacheManager, CacheConfig } from './CacheManager';
import { CacheInvalidation } from './CacheInvalidation';
import { CacheWarming } from './CacheWarming';
import { MonitoringIntegration } from '../monitoring/MonitoringIntegration';
import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export interface CacheServiceConfig {
  defaultCacheConfig: Partial<CacheConfig>;
  enableInvalidation: boolean;
  enableWarming: boolean;
  enableMonitoring: boolean;
  autoWarmPopularContent: boolean;
  invalidationRules: Array<{
    name: string;
    pattern: string | RegExp;
    strategy: 'immediate' | 'lazy' | 'scheduled' | 'dependency-based';
    priority: number;
  }>;
  warmingRules: Array<{
    name: string;
    strategy: 'eager' | 'predictive' | 'scheduled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    schedule?: {
      interval?: number;
      immediate?: boolean;
    };
  }>;
}

export interface CacheOperationResult<T = any> {
  success: boolean;
  data?: T;
  fromCache: boolean;
  cacheKey: string;
  executionTime: number;
  error?: string;
}

export class CacheService {
  private static instance: CacheService;
  private cacheManager!: CacheManager;
  private invalidationService!: CacheInvalidation;
  private warmingService!: CacheWarming;
  private monitoringIntegration: MonitoringIntegration;
  private performanceCollector: PerformanceCollector;
  private config: CacheServiceConfig;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.performanceCollector = PerformanceCollector.getInstance();
    this.monitoringIntegration = MonitoringIntegration.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialize cache service
   */
  async initialize(config?: Partial<CacheServiceConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('Cache service already initialized');
      return;
    }

    this.config = { ...this.config, ...config };

    // Initialize cache manager
    this.cacheManager = CacheManager.getInstance('main', this.config.defaultCacheConfig);

    // Initialize invalidation service
    if (this.config.enableInvalidation) {
      this.invalidationService = CacheInvalidation.getInstance();
      this.invalidationService.registerCacheManager('main', this.cacheManager);
      this.setupInvalidationRules();
    }

    // Initialize warming service
    if (this.config.enableWarming) {
      this.warmingService = CacheWarming.getInstance();
      this.warmingService.registerCacheManager('main', this.cacheManager);
      this.setupWarmingRules();
    }

    // Initialize monitoring integration
    if (this.config.enableMonitoring) {
      await this.monitoringIntegration.initialize({
        enablePerformanceTracking: true,
        enableCustomMetrics: true,
        sampleRate: 1.0
      });
    }

    this.isInitialized = true;
    console.log('Cache service initialized successfully');

    // Record initialization
    this.performanceCollector.recordMetric({
      name: 'cache.service_initialized',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: {
        invalidation_enabled: this.config.enableInvalidation.toString(),
        warming_enabled: this.config.enableWarming.toString(),
        monitoring_enabled: this.config.enableMonitoring.toString()
      }
    });

    // Auto-warm popular content if enabled
    if (this.config.autoWarmPopularContent && this.config.enableWarming) {
      setTimeout(() => this.autoWarmPopularContent(), 5000);
    }
  }

  /**
   * Get cached value with comprehensive monitoring
   */
  async get<T = any>(key: string, userId?: string): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.normalizeKey(key);

    try {
      // Record access for learning (if warming is enabled)
      if (this.config.enableWarming && this.warmingService) {
        this.warmingService.recordAccess(userId || null, cacheKey);
      }

      const value = await this.cacheManager.get<T>(cacheKey);
      const executionTime = Date.now() - startTime;

      const result: CacheOperationResult<T> = {
        success: true,
        data: value || undefined,
        fromCache: value !== null,
        cacheKey,
        executionTime
      };

      // Record metrics
      this.recordOperation('get', result.fromCache ? 'hit' : 'miss', executionTime, cacheKey);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordOperation('get', 'error', executionTime, cacheKey, errorMessage);

      return {
        success: false,
        fromCache: false,
        cacheKey,
        executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * Set cached value with automatic invalidation setup
   */
  async set<T = any>(
    key: string,
    value: T,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<CacheOperationResult<boolean>> {
    const startTime = Date.now();
    const cacheKey = this.normalizeKey(key);

    try {
      const success = await this.cacheManager.set(cacheKey, value, ttl, metadata);
      const executionTime = Date.now() - startTime;

      const result: CacheOperationResult<boolean> = {
        success,
        data: success,
        fromCache: false,
        cacheKey,
        executionTime
      };

      this.recordOperation('set', success ? 'success' : 'failure', executionTime, cacheKey);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordOperation('set', 'error', executionTime, cacheKey, errorMessage);

      return {
        success: false,
        data: false,
        fromCache: false,
        cacheKey,
        executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * Get or set with factory function (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    metadata?: Record<string, any>,
    userId?: string
  ): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.normalizeKey(key);

    try {
      // Try to get from cache first
      const cached = await this.get<T>(cacheKey, userId);
      if (cached.success && cached.data !== null) {
        return cached;
      }

      // Cache miss - execute factory function
      const factoryStartTime = Date.now();
      const value = await this.monitoringIntegration.trackOperation(
        {
          operationName: 'cache_factory',
          service: 'cache_service',
          userId,
          tags: { cache_key: cacheKey }
        },
        factory
      );
      const factoryTime = Date.now() - factoryStartTime;

      // Store in cache
      await this.set(cacheKey, value, ttl, {
        ...metadata,
        factoryExecutionTime: factoryTime,
        generatedAt: Date.now()
      });

      const executionTime = Date.now() - startTime;

      const result: CacheOperationResult<T> = {
        success: true,
        data: value,
        fromCache: false,
        cacheKey,
        executionTime
      };

      this.recordOperation('getOrSet', 'factory_executed', executionTime, cacheKey);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordOperation('getOrSet', 'error', executionTime, cacheKey, errorMessage);

      return {
        success: false,
        fromCache: false,
        cacheKey,
        executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * Delete cached value with invalidation
   */
  async delete(key: string): Promise<CacheOperationResult<boolean>> {
    const startTime = Date.now();
    const cacheKey = this.normalizeKey(key);

    try {
      const success = await this.cacheManager.delete(cacheKey);
      const executionTime = Date.now() - startTime;

      // Trigger dependency invalidation if enabled
      if (this.config.enableInvalidation && this.invalidationService) {
        await this.invalidationService.invalidateDependencies(cacheKey);
      }

      const result: CacheOperationResult<boolean> = {
        success,
        data: success,
        fromCache: false,
        cacheKey,
        executionTime
      };

      this.recordOperation('delete', success ? 'success' : 'failure', executionTime, cacheKey);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.recordOperation('delete', 'error', executionTime, cacheKey, errorMessage);

      return {
        success: false,
        data: false,
        fromCache: false,
        cacheKey,
        executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string | RegExp, reason?: string): Promise<number> {
    if (!this.config.enableInvalidation || !this.invalidationService) {
      throw new Error('Cache invalidation is not enabled');
    }

    const startTime = Date.now();
    const count = await this.invalidationService.invalidatePattern(pattern, reason);
    const executionTime = Date.now() - startTime;

    this.performanceCollector.recordMetric({
      name: 'cache.pattern_invalidation',
      type: 'timer',
      value: executionTime,
      unit: 'milliseconds',
      tags: {
        pattern: pattern.toString(),
        count: count.toString(),
        reason: reason || 'manual'
      }
    });

    return count;
  }

  /**
   * Trigger cache warming
   */
  async warmCache(keys: string[], priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<string> {
    if (!this.config.enableWarming || !this.warmingService) {
      throw new Error('Cache warming is not enabled');
    }

    const normalizedKeys = keys.map(key => this.normalizeKey(key));
    return this.warmingService.warmKeys(normalizedKeys, undefined, priority);
  }

  /**
   * Start predictive warming for user
   */
  async warmPredictive(userId: string, limit: number = 50): Promise<string> {
    if (!this.config.enableWarming || !this.warmingService) {
      throw new Error('Cache warming is not enabled');
    }

    return this.warmingService.warmPredictive(userId, limit);
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): {
    cacheStats: any;
    invalidationStats?: any;
    warmingStats?: any;
    recommendations: string[];
  } {
    const cacheStats = this.cacheManager.getStats();
    const recommendations: string[] = [];

    let invalidationStats;
    if (this.config.enableInvalidation && this.invalidationService) {
      invalidationStats = this.invalidationService.getStats();
    }

    let warmingStats;
    if (this.config.enableWarming && this.warmingService) {
      warmingStats = this.warmingService.getStats();
    }

    // Generate recommendations
    if (cacheStats.hitRate < 0.7) {
      recommendations.push('Consider implementing cache warming for frequently accessed data');
    }

    if (invalidationStats && invalidationStats.failedInvalidations > 10) {
      recommendations.push('Review invalidation rules - high failure rate detected');
    }

    if (warmingStats && warmingStats.predictiveAccuracy < 0.6) {
      recommendations.push('Improve predictive warming by analyzing user access patterns');
    }

    return {
      cacheStats,
      invalidationStats,
      warmingStats,
      recommendations
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    await this.cacheManager.clear();
    
    this.performanceCollector.recordMetric({
      name: 'cache.clear_all',
      type: 'counter',
      value: 1,
      unit: 'count'
    });
  }

  /**
   * Shutdown cache service
   */
  shutdown(): void {
    this.cacheManager.shutdown();
    console.log('Cache service shutdown completed');
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private getDefaultConfig(): CacheServiceConfig {
    return {
      defaultCacheConfig: {
        maxSize: 1000,
        ttl: 3600000, // 1 hour
        strategy: 'LRU',
        layer: 'memory',
        enableMetrics: true,
        compressionEnabled: true,
        persistToDisk: false
      },
      enableInvalidation: true,
      enableWarming: true,
      enableMonitoring: true,
      autoWarmPopularContent: true,
      invalidationRules: [
        {
          name: 'User Data Changes',
          pattern: /^user:.*$/,
          strategy: 'immediate',
          priority: 9
        },
        {
          name: 'Test History Updates',
          pattern: /^test_history:.*$/,
          strategy: 'immediate',
          priority: 8
        }
      ],
      warmingRules: [
        {
          name: 'Popular Content',
          strategy: 'scheduled',
          priority: 'medium',
          schedule: {
            interval: 3600000, // 1 hour
            immediate: false
          }
        }
      ]
    };
  }

  private setupInvalidationRules(): void {
    if (!this.invalidationService) return;

    this.config.invalidationRules.forEach(rule => {
      this.invalidationService.addRule({
        name: rule.name,
        pattern: rule.pattern,
        strategy: rule.strategy,
        enabled: true,
        priority: rule.priority
      });
    });
  }

  private setupWarmingRules(): void {
    if (!this.warmingService) return;

    this.config.warmingRules.forEach(rule => {
      this.warmingService.addRule({
        name: rule.name,
        strategy: rule.strategy,
        priority: rule.priority,
        pattern: '*', // Simplified
        dataLoader: async () => ({}), // Placeholder
        schedule: rule.schedule,
        batchSize: 10,
        maxConcurrency: 2,
        retryAttempts: 1,
        retryDelay: 1000,
        enabled: true
      });
    });
  }

  private async autoWarmPopularContent(): Promise<void> {
    try {
      if (!this.warmingService) return;
      
      const jobId = await this.warmingService.warmPopular(100);
      console.log(`Auto-warming started with job ID: ${jobId}`);
      
      this.performanceCollector.recordMetric({
        name: 'cache.auto_warming_started',
        type: 'counter',
        value: 1,
        unit: 'count'
      });
    } catch (error) {
      console.warn('Auto-warming failed:', error);
    }
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase().trim();
  }

  private recordOperation(
    operation: string,
    result: string,
    executionTime: number,
    key: string,
    error?: string
  ): void {
    this.performanceCollector.recordMetric({
      name: `cache.operation.${operation}`,
      type: 'timer',
      value: executionTime,
      unit: 'milliseconds',
      tags: {
        result,
        cache_key: key.length > 50 ? `${key.substring(0, 47)}...` : key
      },
      metadata: error ? { error } : undefined
    });
  }

  /**
   * Update cache configuration
   */
  async updateCacheConfig(config: Partial<CacheServiceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    console.log('Cache configuration updated:', config);
  }

  /**
   * Enable cache warming
   */
  async enableCacheWarming(): Promise<void> {
    if (this.warmingService) {
      await this.warmingService.enableWarming();
      console.log('Cache warming enabled');
    }
  }

  /**
   * Disable cache warming
   */
  async disableCacheWarming(): Promise<void> {
    if (this.warmingService) {
      await this.warmingService.disableWarming();
      console.log('Cache warming disabled');
    }
  }
}
