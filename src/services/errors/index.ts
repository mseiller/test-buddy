/**
 * Advanced Error Handling System
 * Comprehensive error handling with recovery, reporting, and fallback strategies
 */

export { ErrorHandler } from './ErrorHandler';
export { ErrorReporting } from './ErrorReporting';
export { FallbackStrategies } from './FallbackStrategies';

export type {
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  ErrorContext,
  ErrorDetails,
  ErrorRecoveryResult,
  ErrorHandlerConfig,
  ErrorStats
} from './ErrorHandler';

export type {
  ErrorReport,
  ErrorBreadcrumb,
  ReportingConfig,
  ReportingStats
} from './ErrorReporting';

export type {
  FallbackType,
  FallbackConfig,
  FallbackContext,
  FallbackResult,
  OperationFallbacks
} from './FallbackStrategies';

// Re-export error boundary components
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../../components/errors/ErrorBoundary';

/**
 * Unified Error Management Service
 * Integrates all error handling components into a single service
 */
import { ErrorHandler, ErrorSeverity, ErrorCategory } from './ErrorHandler';
import { ErrorReporting } from './ErrorReporting';
import { FallbackStrategies } from './FallbackStrategies';

export interface ErrorManagementConfig {
  enableErrorHandler?: boolean;
  enableReporting?: boolean;
  enableFallbacks?: boolean;
  reportingEndpoint?: string;
  reportingApiKey?: string;
  maxRetries?: number;
  enableBreadcrumbs?: boolean;
  enablePerformanceData?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class ErrorManagementService {
  private static instance: ErrorManagementService;
  private errorHandler: ErrorHandler;
  private errorReporting: ErrorReporting;
  private fallbackStrategies: FallbackStrategies;
  private config: Required<ErrorManagementConfig>;

  private constructor(config: ErrorManagementConfig = {}) {
    this.config = {
      enableErrorHandler: true,
      enableReporting: true,
      enableFallbacks: true,
      reportingEndpoint: '',
      reportingApiKey: '',
      maxRetries: 3,
      enableBreadcrumbs: true,
      enablePerformanceData: true,
      logLevel: 'error',
      ...config
    };

    // Initialize services
    this.errorHandler = ErrorHandler.getInstance({
      enableLogging: this.config.enableErrorHandler,
      enableReporting: this.config.enableReporting,
      enableRecovery: this.config.enableFallbacks,
      enableMonitoring: this.config.enablePerformanceData,
      maxRetryAttempts: this.config.maxRetries,
      reportingEndpoint: this.config.reportingEndpoint,
      logLevel: this.config.logLevel
    });

    this.errorReporting = ErrorReporting.getInstance({
      enabled: this.config.enableReporting,
      endpoint: this.config.reportingEndpoint,
      apiKey: this.config.reportingApiKey,
      enableBreadcrumbs: this.config.enableBreadcrumbs,
      enablePerformanceData: this.config.enablePerformanceData
    });

    this.fallbackStrategies = FallbackStrategies.getInstance();

    console.log('ErrorManagementService initialized with comprehensive error handling');
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ErrorManagementConfig): ErrorManagementService {
    if (!ErrorManagementService.instance) {
      ErrorManagementService.instance = new ErrorManagementService(config);
    }
    return ErrorManagementService.instance;
  }

  /**
   * Handle error with full error management pipeline
   */
  async handleError(
    error: Error,
    context: {
      operation?: string;
      component?: string;
      action?: string;
      userId?: string;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      enableFallback?: boolean;
      fallbackData?: any;
    } = {}
  ) {
    const startTime = Date.now();

    try {
      // 1. Handle error with error handler
      const recoveryResult = await this.errorHandler.handleError(
        error,
        {
          component: context.component,
          action: context.action,
          userId: context.userId,
          operationId: context.operation
        },
        {
          severity: context.severity,
          category: context.category,
          maxRetries: this.config.maxRetries
        }
      );

      // 2. If recovery failed and fallbacks are enabled, try fallback strategies
      if (!recoveryResult.success && context.enableFallback && context.operation) {
        try {
          const fallbackResult = await this.fallbackStrategies.executeWithFallback(
            context.operation,
            async () => { throw error; }, // Will trigger fallback
            {
              operation: context.operation,
              userId: context.userId,
              parameters: context.fallbackData
            }
          );

          if (fallbackResult.success) {
            // Add breadcrumb for successful fallback
            this.errorReporting.addBreadcrumb({
              timestamp: Date.now(),
              category: 'lifecycle',
              message: `Fallback strategy ${fallbackResult.strategy} succeeded for ${context.operation}`,
              level: 'info',
              data: {
                strategy: fallbackResult.strategy,
                source: fallbackResult.source,
                executionTime: fallbackResult.performance.executionTime
              }
            });

            return {
              success: true,
              data: fallbackResult.data,
              source: 'fallback',
              strategy: fallbackResult.strategy,
              executionTime: Date.now() - startTime,
              warnings: fallbackResult.warnings
            };
          }
        } catch (fallbackError) {
          console.warn('Fallback strategies failed:', fallbackError);
        }
      }

      return {
        success: recoveryResult.success,
        data: recoveryResult.fallbackData,
        source: 'recovery',
        strategy: recoveryResult.strategy,
        executionTime: Date.now() - startTime,
        warnings: recoveryResult.success ? [] : ['Recovery failed']
      };

    } catch (managementError) {
      console.error('Error management pipeline failed:', managementError);
      
      return {
        success: false,
        data: null,
        source: 'none',
        strategy: 'fail-fast',
        executionTime: Date.now() - startTime,
        warnings: ['Error management pipeline failed']
      };
    }
  }

  /**
   * Execute operation with comprehensive error protection
   */
  async executeWithProtection<T>(
    operation: () => Promise<T>,
    config: {
      operationName: string;
      component?: string;
      userId?: string;
      maxRetries?: number;
      fallbackValue?: T;
      enableCircuitBreaker?: boolean;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
    }
  ): Promise<T> {
    const { operationName, component, userId, fallbackValue } = config;

    try {
      // Add breadcrumb for operation start
      this.errorReporting.addBreadcrumb({
        timestamp: Date.now(),
        category: 'lifecycle',
        message: `Starting protected operation: ${operationName}`,
        level: 'info',
        data: { operation: operationName, component }
      });

      // Execute with error handler protection
      const result = await this.errorHandler.executeWithErrorHandling(
        operation,
        {
          component,
          userId,
          operationId: operationName
        },
        {
          operationName,
          maxRetries: config.maxRetries || this.config.maxRetries,
          fallbackValue,
          useCircuitBreaker: config.enableCircuitBreaker,
          severity: config.severity,
          category: config.category
        }
      );

      // Add success breadcrumb
      this.errorReporting.addBreadcrumb({
        timestamp: Date.now(),
        category: 'lifecycle',
        message: `Protected operation completed successfully: ${operationName}`,
        level: 'info',
        data: { operation: operationName }
      });

      return result;

    } catch (error) {
      // Try fallback strategies as last resort
      if (fallbackValue !== undefined) {
        console.warn(`Operation ${operationName} failed, returning fallback value`);
        return fallbackValue;
      }

      throw error;
    }
  }

  /**
   * Add breadcrumb for user action
   */
  addUserActionBreadcrumb(action: string, element?: string, data?: Record<string, any>): void {
    this.errorReporting.addUserActionBreadcrumb(action, element, data);
  }

  /**
   * Add breadcrumb for navigation
   */
  addNavigationBreadcrumb(from: string, to: string): void {
    this.errorReporting.addNavigationBreadcrumb(from, to);
  }

  /**
   * Add breadcrumb for HTTP request
   */
  addHttpBreadcrumb(method: string, url: string, status: number, duration: number): void {
    this.errorReporting.addHttpBreadcrumb(method, url, status, duration);
  }

  /**
   * Get comprehensive error statistics
   */
  getErrorStats(): {
    errorHandler: any;
    reporting: any;
    fallbacks: any;
  } {
    return {
      errorHandler: this.errorHandler.getErrorStats(),
      reporting: this.errorReporting.getStats(),
      fallbacks: this.fallbackStrategies.getFallbackStats()
    };
  }

  /**
   * Export all error data for analysis
   */
  exportErrorData(): {
    config: Required<ErrorManagementConfig>;
    stats: any;
    errorHandler: any;
    reporting: any;
    fallbacks: any;
  } {
    return {
      config: this.config,
      stats: this.getErrorStats(),
      errorHandler: this.errorHandler.exportErrorData(),
      reporting: this.errorReporting.exportData(),
      fallbacks: this.fallbackStrategies.getFallbackStats()
    };
  }

  /**
   * Clear all error data
   */
  clearAllData(): void {
    this.errorHandler.clearErrorHistory();
    this.errorReporting.clear();
    console.log('All error management data cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorManagementConfig>): void {
    this.config = { ...this.config, ...config };

    // Update reporting configuration
    if (config.reportingEndpoint || config.reportingApiKey || config.enableBreadcrumbs || config.enablePerformanceData) {
      this.errorReporting.updateConfig({
        endpoint: this.config.reportingEndpoint,
        apiKey: this.config.reportingApiKey,
        enableBreadcrumbs: this.config.enableBreadcrumbs,
        enablePerformanceData: this.config.enablePerformanceData
      });
    }

    console.log('ErrorManagementService configuration updated');
  }
}
