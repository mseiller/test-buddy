/**
 * Performance Data Collector
 * Centralized system for collecting, aggregating, and analyzing performance metrics
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceSample {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorType?: string;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceSnapshot {
  timestamp: number;
  system: {
    cpu: number;
    memory: number;
    connections: number;
    activeOperations: number;
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    successRate: number;
  };
  services: Record<string, {
    availability: number;
    responseTime: number;
    errorCount: number;
    throughput: number;
  }>;
  resilience: {
    circuitBreakerStates: Record<string, string>;
    retrySuccessRate: number;
    queueUtilization: number;
    transactionSuccessRate: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // e.g., "errorRate > 0.05"
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number; // milliseconds
  enabled: boolean;
  lastTriggered?: number;
  actions: Array<{
    type: 'email' | 'webhook' | 'log';
    target: string;
    template?: string;
  }>;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export class PerformanceCollector {
  private static instance: PerformanceCollector;
  private metrics = new Map<string, PerformanceMetric>();
  private samples: PerformanceSample[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private isCollecting = false;
  private collectionInterval: NodeJS.Timeout | null = null;
  private readonly maxSamples = 10000;
  private readonly maxSnapshots = 1000;
  private readonly maxAlerts = 500;

  private constructor() {
    this.initializeDefaultRules();
    this.startCollection();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector();
    }
    return PerformanceCollector.instance;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const id = this.generateMetricId(metric.name, metric.tags);
    const fullMetric: PerformanceMetric = {
      id,
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.set(id, fullMetric);

    // Cleanup old metrics
    if (this.metrics.size > this.maxSamples) {
      const oldestKeys = Array.from(this.metrics.keys())
        .sort((a, b) => this.metrics.get(a)!.timestamp - this.metrics.get(b)!.timestamp)
        .slice(0, Math.floor(this.maxSamples * 0.1));
      
      oldestKeys.forEach(key => this.metrics.delete(key));
    }
  }

  /**
   * Record a performance sample
   */
  recordSample(sample: PerformanceSample): void {
    this.samples.push(sample);

    // Cleanup old samples
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-Math.floor(this.maxSamples * 0.9));
    }

    // Check alert rules
    this.checkAlertRules(sample);
  }

  /**
   * Start an operation timer
   */
  startTimer(operationName: string, tags: Record<string, string> = {}): (success?: boolean, errorType?: string, metadata?: Record<string, any>) => void {
    const startTime = Date.now();
    
    return (success: boolean = true, errorType?: string, metadata?: Record<string, any>) => {
      const endTime = Date.now();
      const sample: PerformanceSample = {
        operationName,
        startTime,
        endTime,
        duration: endTime - startTime,
        success,
        errorType,
        tags,
        metadata
      };
      
      this.recordSample(sample);
    };
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): PerformanceSnapshot {
    const now = Date.now();
    const recentSamples = this.samples.filter(s => now - s.endTime < 60000); // Last minute
    
    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      system: this.getSystemMetrics(),
      application: this.getApplicationMetrics(recentSamples),
      services: this.getServiceMetrics(recentSamples),
      resilience: this.getResilienceMetrics()
    };

    this.snapshots.push(snapshot);

    // Cleanup old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-Math.floor(this.maxSnapshots * 0.9));
    }

    return snapshot;
  }

  /**
   * Get performance history
   */
  getHistory(duration: number = 3600000): {
    samples: PerformanceSample[];
    snapshots: PerformanceSnapshot[];
    metrics: PerformanceMetric[];
  } {
    const cutoff = Date.now() - duration;
    
    return {
      samples: this.samples.filter(s => s.endTime > cutoff),
      snapshots: this.snapshots.filter(s => s.timestamp > cutoff),
      metrics: Array.from(this.metrics.values()).filter(m => m.timestamp > cutoff)
    };
  }

  /**
   * Get performance analytics
   */
  getAnalytics(duration: number = 3600000): {
    overview: {
      totalOperations: number;
      successRate: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      errorRate: number;
    };
    trends: {
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      errorRateTrend: 'improving' | 'stable' | 'degrading';
      throughputTrend: 'increasing' | 'stable' | 'decreasing';
    };
    topErrors: Array<{ type: string; count: number; percentage: number }>;
    slowestOperations: Array<{ name: string; averageTime: number; count: number }>;
    recommendations: string[];
  } {
    const cutoff = Date.now() - duration;
    const samples = this.samples.filter(s => s.endTime > cutoff);
    
    if (samples.length === 0) {
      return this.getEmptyAnalytics();
    }

    const durations = samples.map(s => s.duration).sort((a, b) => a - b);
    const successfulSamples = samples.filter(s => s.success);
    const errorSamples = samples.filter(s => !s.success);

    const overview = {
      totalOperations: samples.length,
      successRate: successfulSamples.length / samples.length,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
      errorRate: errorSamples.length / samples.length
    };

    const trends = this.calculateTrends(samples);
    const topErrors = this.getTopErrors(errorSamples);
    const slowestOperations = this.getSlowestOperations(samples);
    const recommendations = this.generateRecommendations(overview, trends);

    return {
      overview,
      trends,
      topErrors,
      slowestOperations,
      recommendations
    };
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = this.generateAlertRuleId(rule.name);
    const fullRule: AlertRule = { id, ...rule };
    
    this.alertRules.push(fullRule);
    return id;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get alert history
   */
  getAlertHistory(duration: number = 86400000): Alert[] {
    const cutoff = Date.now() - duration;
    return this.alerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get health score (0-100)
   */
  getHealthScore(): {
    overall: number;
    breakdown: {
      performance: number;
      reliability: number;
      availability: number;
      errors: number;
    };
    factors: Array<{ name: string; impact: number; description: string }>;
  } {
    const analytics = this.getAnalytics();
    const activeAlerts = this.getActiveAlerts();
    
    let performance = 100;
    let reliability = 100;
    let availability = 100;
    let errors = 100;
    
    const factors: Array<{ name: string; impact: number; description: string }> = [];

    // Performance scoring
    if (analytics.overview.averageResponseTime > 5000) {
      const impact = Math.min(30, (analytics.overview.averageResponseTime - 5000) / 1000 * 5);
      performance -= impact;
      factors.push({
        name: 'Slow Response Time',
        impact,
        description: `Average response time is ${analytics.overview.averageResponseTime}ms`
      });
    }

    // Reliability scoring
    if (analytics.overview.successRate < 0.99) {
      const impact = (0.99 - analytics.overview.successRate) * 100;
      reliability -= impact;
      factors.push({
        name: 'Low Success Rate',
        impact,
        description: `Success rate is ${(analytics.overview.successRate * 100).toFixed(2)}%`
      });
    }

    // Error scoring
    if (analytics.overview.errorRate > 0.01) {
      const impact = Math.min(40, analytics.overview.errorRate * 1000);
      errors -= impact;
      factors.push({
        name: 'High Error Rate',
        impact,
        description: `Error rate is ${(analytics.overview.errorRate * 100).toFixed(2)}%`
      });
    }

    // Alert impact
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0) {
      const impact = criticalAlerts * 15;
      availability -= impact;
      factors.push({
        name: 'Critical Alerts',
        impact,
        description: `${criticalAlerts} critical alerts active`
      });
    }
    
    if (highAlerts > 0) {
      const impact = highAlerts * 8;
      availability -= impact;
      factors.push({
        name: 'High Priority Alerts',
        impact,
        description: `${highAlerts} high priority alerts active`
      });
    }

    const overall = Math.max(0, Math.min(100, (performance + reliability + availability + errors) / 4));

    return {
      overall: Math.round(overall),
      breakdown: {
        performance: Math.max(0, Math.round(performance)),
        reliability: Math.max(0, Math.round(reliability)),
        availability: Math.max(0, Math.round(availability)),
        errors: Math.max(0, Math.round(errors))
      },
      factors
    };
  }

  /**
   * Start performance collection
   */
  private startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    this.collectionInterval = setInterval(() => {
      this.getCurrentSnapshot();
    }, 30000); // Collect snapshot every 30 seconds

    console.log('Performance collection started');
  }

  /**
   * Stop performance collection
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    console.log('Performance collection stopped');
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private initializeDefaultRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        condition: 'errorRate > 0.05',
        severity: 'high',
        cooldownPeriod: 300000, // 5 minutes
        enabled: true,
        actions: [{ type: 'log', target: 'console' }]
      },
      {
        name: 'Slow Response Time',
        condition: 'averageResponseTime > 10000',
        severity: 'medium',
        cooldownPeriod: 300000,
        enabled: true,
        actions: [{ type: 'log', target: 'console' }]
      },
      {
        name: 'Critical System Failure',
        condition: 'successRate < 0.5',
        severity: 'critical',
        cooldownPeriod: 60000, // 1 minute
        enabled: true,
        actions: [{ type: 'log', target: 'console' }]
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  private generateMetricId(name: string, tags?: Record<string, string>): string {
    const tagString = tags ? Object.entries(tags).sort().map(([k, v]) => `${k}=${v}`).join(',') : '';
    return `${name}${tagString ? `[${tagString}]` : ''}_${Date.now()}`;
  }

  private generateAlertRuleId(name: string): string {
    return `rule_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }

  private getSystemMetrics(): PerformanceSnapshot['system'] {
    // In a real implementation, these would come from system monitoring
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      connections: Math.floor(Math.random() * 1000),
      activeOperations: this.samples.filter(s => Date.now() - s.startTime < 30000).length
    };
  }

  private getApplicationMetrics(samples: PerformanceSample[]): PerformanceSnapshot['application'] {
    if (samples.length === 0) {
      return { requestsPerSecond: 0, averageResponseTime: 0, errorRate: 0, successRate: 1 };
    }

    const duration = 60; // 1 minute
    const successfulSamples = samples.filter(s => s.success);

    return {
      requestsPerSecond: samples.length / duration,
      averageResponseTime: samples.reduce((sum, s) => sum + s.duration, 0) / samples.length,
      errorRate: (samples.length - successfulSamples.length) / samples.length,
      successRate: successfulSamples.length / samples.length
    };
  }

  private getServiceMetrics(samples: PerformanceSample[]): PerformanceSnapshot['services'] {
    const services: Record<string, PerformanceSample[]> = {};
    
    samples.forEach(sample => {
      const serviceName = sample.tags.service || 'unknown';
      if (!services[serviceName]) {
        services[serviceName] = [];
      }
      services[serviceName].push(sample);
    });

    const result: PerformanceSnapshot['services'] = {};
    
    Object.entries(services).forEach(([name, serviceSamples]) => {
      const successful = serviceSamples.filter(s => s.success);
      const errors = serviceSamples.filter(s => !s.success);
      
      result[name] = {
        availability: successful.length / serviceSamples.length,
        responseTime: serviceSamples.reduce((sum, s) => sum + s.duration, 0) / serviceSamples.length,
        errorCount: errors.length,
        throughput: serviceSamples.length / 60 // per minute
      };
    });

    return result;
  }

  private getResilienceMetrics(): PerformanceSnapshot['resilience'] {
    // In a real implementation, these would come from resilience services
    return {
      circuitBreakerStates: {
        'openrouter': 'CLOSED',
        'firebase': 'CLOSED',
        'ocr': 'CLOSED'
      },
      retrySuccessRate: 0.95,
      queueUtilization: 0.3,
      transactionSuccessRate: 0.99
    };
  }

  private checkAlertRules(sample: PerformanceSample): void {
    // Simplified alert rule evaluation
    const now = Date.now();
    const recentSamples = this.samples.filter(s => now - s.endTime < 300000); // Last 5 minutes
    
    if (recentSamples.length === 0) return;

    const errorRate = recentSamples.filter(s => !s.success).length / recentSamples.length;
    const avgResponseTime = recentSamples.reduce((sum, s) => sum + s.duration, 0) / recentSamples.length;
    const successRate = recentSamples.filter(s => s.success).length / recentSamples.length;

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldownPeriod) return;

      let shouldTrigger = false;
      let message = '';

      switch (rule.condition) {
        case 'errorRate > 0.05':
          shouldTrigger = errorRate > 0.05;
          message = `Error rate is ${(errorRate * 100).toFixed(2)}%`;
          break;
        case 'averageResponseTime > 10000':
          shouldTrigger = avgResponseTime > 10000;
          message = `Average response time is ${avgResponseTime.toFixed(0)}ms`;
          break;
        case 'successRate < 0.5':
          shouldTrigger = successRate < 0.5;
          message = `Success rate is ${(successRate * 100).toFixed(2)}%`;
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(rule, message);
      }
    });
  }

  private triggerAlert(rule: AlertRule, message: string): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata: { rule: rule.name, condition: rule.condition }
    };

    this.alerts.push(alert);
    rule.lastTriggered = Date.now();

    // Execute actions
    rule.actions.forEach(action => {
      if (action.type === 'log') {
        console.warn(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name} - ${message}`);
      }
    });

    // Cleanup old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-Math.floor(this.maxAlerts * 0.9));
    }
  }

  private calculateTrends(samples: PerformanceSample[]): {
    responseTimeTrend: 'improving' | 'stable' | 'degrading';
    errorRateTrend: 'improving' | 'stable' | 'degrading';
    throughputTrend: 'increasing' | 'stable' | 'decreasing';
  } {
    // Simplified trend calculation
    const midpoint = Math.floor(samples.length / 2);
    const firstHalf = samples.slice(0, midpoint);
    const secondHalf = samples.slice(midpoint);

    const firstHalfAvgTime = firstHalf.reduce((sum, s) => sum + s.duration, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, s) => sum + s.duration, 0) / secondHalf.length;

    const firstHalfErrorRate = firstHalf.filter(s => !s.success).length / firstHalf.length;
    const secondHalfErrorRate = secondHalf.filter(s => !s.success).length / secondHalf.length;

    const responseTimeTrend = secondHalfAvgTime < firstHalfAvgTime * 0.95 ? 'improving' :
                             secondHalfAvgTime > firstHalfAvgTime * 1.05 ? 'degrading' : 'stable';

    const errorRateTrend = secondHalfErrorRate < firstHalfErrorRate * 0.9 ? 'improving' :
                          secondHalfErrorRate > firstHalfErrorRate * 1.1 ? 'degrading' : 'stable';

    const throughputTrend = secondHalf.length > firstHalf.length * 1.1 ? 'increasing' :
                           secondHalf.length < firstHalf.length * 0.9 ? 'decreasing' : 'stable';

    return { responseTimeTrend, errorRateTrend, throughputTrend };
  }

  private getTopErrors(errorSamples: PerformanceSample[]): Array<{ type: string; count: number; percentage: number }> {
    const errorCounts = new Map<string, number>();
    
    errorSamples.forEach(sample => {
      const errorType = sample.errorType || 'unknown';
      errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: count / errorSamples.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getSlowestOperations(samples: PerformanceSample[]): Array<{ name: string; averageTime: number; count: number }> {
    const operationStats = new Map<string, { totalTime: number; count: number }>();
    
    samples.forEach(sample => {
      const current = operationStats.get(sample.operationName) || { totalTime: 0, count: 0 };
      operationStats.set(sample.operationName, {
        totalTime: current.totalTime + sample.duration,
        count: current.count + 1
      });
    });

    return Array.from(operationStats.entries())
      .map(([name, stats]) => ({
        name,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
  }

  private generateRecommendations(overview: any, trends: any): string[] {
    const recommendations: string[] = [];

    if (overview.errorRate > 0.02) {
      recommendations.push('Consider implementing additional error handling and retry logic');
    }

    if (overview.averageResponseTime > 5000) {
      recommendations.push('Optimize slow operations and consider caching frequently accessed data');
    }

    if (trends.responseTimeTrend === 'degrading') {
      recommendations.push('Response times are trending worse - investigate recent changes');
    }

    if (trends.errorRateTrend === 'degrading') {
      recommendations.push('Error rates are increasing - check for system issues or recent deployments');
    }

    if (overview.p99ResponseTime > overview.averageResponseTime * 3) {
      recommendations.push('High P99 response times indicate outliers - investigate worst-case scenarios');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring');
    }

    return recommendations;
  }

  private getEmptyAnalytics(): any {
    return {
      overview: {
        totalOperations: 0,
        successRate: 1,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0
      },
      trends: {
        responseTimeTrend: 'stable' as const,
        errorRateTrend: 'stable' as const,
        throughputTrend: 'stable' as const
      },
      topErrors: [],
      slowestOperations: [],
      recommendations: ['No data available - start generating metrics']
    };
  }
}
