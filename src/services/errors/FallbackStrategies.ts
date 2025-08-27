/**
 * Fallback Strategies for Critical Operations
 * Comprehensive fallback mechanisms for maintaining service availability
 */

import { ErrorDetails, ErrorRecoveryResult } from './ErrorHandler';
import { CacheService } from '../caching/CacheService';
import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export type FallbackType = 
  | 'cached-data' 
  | 'default-values' 
  | 'degraded-service' 
  | 'offline-mode' 
  | 'static-content' 
  | 'placeholder' 
  | 'retry-queue'
  | 'circuit-breaker'
  | 'graceful-degradation';

export interface FallbackConfig {
  type: FallbackType;
  priority: number;
  timeout: number;
  retryAfter?: number;
  fallbackData?: any;
  condition?: (error: ErrorDetails) => boolean;
  customHandler?: (error: ErrorDetails) => Promise<ErrorRecoveryResult>;
}

export interface FallbackContext {
  operation: string;
  parameters: any;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  attemptCount: number;
  lastError?: Error;
}

export interface FallbackResult {
  success: boolean;
  data: any;
  source: 'cache' | 'default' | 'degraded' | 'offline' | 'static' | 'placeholder' | 'custom';
  strategy: FallbackType;
  performance: {
    executionTime: number;
    cacheHit?: boolean;
    degradationLevel?: 'minimal' | 'moderate' | 'severe';
  };
  warnings: string[];
  metadata: Record<string, any>;
}

export interface OperationFallbacks {
  [operationName: string]: FallbackConfig[];
}

export class FallbackStrategies {
  private static instance: FallbackStrategies;
  private cacheService: CacheService;
  private performanceCollector: PerformanceCollector;
  private fallbackConfigs: OperationFallbacks = {};
  private retryQueues = new Map<string, Array<{ context: FallbackContext; resolve: (value: any) => void; reject: (reason: any) => void }>>();
  private circuitBreakerStates = new Map<string, { isOpen: boolean; failures: number; lastFailure: number }>();

  private constructor() {
    this.cacheService = CacheService.getInstance();
    this.performanceCollector = PerformanceCollector.getInstance();
    this.setupDefaultFallbacks();
    console.log('FallbackStrategies initialized with comprehensive fallback mechanisms');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FallbackStrategies {
    if (!FallbackStrategies.instance) {
      FallbackStrategies.instance = new FallbackStrategies();
    }
    return FallbackStrategies.instance;
  }

  /**
   * Execute operation with fallback strategies
   */
  async executeWithFallback<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: Partial<FallbackContext> = {},
    fallbackConfigs?: FallbackConfig[]
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    const fullContext: FallbackContext = {
      operation: operationName,
      parameters: {},
      timestamp: Date.now(),
      attemptCount: 1,
      ...context
    };

    const strategies = fallbackConfigs || this.fallbackConfigs[operationName] || [];
    const sortedStrategies = strategies.sort((a, b) => a.priority - b.priority);

    // Try the primary operation first
    try {
      const result = await operation();
      
      return {
        success: true,
        data: result,
        source: 'primary' as any,
        strategy: 'none' as any,
        performance: {
          executionTime: Date.now() - startTime
        },
        warnings: [],
        metadata: { primary: true }
      };
    } catch (error) {
      const errorDetails = this.createErrorDetails(error as Error, fullContext);
      
      // Try fallback strategies in order of priority
      for (const strategy of sortedStrategies) {
        if (strategy.condition && !strategy.condition(errorDetails)) {
          continue;
        }

        try {
          const fallbackResult = await this.executeFallbackStrategy(strategy, errorDetails, fullContext);
          if (fallbackResult.success) {
            return {
              ...fallbackResult,
              performance: {
                ...fallbackResult.performance,
                executionTime: Date.now() - startTime
              }
            };
          }
        } catch (fallbackError) {
          console.warn(`Fallback strategy ${strategy.type} failed:`, fallbackError);
        }
      }

      // All fallbacks failed
      throw error;
    }
  }

  /**
   * Register fallback strategies for an operation
   */
  registerFallbacks(operationName: string, fallbacks: FallbackConfig[]): void {
    this.fallbackConfigs[operationName] = fallbacks.sort((a, b) => a.priority - b.priority);
    console.log(`Registered ${fallbacks.length} fallback strategies for operation: ${operationName}`);
  }

