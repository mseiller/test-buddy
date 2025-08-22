'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { FolderList } from '@/components/FolderList';
import { FirebaseService } from '@/services/firebaseService';
import { TestHistory as TestHistoryType } from '@/types';
import { ArrowLeft, Clock, FileText, Eye, RotateCcw } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useAuth();
  const { folders } = useFolders();
  const router = useRouter();
  const [tests, setTests] = useState<TestHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const loadTests = async () => {
        try {
          setLoading(true);
          setError(null);
          const userTests = await FirebaseService.getUserTestHistory(user.uid);
          setTests(userTests);
        } catch (err) {
          console.error('Failed to load test history:', err);
          setError('Failed to load test history');
        } finally {
          setLoading(false);
        }
      };
      
      loadTests();
    }
  }, [user]);

  if (!user) {
    router.push('/');
    return null;
  }

  const handleViewTest = (test: TestHistoryType) => {
    // TODO: Implement test review functionality
    console.log('View test:', test);
  };

  const handleRetakeTest = (test: TestHistoryType) => {
    // TODO: Implement retake functionality
    console.log('Retake test:', test);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatScore = (score: number | undefined) => {
    return score ? score.toFixed(1) : 'N/A';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <FolderList />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push('/')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Test History</h1>
            </div>
            <p className="text-gray-600">
              Review your quiz history and retake tests
            </p>
          </div>

          {/* Content */}
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tests yet</h3>
              <p className="text-gray-500 mb-6">
                Upload your first document to generate a quiz
              </p>
              <button
                onClick={() => router.push('/upload')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={test.id || index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{test.testName}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {test.fileName}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(test.createdAt)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {test.quizType}
                        </span>
                        <span className="font-medium text-gray-900">
                          Score: {formatScore(test.score)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewTest(test)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </button>
                      <button
                        onClick={() => handleRetakeTest(test)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retake
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
