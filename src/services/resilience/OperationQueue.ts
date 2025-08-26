/**
 * Operation Queue System
 * Handles high-load scenarios with priority queuing, rate limiting, and concurrency control
 */

export enum OperationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface QueuedOperation<T = any> {
  id: string;
  name: string;
  operation: () => Promise<T>;
  priority: OperationPriority;
  status: OperationStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
  maxAttempts: number;
  timeout: number;
  retryDelay: number;
  result?: T;
  error?: Error;
  abortController?: AbortController;
  tags?: string[];
  userId?: string;
  metadata?: Record<string, any>;
}

export interface QueueOptions {
  maxConcurrency?: number;
  maxQueueSize?: number;
  defaultTimeout?: number;
  defaultMaxAttempts?: number;
  defaultRetryDelay?: number;
  rateLimitPerSecond?: number;
  enablePriority?: boolean;
  enableMetrics?: boolean;
  onOperationStart?: (operation: QueuedOperation) => void;
  onOperationComplete?: (operation: QueuedOperation) => void;
  onOperationFailed?: (operation: QueuedOperation) => void;
  onQueueFull?: (rejectedOperation: QueuedOperation) => void;
}

export interface QueueMetrics {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  cancelledOperations: number;
  currentQueueSize: number;
  runningOperations: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  throughputPerSecond: number;
  errorRate: number;
  operationsByPriority: Record<OperationPriority, number>;
  operationsByStatus: Record<OperationStatus, number>;
  recentErrors: Array<{ timestamp: number; error: string; operationName: string }>;
}

export class OperationQueue {
  private queue: QueuedOperation[] = [];
  private running = new Map<string, QueuedOperation>();
  private completed: QueuedOperation[] = [];
  private rateLimitTokens: number;
  private rateLimitLastRefill: number;
  private isProcessing = false;
  private metrics: QueueMetrics;

  private readonly options: Required<QueueOptions>;

  constructor(name: string, options: QueueOptions = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 5,
      maxQueueSize: options.maxQueueSize ?? 1000,
      defaultTimeout: options.defaultTimeout ?? 30000,
      defaultMaxAttempts: options.defaultMaxAttempts ?? 3,
      defaultRetryDelay: options.defaultRetryDelay ?? 1000,
      rateLimitPerSecond: options.rateLimitPerSecond ?? 10,
      enablePriority: options.enablePriority ?? true,
      enableMetrics: options.enableMetrics ?? true,
      onOperationStart: options.onOperationStart ?? (() => {}),
      onOperationComplete: options.onOperationComplete ?? (() => {}),
      onOperationFailed: options.onOperationFailed ?? (() => {}),
      onQueueFull: options.onQueueFull ?? (() => {})
    };

    this.rateLimitTokens = this.options.rateLimitPerSecond;
    this.rateLimitLastRefill = Date.now();

    this.metrics = this.initializeMetrics();

    console.log(`Operation queue '${name}' initialized with options:`, this.options);