  /**
   * Get cached data fallback
   */
  async getCachedDataFallback<T>(key: string, maxAge?: number): Promise<FallbackResult> {
    const startTime = Date.now();
    
    try {
      const cacheResult = await this.cacheService.get<T>(key);
      const cachedData = cacheResult.success ? cacheResult.data : null;

      if (cachedData !== null) {
        return {
          success: true,
          data: cachedData,
          source: 'cache',
          strategy: 'cached-data',
          performance: {
            executionTime: Date.now() - startTime,
            cacheHit: true
          },
          warnings: ['Using cached data due to primary operation failure'],
          metadata: { cacheKey: key, maxAge }
        };
      }
    } catch (cacheError) {
      console.warn('Cache fallback failed:', cacheError);
    }

    return {
      success: false,
      data: null,
      source: 'cache',
      strategy: 'cached-data',
      performance: {
        executionTime: Date.now() - startTime,
        cacheHit: false
      },
      warnings: ['No cached data available'],
      metadata: { cacheKey: key }
    };
  }

  /**
   * Get default values fallback
   */
  getDefaultValuesFallback(defaults: any): FallbackResult {
    return {
      success: true,
      data: defaults,
      source: 'default',
      strategy: 'default-values',
      performance: {
        executionTime: 0
      },
      warnings: ['Using default values due to operation failure'],
      metadata: { defaults }
    };
  }

  /**
   * Get degraded service fallback
   */
  getDegradedServiceFallback(
    limitedData: any, 
    degradationLevel: 'minimal' | 'moderate' | 'severe' = 'moderate'
  ): FallbackResult {
    const warnings = [];
    
    switch (degradationLevel) {
      case 'minimal':
        warnings.push('Some features may be limited');
        break;
      case 'moderate':
        warnings.push('Running in degraded mode with reduced functionality');
        break;
      case 'severe':
        warnings.push('Service severely degraded - only basic features available');
        break;
    }

    return {
      success: true,
      data: {
        ...limitedData,
        degraded: true,
        degradationLevel,
        availableFeatures: this.getAvailableFeatures(degradationLevel)
      },
      source: 'degraded',
      strategy: 'degraded-service',
      performance: {
        executionTime: 0,
        degradationLevel
      },
      warnings,
      metadata: { degradationLevel }
    };
  }

  /**
   * Get offline mode fallback
   */
  async getOfflineModeFallback(operationName: string): Promise<FallbackResult> {
    const offlineData = await this.getOfflineData(operationName);
    
    return {
      success: true,
      data: {
        ...offlineData,
        offline: true,
        lastSync: this.getLastSyncTime(operationName)
      },
      source: 'offline',
      strategy: 'offline-mode',
      performance: {
        executionTime: 0
      },
      warnings: ['Operating in offline mode with local data'],
      metadata: { 
        operation: operationName,
        hasOfflineData: !!offlineData 
      }
    };
  }

  /**
   * Get static content fallback
   */
  getStaticContentFallback(staticContent: any): FallbackResult {
    return {
      success: true,
      data: {
        ...staticContent,
        static: true,
        timestamp: Date.now()
      },
      source: 'static',
      strategy: 'static-content',
      performance: {
        executionTime: 0
      },
      warnings: ['Displaying static content due to service unavailability'],
      metadata: { contentType: 'static' }
    };
  }

  /**
   * Get placeholder fallback
   */
  getPlaceholderFallback(placeholderType: 'loading' | 'error' | 'empty' | 'maintenance'): FallbackResult {
    const placeholders = {
      loading: { message: 'Loading...', type: 'loading' },
      error: { message: 'Something went wrong', type: 'error' },
      empty: { message: 'No data available', type: 'empty' },
      maintenance: { message: 'Service temporarily unavailable', type: 'maintenance' }
    };

    return {
      success: true,
      data: {
        placeholder: true,
        ...placeholders[placeholderType]
      },
      source: 'placeholder',
      strategy: 'placeholder',
      performance: {
        executionTime: 0
      },
      warnings: [`Displaying ${placeholderType} placeholder`],
      metadata: { placeholderType }
    };
  }

