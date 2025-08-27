/**
 * Advanced Error Reporting Service
 * Comprehensive error reporting with batching, retry logic, and analytics
 */

import { ErrorDetails, ErrorSeverity, ErrorCategory } from './ErrorHandler';
import { PerformanceCollector } from '../monitoring/PerformanceCollector';

export interface ErrorReport {
  id: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  errorDetails: ErrorDetails;
  environment: {
    userAgent: string;
    url: string;
    viewport: { width: number; height: number };
    timestamp: number;
    timezone: string;
    language: string;
  };
  performance: {
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
    timing: PerformanceTiming | null;
    navigation?: PerformanceNavigation;
  };
  breadcrumbs: ErrorBreadcrumb[];
  tags: Record<string, string>;
  fingerprint: string;
}

export interface ErrorBreadcrumb {
  timestamp: number;
  category: 'navigation' | 'user' | 'http' | 'console' | 'error' | 'lifecycle';
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableBreadcrumbs: boolean;
  maxBreadcrumbs: number;
  enablePerformanceData: boolean;
  enableScreenshots: boolean;
  enableLocalStorage: boolean;
  samplingRate: number;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  onReportSent?: (report: ErrorReport) => void;
  onReportFailed?: (report: ErrorReport, error: Error) => void;
}

export interface ReportingStats {
  totalReports: number;
  successfulReports: number;
  failedReports: number;
  averageReportSize: number;
  averageUploadTime: number;
  reportsByCategory: Record<ErrorCategory, number>;
  reportsBySeverity: Record<ErrorSeverity, number>;
  lastReportTime: number;
  batchesSent: number;
  retryAttempts: number;
}

export class ErrorReporting {
  private static instance: ErrorReporting;
  private config: ReportingConfig;
  private performanceCollector: PerformanceCollector;
  private reportQueue: ErrorReport[] = [];
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private sessionId: string;
  private stats: ReportingStats;
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;

  private constructor(config: Partial<ReportingConfig> = {}) {
    this.config = {
      enabled: true,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000,
      enableBreadcrumbs: true,
      maxBreadcrumbs: 50,
      enablePerformanceData: true,
      enableScreenshots: false,
      enableLocalStorage: false,
      samplingRate: 1.0,
      ...config
    };

    this.performanceCollector = PerformanceCollector.getInstance();
    this.sessionId = this.generateSessionId();
    
    this.stats = {
      totalReports: 0,
      successfulReports: 0,
      failedReports: 0,
      averageReportSize: 0,
      averageUploadTime: 0,
      reportsByCategory: {
        network: 0,
        validation: 0,
        authentication: 0,
        authorization: 0,
        business: 0,
        system: 0,
        unknown: 0
      },
      reportsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      lastReportTime: 0,
      batchesSent: 0,
      retryAttempts: 0
    };

    this.setupEventListeners();
    this.startFlushTimer();
    
    console.log('ErrorReporting initialized with advanced reporting capabilities');
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ReportingConfig>): ErrorReporting {
    if (!ErrorReporting.instance) {
      ErrorReporting.instance = new ErrorReporting(config);
    }
    return ErrorReporting.instance;
  }

