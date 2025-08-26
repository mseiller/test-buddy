/**
 * Performance Monitor
 * Monitors and analyzes Firestore query performance
 */

import { QueryOptimizer, QueryStats } from './QueryOptimizer';
import { IndexAnalyzer } from './FirestoreIndexes';

export interface PerformanceMetrics {
  queryCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  slowQueryCount: number;
  errorRate: number;
  totalDataTransferred: number; // in bytes
  mostExpensiveQueries: Array<{
    query: string;
    avgTime: number;
    count: number;
  }>;
}

export interface PerformanceAlert {
  type: 'SLOW_QUERY' | 'HIGH_ERROR_RATE' | 'LOW_CACHE_HIT_RATE' | 'HIGH_DATA_TRANSFER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: number;
}

export class PerformanceMonitor {
  private static alerts: PerformanceAlert[] = [];
  private static readonly MAX_ALERTS = 100;
  
  // Thresholds for alerts
  private static readonly THRESHOLDS = {
    SLOW_QUERY_MS: 2000,
    HIGH_ERROR_RATE: 0.05, // 5%
    LOW_CACHE_HIT_RATE: 0.5, // 50%
    HIGH_DATA_TRANSFER_MB: 10
  };

  /**
   * Get current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    const stats = QueryOptimizer.getStats();
    
    const cacheHitRate = stats.totalQueries > 0 
      ? stats.cacheHits / stats.totalQueries 
      : 0;

    const errorRate = 0; // Would need to track errors separately
    const totalDataTransferred = 0; // Would need to track data size

    // Analyze slow queries to find most expensive
    const queryFrequency = new Map<string, { count: number; totalTime: number }>();
    
    stats.slowQueries.forEach(slowQuery => {
      const existing = queryFrequency.get(slowQuery.query) || { count: 0, totalTime: 0 };
      queryFrequency.set(slowQuery.query, {
        count: existing.count + 1,
        totalTime: existing.totalTime + slowQuery.time
      });
    });

    const mostExpensiveQueries = Array.from(queryFrequency.entries())
      .map(([query, data]) => ({
        query,
        avgTime: data.totalTime / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      queryCount: stats.totalQueries,
      averageResponseTime: stats.averageQueryTime,
      cacheHitRate,
      slowQueryCount: stats.slowQueries.length,
      errorRate,
      totalDataTransferred,
      mostExpensiveQueries
    };
  }

  /**
   * Check for performance issues and generate alerts
   */
  static checkPerformanceAlerts(): PerformanceAlert[] {
    const metrics = this.getMetrics();
    const newAlerts: PerformanceAlert[] = [];

    // Check for slow queries
    if (metrics.averageResponseTime > this.THRESHOLDS.SLOW_QUERY_MS) {
      newAlerts.push({
        type: 'SLOW_QUERY',
        severity: metrics.averageResponseTime > 5000 ? 'CRITICAL' : 'HIGH',
        message: `Average query time is ${Math.round(metrics.averageResponseTime)}ms`,
        details: {
          averageTime: metrics.averageResponseTime,
          threshold: this.THRESHOLDS.SLOW_QUERY_MS,
          slowQueries: metrics.mostExpensiveQueries.slice(0, 3)
        },
        timestamp: Date.now()
      });
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < this.THRESHOLDS.LOW_CACHE_HIT_RATE) {
      newAlerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        severity: metrics.cacheHitRate < 0.3 ? 'HIGH' : 'MEDIUM',
        message: `Cache hit rate is ${Math.round(metrics.cacheHitRate * 100)}%`,
        details: {
          hitRate: metrics.cacheHitRate,
          threshold: this.THRESHOLDS.LOW_CACHE_HIT_RATE,
          totalQueries: metrics.queryCount
        },
        timestamp: Date.now()
      });
    }

    // Check error rate
    if (metrics.errorRate > this.THRESHOLDS.HIGH_ERROR_RATE) {
      newAlerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: metrics.errorRate > 0.1 ? 'CRITICAL' : 'HIGH',
        message: `Error rate is ${Math.round(metrics.errorRate * 100)}%`,
        details: {
          errorRate: metrics.errorRate,
          threshold: this.THRESHOLDS.HIGH_ERROR_RATE
        },
        timestamp: Date.now()
      });
    }

    // Add new alerts to the list
    this.alerts.push(...newAlerts);
    
    // Keep only the most recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    return newAlerts;
  }

  /**
   * Get all alerts
   */
  static getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  static clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Generate performance report
   */
  static generateReport(): {
    summary: PerformanceMetrics;
    recommendations: string[];
    alerts: PerformanceAlert[];
    indexAnalysis: any[];
  } {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.averageResponseTime > 1000) {
      recommendations.push('Consider optimizing slow queries or adding indexes');
    }

    if (metrics.cacheHitRate < 0.7) {
      recommendations.push('Increase cache TTL or review caching strategy');
    }

    if (metrics.slowQueryCount > 10) {
      recommendations.push('Review and optimize the most expensive queries');
    }

    // Add index recommendations
    const indexRecommendations = IndexAnalyzer.getRecommendations();
    recommendations.push(...indexRecommendations.map(rec => rec.recommendation));

    return {
      summary: metrics,
      recommendations,
      alerts,
      indexAnalysis: indexRecommendations
    };
  }

  /**
   * Start performance monitoring
   */
  static startMonitoring(intervalMs: number = 60000): void {
    console.log('Starting performance monitoring...');
    
    setInterval(() => {
      const alerts = this.checkPerformanceAlerts();
      
      if (alerts.length > 0) {
        console.warn('Performance alerts detected:', alerts);
        
        // In a real application, you might want to:
        // - Send alerts to a monitoring service
        // - Log to analytics
        // - Notify administrators
      }
    }, intervalMs);
  }

  /**
   * Log query performance
   */
  static logQueryPerformance(
    queryName: string,
    duration: number,
    dataSize: number,
    fromCache: boolean
  ): void {
    // In a real implementation, this would log to analytics service
    console.log(`Query Performance: ${queryName}`, {
      duration,
      dataSize,
      fromCache,
      timestamp: Date.now()
    });
  }

  /**
   * Get performance insights
   */
  static getInsights(): {
    topBottlenecks: string[];
    optimizationOpportunities: string[];
    healthScore: number;
  } {
    const metrics = this.getMetrics();
    const topBottlenecks: string[] = [];
    const optimizationOpportunities: string[] = [];

    // Identify bottlenecks
    if (metrics.averageResponseTime > 2000) {
      topBottlenecks.push('Slow query performance');
    }
    
    if (metrics.cacheHitRate < 0.5) {
      topBottlenecks.push('Low cache efficiency');
    }

    // Identify optimization opportunities
    if (metrics.mostExpensiveQueries.length > 0) {
      optimizationOpportunities.push('Optimize most expensive queries');
    }

    if (metrics.cacheHitRate < 0.8) {
      optimizationOpportunities.push('Improve caching strategy');
    }

    // Calculate health score (0-100)
    let healthScore = 100;
    
    // Deduct points for issues
    if (metrics.averageResponseTime > 1000) healthScore -= 20;
    if (metrics.averageResponseTime > 2000) healthScore -= 20;
    if (metrics.cacheHitRate < 0.7) healthScore -= 15;
    if (metrics.cacheHitRate < 0.5) healthScore -= 15;
    if (metrics.slowQueryCount > 5) healthScore -= 10;
    if (metrics.errorRate > 0.02) healthScore -= 20;

    healthScore = Math.max(0, healthScore);

    return {
      topBottlenecks,
      optimizationOpportunities,
      healthScore
    };
  }

  /**
   * Export performance data for analysis
   */
  static exportData(): {
    metrics: PerformanceMetrics;
    queryStats: QueryStats;
    alerts: PerformanceAlert[];
    timestamp: number;
  } {
    return {
      metrics: this.getMetrics(),
      queryStats: QueryOptimizer.getStats(),
      alerts: this.getAlerts(),
      timestamp: Date.now()
    };
  }
}
