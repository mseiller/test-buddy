'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Play,
  BarChart3,
  Database,
  Code,
  Settings
} from 'lucide-react';

interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: 'query' | 'cache' | 'index' | 'general';
  actions: OptimizationAction[];
  estimatedImprovement: number;
}

interface OptimizationAction {
  type: 'query_optimization' | 'cache_strategy' | 'index_creation' | 'code_refactor';
  description: string;
  implementation: string;
  rollback?: string;
}

interface PerformanceAnalysis {
  bottlenecks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    impact: string;
    recommendations: string[];
  }>;
  optimizationStrategies: OptimizationStrategy[];
  priorityOrder: string[];
  estimatedOverallImprovement: number;
}

export default function OptimizationRecommendations() {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingOptimization, setApplyingOptimization] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Array<{
    strategyId: string;
    success: boolean;
    improvement: number;
    message: string;
    timestamp: Date;
  }>>([]);

  // Fetch optimization analysis
  const fetchAnalysis = async () => {
    try {
      const response = await fetch('/api/monitoring/optimization/analyze');
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to fetch optimization analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply optimization strategy
  const applyOptimization = async (strategyId: string) => {
    setApplyingOptimization(strategyId);
    try {
      const response = await fetch('/api/monitoring/optimization/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId })
      });

      if (response.ok) {
        const result = await response.json();
        setOptimizationResults(prev => [...prev, {
          ...result,
          timestamp: new Date()
        }]);
        
        // Refresh analysis after optimization
        setTimeout(fetchAnalysis, 2000);
      }
    } catch (error) {
      console.error('Failed to apply optimization:', error);
      setOptimizationResults(prev => [...prev, {
        strategyId,
        success: false,
        improvement: 0,
        message: 'Failed to apply optimization',
        timestamp: new Date()
      }]);
    } finally {
      setApplyingOptimization(null);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get effort color
  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'query': return <Database className="h-4 w-4" />;
      case 'cache': return <Settings className="h-4 w-4" />;
      case 'index': return <BarChart3 className="h-4 w-4" />;
      case 'general': return <Code className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={`skeleton-${i}`} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Failed to load optimization recommendations</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-6 w-6 text-yellow-600" />
          <h2 className="text-xl font-semibold text-gray-900">Optimization Recommendations</h2>
        </div>
        <button
          onClick={fetchAnalysis}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Refresh Analysis
        </button>
      </div>

      {/* Overall Improvement Estimate */}
      {analysis.estimatedOverallImprovement > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Potential Performance Improvement</h3>
              <p className="text-blue-700">
                Applying all optimizations could improve performance by up to{' '}
                <span className="font-bold">{analysis.estimatedOverallImprovement.toFixed(1)}%</span>
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      )}

      {/* Bottlenecks Summary */}
      {analysis.bottlenecks.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Identified Bottlenecks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.bottlenecks.map((bottleneck, index) => (
              <div
                key={`bottleneck-${bottleneck.type}-${index}`}
                className={`p-4 rounded-lg border-l-4 ${
                  bottleneck.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                  bottleneck.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-green-500 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{bottleneck.type.replace(/_/g, ' ').toUpperCase()}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    bottleneck.severity === 'high' ? 'bg-red-100 text-red-800' :
                    bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {bottleneck.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{bottleneck.description}</p>
                <p className="text-xs text-gray-600">{bottleneck.impact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Optimization Strategies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Optimizations</h3>
        {analysis.optimizationStrategies.length > 0 ? (
          analysis.optimizationStrategies.map((strategy) => {
            const isApplying = applyingOptimization === strategy.id;
            const result = optimizationResults.find(r => r.strategyId === strategy.id);
            
            return (
              <Card key={strategy.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getCategoryIcon(strategy.category)}
                      <h4 className="text-lg font-semibold text-gray-900">{strategy.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(strategy.impact)}`}>
                        {strategy.impact} impact
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEffortColor(strategy.effort)}`}>
                        {strategy.effort} effort
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{strategy.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center space-x-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>~{strategy.estimatedImprovement}% improvement</span>
                      </span>
                      <span className="text-gray-500">
                        Priority: {analysis.priorityOrder.indexOf(strategy.id) + 1}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {!result ? (
                      <button
                        onClick={() => applyOptimization(strategy.id)}
                        disabled={isApplying}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          isApplying
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isApplying ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Applying...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Play className="h-4 w-4" />
                            <span>Apply</span>
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>+{result.improvement.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Failed</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Strategy Actions */}
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Actions to be performed:</h5>
                  <div className="space-y-2">
                    {strategy.actions.map((action, actionIndex) => (
                      <div key={`${strategy.id}-action-${actionIndex}`} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Target className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{action.description}</p>
                          <p className="text-xs text-gray-600 mt-1">{action.implementation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result Message */}
                {result && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied at {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <Card className="p-6">
            <div className="text-center text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p>No optimization recommendations</p>
              <p className="text-sm">Performance is already optimal</p>
            </div>
          </Card>
        )}
      </div>

      {/* Optimization History */}
      {optimizationResults.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Optimizations</h3>
          <div className="space-y-3">
            {optimizationResults.slice(-5).reverse().map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
                {result.success && (
                  <span className="text-sm font-medium text-green-600">
                    +{result.improvement.toFixed(1)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
