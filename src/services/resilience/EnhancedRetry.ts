/**
 * Enhanced Retry System
 * Advanced retry logic with multiple backoff strategies, circuit breaker integration,
 * and comprehensive error handling
 */

import { CircuitBreaker, CircuitBreakerRegistry } from './CircuitBreaker';
import { FirebaseError, FirebaseErrorCode } from '../firebase/FirebaseError';

export enum BackoffStrategy {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  FIXED = 'fixed',
  FIBONACCI = 'fibonacci',
  DECORRELATED_JITTER = 'decorrelated_jitter'
}

export interface EnhancedRetryOptions {
  maxAttempts?: number;
  backoffStrategy?: BackoffStrategy;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  jitterFactor?: number;
  timeout?: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onSuccess?: (attempt: number, totalTime: number) => void;
  onFailure?: (finalError: Error, totalAttempts: number, totalTime: number) => void;
  circuitBreaker?: {
    name: string;
    enabled: boolean;
    options?: any;
  };
  abortSignal?: AbortSignal;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  aborted: boolean;
}

export interface RetryMetrics {
  operationName: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageAttempts: number;
  averageSuccessTime: number;
  lastAttemptTime: number;
  errorDistribution: Record<string, number>;
}

export class EnhancedRetry {
  private static readonly DEFAULT_OPTIONS: Required<Omit<EnhancedRetryOptions, 'onRetry' | 'onSuccess' | 'onFailure' | 'circuitBreaker' | 'abortSignal'>> = {
    maxAttempts: 3,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    jitterFactor: 0.1,
    timeout: 60000,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
    nonRetryableErrors: ['EACCES', 'EPERM', 'ENOENT']
  };

  private static metrics = new Map<string, RetryMetrics>();

  /**
   * Execute operation with enhanced retry logic
   */
  static async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: EnhancedRetryOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error | null = null;
    let aborted = false;

    // Initialize metrics
    this.initializeMetrics(operationName);

