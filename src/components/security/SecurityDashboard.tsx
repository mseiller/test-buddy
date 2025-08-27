'use client';

import { useState, useEffect } from 'react';
import { SecurityService } from '@/services/security/SecurityService';
import { Shield, AlertTriangle, Eye, Lock, Activity, Users, Clock, TrendingUp } from 'lucide-react';

interface SecurityStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  blockedUsers: number;
  rateLimitViolations: number;
}

interface SecurityEvent {
  timestamp: Date;
  userId?: string;
  eventType: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would fetch from an API endpoint
      const securityService = SecurityService.getInstance();
      const securityStats = securityService.getSecurityStats();
      
      setStats(securityStats);
      
      // Mock recent events for demonstration
      const mockEvents: SecurityEvent[] = [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          userId: 'user123',
          eventType: 'auth_success',
          details: { email: 'user@example.com', provider: 'password' },
          severity: 'low'
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          userId: 'user456',
          eventType: 'rate_limit_exceeded',
          details: { endpoint: '/api/quiz', requests: 150 },
          severity: 'medium'
        },
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          userId: 'user789',
          eventType: 'suspicious_activity',
          details: { action: 'file_upload', count: 25, threshold: 10 },
          severity: 'high'
        }
      ];
      
      setRecentEvents(mockEvents);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_success': return <Lock className="w-4 h-4" />;
      case 'auth_failure': return <AlertTriangle className="w-4 h-4" />;
      case 'rate_limit_exceeded': return <Clock className="w-4 h-4" />;
      case 'suspicious_activity': return <AlertTriangle className="w-4 h-4" />;
      case 'file_upload': return <Eye className="w-4 h-4" />;
      case 'api_request': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={`security-skeleton-${i}`} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600">Monitor security events and system health</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Security Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12% from last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rate Limit Violations</p>
                <p className="text-2xl font-bold text-orange-600">{stats.rateLimitViolations}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+5% from last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked Users</p>
                <p className="text-2xl font-bold text-red-600">{stats.blockedUsers}</p>
              </div>
              <Users className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>No change from last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Severity Events</p>
                <p className="text-2xl font-bold text-red-600">
                  {(stats.eventsBySeverity.high || 0) + (stats.eventsBySeverity.critical || 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <span>-3% from last period</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Type Distribution */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.eventsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Severity</h3>
            <div className="space-y-3">
              {Object.entries(stats.eventsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity).split(' ')[0]}`}></div>
                    <span className="text-sm text-gray-600 capitalize">{severity}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Security Events */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentEvents.length > 0 ? (
            recentEvents.map((event, index) => (
              <div key={`event-${event.eventType}-${index}`} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(event.severity)}`}>
                      {getEventTypeIcon(event.eventType)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {event.eventType.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {event.userId ? `User: ${event.userId}` : 'System Event'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{formatTimestamp(event.timestamp)}</p>
                    <p className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </p>
                  </div>
                </div>
                {Object.keys(event.details).length > 0 && (
                  <div className="mt-3 pl-11">
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-900">View Details</summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No security events in the selected timeframe</p>
            </div>
          )}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Security Recommendations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Enable two-factor authentication for all user accounts</li>
              <li>• Review and update security rules regularly</li>
              <li>• Monitor for unusual activity patterns</li>
              <li>• Keep all dependencies updated to latest secure versions</li>
              <li>• Implement automated security scanning in CI/CD pipeline</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
