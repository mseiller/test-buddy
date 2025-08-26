/**
 * Monitoring Integration Service
 * Integrates monitoring with all existing services for comprehensive tracking
 */

import { PerformanceCollector } from './PerformanceCollector';
import { MonitoringAPI } from './MonitoringAPI';
import { ResilienceService } from '../resilience/ResilienceService';
import { CircuitBreakerRegistry } from '../resilience/CircuitBreaker';
import { EnhancedRetry } from '../resilience/EnhancedRetry';

export interface MonitoringConfig {
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableResilienceTracking: boolean;
  enableCustomMetrics: boolean;
  sampleRate: number; // 0.0 to 1.0
  bufferSize: number;
  flushInterval: number; // milliseconds
}

export interface OperationContext {
  operationName: string;
  service: string;
  userId?: string;
  requestId?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export class MonitoringIntegration {
  private static instance: MonitoringIntegration;
  private performanceCollector: PerformanceCollector;
  private monitoringAPI: MonitoringAPI;
  private resilienceService: ResilienceService;
  private config: MonitoringConfig;
  private isInitialized = false;

  private constructor() {
    this.performanceCollector = PerformanceCollector.getInstance();
    this.monitoringAPI = MonitoringAPI.getInstance();
    this.resilienceService = ResilienceService.getInstance();
    this.config = this.getDefaultConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MonitoringIntegration {
    if (!MonitoringIntegration.instance) {
      MonitoringIntegration.instance = new MonitoringIntegration();
    }
    return MonitoringIntegration.instance;
  }

  /**
   * Initialize monitoring integration
   */
  async initialize(config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('Monitoring integration already initialized');
      return;
    }

    this.config = { ...this.config, ...config };
    
    // Initialize performance tracking
    if (this.config.enablePerformanceTracking) {
      this.setupPerformanceTracking();
    }

    // Initialize error tracking
    if (this.config.enableErrorTracking) {
      this.setupErrorTracking();
    }

    // Initialize resilience tracking
    if (this.config.enableResilienceTracking) {
      this.setupResilienceTracking();
    }

    // Setup automatic metric collection
    this.setupAutomaticMetrics();

    this.isInitialized = true;
    console.log('Monitoring integration initialized with config:', this.config);

    // Record initialization metric
    this.recordMetric({
      name: 'monitoring.initialized',
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: { component: 'monitoring_integration' }
    });
  }

  /**
   * Track operation performance
   */
  trackOperation<T>(
    context: OperationContext,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enablePerformanceTracking || Math.random() > this.config.sampleRate) {
      return operation();
    }

    const timer = this.performanceCollector.startTimer(context.operationName, {
      service: context.service,
      userId: context.userId || 'anonymous',
      requestId: context.requestId || 'unknown',
      ...context.tags
    });

    const startTime = Date.now();

    return operation()
      .then(result => {
        timer(true, undefined, {
          ...context.metadata,
          duration: Date.now() - startTime,
          success: true
        });

        // Record success metric
        this.recordMetric({
          name: `${context.service}.${context.operationName}.success`,
          type: 'counter',
          value: 1,
          unit: 'count',
          tags: {
            service: context.service,
            operation: context.operationName,
            ...context.tags
          }
        });

        return result;
      })
      .catch(error => {
        const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        
        timer(false, errorType, {
          ...context.metadata,
          duration: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });

        // Record error metric
        this.recordMetric({
          name: `${context.service}.${context.operationName}.error`,
          type: 'counter',
          value: 1,
          unit: 'count',
          tags: {
            service: context.service,
            operation: context.operationName,
            errorType,
            ...context.tags
          }
        });

        throw error;
      });
  }