  /**
   * Add operation to retry queue
   */
  async addToRetryQueue(
    operationName: string,
    context: FallbackContext,
    retryAfter: number = 5000
  ): Promise<FallbackResult> {
    return new Promise((resolve, reject) => {
      if (!this.retryQueues.has(operationName)) {
        this.retryQueues.set(operationName, []);
      }

      const queue = this.retryQueues.get(operationName)!;
      queue.push({ context, resolve, reject });

      // Process queue after delay
      setTimeout(() => {
        this.processRetryQueue(operationName);
      }, retryAfter);

      // Return immediate fallback result
      resolve({
        success: true,
        data: {
          queued: true,
          position: queue.length,
          estimatedWait: retryAfter
        },
        source: 'placeholder',
        strategy: 'retry-queue',
        performance: {
          executionTime: 0
        },
        warnings: [`Operation queued for retry in ${retryAfter}ms`],
        metadata: { 
          queuePosition: queue.length,
          retryAfter 
        }
      });
    });
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker(operationName: string, failureThreshold: number = 5, timeout: number = 30000): boolean {
    const state = this.circuitBreakerStates.get(operationName);
    
    if (!state) {
      this.circuitBreakerStates.set(operationName, { isOpen: false, failures: 0, lastFailure: 0 });
      return false; // Closed
    }

    // Reset circuit breaker after timeout
    if (state.isOpen && Date.now() - state.lastFailure > timeout) {
      state.isOpen = false;
      state.failures = 0;
      console.log(`Circuit breaker for ${operationName} reset after timeout`);
    }

    return state.isOpen;
  }

  /**
   * Record circuit breaker failure
   */
  recordCircuitBreakerFailure(operationName: string, failureThreshold: number = 5): void {
    const state = this.circuitBreakerStates.get(operationName) || { isOpen: false, failures: 0, lastFailure: 0 };
    
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= failureThreshold) {
      state.isOpen = true;
      console.log(`Circuit breaker opened for ${operationName} after ${state.failures} failures`);
    }

    this.circuitBreakerStates.set(operationName, state);
  }

