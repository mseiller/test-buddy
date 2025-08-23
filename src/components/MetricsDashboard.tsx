'use client';
import { useEffect, useState } from 'react';
import { getUserMetrics, UserMetrics, migrateTestHistoryToResults, getUserFolders, MetricsFilters } from '@/services/metrics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MetricsDashboardProps {
  userId: string;
}

export default function MetricsDashboard({ userId }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [folders, setFolders] = useState<Array<{id: string, name: string, color?: string}>>([]);
  const [filters, setFilters] = useState<MetricsFilters>({});

  // Load folders on mount
  useEffect(() => {
    (async () => {
      try {
        const folderData = await getUserFolders(userId);
        console.log('Loaded folders for metrics:', folderData);
        setFolders(folderData);
      } catch (err) {
        console.error('Error loading folders:', err);
      }
    })();
  }, [userId]);

  // Load metrics when filters change
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserMetrics(userId, filters);
        setMetrics(data);
      } catch (err) {
        console.error('Error loading metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, filters]);

  const handleMigration = async () => {
    setMigrating(true);
    try {
      const migratedCount = await migrateTestHistoryToResults(userId);
      setMigrationComplete(true);
      
      // Reload metrics after migration
      const data = await getUserMetrics(userId, filters);
      setMetrics(data);
      
      if (migratedCount > 0) {
        alert(`Successfully migrated ${migratedCount} test records to analytics!`);
      } else {
        alert('No additional test records found to migrate.');
      }
    } catch (err) {
      console.error('Migration failed:', err);
      alert('Migration failed. Please try again.');
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600">Loading metrics…</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error || 'No metrics available'}</div>
      </div>
    );
  }

  const chartData = metrics.trend.map((p) => ({
    date: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: p.score
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Learning Analytics</h2>
          
          {!migrationComplete && (
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {migrating ? 'Migrating...' : 'Include Past Tests'}
            </button>
          )}
        </div>
        
        {!migrationComplete && metrics && metrics.quizzesTaken > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-blue-800 text-sm">
              <strong>Note:</strong> This dashboard shows your quiz history including past tests. 
              Click &quot;Include Past Tests&quot; to ensure all your historical data is properly indexed for faster loading.
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={filters.days || 'all'}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  days: e.target.value === 'all' ? undefined : parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="1">Last 24 Hours</option>
                <option value="3">Last 3 Days</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 3 Months</option>
                <option value="180">Last 6 Months</option>
                <option value="365">Last Year</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder
              </label>
              <select
                value={filters.folderId || 'all'}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  folderId: e.target.value === 'all' ? undefined : e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Folders</option>
                <option value="">No Folder</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {(filters.days || filters.folderId) && (
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({})}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            title={filters.days ? `Quizzes (${getTimePeriodLabel(filters.days)})` : "Total Quizzes"} 
            value={metrics.quizzesTakenInPeriod.toString()}
            subtitle={filters.days ? `${metrics.quizzesTaken} total all time` : `${metrics.quizzesTakenInPeriod} in filtered period`}
          />
          <KpiCard 
            title="Average Score" 
            value={`${metrics.avgScore}%`}
            subtitle={`${metrics.avgLast5}% last 5 quizzes`}
          />
          <KpiCard 
            title="Retakes" 
            value={metrics.totalRetakes.toString()}
            subtitle={metrics.retakeCount > 0 ? `${metrics.retakeDelta >= 0 ? '+' : ''}${metrics.retakeDelta} pts avg improvement` : 'No retakes in period'}
            valueColor={metrics.retakeDelta >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <KpiCard 
            title="Recent Trend" 
            value={chartData.length > 1 ? getTrendDirection(chartData) : '—'}
            subtitle={`Last ${Math.min(chartData.length, 10)} quizzes`}
          />
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-medium text-gray-900 mb-4">
            Score Trend ({filters.days ? getTimePeriodLabel(filters.days) : 'Last 10 Quizzes'})
            {filters.folderId && (
              <span className="text-sm text-gray-500 ml-2">
                • {folders.find(f => f.id === filters.folderId)?.name || 'Selected Folder'}
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => [`${value}%`, 'Score']}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {metrics.quizzesTaken === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-800 font-medium mb-2">No quiz data yet</div>
          <div className="text-blue-600">Complete your first quiz to see your learning analytics!</div>
        </div>
      )}
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
}

function KpiCard({ title, value, subtitle, valueColor = 'text-gray-900' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-2xl font-semibold ${valueColor}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function getTrendDirection(data: Array<{ score: number }>): string {
  if (data.length < 2) return '—';
  
  const recent = data.slice(-3); // Last 3 scores
  const older = data.slice(-6, -3); // Previous 3 scores
  
  if (recent.length === 0 || older.length === 0) return '—';
  
  const recentAvg = recent.reduce((a, b) => a + b.score, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b.score, 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  
  if (diff > 5) return '📈 Improving';
  if (diff < -5) return '📉 Declining';
  return '➡️ Stable';
}

function getTimePeriodLabel(days: number): string {
  switch (days) {
    case 1: return 'Last 24 Hours';
    case 3: return 'Last 3 Days';
    case 7: return 'Last 7 Days';
    case 30: return 'Last 30 Days';
    case 90: return 'Last 3 Months';
    case 180: return 'Last 6 Months';
    case 365: return 'Last Year';
    default: return `Last ${days} Days`;
  }
}