  /**
   * Track resilient operation
   */
  trackResilientOperation<T>(
    context: OperationContext,
    operation: () => Promise<T>,
    resilienceConfig?: any
  ): Promise<T> {
    const wrappedOperation = () => this.trackOperation(context, operation);
    
    return this.resilienceService.executeResilient(wrappedOperation, {
      name: context.operationName,
      tags: context.tags,
      userId: context.userId,
      metadata: context.metadata,
      ...resilienceConfig
    });
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: {
    name: string;
    type: 'counter' | 'gauge' | 'histogram' | 'timer';
    value: number;
    unit: string;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): void {
    if (!this.config.enableCustomMetrics) return;

    this.performanceCollector.recordMetric(metric);
  }

  /**
   * Record custom event
   */
  recordEvent(event: {
    name: string;
    message: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): void {
    this.recordMetric({
      name: `events.${event.name}`,
      type: 'counter',
      value: 1,
      unit: 'count',
      tags: {
        level: event.level,
        ...event.tags
      },
      metadata: {
        message: event.message,
        ...event.metadata
      }
    });

    console.log(`📊 Event [${event.level.toUpperCase()}]: ${event.name} - ${event.message}`);
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(): Promise<any> {
    const response = await this.monitoringAPI.getDashboardData();
    return response.data;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    const response = await this.monitoringAPI.getHealthStatus();
    return response.data;
  }

  /**
   * Create performance wrapper for functions
   */
  createPerformanceWrapper<T extends (...args: any[]) => Promise<any>>(
    func: T,
    context: Omit<OperationContext, 'operationName'> & { operationName?: string }
  ): T {
    const operationName = context.operationName || func.name || 'anonymous_operation';
    const fullContext = { ...context, operationName };

    return (async (...args: Parameters<T>) => {
      return this.trackOperation(fullContext, () => func(...args));
    }) as T;
  }

  /**
   * Create resilient wrapper for functions
   */
  createResilientWrapper<T extends (...args: any[]) => Promise<any>>(
    func: T,
    context: Omit<OperationContext, 'operationName'> & { operationName?: string },
    resilienceConfig?: any
  ): T {
    const operationName = context.operationName || func.name || 'anonymous_operation';
    const fullContext = { ...context, operationName };

    return (async (...args: Parameters<T>) => {
      return this.trackResilientOperation(fullContext, () => func(...args), resilienceConfig);
    }) as T;
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private getDefaultConfig(): MonitoringConfig {
    return {
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      enableResilienceTracking: true,
      enableCustomMetrics: true,
      sampleRate: 1.0, // Track all operations by default
      bufferSize: 1000,
      flushInterval: 30000 // 30 seconds
    };
  }

  private setupPerformanceTracking(): void {
    // Monkey patch common operations for automatic tracking
    this.patchFetchAPI();
    this.patchConsoleErrors();
  }

  private setupErrorTracking(): void {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.recordEvent({
          name: 'unhandled_error',
          message: event.error?.message || 'Unknown error',
          level: 'error',
          tags: {
            source: 'window_error',
            filename: event.filename || 'unknown',
            lineno: String(event.lineno || 0),
            colno: String(event.colno || 0)
          },
          metadata: {
            stack: event.error?.stack
          }
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.recordEvent({
          name: 'unhandled_promise_rejection',
          message: event.reason?.message || String(event.reason) || 'Unknown rejection',
          level: 'error',
          tags: {
            source: 'unhandled_promise'
          },
          metadata: {
            reason: event.reason,
            stack: event.reason?.stack
          }
        });
      });
    }
  }

  private setupResilienceTracking(): void {
    // Track circuit breaker state changes
    setInterval(() => {
      const metrics = CircuitBreakerRegistry.getAllMetrics();
      Object.entries(metrics).forEach(([name, data]: [string, any]) => {
        this.recordMetric({
          name: `circuit_breaker.${name}.state`,
          type: 'gauge',
          value: data.state === 'CLOSED' ? 0 : data.state === 'HALF_OPEN' ? 1 : 2,
          unit: 'state',
          tags: { circuit_breaker: name, state: data.state }
        });
      });
    }, 10000); // Every 10 seconds
  }

  private setupAutomaticMetrics(): void {
    // Collect system metrics periodically
    setInterval(() => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric({
            name: 'browser.page_load_time',
            type: 'timer',
            value: navigation.loadEventEnd - navigation.fetchStart,
            unit: 'milliseconds',
            tags: { component: 'browser_performance' }
          });
        }

        // Memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          this.recordMetric({
            name: 'browser.memory_used',
            type: 'gauge',
            value: memory.usedJSHeapSize,
            unit: 'bytes',
            tags: { component: 'browser_memory' }
          });
        }
      }
    }, 60000); // Every minute
  }

  private patchFetchAPI(): void {
    if (typeof window !== 'undefined' && 'fetch' in window) {
      const originalFetch = window.fetch;
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method || 'GET';
        
        return this.trackOperation({
          operationName: 'http_request',
          service: 'fetch_api',
          tags: { method, url: this.sanitizeUrl(url) }
        }, () => originalFetch(input, init));
      };
    }
  }

  private patchConsoleErrors(): void {
    if (typeof console !== 'undefined') {
      const originalError = console.error;
      
      console.error = (...args: any[]) => {
        this.recordEvent({
          name: 'console_error',
          message: args.map(arg => String(arg)).join(' '),
          level: 'error',
          tags: { source: 'console' }
        });
        
        return originalError.apply(console, args);
      };
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url.split('?')[0]; // Remove query parameters
    }
  }
}