    // Set up abort handling
    const abortPromise = options.abortSignal ? new Promise<never>((_, reject) => {
      options.abortSignal!.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('Operation aborted'));
      });
    }) : null;

    // Circuit breaker integration
    const circuitBreaker = options.circuitBreaker?.enabled
      ? CircuitBreakerRegistry.getBreaker(options.circuitBreaker.name, options.circuitBreaker.options)
      : null;

    const executeWithCircuitBreaker = circuitBreaker
      ? () => circuitBreaker.execute(operation)
      : operation;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`${operationName}: Attempt ${attempt}/${config.maxAttempts}`);

        // Race between operation, timeout, and abort signal
        const promises = [executeWithCircuitBreaker()];
        
        if (abortPromise) {
          promises.push(abortPromise);
        }

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new FirebaseError(
              FirebaseErrorCode.TIMEOUT_ERROR,
              `${operationName} timed out after ${config.timeout}ms`
            ));
          }, config.timeout);
        });
        promises.push(timeoutPromise);

        const result = await Promise.race(promises);
        
        // Success
        const totalTime = Date.now() - startTime;
        this.updateMetricsOnSuccess(operationName, attempt, totalTime);
        
        if (attempt > 1) {
          console.log(`${operationName}: Succeeded on attempt ${attempt} after ${totalTime}ms`);
        }

        options.onSuccess?.(attempt, totalTime);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (aborted) {
          break;
        }

        // Convert to structured error
        const structuredError = this.normalizeError(lastError);
        
        console.error(`${operationName}: Failed on attempt ${attempt}/${config.maxAttempts}:`, {
          error: structuredError.message,
          code: structuredError.code,
          retryable: this.isRetryableError(structuredError, config)
        });

        // Update metrics
        this.updateMetricsOnFailure(operationName, structuredError);

        // Check if error is retryable
        if (!this.isRetryableError(structuredError, config)) {
          console.error(`${operationName}: Non-retryable error, stopping retries`);
          break;
        }

        // If this is the last attempt, don't wait
        if (attempt >= config.maxAttempts) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, config);
        
        console.log(`${operationName}: Retrying in ${Math.round(delay)}ms...`);
        options.onRetry?.(attempt, lastError, delay);

        // Wait before retry (unless aborted)
        try {
          await this.delay(delay, options.abortSignal);
        } catch (delayError) {
          if (options.abortSignal?.aborted) {
            aborted = true;
            break;
          }
          throw delayError;
        }
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    const finalError = lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
    
    console.error(`${operationName}: All ${config.maxAttempts} attempts failed after ${totalTime}ms`);
    options.onFailure?.(finalError, config.maxAttempts, totalTime);

    if (aborted) {
      throw new Error(`${operationName} was aborted`);
    }

    throw finalError;
  }

  /**
   * Calculate delay based on backoff strategy
   */
  private static calculateDelay(attempt: number, config: Required<Omit<EnhancedRetryOptions, 'onRetry' | 'onSuccess' | 'onFailure' | 'circuitBreaker' | 'abortSignal'>>): number {
    let baseDelay: number;

    switch (config.backoffStrategy) {
      case BackoffStrategy.EXPONENTIAL:
        baseDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
        break;

      case BackoffStrategy.LINEAR:
        baseDelay = config.initialDelay * attempt;
        break;

      case BackoffStrategy.FIXED:
        baseDelay = config.initialDelay;
        break;

      case BackoffStrategy.FIBONACCI:
        baseDelay = config.initialDelay * this.fibonacci(attempt);
        break;

      case BackoffStrategy.DECORRELATED_JITTER:
        // AWS decorrelated jitter formula
        const previousDelay = attempt > 1 ? config.initialDelay * Math.pow(config.backoffFactor, attempt - 2) : 0;
        baseDelay = Math.random() * (config.maxDelay - config.initialDelay) + Math.max(config.initialDelay, previousDelay);
        break;

      default:
        baseDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
    }

    // Apply max delay cap
    baseDelay = Math.min(baseDelay, config.maxDelay);

    // Apply jitter if enabled (except for decorrelated jitter which has built-in randomness)
    if (config.jitter && config.backoffStrategy !== BackoffStrategy.DECORRELATED_JITTER) {
      const jitterAmount = baseDelay * config.jitterFactor;
      const jitter = (Math.random() * 2 - 1) * jitterAmount; // Random between -jitterAmount and +jitterAmount
      baseDelay = Math.max(0, baseDelay + jitter);
    }

    return Math.round(baseDelay);
  }

  /**
   * Calculate Fibonacci number for Fibonacci backoff
   */
  private static fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  /**
   * Delay with abort signal support
   */
  private static delay(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      abortSignal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Aborted'));
      });
    });
  }

  /**
   * Normalize error to structured format
   */
  private static normalizeError(error: Error): { message: string; code?: string; retryable: boolean } {
    if (error instanceof FirebaseError) {
      return {
        message: error.message,
        code: error.code,
        retryable: error.retryable
      };
    }

    // Handle common Node.js errors
    if ('code' in error) {
      return {
        message: error.message,
        code: (error as any).code,
        retryable: true // Will be checked against retryable/non-retryable lists
      };
    }

    return {
      message: error.message,
      retryable: true
    };
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(
    error: { message: string; code?: string; retryable: boolean },
    config: Required<Omit<EnhancedRetryOptions, 'onRetry' | 'onSuccess' | 'onFailure' | 'circuitBreaker' | 'abortSignal'>>
  ): boolean {
    // If error has explicit retryable flag, use it
    if (typeof error.retryable === 'boolean') {
      return error.retryable;
    }

    // Check non-retryable errors first
    if (error.code && config.nonRetryableErrors.includes(error.code)) {
      return false;
    }

    // Check retryable errors
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check message patterns for common retryable errors
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /unavailable/i,
      /temporary/i,
      /rate limit/i,
      /throttl/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Initialize metrics for operation
   */
  private static initializeMetrics(operationName: string): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        operationName,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        averageAttempts: 0,
        averageSuccessTime: 0,
        lastAttemptTime: Date.now(),
        errorDistribution: {}
      });
    }
  }

  /**
   * Update metrics on success
   */
  private static updateMetricsOnSuccess(operationName: string, attempts: number, totalTime: number): void {
    const metrics = this.metrics.get(operationName)!;
    metrics.totalAttempts += attempts;
    metrics.successfulAttempts++;
    metrics.lastAttemptTime = Date.now();
    
    // Update averages
    metrics.averageAttempts = metrics.totalAttempts / (metrics.successfulAttempts + metrics.failedAttempts);
    metrics.averageSuccessTime = (metrics.averageSuccessTime * (metrics.successfulAttempts - 1) + totalTime) / metrics.successfulAttempts;
  }

  /**
   * Update metrics on failure
   */
  private static updateMetricsOnFailure(operationName: string, error: { message: string; code?: string }): void {
    const metrics = this.metrics.get(operationName)!;
    metrics.failedAttempts++;
    metrics.lastAttemptTime = Date.now();
    
    // Update error distribution
    const errorKey = error.code || 'unknown';
    metrics.errorDistribution[errorKey] = (metrics.errorDistribution[errorKey] || 0) + 1;
  }

  /**
   * Get metrics for operation
   */
  static getMetrics(operationName?: string): RetryMetrics | Record<string, RetryMetrics> {
    if (operationName) {
      return this.metrics.get(operationName) || this.createEmptyMetrics(operationName);
    }
    
    const allMetrics: Record<string, RetryMetrics> = {};
    for (const [name, metrics] of this.metrics) {
      allMetrics[name] = metrics;
    }
    return allMetrics;
  }

  /**
   * Reset metrics
   */
  static resetMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Create empty metrics object
   */
  private static createEmptyMetrics(operationName: string): RetryMetrics {
    return {
      operationName,
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageAttempts: 0,
      averageSuccessTime: 0,
      lastAttemptTime: 0,
      errorDistribution: {}
    };
  }

  /**
   * Health check for retry system
   */
  static getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      totalOperations: number;
      successRate: number;
      averageAttempts: number;
      recentFailures: number;
    };
  } {
    const allMetrics = Object.values(this.getMetrics() as Record<string, RetryMetrics>);
    
    if (allMetrics.length === 0) {
      return {
        status: 'healthy',
        details: {
          totalOperations: 0,
          successRate: 1,
          averageAttempts: 0,
          recentFailures: 0
        }
      };
    }

    const totalSuccessful = allMetrics.reduce((sum, m) => sum + m.successfulAttempts, 0);
    const totalFailed = allMetrics.reduce((sum, m) => sum + m.failedAttempts, 0);
    const totalOperations = totalSuccessful + totalFailed;
    const successRate = totalOperations > 0 ? totalSuccessful / totalOperations : 1;
    const averageAttempts = allMetrics.reduce((sum, m) => sum + m.averageAttempts, 0) / allMetrics.length;
    
    // Count recent failures (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentFailures = allMetrics.filter(m => m.lastAttemptTime > fiveMinutesAgo && m.failedAttempts > 0).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (successRate > 0.95 && averageAttempts < 2) {
      status = 'healthy';
    } else if (successRate > 0.8) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        totalOperations,
        successRate,
        averageAttempts,
        recentFailures
      }
    };
  }
}
