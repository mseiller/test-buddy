/**
 * Monitoring API
 * RESTful API interface for accessing monitoring data
 */

import { PerformanceCollector } from './PerformanceCollector';
import { CircuitBreakerRegistry } from '../resilience/CircuitBreaker';
import { EnhancedRetry } from '../resilience/EnhancedRetry';
import { ResilienceService } from '../resilience/ResilienceService';

export interface MonitoringAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId: string;
}

export interface DashboardData {
  healthScore: {
    overall: number;
    breakdown: {
      performance: number;
      reliability: number;
      availability: number;
      errors: number;
    };
    factors: Array<{ name: string; impact: number; description: string }>;
  };
  realTimeMetrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeOperations: number;
    queueUtilization: number;
  };
  systemStatus: {
    circuitBreakers: Record<string, {
      state: string;
      failureCount: number;
      successCount: number;
      lastFailureTime?: number;
    }>;
    retryMetrics: Record<string, {
      totalAttempts: number;
      successfulAttempts: number;
      failedAttempts: number;
      averageAttempts: number;
    }>;
    queueStatus: Record<string, {
      currentSize: number;
      runningOperations: number;
      completedOperations: number;
      failedOperations: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: number;
    resolved: boolean;
  }>;
  performance: {
    responseTimeChart: Array<{ timestamp: number; value: number }>;
    errorRateChart: Array<{ timestamp: number; value: number }>;
    throughputChart: Array<{ timestamp: number; value: number }>;
  };
}

export class MonitoringAPI {
  private static instance: MonitoringAPI;
  private performanceCollector: PerformanceCollector;
  private resilienceService: ResilienceService;

