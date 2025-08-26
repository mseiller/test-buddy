/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance for external API calls and database operations
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, rejecting calls
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures before opening
  recoveryTimeout?: number;       // Time to wait before half-open (ms)
  requestTimeout?: number;        // Individual request timeout (ms)
  monitoringWindow?: number;      // Time window for failure tracking (ms)
  minimumRequests?: number;       // Minimum requests before calculating failure rate
  successThreshold?: number;      // Successful requests needed to close from half-open
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  failureRate: number;
  uptime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime: number = 0;
  private halfOpenSuccessCount: number = 0;
  private readonly createdAt: number = Date.now();

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      recoveryTimeout: options.recoveryTimeout ?? 30000,
      requestTimeout: options.requestTimeout ?? 10000,
      monitoringWindow: options.monitoringWindow ?? 60000,
      minimumRequests: options.minimumRequests ?? 10,
      successThreshold: options.successThreshold ?? 3,
      onStateChange: options.onStateChange ?? (() => {})
    };

    console.log(`Circuit breaker '${name}' initialized with options:`, this.options);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker '${this.name}' is OPEN. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
      } else {
        // Transition to half-open
        this.setState(CircuitBreakerState.HALF_OPEN);
        this.halfOpenSuccessCount = 0;
      }
    }

    // Execute the operation with timeout
    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.requestTimeout}ms`));
      }, this.options.requestTimeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenSuccessCount++;
      
      if (this.halfOpenSuccessCount >= this.options.successThreshold) {
        // Enough successes in half-open state, close the circuit
        this.setState(CircuitBreakerState.CLOSED);
        this.resetCounts();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.error(`Circuit breaker '${this.name}' recorded failure:`, error.message);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit immediately
      this.openCircuit();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
      }
    }
  }

  /**
   * Determine if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Need minimum requests before considering failure rate
    if (this.totalRequests < this.options.minimumRequests) {
      return false;
    }

    // Check failure threshold
    if (this.failureCount >= this.options.failureThreshold) {
      return true;
    }

    // Check failure rate within monitoring window
    const windowStart = Date.now() - this.options.monitoringWindow;
    const recentFailureRate = this.getFailureRateInWindow(windowStart);
    
    return recentFailureRate > 0.5; // 50% failure rate
  }

  /**
   * Calculate failure rate within time window
   */
  private getFailureRateInWindow(windowStart: number): number {
    // Simplified calculation - in real implementation, you'd track individual request timestamps
    if (this.lastFailureTime && this.lastFailureTime > windowStart) {
      const recentRequests = Math.min(this.totalRequests, this.options.minimumRequests);
      return this.failureCount / recentRequests;
    }
    return 0;
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(): void {
    this.setState(CircuitBreakerState.OPEN);
    this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
    
    console.warn(`Circuit breaker '${this.name}' opened. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
  }

  /**
   * Set circuit breaker state and notify listeners
   */
  private setState(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      console.log(`Circuit breaker '${this.name}' state changed: ${oldState} -> ${newState}`);
      this.options.onStateChange(newState);
    }
  }

  /**
   * Reset failure and success counts
   */
  private resetCounts(): void {
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    const failureRate = this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0;
    const uptime = now - this.createdAt;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      failureRate,
      uptime
    };
  }

  /**
   * Force circuit breaker to specific state (for testing)
   */
  forceState(state: CircuitBreakerState): void {
    this.setState(state);
    if (state === CircuitBreakerState.OPEN) {
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.setState(CircuitBreakerState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.halfOpenSuccessCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = 0;
    
    console.log(`Circuit breaker '${this.name}' reset`);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitBreakerState.CLOSED || 
           (this.state === CircuitBreakerState.HALF_OPEN && this.halfOpenSuccessCount > 0);
  }

  /**
   * Get human-readable status
   */
  getStatus(): string {
    const metrics = this.getMetrics();
    
    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return `CLOSED - ${metrics.successCount} successes, ${metrics.failureCount} failures (${Math.round(metrics.failureRate * 100)}% failure rate)`;
      
      case CircuitBreakerState.OPEN:
        const nextAttempt = new Date(this.nextAttemptTime);
        return `OPEN - Circuit opened due to failures. Next attempt: ${nextAttempt.toLocaleTimeString()}`;
      
      case CircuitBreakerState.HALF_OPEN:
        return `HALF_OPEN - Testing recovery (${this.halfOpenSuccessCount}/${this.options.successThreshold} successes needed)`;
      
      default:
        return 'UNKNOWN';
    }
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  static getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute operation with circuit breaker
   */
  static async execute<T>(
    breakerName: string,
    operation: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    const breaker = this.getBreaker(breakerName, options);
    return breaker.execute(operation);
  }

  /**
   * Get all circuit breaker metrics
   */
  static getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Get health status of all breakers
   */
  static getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, string>;
  } {
    const details: Record<string, string> = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const [name, breaker] of this.breakers) {
      details[name] = breaker.getStatus();
      if (breaker.isHealthy()) {
        healthyCount++;
      }
      totalCount++;
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return { overall, details };
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    console.log('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   */
  static removeBreaker(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  static clear(): void {
    this.breakers.clear();
  }
}