  /**
   * Report an error
   */
  async reportError(errorDetails: ErrorDetails): Promise<void> {
    if (!this.config.enabled || !this.shouldSample()) {
      return;
    }

    try {
      const report = await this.createErrorReport(errorDetails);
      
      // Apply beforeSend filter
      const filteredReport = this.config.beforeSend ? this.config.beforeSend(report) : report;
      if (!filteredReport) {
        return; // Report was filtered out
      }

      this.addToQueue(filteredReport);
      this.updateStats(filteredReport);

      // Add error breadcrumb
      if (this.config.enableBreadcrumbs) {
        this.addBreadcrumb({
          timestamp: Date.now(),
          category: 'error',
          message: `Error reported: ${errorDetails.code}`,
          level: this.mapSeverityToLevel(errorDetails.severity),
          data: {
            errorId: errorDetails.id,
            category: errorDetails.category,
            recoverable: errorDetails.isRecoverable
          }
        });
      }

      // Flush immediately for critical errors
      if (errorDetails.severity === 'critical') {
        await this.flush();
      }

    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    if (!this.config.enableBreadcrumbs) return;

    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Add navigation breadcrumb
   */
  addNavigationBreadcrumb(from: string, to: string): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      category: 'navigation',
      message: `Navigated from ${from} to ${to}`,
      level: 'info',
      data: { from, to }
    });
  }

  /**
   * Add user action breadcrumb
   */
  addUserActionBreadcrumb(action: string, element?: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      category: 'user',
      message: `User ${action}${element ? ` on ${element}` : ''}`,
      level: 'info',
      data: { action, element, ...data }
    });
  }

  /**
   * Add HTTP request breadcrumb
   */
  addHttpBreadcrumb(method: string, url: string, status: number, duration: number): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      category: 'http',
      message: `${method} ${url} - ${status}`,
      level: status >= 400 ? 'error' : 'info',
      data: { method, url, status, duration }
    });
  }

  /**
   * Force flush all pending reports
   */
  async flush(): Promise<void> {
    if (this.reportQueue.length === 0) return;

    const reportsToSend = [...this.reportQueue];
    this.reportQueue = [];

    await this.sendReports(reportsToSend);
  }

  /**
   * Get reporting statistics
   */
  getStats(): ReportingStats {
    return { ...this.stats };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.reportQueue = [];
    this.breadcrumbs = [];
    this.sessionId = this.generateSessionId();
    console.log('ErrorReporting data cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReportingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart flush timer if interval changed
    if (config.flushInterval !== undefined) {
      this.stopFlushTimer();
      this.startFlushTimer();
    }
    
    console.log('ErrorReporting configuration updated');
  }

  /**
   * Export all data for debugging
   */
  exportData(): {
    config: ReportingConfig;
    stats: ReportingStats;
    queueSize: number;
    breadcrumbsCount: number;
    sessionId: string;
  } {
    return {
      config: this.config,
      stats: this.getStats(),
      queueSize: this.reportQueue.length,
      breadcrumbsCount: this.breadcrumbs.length,
      sessionId: this.sessionId
    };
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async createErrorReport(errorDetails: ErrorDetails): Promise<ErrorReport> {
    const environment = await this.collectEnvironmentData();
    const performance = this.config.enablePerformanceData ? await this.collectPerformanceData() : {
      memory: undefined,
      timing: null,
      navigation: undefined
    };

    const report: ErrorReport = {
      id: this.generateReportId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: errorDetails.context.userId,
      errorDetails,
      environment,
      performance,
      breadcrumbs: [...this.breadcrumbs],
      tags: this.generateTags(errorDetails),
      fingerprint: this.generateFingerprint(errorDetails)
    };

    return report;
  }

  private async collectEnvironmentData() {
    const env = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : { width: 0, height: 0 },
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown'
    };

    return env;
  }

  private async collectPerformanceData() {
    const data: any = {
      memory: undefined,
      timing: null,
      navigation: undefined
    };

    if (typeof window !== 'undefined') {
      // Memory information
      if ('memory' in performance) {
        data.memory = (performance as any).memory;
      }

      // Timing information
      if (performance.timing) {
        data.timing = performance.timing;
      }

      // Navigation information
      if (performance.navigation) {
        data.navigation = performance.navigation;
      }
    }

    return data;
  }

  private generateTags(errorDetails: ErrorDetails): Record<string, string> {
    const tags: Record<string, string> = {
      severity: errorDetails.severity,
      category: errorDetails.category,
      recoverable: errorDetails.isRecoverable.toString(),
      strategy: errorDetails.recoveryStrategy
    };

    if (errorDetails.context.component) {
      tags.component = errorDetails.context.component;
    }

    if (errorDetails.context.action) {
      tags.action = errorDetails.context.action;
    }

    return tags;
  }

  private generateFingerprint(errorDetails: ErrorDetails): string {
    // Create a unique fingerprint for grouping similar errors
    const parts = [
      errorDetails.code,
      errorDetails.category,
      errorDetails.context.component || 'unknown',
      errorDetails.context.action || 'unknown'
    ];

    return btoa(parts.join('|')).substring(0, 16);
  }

  private addToQueue(report: ErrorReport): void {
    this.reportQueue.push(report);

    // Auto-flush if queue is full
    if (this.reportQueue.length >= this.config.batchSize) {
      this.flush().catch(error => {
        console.error('Auto-flush failed:', error);
      });
    }
  }

  private async sendReports(reports: ErrorReport[]): Promise<void> {
    if (!this.config.endpoint || !this.isOnline) {
      return;
    }

    const startTime = Date.now();
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify({
            reports,
            sessionId: this.sessionId,
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          const uploadTime = Date.now() - startTime;
          this.updateSuccessStats(reports, uploadTime);
          
          // Call success callback
          if (this.config.onReportSent) {
            reports.forEach(report => this.config.onReportSent!(report));
          }
          
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        attempt++;
        this.stats.retryAttempts++;

        if (attempt >= this.config.maxRetries) {
          this.updateFailureStats(reports);
          
          // Call failure callback
          if (this.config.onReportFailed) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            reports.forEach(report => this.config.onReportFailed!(report, errorObj));
          }
          
          console.error(`Failed to send error reports after ${this.config.maxRetries} attempts:`, error);
          return;
        }

        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);
      }
    }
  }

  private updateStats(report: ErrorReport): void {
    this.stats.totalReports++;
    this.stats.reportsByCategory[report.errorDetails.category]++;
    this.stats.reportsBySeverity[report.errorDetails.severity]++;
    this.stats.lastReportTime = report.timestamp;
  }

  private updateSuccessStats(reports: ErrorReport[], uploadTime: number): void {
    this.stats.successfulReports += reports.length;
    this.stats.batchesSent++;
    
    // Update average upload time
    const totalUploads = this.stats.batchesSent;
    this.stats.averageUploadTime = 
      ((this.stats.averageUploadTime * (totalUploads - 1)) + uploadTime) / totalUploads;
    
    // Update average report size
    const totalSize = JSON.stringify(reports).length;
    const avgSize = totalSize / reports.length;
    this.stats.averageReportSize = 
      ((this.stats.averageReportSize * (this.stats.successfulReports - reports.length)) + (avgSize * reports.length)) / this.stats.successfulReports;
  }

  private updateFailureStats(reports: ErrorReport[]): void {
    this.stats.failedReports += reports.length;
  }

  private shouldSample(): boolean {
    return Math.random() <= this.config.samplingRate;
  }

  private mapSeverityToLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warning' | 'error' {
    switch (severity) {
      case 'low': return 'debug';
      case 'medium': return 'info';
      case 'high': return 'warning';
      case 'critical': return 'error';
      default: return 'error';
    }
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.addBreadcrumb({
        timestamp: Date.now(),
        category: 'lifecycle',
        message: 'Connection restored',
        level: 'info'
      });
      // Try to flush queued reports
      this.flush().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.addBreadcrumb({
        timestamp: Date.now(),
        category: 'lifecycle',
        message: 'Connection lost',
        level: 'warning'
      });
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Flush reports before page becomes hidden
        this.flush().catch(console.error);
      }
    });

    // Before page unload
    window.addEventListener('beforeunload', () => {
      // Try to send reports synchronously
      if (this.reportQueue.length > 0 && this.config.endpoint) {
        navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify({
            reports: this.reportQueue,
            sessionId: this.sessionId,
            timestamp: Date.now()
          })
        );
      }
    });
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.flush().catch(error => {
          console.error('Scheduled flush failed:', error);
        });
      }
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
