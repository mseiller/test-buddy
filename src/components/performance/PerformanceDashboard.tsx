'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Zap,
  BarChart3,
  Gauge,
  Target,
  Lightbulb
} from 'lucide-react';

interface PerformanceMetrics {
  queryCount: number;
  averageResponseTime: number;
  cacheHitRate: number;
  slowQueryCount: number;
  errorRate: number;
  totalDataTransferred: number;
  mostExpensiveQueries: Array<{
    query: string;
    avgTime: number;
    count: number;
  }>;
}

interface PerformanceInsights {
  topBottlenecks: string[];
  optimizationOpportunities: string[];
  healthScore: number;
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  details?: any;
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      const [metricsResponse, insightsResponse, alertsResponse] = await Promise.all([
        fetch('/api/monitoring/metrics?type=system'),
        fetch('/api/monitoring/health'),
        fetch('/api/monitoring/alerts')
      ]);

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.insights);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch performance data');
      console.error('Performance dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchPerformanceData();

    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 30000);
      return () => clearInterval(interval);
    }
    
    // Return empty cleanup function when autoRefresh is false
    return () => {};
  }, [autoRefresh]);

  // Get health score color
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get health score icon
  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  // Get response time color
  const getResponseTimeColor = (time: number) => {
    if (time < 1000) return 'text-green-600';
    if (time < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get cache hit rate color
  const getCacheHitRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={`metric-skeleton-${i}`} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={`chart-skeleton-${i}`} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-6">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Performance Dashboard Error</h2>
          </div>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={fetchPerformanceData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* System Health Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className={`text-2xl font-bold ${getHealthScoreColor(insights?.healthScore || 0)}`}>
                  {insights?.healthScore || 0}%
                </p>
              </div>
              {getHealthScoreIcon(insights?.healthScore || 0)}
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (insights?.healthScore || 0) >= 80 ? 'bg-green-600' :
                    (insights?.healthScore || 0) >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${insights?.healthScore || 0}%` }}
                ></div>
              </div>
            </div>
          </Card>

          {/* Average Response Time */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className={`text-2xl font-bold ${getResponseTimeColor(metrics.averageResponseTime)}`}>
                  {metrics.averageResponseTime.toFixed(0)}ms
                </p>
              </div>
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {metrics.queryCount} queries tracked
              </p>
            </div>
          </Card>

          {/* Cache Hit Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className={`text-2xl font-bold ${getCacheHitRateColor(metrics.cacheHitRate)}`}>
                  {(metrics.cacheHitRate * 100).toFixed(1)}%
                </p>
              </div>
              <Database className="h-6 w-6 text-gray-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {metrics.cacheHitRate >= 0.8 ? 'Excellent' : 
                 metrics.cacheHitRate >= 0.5 ? 'Good' : 'Needs improvement'}
              </p>
            </div>
          </Card>

          {/* Slow Queries */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Slow Queries</p>
                <p className={`text-2xl font-bold ${metrics.slowQueryCount > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.slowQueryCount}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-gray-400" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {metrics.slowQueryCount > 5 ? 'Action needed' : 'Within limits'}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Alerts */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Performance Alerts</h2>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert, index) => (
                <div
                  key={`alert-${alert.type}-${index}`}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'error' ? 'border-l-red-500 bg-red-50' :
                    alert.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p>No performance alerts</p>
              <p className="text-sm">System is running smoothly</p>
            </div>
          )}
        </Card>

        {/* Optimization Recommendations */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Optimization Opportunities</h2>
          </div>
          {insights?.optimizationOpportunities && insights.optimizationOpportunities.length > 0 ? (
            <div className="space-y-3">
              {insights.optimizationOpportunities.map((opportunity, index) => (
                <div key={`opportunity-${index}`} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{opportunity}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p>No optimization opportunities</p>
              <p className="text-sm">Performance is optimal</p>
            </div>
          )}
        </Card>

        {/* Most Expensive Queries */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Most Expensive Queries</h2>
          </div>
          {metrics?.mostExpensiveQueries && metrics.mostExpensiveQueries.length > 0 ? (
            <div className="space-y-3">
              {metrics.mostExpensiveQueries.slice(0, 5).map((query, index) => (
                <div key={`query-${query.avgTime}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Query {index + 1}
                    </span>
                    <span className="text-sm text-red-600 font-medium">
                      {query.avgTime.toFixed(0)}ms avg
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{query.query}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Executed {query.count} times
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Gauge className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p>No expensive queries detected</p>
              <p className="text-sm">All queries are performing well</p>
            </div>
          )}
        </Card>

        {/* Performance Trends */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Performance Trends</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Time</span>
              <div className="flex items-center space-x-2">
                {metrics && metrics.averageResponseTime < 1000 ? (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  metrics && metrics.averageResponseTime < 1000 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics && metrics.averageResponseTime < 1000 ? 'Improving' : 'Degrading'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cache Efficiency</span>
              <div className="flex items-center space-x-2">
                {metrics && metrics.cacheHitRate >= 0.8 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                )}
                <span className={`text-sm font-medium ${
                  metrics && metrics.cacheHitRate >= 0.8 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {metrics && metrics.cacheHitRate >= 0.8 ? 'Optimal' : 'Needs attention'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <div className="flex items-center space-x-2">
                {metrics && metrics.errorRate < 0.02 ? (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  metrics && metrics.errorRate < 0.02 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(metrics?.errorRate || 0) * 100}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
