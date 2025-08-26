/**
 * Integrated Resilience Service
 * Combines circuit breaker, retry logic, operation queue, and transaction management
 * for comprehensive fault tolerance
 */

import { CircuitBreakerRegistry, CircuitBreakerOptions } from './CircuitBreaker';
import { EnhancedRetry, EnhancedRetryOptions, BackoffStrategy } from './EnhancedRetry';
import { OperationQueue, OperationPriority, QueueOptions } from './OperationQueue';
import { TransactionManager, TransactionStep, TransactionOptions } from '../transactions/TransactionManager';

export interface ResilienceConfig {
  circuitBreaker?: {
    enabled: boolean;
    options?: CircuitBreakerOptions;
  };
  retry?: {
    enabled: boolean;
    options?: EnhancedRetryOptions;
  };
  queue?: {
    enabled: boolean;
    options?: QueueOptions;
  };
  transaction?: {
    enabled: boolean;
    options?: TransactionOptions;
  };
}

export interface OperationConfig {
  name: string;
  priority?: OperationPriority;
  timeout?: number;
  maxAttempts?: number;
  backoffStrategy?: BackoffStrategy;
  circuitBreakerName?: string;
  enableQueue?: boolean;
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  tags?: string[];
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ResilienceMetrics {
  circuitBreakers: Record<string, any>;
  retryOperations: Record<string, any>;
  queues: Record<string, any>;
  transactions: {
    totalExecuted: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageExecutionTime: number;
    rollbacksExecuted: number;
  };
  overall: {
    totalOperations: number;
    successRate: number;
    averageResponseTime: number;
    healthScore: number;
  };
}

export class ResilienceService {
  private static instance: ResilienceService;
  private queues = new Map<string, OperationQueue>();
  private defaultConfig: ResilienceConfig;
  private operationMetrics = new Map<string, {
    totalExecutions: number;
    successes: number;
    failures: number;
    totalTime: number;
    lastExecution: number;
  }>();

  private constructor(config: ResilienceConfig = {}) {
    this.defaultConfig = {
      circuitBreaker: {
        enabled: true,
        options: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          requestTimeout: 10000
        }
      },
      retry: {
        enabled: true,
        options: {
          maxAttempts: 3,
          backoffStrategy: BackoffStrategy.EXPONENTIAL,
          initialDelay: 1000,
          maxDelay: 30000
        }
      },
      queue: {
        enabled: false,
        options: {
          maxConcurrency: 5,
          maxQueueSize: 1000
        }
      },
      transaction: {
        enabled: true,
        options: {
          enableRollback: true,
          timeout: 60000
        }
      },
      ...config
    };

    console.log('ResilienceService initialized with config:', this.defaultConfig);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ResilienceConfig): ResilienceService {
    if (!ResilienceService.instance) {
      ResilienceService.instance = new ResilienceService(config);
    }
    return ResilienceService.instance;
  }

  /**
   * Execute operation with full resilience features
   */
  async executeResilient<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = this.generateOperationId(config.name);