  private constructor() {
    this.performanceCollector = PerformanceCollector.getInstance();
    this.resilienceService = ResilienceService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MonitoringAPI {
    if (!MonitoringAPI.instance) {
      MonitoringAPI.instance = new MonitoringAPI();
    }
    return MonitoringAPI.instance;
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<MonitoringAPIResponse<DashboardData>> {
    try {
      const requestId = this.generateRequestId();
      
      const [
        healthScore,
        snapshot,
        analytics,
        alerts,
        circuitBreakerMetrics,
        retryMetrics,
        resilienceMetrics
      ] = await Promise.all([
        Promise.resolve(this.performanceCollector.getHealthScore()),
        Promise.resolve(this.performanceCollector.getCurrentSnapshot()),
        Promise.resolve(this.performanceCollector.getAnalytics()),
        Promise.resolve(this.performanceCollector.getActiveAlerts()),
        Promise.resolve(CircuitBreakerRegistry.getAllMetrics()),
        Promise.resolve(EnhancedRetry.getMetrics()),
        Promise.resolve(this.resilienceService.getMetrics())
      ]);

      const history = this.performanceCollector.getHistory(3600000); // Last hour
      
      const dashboardData: DashboardData = {
        healthScore,
        realTimeMetrics: {
          requestsPerSecond: snapshot.application.requestsPerSecond,
          averageResponseTime: snapshot.application.averageResponseTime,
          errorRate: snapshot.application.errorRate,
          activeOperations: snapshot.system.activeOperations,
          queueUtilization: snapshot.resilience.queueUtilization
        },
        systemStatus: {
          circuitBreakers: this.formatCircuitBreakerData(circuitBreakerMetrics),
          retryMetrics: this.formatRetryData(retryMetrics),
          queueStatus: this.formatQueueData(resilienceMetrics.queues)
        },
        alerts: alerts.map(alert => ({
          id: alert.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp,
          resolved: alert.resolved
        })),
        performance: {
          responseTimeChart: this.generateTimeSeriesData(history.snapshots, 'responseTime'),
          errorRateChart: this.generateTimeSeriesData(history.snapshots, 'errorRate'),
          throughputChart: this.generateTimeSeriesData(history.snapshots, 'throughput')
        }
      };

      return {
        success: true,
        data: dashboardData,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<MonitoringAPIResponse<any>> {
    try {
      const requestId = this.generateRequestId();
      const healthScore = this.performanceCollector.getHealthScore();
      const resilienceHealth = this.resilienceService.getHealthStatus();
      
      return {
        success: true,
        data: {
          application: healthScore,
          resilience: resilienceHealth,
          overall: {
            status: healthScore.overall > 80 ? 'healthy' : 
                   healthScore.overall > 60 ? 'degraded' : 'unhealthy',
            score: healthScore.overall
          }
        },
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get performance analytics
   */
  async getAnalytics(duration: number = 3600000): Promise<MonitoringAPIResponse<any>> {
    try {
      const requestId = this.generateRequestId();
      const analytics = this.performanceCollector.getAnalytics(duration);
      
      return {
        success: true,
        data: analytics,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get alerts
   */
  async getAlerts(includeResolved: boolean = false): Promise<MonitoringAPIResponse<any>> {
    try {
      const requestId = this.generateRequestId();
      const alerts = includeResolved 
        ? this.performanceCollector.getAlertHistory()
        : this.performanceCollector.getActiveAlerts();
      
      return {
        success: true,
        data: { alerts },
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<MonitoringAPIResponse<boolean>> {
    try {
      const requestId = this.generateRequestId();
      const resolved = this.performanceCollector.resolveAlert(alertId);
      
      return {
        success: true,
        data: resolved,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<MonitoringAPIResponse<any>> {
    try {
      const requestId = this.generateRequestId();
      const snapshot = this.performanceCollector.getCurrentSnapshot();
      const circuitBreakerMetrics = CircuitBreakerRegistry.getAllMetrics();
      const retryMetrics = EnhancedRetry.getMetrics();
      
      return {
        success: true,
        data: {
          system: snapshot.system,
          application: snapshot.application,
          services: snapshot.services,
          resilience: snapshot.resilience,
          circuitBreakers: circuitBreakerMetrics,
          retryMetrics
        },
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get performance history
   */
  async getPerformanceHistory(duration: number = 3600000): Promise<MonitoringAPIResponse<any>> {
    try {
      const requestId = this.generateRequestId();
      const history = this.performanceCollector.getHistory(duration);
      
      return {
        success: true,
        data: {
          samples: history.samples.length,
          snapshots: history.snapshots.length,
          metrics: history.metrics.length,
          timeRange: {
            start: Date.now() - duration,
            end: Date.now()
          },
          data: {
            responseTimeChart: this.generateTimeSeriesData(history.snapshots, 'responseTime'),
            errorRateChart: this.generateTimeSeriesData(history.snapshots, 'errorRate'),
            throughputChart: this.generateTimeSeriesData(history.snapshots, 'throughput'),
            samples: history.samples.slice(-100) // Last 100 samples
          }
        },
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Record custom metric
   */
  async recordMetric(metric: {
    name: string;
    type: 'counter' | 'gauge' | 'histogram' | 'timer';
    value: number;
    unit: string;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<MonitoringAPIResponse<boolean>> {
    try {
      const requestId = this.generateRequestId();
      this.performanceCollector.recordMetric(metric);
      
      return {
        success: true,
        data: true,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Start operation timer
   */
  startTimer(operationName: string, tags: Record<string, string> = {}): (success?: boolean, errorType?: string, metadata?: Record<string, any>) => void {
    return this.performanceCollector.startTimer(operationName, tags);
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private formatCircuitBreakerData(metrics: Record<string, any>): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    Object.entries(metrics).forEach(([name, data]) => {
      formatted[name] = {
        state: data.state,
        failureCount: data.failureCount,
        successCount: data.successCount,
        lastFailureTime: data.lastFailureTime,
        failureRate: data.failureRate,
        uptime: data.uptime
      };
    });
    
    return formatted;
  }

  private formatRetryData(metrics: any): Record<string, any> {
    if (typeof metrics === 'object' && metrics !== null) {
      const formatted: Record<string, any> = {};
      
      Object.entries(metrics).forEach(([name, data]: [string, any]) => {
        formatted[name] = {
          totalAttempts: data.totalAttempts || 0,
          successfulAttempts: data.successfulAttempts || 0,
          failedAttempts: data.failedAttempts || 0,
          averageAttempts: data.averageAttempts || 0,
          averageSuccessTime: data.averageSuccessTime || 0
        };
      });
      
      return formatted;
    }
    
    return {};
  }

  private formatQueueData(queues: any): Record<string, any> {
    if (typeof queues === 'object' && queues !== null) {
      const formatted: Record<string, any> = {};
      
      Object.entries(queues).forEach(([name, data]: [string, any]) => {
        formatted[name] = {
          currentSize: data.currentQueueSize || 0,
          runningOperations: data.runningOperations || 0,
          completedOperations: data.completedOperations || 0,
          failedOperations: data.failedOperations || 0,
          throughput: data.throughputPerSecond || 0
        };
      });
      
      return formatted;
    }
    
    return {};
  }

  private generateTimeSeriesData(snapshots: any[], metric: string): Array<{ timestamp: number; value: number }> {
    return snapshots.map(snapshot => {
      let value = 0;
      
      switch (metric) {
        case 'responseTime':
          value = snapshot.application?.averageResponseTime || 0;
          break;
        case 'errorRate':
          value = snapshot.application?.errorRate || 0;
          break;
        case 'throughput':
          value = snapshot.application?.requestsPerSecond || 0;
          break;
        default:
          value = 0;
      }
      
      return {
        timestamp: snapshot.timestamp,
        value
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }
}