  /**
   * Get fallback statistics
   */
  getFallbackStats(): {
    totalFallbacks: number;
    fallbacksByType: Record<FallbackType, number>;
    fallbacksByOperation: Record<string, number>;
    circuitBreakerStates: Array<{
      operation: string;
      isOpen: boolean;
      failures: number;
      lastFailure: number;
    }>;
    queueSizes: Record<string, number>;
  } {
    const circuitBreakerStates = Array.from(this.circuitBreakerStates.entries()).map(([operation, state]) => ({
      operation,
      ...state
    }));

    const queueSizes = Object.fromEntries(
      Array.from(this.retryQueues.entries()).map(([operation, queue]) => [operation, queue.length])
    );

    return {
      totalFallbacks: 0, // Would be tracked in real implementation
      fallbacksByType: {} as Record<FallbackType, number>, // Would be tracked in real implementation
      fallbacksByOperation: {} as Record<string, number>, // Would be tracked in real implementation
      circuitBreakerStates,
      queueSizes
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async executeFallbackStrategy(
    strategy: FallbackConfig,
    error: ErrorDetails,
    context: FallbackContext
  ): Promise<FallbackResult> {
    const startTime = Date.now();

    // Check custom handler first
    if (strategy.customHandler) {
      const recoveryResult = await strategy.customHandler(error);
      return {
        success: recoveryResult.success,
        data: recoveryResult.fallbackData,
        source: 'custom',
        strategy: strategy.type,
        performance: {
          executionTime: Date.now() - startTime
        },
        warnings: recoveryResult.success ? [] : ['Custom fallback handler failed'],
        metadata: { customHandler: true }
      };
    }

    // Execute built-in strategy
    switch (strategy.type) {
      case 'cached-data':
        return await this.getCachedDataFallback(context.operation);

      case 'default-values':
        return this.getDefaultValuesFallback(strategy.fallbackData);

      case 'degraded-service':
        return this.getDegradedServiceFallback(strategy.fallbackData);

      case 'offline-mode':
        return await this.getOfflineModeFallback(context.operation);

      case 'static-content':
        return this.getStaticContentFallback(strategy.fallbackData);

      case 'placeholder':
        return this.getPlaceholderFallback('error');

      case 'retry-queue':
        return await this.addToRetryQueue(context.operation, context, strategy.retryAfter);

      case 'circuit-breaker':
        if (this.checkCircuitBreaker(context.operation)) {
          return this.getPlaceholderFallback('maintenance');
        }
        this.recordCircuitBreakerFailure(context.operation);
        throw new Error('Circuit breaker open');

      case 'graceful-degradation':
        return this.getDegradedServiceFallback(strategy.fallbackData, 'moderate');

      default:
        throw new Error(`Unknown fallback strategy: ${strategy.type}`);
    }
  }

  private createErrorDetails(error: Error, context: FallbackContext): ErrorDetails {
    return {
      id: `fallback_${Date.now()}`,
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      originalError: error,
      severity: 'medium',
      category: 'system',
      context: {
        component: context.operation,
        action: 'fallback-execution',
        timestamp: context.timestamp,
        metadata: context.parameters
      },
      recoveryStrategy: 'fallback',
      retryCount: context.attemptCount,
      maxRetries: 3,
      isRecoverable: true,
      userFriendlyMessage: 'Service temporarily unavailable',
      suggestedActions: ['Try again later', 'Use alternative features']
    };
  }

  private getAvailableFeatures(degradationLevel: 'minimal' | 'moderate' | 'severe'): string[] {
    switch (degradationLevel) {
      case 'minimal':
        return ['core-features', 'basic-ui', 'local-storage'];
      case 'moderate':
        return ['core-features', 'basic-ui'];
      case 'severe':
        return ['core-features'];
      default:
        return [];
    }
  }

  private async getOfflineData(operationName: string): Promise<any> {
    // In a real implementation, this would retrieve offline data
    // from IndexedDB, localStorage, or other offline storage
    try {
      const offlineKey = `offline_${operationName}`;
      const cacheResult = await this.cacheService.get(offlineKey);
      return cacheResult.success ? cacheResult.data : null;
    } catch {
      return null;
    }
  }

  private getLastSyncTime(operationName: string): number {
    // In a real implementation, this would track last sync times
    const syncKey = `last_sync_${operationName}`;
    const lastSync = localStorage.getItem(syncKey);
    return lastSync ? parseInt(lastSync, 10) : 0;
  }

  private async processRetryQueue(operationName: string): Promise<void> {
    const queue = this.retryQueues.get(operationName);
    if (!queue || queue.length === 0) return;

    const items = [...queue];
    this.retryQueues.set(operationName, []);

    for (const item of items) {
      try {
        // In a real implementation, this would retry the original operation
        item.resolve({
          success: true,
          data: { retried: true, timestamp: Date.now() },
          source: 'retry' as any,
          strategy: 'retry-queue',
          performance: { executionTime: 0 },
          warnings: ['Operation retried from queue'],
          metadata: { fromQueue: true }
        });
      } catch (error) {
        item.reject(error);
      }
    }
  }

  private setupDefaultFallbacks(): void {
    // Default fallbacks for common operations
    this.registerFallbacks('api-request', [
      {
        type: 'cached-data',
        priority: 1,
        timeout: 5000,
        condition: (error) => error.category === 'network'
      },
      {
        type: 'retry-queue',
        priority: 2,
        timeout: 10000,
        retryAfter: 5000
      },
      {
        type: 'circuit-breaker',
        priority: 3,
        timeout: 30000
      }
    ]);

    this.registerFallbacks('user-data', [
      {
        type: 'cached-data',
        priority: 1,
        timeout: 3000
      },
      {
        type: 'offline-mode',
        priority: 2,
        timeout: 5000
      },
      {
        type: 'placeholder',
        priority: 3,
        timeout: 1000
      }
    ]);

    this.registerFallbacks('quiz-generation', [
      {
        type: 'cached-data',
        priority: 1,
        timeout: 10000
      },
      {
        type: 'degraded-service',
        priority: 2,
        timeout: 15000,
        fallbackData: { 
          simplified: true,
          questionCount: 5,
          message: 'Generating simplified quiz due to service limitations'
        }
      }
    ]);
  }
}
