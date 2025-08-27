/**
 * Advanced Error Handler
 * Comprehensive error handling with recovery strategies and monitoring integration
 */

import { PerformanceCollector } from '../monitoring/PerformanceCollector';
import { CircuitBreaker } from '../resilience/CircuitBreaker';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'authentication' | 'authorization' | 'business' | 'system' | 'unknown';
export type RecoveryStrategy = 'retry' | 'fallback' | 'circuit-breaker' | 'graceful-degradation' | 'fail-fast';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operationId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
}

export interface ErrorDetails {
  id: string;
  code: string;
  message: string;
  originalError: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  recoveryStrategy: RecoveryStrategy;
  retryCount: number;
  maxRetries: number;
  isRecoverable: boolean;
  userFriendlyMessage: string;
  suggestedActions: string[];
}

export interface ErrorRecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  attemptsUsed: number;
  timeTaken: number;
  fallbackData?: any;
  error?: Error;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  enableRecovery: boolean;
  enableMonitoring: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  reportingEndpoint?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  mostCommonErrors: Array<{
    code: string;
    count: number;
    lastOccurrence: number;
  }>;
  recentErrors: ErrorDetails[];
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private performanceCollector: PerformanceCollector;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorStats: ErrorStats;
  private errorHistory: ErrorDetails[] = [];
  private recoveryStrategies = new Map<string, (error: ErrorDetails) => Promise<ErrorRecoveryResult>>();

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableReporting: true,
      enableRecovery: true,
      enableMonitoring: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      circuitBreakerThreshold: 5,
      logLevel: 'error',
      ...config
    };

    this.performanceCollector = PerformanceCollector.getInstance();
    
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {
        network: 0,
        validation: 0,
        authentication: 0,
        authorization: 0,
        business: 0,
        system: 0,
        unknown: 0
      },
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      recoverySuccessRate: 0,
      averageRecoveryTime: 0,
      mostCommonErrors: [],
      recentErrors: []
    };

    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
    
    console.log('ErrorHandler initialized with advanced error handling patterns');
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with comprehensive analysis and recovery
   */
  async handleError(
    error: Error,
    context: Partial<ErrorContext> = {},
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      recoveryStrategy?: RecoveryStrategy;
      maxRetries?: number;
      userFriendlyMessage?: string;
    } = {}
  ): Promise<ErrorRecoveryResult> {
    const errorDetails = this.createErrorDetails(error, context, options);
    
    // Log error
    if (this.config.enableLogging) {
      this.logError(errorDetails);
    }

    // Record metrics
    if (this.config.enableMonitoring) {
      this.recordErrorMetrics(errorDetails);
    }

    // Update statistics
    this.updateErrorStats(errorDetails);

    // Store in history
    this.addToHistory(errorDetails);

    // Report error
    if (this.config.enableReporting) {
      await this.reportError(errorDetails);
    }

    // Attempt recovery
    let recoveryResult: ErrorRecoveryResult;
    if (this.config.enableRecovery && errorDetails.isRecoverable) {
      recoveryResult = await this.attemptRecovery(errorDetails);
    } else {
      recoveryResult = {
        success: false,
        strategy: 'fail-fast',
        attemptsUsed: 0,
        timeTaken: 0,
        error: errorDetails.originalError
      };
    }

    // Update recovery statistics
    this.updateRecoveryStats(recoveryResult);

    return recoveryResult;
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(
    name: string,
    strategy: (error: ErrorDetails) => Promise<ErrorRecoveryResult>
  ): void {
    this.recoveryStrategies.set(name, strategy);
    console.log(`Custom recovery strategy '${name}' registered`);
  }

  /**
   * Create circuit breaker for specific operation
   */
  createCircuitBreaker(operationName: string, threshold: number = this.config.circuitBreakerThreshold): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(operationName, {
      failureThreshold: threshold,
      recoveryTimeout: 30000,
      requestTimeout: 10000
    });

    this.circuitBreakers.set(operationName, circuitBreaker);
    return circuitBreaker;
  }

  /**
   * Execute operation with error handling and recovery
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    options: {
      operationName?: string;
      maxRetries?: number;
      fallbackValue?: T;
      useCircuitBreaker?: boolean;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
    } = {}
  ): Promise<T> {
    const operationName = options.operationName || 'unknown-operation';
    const maxRetries = options.maxRetries || this.config.maxRetryAttempts;
    let lastError: Error | null = null;

    // Get or create circuit breaker if requested
    let circuitBreaker: CircuitBreaker | null = null;
    if (options.useCircuitBreaker) {
      circuitBreaker = this.circuitBreakers.get(operationName) || this.createCircuitBreaker(operationName);
    }

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Execute through circuit breaker if available
        if (circuitBreaker) {
          return await circuitBreaker.execute(operation);
        } else {
          return await operation();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Handle error and check if retry is appropriate
        const recoveryResult = await this.handleError(
          lastError,
          { 
            ...context, 
            operationId: operationName,
            metadata: { 
              ...context.metadata,
              retryAttempt: attempt 
            }
          },
          {
            severity: options.severity || 'medium',
            category: options.category || 'system',
            maxRetries
          }
        );

        // If recovery was successful, return the result
        if (recoveryResult.success && recoveryResult.fallbackData !== undefined) {
          return recoveryResult.fallbackData;
        }

        // Wait before retry
        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    // All retries exhausted, return fallback or throw
    if (options.fallbackValue !== undefined) {
      console.warn(`Operation '${operationName}' failed, returning fallback value`);
      return options.fallbackValue;
    }

    throw lastError;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    this.updateMostCommonErrors();
    return { ...this.errorStats };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): ErrorDetails[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorStats.recentErrors = [];
    console.log('Error history cleared');
  }

  /**
   * Export error data for analysis
   */
  exportErrorData(): {
    stats: ErrorStats;
    history: ErrorDetails[];
    circuitBreakerStates: Array<{
      name: string;
      state: string;
      failureCount: number;
      lastFailureTime?: number;
    }>;
  } {
    const circuitBreakerStates = Array.from(this.circuitBreakers.entries()).map(([name, cb]) => {
      const metrics = cb.getMetrics();
      return {
        name,
        state: metrics.state,
        failureCount: metrics.failureCount,
        lastFailureTime: metrics.lastFailureTime
      };
    });

    return {
      stats: this.getErrorStats(),
      history: this.errorHistory,
      circuitBreakerStates
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private createErrorDetails(
    error: Error,
    context: Partial<ErrorContext>,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      recoveryStrategy?: RecoveryStrategy;
      maxRetries?: number;
      userFriendlyMessage?: string;
    }
  ): ErrorDetails {
    const errorId = this.generateErrorId();
    const severity = options.severity || this.determineSeverity(error);
    const category = options.category || this.categorizeError(error);
    const recoveryStrategy = options.recoveryStrategy || this.determineRecoveryStrategy(error, category);

    return {
      id: errorId,
      code: this.extractErrorCode(error),
      message: error.message,
      originalError: error,
      severity,
      category,
      context: {
        timestamp: Date.now(),
        stackTrace: error.stack,
        ...context
      },
      recoveryStrategy,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetryAttempts,
      isRecoverable: this.isRecoverable(error, category),
      userFriendlyMessage: options.userFriendlyMessage || this.generateUserFriendlyMessage(error, category),
      suggestedActions: this.generateSuggestedActions(error, category)
    };
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    } else if (message.includes('network') || message.includes('timeout')) {
      return 'high';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    } else if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    } else if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'authentication';
    } else if (message.includes('forbidden') || message.includes('permission')) {
      return 'authorization';
    } else if (stack.includes('business') || message.includes('business rule')) {
      return 'business';
    } else if (message.includes('system') || message.includes('internal')) {
      return 'system';
    } else {
      return 'unknown';
    }
  }

  private determineRecoveryStrategy(error: Error, category: ErrorCategory): RecoveryStrategy {
    switch (category) {
      case 'network':
        return 'retry';
      case 'validation':
        return 'fail-fast';
      case 'authentication':
        return 'fallback';
      case 'authorization':
        return 'graceful-degradation';
      case 'business':
        return 'fallback';
      case 'system':
        return 'circuit-breaker';
      default:
        return 'retry';
    }
  }

  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    const nonRecoverableCategories: ErrorCategory[] = ['validation', 'authentication', 'authorization'];
    return !nonRecoverableCategories.includes(category);
  }

  private generateUserFriendlyMessage(error: Error, category: ErrorCategory): string {
    switch (category) {
      case 'network':
        return 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.';
      case 'validation':
        return 'Please check your input and make sure all required fields are filled correctly.';
      case 'authentication':
        return 'Your session has expired. Please sign in again to continue.';
      case 'authorization':
        return 'You don\'t have permission to perform this action. Please contact support if you need access.';
      case 'business':
        return 'This operation cannot be completed due to business rules. Please review your request.';
      case 'system':
        return 'We\'re experiencing technical difficulties. Our team has been notified and is working on a fix.';
      default:
        return 'Something went wrong. Please try again or contact support if the problem persists.';
    }
  }

  private generateSuggestedActions(error: Error, category: ErrorCategory): string[] {
    switch (category) {
      case 'network':
        return ['Check your internet connection', 'Try refreshing the page', 'Wait a moment and try again'];
      case 'validation':
        return ['Review your input', 'Make sure all required fields are filled', 'Check for any error messages'];
      case 'authentication':
        return ['Sign in again', 'Clear your browser cache', 'Contact support if issue persists'];
      case 'authorization':
        return ['Contact your administrator', 'Check if you have the right permissions', 'Try signing out and back in'];
      case 'business':
        return ['Review the requirements', 'Contact support for clarification', 'Try a different approach'];
      case 'system':
        return ['Try again in a few minutes', 'Contact support', 'Check our status page'];
      default:
        return ['Try again', 'Refresh the page', 'Contact support if issue persists'];
    }
  }

  private async attemptRecovery(errorDetails: ErrorDetails): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();
    const strategy = this.recoveryStrategies.get(errorDetails.recoveryStrategy);

    if (strategy) {
      try {
        const result = await strategy(errorDetails);
        result.timeTaken = Date.now() - startTime;
        return result;
      } catch (recoveryError) {
        return {
          success: false,
          strategy: errorDetails.recoveryStrategy,
          attemptsUsed: 1,
          timeTaken: Date.now() - startTime,
          error: recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError))
        };
      }
    }

    return {
      success: false,
      strategy: errorDetails.recoveryStrategy,
      attemptsUsed: 0,
      timeTaken: Date.now() - startTime,
      error: new Error(`No recovery strategy found for: ${errorDetails.recoveryStrategy}`)
    };
  }

  private setupDefaultRecoveryStrategies(): void {
    // Retry strategy
    this.registerRecoveryStrategy('retry', async (error: ErrorDetails) => {
      return {
        success: false,
        strategy: 'retry',
        attemptsUsed: 1,
        timeTaken: 0
      };
    });

    // Fallback strategy
    this.registerRecoveryStrategy('fallback', async (error: ErrorDetails) => {
      return {
        success: true,
        strategy: 'fallback',
        attemptsUsed: 1,
        timeTaken: 0,
        fallbackData: this.getFallbackData(error)
      };
    });

    // Graceful degradation strategy
    this.registerRecoveryStrategy('graceful-degradation', async (error: ErrorDetails) => {
      return {
        success: true,
        strategy: 'graceful-degradation',
        attemptsUsed: 1,
        timeTaken: 0,
        fallbackData: this.getDegradedService(error)
      };
    });
  }

  private getFallbackData(error: ErrorDetails): any {
    // Return appropriate fallback data based on error context
    switch (error.category) {
      case 'network':
        return { offline: true, cached: true };
      case 'business':
        return { partial: true, warning: 'Some features may be limited' };
      default:
        return null;
    }
  }

  private getDegradedService(error: ErrorDetails): any {
    return {
      degraded: true,
      message: 'Service running in limited mode',
      availableFeatures: ['basic-functionality']
    };
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(
          new Error(event.reason),
          {
            component: 'global',
            action: 'unhandled-promise-rejection',
            url: window.location.href
          },
          { severity: 'high', category: 'system' }
        );
      });

      // Handle uncaught errors
      window.addEventListener('error', (event) => {
        this.handleError(
          event.error || new Error(event.message),
          {
            component: 'global',
            action: 'uncaught-error',
            url: window.location.href,
            metadata: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          },
          { severity: 'high', category: 'system' }
        );
      });
    }
  }

  private logError(error: ErrorDetails): void {
    const logLevel = this.config.logLevel;
    const logMessage = `[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`;
    
    switch (logLevel) {
      case 'debug':
        console.debug(logMessage, error);
        break;
      case 'info':
        console.info(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'error':
      default:
        console.error(logMessage, error);
        break;
    }
  }

  private recordErrorMetrics(error: ErrorDetails): void {
    this.performanceCollector.recordMetric({
      name: 'error.occurred',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: {
        severity: error.severity,
        category: error.category,
        code: error.code,
        recoverable: error.isRecoverable.toString()
      },
      metadata: {
        errorId: error.id,
        component: error.context.component,
        action: error.context.action
      }
    });
  }

  private async reportError(error: ErrorDetails): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errorId: error.id,
          code: error.code,
          message: error.message,
          severity: error.severity,
          category: error.category,
          context: error.context,
          stackTrace: error.context.stackTrace
        })
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private updateErrorStats(error: ErrorDetails): void {
    this.errorStats.totalErrors++;
    this.errorStats.errorsByCategory[error.category]++;
    this.errorStats.errorsBySeverity[error.severity]++;
  }

  private updateRecoveryStats(result: ErrorRecoveryResult): void {
    const totalRecoveries = this.errorStats.totalErrors;
    const successfulRecoveries = result.success ? 1 : 0;
    
    this.errorStats.recoverySuccessRate = 
      ((this.errorStats.recoverySuccessRate * (totalRecoveries - 1)) + successfulRecoveries) / totalRecoveries;
    
    this.errorStats.averageRecoveryTime = 
      ((this.errorStats.averageRecoveryTime * (totalRecoveries - 1)) + result.timeTaken) / totalRecoveries;
  }

  private addToHistory(error: ErrorDetails): void {
    this.errorHistory.push(error);
    
    // Keep only last 1000 errors
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-1000);
    }
    
    // Update recent errors in stats
    this.errorStats.recentErrors = this.errorHistory.slice(-10);
  }

  private updateMostCommonErrors(): void {
    const errorCounts = new Map<string, number>();
    const lastOccurrence = new Map<string, number>();

    for (const error of this.errorHistory) {
      const count = errorCounts.get(error.code) || 0;
      errorCounts.set(error.code, count + 1);
      lastOccurrence.set(error.code, Math.max(lastOccurrence.get(error.code) || 0, error.context.timestamp));
    }

    this.errorStats.mostCommonErrors = Array.from(errorCounts.entries())
      .map(([code, count]) => ({
        code,
        count,
        lastOccurrence: lastOccurrence.get(code) || 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private extractErrorCode(error: Error): string {
    // Try to extract error code from error message or use error name
    const match = error.message.match(/^(\w+):/);
    return match ? match[1] : error.name || 'UNKNOWN_ERROR';
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
