'use client';
import { useEffect, useState } from 'react';
import { getUserMetrics, UserMetrics, migrateTestHistoryToResults } from '@/services/metrics';
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserMetrics(userId);
        setMetrics(data);
      } catch (err) {
        console.error('Error loading metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleMigration = async () => {
    setMigrating(true);
    try {
      const migratedCount = await migrateTestHistoryToResults(userId);
      setMigrationComplete(true);
      
      // Reload metrics after migration
      const data = await getUserMetrics(userId);
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            title="Total Quizzes" 
            value={metrics.quizzesTaken.toString()}
            subtitle={`${metrics.quizzesTaken30} in last 30 days`}
          />
          <KpiCard 
            title="Average Score" 
            value={`${metrics.avgScore}%`}
            subtitle={`${metrics.avgLast5}% last 5 quizzes`}
          />
          <KpiCard 
            title="Retake Improvement" 
            value={`${metrics.retakeDelta >= 0 ? '+' : ''}${metrics.retakeDelta} pts`}
            subtitle="Average improvement"
            valueColor={metrics.retakeDelta >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          <KpiCard 
            title="Recent Trend" 
            value={chartData.length > 1 ? getTrendDirection(chartData) : '—'}
            subtitle="Last 10 quizzes"
          />
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="font-medium text-gray-900 mb-4">Score Trend (Last 10 Quizzes)</div>
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