    // Start processing
    this.startProcessing();
  }

  /**
   * Add operation to queue
   */
  async enqueue<T>(
    name: string,
    operation: () => Promise<T>,
    operationOptions: {
      priority?: OperationPriority;
      timeout?: number;
      maxAttempts?: number;
      retryDelay?: number;
      tags?: string[];
      userId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      const rejectedOp: QueuedOperation = {
        id: this.generateOperationId(),
        name,
        operation,
        priority: operationOptions.priority ?? OperationPriority.NORMAL,
        status: OperationStatus.CANCELLED,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: operationOptions.maxAttempts ?? this.options.defaultMaxAttempts,
        timeout: operationOptions.timeout ?? this.options.defaultTimeout,
        retryDelay: operationOptions.retryDelay ?? this.options.defaultRetryDelay,
        tags: operationOptions.tags,
        userId: operationOptions.userId,
        metadata: operationOptions.metadata
      };

      this.options.onQueueFull(rejectedOp);
      throw new Error(`Queue is full (${this.options.maxQueueSize} operations). Operation '${name}' rejected.`);
    }

    const queuedOperation: QueuedOperation<T> = {
      id: this.generateOperationId(),
      name,
      operation,
      priority: operationOptions.priority ?? OperationPriority.NORMAL,
      status: OperationStatus.PENDING,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: operationOptions.maxAttempts ?? this.options.defaultMaxAttempts,
      timeout: operationOptions.timeout ?? this.options.defaultTimeout,
      retryDelay: operationOptions.retryDelay ?? this.options.defaultRetryDelay,
      abortController: new AbortController(),
      tags: operationOptions.tags,
      userId: operationOptions.userId,
      metadata: operationOptions.metadata
    };

    // Insert operation in priority order
    if (this.options.enablePriority) {
      this.insertByPriority(queuedOperation);
    } else {
      this.queue.push(queuedOperation);
    }

    this.updateMetrics();

    console.log(`Operation '${name}' (${queuedOperation.id}) enqueued with priority ${queuedOperation.priority}`);
    
    return queuedOperation.id;
  }

  /**
   * Get operation result (waits for completion)
   */
  async waitForResult<T>(operationId: string, timeout?: number): Promise<T> {
    const operation = this.findOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    const waitTimeout = timeout || operation.timeout + 5000; // Add buffer
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const currentOp = this.findOperation(operationId);
        if (!currentOp) {
          reject(new Error(`Operation ${operationId} not found`));
          return;
        }

        switch (currentOp.status) {
          case OperationStatus.COMPLETED:
            resolve(currentOp.result as T);
            return;
          case OperationStatus.FAILED:
            reject(currentOp.error || new Error('Operation failed'));
            return;
          case OperationStatus.CANCELLED:
            reject(new Error('Operation was cancelled'));
            return;
          case OperationStatus.TIMEOUT:
            reject(new Error('Operation timed out'));
            return;
        }

        // Check timeout
        if (Date.now() - startTime > waitTimeout) {
          reject(new Error(`Wait timeout exceeded for operation ${operationId}`));
          return;
        }

        // Continue checking
        setTimeout(checkStatus, 100);
      };

      checkStatus();
    });
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): boolean {
    const operation = this.findOperation(operationId);
    if (!operation) {
      return false;
    }

    if (operation.status === OperationStatus.RUNNING) {
      operation.abortController?.abort();
    }

    operation.status = OperationStatus.CANCELLED;
    operation.completedAt = Date.now();

    // Remove from queue if pending
    this.queue = this.queue.filter(op => op.id !== operationId);
    
    // Remove from running if running
    this.running.delete(operationId);

    this.updateMetrics();
    
    console.log(`Operation ${operationId} cancelled`);
    return true;
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId: string): OperationStatus | null {
    const operation = this.findOperation(operationId);
    return operation?.status || null;
  }

  /**
   * Get operations by criteria
   */
  getOperations(criteria: {
    status?: OperationStatus;
    priority?: OperationPriority;
    userId?: string;
    tags?: string[];
    name?: string;
  } = {}): QueuedOperation[] {
    const allOperations = [
      ...this.queue,
      ...Array.from(this.running.values()),
      ...this.completed
    ];

    return allOperations.filter(op => {
      if (criteria.status && op.status !== criteria.status) return false;
      if (criteria.priority !== undefined && op.priority !== criteria.priority) return false;
      if (criteria.userId && op.userId !== criteria.userId) return false;
      if (criteria.name && op.name !== criteria.name) return false;
      if (criteria.tags && !criteria.tags.some(tag => op.tags?.includes(tag))) return false;
      return true;
    });
  }

  /**
   * Clear completed operations
   */
  clearCompleted(): number {
    const count = this.completed.length;
    this.completed = [];
    this.updateMetrics();
    console.log(`Cleared ${count} completed operations`);
    return count;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isProcessing = false;
    console.log('Queue processing paused');
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.startProcessing();
      console.log('Queue processing resumed');
    }
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get queue health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      queueUtilization: number;
      concurrencyUtilization: number;
      errorRate: number;
      averageWaitTime: number;
      throughput: number;
    };
  } {
    const metrics = this.getMetrics();
    
    const queueUtilization = metrics.currentQueueSize / this.options.maxQueueSize;
    const concurrencyUtilization = metrics.runningOperations / this.options.maxConcurrency;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (queueUtilization < 0.7 && concurrencyUtilization < 0.8 && metrics.errorRate < 0.05) {
      status = 'healthy';
    } else if (queueUtilization < 0.9 && concurrencyUtilization < 0.95 && metrics.errorRate < 0.15) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        queueUtilization,
        concurrencyUtilization,
        errorRate: metrics.errorRate,
        averageWaitTime: metrics.averageWaitTime,
        throughput: metrics.throughputPerSecond
      }
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Main queue processing loop
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Refill rate limit tokens
        this.refillRateLimitTokens();

        // Process next operation if conditions are met
        if (this.canProcessNext()) {
          const operation = this.getNextOperation();
          if (operation) {
            this.executeOperation(operation);
          }
        }

        // Wait before next iteration
        await this.sleep(50); // 50ms polling interval
      } catch (error) {
        console.error('Error in queue processing:', error);
        await this.sleep(1000); // Wait longer on error
      }
    }
  }

  /**
   * Check if we can process the next operation
   */
  private canProcessNext(): boolean {
    return (
      this.queue.length > 0 &&
      this.running.size < this.options.maxConcurrency &&
      this.rateLimitTokens > 0
    );
  }

  /**
   * Get next operation from queue
   */
  private getNextOperation(): QueuedOperation | null {
    if (this.queue.length === 0) return null;

    // If priority is disabled, just take the first one
    if (!this.options.enablePriority) {
      return this.queue.shift() || null;
    }

    // Find highest priority operation
    let highestPriorityIndex = 0;
    let highestPriority = this.queue[0].priority;

    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i].priority > highestPriority) {
        highestPriority = this.queue[i].priority;
        highestPriorityIndex = i;
      }
    }

    return this.queue.splice(highestPriorityIndex, 1)[0];
  }

  /**
   * Execute operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    this.rateLimitTokens--;
    operation.status = OperationStatus.RUNNING;
    operation.startedAt = Date.now();
    operation.attempts++;

    this.running.set(operation.id, operation);
    this.options.onOperationStart(operation);

    console.log(`Executing operation '${operation.name}' (${operation.id}), attempt ${operation.attempts}/${operation.maxAttempts}`);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${operation.timeout}ms`));
        }, operation.timeout);
      });

      // Race between operation and timeout
      const result = await Promise.race([
        operation.operation(),
        timeoutPromise
      ]);

      // Success
      operation.status = OperationStatus.COMPLETED;
      operation.result = result;
      operation.completedAt = Date.now();

      this.running.delete(operation.id);
      this.completed.push(operation);
      this.options.onOperationComplete(operation);

      console.log(`Operation '${operation.name}' (${operation.id}) completed successfully`);

    } catch (error) {
      const operationError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`Operation '${operation.name}' (${operation.id}) failed on attempt ${operation.attempts}:`, operationError.message);

      if (operation.attempts < operation.maxAttempts && !operation.abortController?.signal.aborted) {
        // Retry the operation
        operation.status = OperationStatus.PENDING;
        this.running.delete(operation.id);
        
        // Add back to queue after delay
        setTimeout(() => {
          this.insertByPriority(operation);
        }, operation.retryDelay);

        console.log(`Operation '${operation.name}' (${operation.id}) will retry in ${operation.retryDelay}ms`);
      } else {
        // Final failure
        operation.status = operationError.message.includes('timeout') 
          ? OperationStatus.TIMEOUT 
          : OperationStatus.FAILED;
        operation.error = operationError;
        operation.completedAt = Date.now();

        this.running.delete(operation.id);
        this.completed.push(operation);
        this.options.onOperationFailed(operation);

        // Add to recent errors for metrics
        if (this.options.enableMetrics) {
          this.metrics.recentErrors.push({
            timestamp: Date.now(),
            error: operationError.message,
            operationName: operation.name
          });

          // Keep only last 50 errors
          if (this.metrics.recentErrors.length > 50) {
            this.metrics.recentErrors = this.metrics.recentErrors.slice(-50);
          }
        }
      }
    }

    this.updateMetrics();
  }

  /**
   * Insert operation by priority
   */
  private insertByPriority(operation: QueuedOperation): void {
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      if (operation.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, operation);
  }

  /**
   * Refill rate limit tokens
   */
  private refillRateLimitTokens(): void {
    const now = Date.now();
    const timePassed = now - this.rateLimitLastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.options.rateLimitPerSecond);
    
    if (tokensToAdd > 0) {
      this.rateLimitTokens = Math.min(
        this.rateLimitTokens + tokensToAdd,
        this.options.rateLimitPerSecond
      );
      this.rateLimitLastRefill = now;
    }
  }

  /**
   * Find operation by ID
   */
  private findOperation(operationId: string): QueuedOperation | null {
    // Check running operations
    const running = this.running.get(operationId);
    if (running) return running;

    // Check queue
    const queued = this.queue.find(op => op.id === operationId);
    if (queued) return queued;

    // Check completed
    const completed = this.completed.find(op => op.id === operationId);
    if (completed) return completed;

    return null;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): QueueMetrics {
    return {
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      cancelledOperations: 0,
      currentQueueSize: 0,
      runningOperations: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      throughputPerSecond: 0,
      errorRate: 0,
      operationsByPriority: {
        [OperationPriority.LOW]: 0,
        [OperationPriority.NORMAL]: 0,
        [OperationPriority.HIGH]: 0,
        [OperationPriority.CRITICAL]: 0
      },
      operationsByStatus: {
        [OperationStatus.PENDING]: 0,
        [OperationStatus.RUNNING]: 0,
        [OperationStatus.COMPLETED]: 0,
        [OperationStatus.FAILED]: 0,
        [OperationStatus.CANCELLED]: 0,
        [OperationStatus.TIMEOUT]: 0
      },
      recentErrors: []
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    if (!this.options.enableMetrics) return;

    const allOperations = [
      ...this.queue,
      ...Array.from(this.running.values()),
      ...this.completed
    ];

    this.metrics.totalOperations = allOperations.length;
    this.metrics.currentQueueSize = this.queue.length;
    this.metrics.runningOperations = this.running.size;

    // Count by status
    this.metrics.operationsByStatus = {
      [OperationStatus.PENDING]: 0,
      [OperationStatus.RUNNING]: 0,
      [OperationStatus.COMPLETED]: 0,
      [OperationStatus.FAILED]: 0,
      [OperationStatus.CANCELLED]: 0,
      [OperationStatus.TIMEOUT]: 0
    };

    // Count by priority
    this.metrics.operationsByPriority = {
      [OperationPriority.LOW]: 0,
      [OperationPriority.NORMAL]: 0,
      [OperationPriority.HIGH]: 0,
      [OperationPriority.CRITICAL]: 0
    };

    let totalWaitTime = 0;
    let totalExecutionTime = 0;
    let waitTimeCount = 0;
    let executionTimeCount = 0;

    for (const op of allOperations) {
      this.metrics.operationsByStatus[op.status]++;
      this.metrics.operationsByPriority[op.priority]++;

      if (op.startedAt) {
        totalWaitTime += op.startedAt - op.createdAt;
        waitTimeCount++;
      }

      if (op.completedAt && op.startedAt) {
        totalExecutionTime += op.completedAt - op.startedAt;
        executionTimeCount++;
      }
    }

    this.metrics.completedOperations = this.metrics.operationsByStatus[OperationStatus.COMPLETED];
    this.metrics.failedOperations = this.metrics.operationsByStatus[OperationStatus.FAILED];
    this.metrics.cancelledOperations = this.metrics.operationsByStatus[OperationStatus.CANCELLED];

    this.metrics.averageWaitTime = waitTimeCount > 0 ? totalWaitTime / waitTimeCount : 0;
    this.metrics.averageExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;

    // Calculate error rate
    const totalCompleted = this.metrics.completedOperations + this.metrics.failedOperations;
    this.metrics.errorRate = totalCompleted > 0 ? this.metrics.failedOperations / totalCompleted : 0;

    // Calculate throughput (operations per second over last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentCompletions = this.completed.filter(op => 
      op.completedAt && op.completedAt > oneMinuteAgo
    ).length;
    this.metrics.throughputPerSecond = recentCompletions / 60;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