    try {
      console.log(`Executing resilient operation: ${config.name} (${operationId})`);

      let result: T;

      if (config.enableQueue && this.defaultConfig.queue?.enabled) {
        // Execute through queue
        result = await this.executeWithQueue(operation, config);
      } else if (config.enableRetry && this.defaultConfig.retry?.enabled) {
        // Execute with retry logic
        result = await this.executeWithRetry(operation, config);
      } else if (config.enableCircuitBreaker && this.defaultConfig.circuitBreaker?.enabled) {
        // Execute with circuit breaker
        result = await this.executeWithCircuitBreaker(operation, config);
      } else {
        // Execute directly
        result = await operation();
      }

      // Record success metrics
      this.recordOperationMetrics(config.name, true, Date.now() - startTime);
      
      console.log(`Resilient operation completed: ${config.name} (${operationId}) in ${Date.now() - startTime}ms`);
      
      return result;

    } catch (error) {
      // Record failure metrics
      this.recordOperationMetrics(config.name, false, Date.now() - startTime);
      
      console.error(`Resilient operation failed: ${config.name} (${operationId})`, error);
      throw error;
    }
  }

  /**
   * Execute transaction with resilience features
   */
  async executeResilientTransaction<T>(
    steps: TransactionStep[],
    config: OperationConfig & { transactionOptions?: TransactionOptions }
  ): Promise<T> {
    const transactionOperation = () => 
      TransactionManager.executeAdvancedTransaction<T>(
        steps, 
        { ...this.defaultConfig.transaction?.options, ...config.transactionOptions }
      ).then(result => {
        if (!result.success) {
          throw new Error(result.error || 'Transaction failed');
        }
        return result.data as T;
      });

    return this.executeResilient(transactionOperation, {
      ...config,
      name: `transaction_${config.name}`
    });
  }

  /**
   * Execute saga pattern with resilience
   */
  async executeResilientSaga<T>(
    steps: TransactionStep[],
    config: OperationConfig & { transactionOptions?: TransactionOptions }
  ): Promise<T> {
    const sagaOperation = () => 
      TransactionManager.executeSaga<T>(
        steps,
        { ...this.defaultConfig.transaction?.options, ...config.transactionOptions }
      ).then(result => {
        if (!result.success) {
          throw new Error(result.error || 'Saga failed');
        }
        return result.data as T;
      });

    return this.executeResilient(sagaOperation, {
      ...config,
      name: `saga_${config.name}`
    });
  }

  /**
   * Create or get operation queue
   */
  getOrCreateQueue(name: string, options?: QueueOptions): OperationQueue {
    if (!this.queues.has(name)) {
      const queueOptions = { ...this.defaultConfig.queue?.options, ...options };
      this.queues.set(name, new OperationQueue(name, queueOptions));
    }
    return this.queues.get(name)!;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): ResilienceMetrics {
    const circuitBreakers = CircuitBreakerRegistry.getAllMetrics();
    const retryOperations = EnhancedRetry.getMetrics() as Record<string, any>;
    
    const queues: Record<string, any> = {};
    for (const [name, queue] of this.queues) {
      queues[name] = queue.getMetrics();
    }

    // Calculate transaction metrics (simplified)
    const transactionMetrics = {
      totalExecuted: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageExecutionTime: 0,
      rollbacksExecuted: 0
    };

    // Calculate overall metrics
    let totalOperations = 0;
    let totalSuccesses = 0;
    let totalTime = 0;

    for (const metrics of this.operationMetrics.values()) {
      totalOperations += metrics.totalExecutions;
      totalSuccesses += metrics.successes;
      totalTime += metrics.totalTime;
    }

    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 1;
    const averageResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;
    
    // Calculate health score (0-100)
    let healthScore = 100;
    if (successRate < 0.95) healthScore -= 20;
    if (successRate < 0.9) healthScore -= 20;
    if (averageResponseTime > 5000) healthScore -= 15;
    if (averageResponseTime > 10000) healthScore -= 15;

    const overall = {
      totalOperations,
      successRate,
      averageResponseTime,
      healthScore: Math.max(0, healthScore)
    };

    return {
      circuitBreakers,
      retryOperations,
      queues,
      transactions: transactionMetrics,
      overall
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      circuitBreakers: any;
      retrySystem: any;
      queues: any;
      overall: any;
    };
  } {
    const circuitBreakers = CircuitBreakerRegistry.getHealthStatus();
    const retrySystem = EnhancedRetry.getHealthStatus();
    
    const queues: Record<string, any> = {};
    for (const [name, queue] of this.queues) {
      queues[name] = queue.getHealthStatus();
    }

    const metrics = this.getMetrics();
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (metrics.overall.healthScore > 80) {
      overallStatus = 'healthy';
    } else if (metrics.overall.healthScore > 60) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      details: {
        circuitBreakers,
        retrySystem,
        queues,
        overall: {
          healthScore: metrics.overall.healthScore,
          successRate: metrics.overall.successRate,
          averageResponseTime: metrics.overall.averageResponseTime
        }
      }
    };
  }

  /**
   * Reset all systems
   */
  resetAll(): void {
    CircuitBreakerRegistry.resetAll();
    EnhancedRetry.resetMetrics();
    
    for (const queue of this.queues.values()) {
      queue.clearCompleted();
    }
    
    this.operationMetrics.clear();
    
    console.log('All resilience systems reset');
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Execute operation with queue
   */
  private async executeWithQueue<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<T> {
    const queueName = config.circuitBreakerName || 'default';
    const queue = this.getOrCreateQueue(queueName);
    
    const operationId = await queue.enqueue(
      config.name,
      operation,
      {
        priority: config.priority,
        timeout: config.timeout,
        maxAttempts: config.maxAttempts,
        tags: config.tags,
        userId: config.userId,
        metadata: config.metadata
      }
    );

    return queue.waitForResult<T>(operationId);
  }

  /**
   * Execute operation with retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<T> {
    const retryOptions: EnhancedRetryOptions = {
      maxAttempts: config.maxAttempts,
      backoffStrategy: config.backoffStrategy,
      timeout: config.timeout,
      circuitBreaker: config.enableCircuitBreaker ? {
        name: config.circuitBreakerName || config.name,
        enabled: true,
        options: this.defaultConfig.circuitBreaker?.options
      } : undefined
    };

    return EnhancedRetry.execute(operation, config.name, retryOptions);
  }

  /**
   * Execute operation with circuit breaker
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<T> {
    const breakerName = config.circuitBreakerName || config.name;
    return CircuitBreakerRegistry.execute(
      breakerName,
      operation,
      this.defaultConfig.circuitBreaker?.options
    );
  }

  /**
   * Record operation metrics
   */
  private recordOperationMetrics(
    operationName: string, 
    success: boolean, 
    executionTime: number
  ): void {
    if (!this.operationMetrics.has(operationName)) {
      this.operationMetrics.set(operationName, {
        totalExecutions: 0,
        successes: 0,
        failures: 0,
        totalTime: 0,
        lastExecution: 0
      });
    }

    const metrics = this.operationMetrics.get(operationName)!;
    metrics.totalExecutions++;
    metrics.totalTime += executionTime;
    metrics.lastExecution = Date.now();

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(operationName: string): string {
    return `${operationName}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}
