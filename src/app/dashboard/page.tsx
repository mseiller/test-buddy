'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { FolderList } from '@/components/FolderList';
import { FolderIcon, BookOpen, TrendingUp, History, Upload } from 'lucide-react';
import { FirebaseService } from '@/services/firebaseService';
import { TestHistory as TestHistoryType } from '@/types';

export default function DashboardHome() {
  const { user, loading } = useAuth();
  const { folders } = useFolders();
  const router = useRouter();
  const [existingTests, setExistingTests] = useState<TestHistoryType[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  // Load existing test history when user is available
  useEffect(() => {
    if (user) {
      const loadExistingTests = async () => {
        try {
          setLoadingTests(true);
          const tests = await FirebaseService.getUserTestHistory(user.uid);
          setExistingTests(tests);
        } catch (error) {
          console.error('Failed to load existing tests:', error);
        } finally {
          setLoadingTests(false);
        }
      };
      
      loadExistingTests();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const totalTests = folders.reduce((sum, folder) => sum + folder.testCount, 0);
  const recentFolders = folders.slice(0, 3);

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.displayName || 'User'}!
            </h1>
            <p className="text-gray-600">
              Organize your study materials and create effective quizzes
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <FolderIcon className="h-8 w-8 text-indigo-500" />
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{folders.length}</p>
                  <p className="text-sm text-gray-600">Folders</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{totalTests}</p>
                  <p className="text-sm text-gray-600">Total Tests</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {folders.length > 0 ? Math.round(totalTests / folders.length) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Avg Tests/Folder</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Folders */}
          {recentFolders.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Folders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => router.push(`/folder/${folder.id}`)}
                    className="bg-white rounded-lg border border-gray-200 p-6 text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <FolderIcon className={`h-6 w-6 ${
                        folder.color ? `text-${folder.color}-500` : 'text-gray-500'
                      }`} />
                      <h3 className="ml-3 text-lg font-medium text-gray-900 truncate">
                        {folder.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{folder.testCount} tests</span>
                      <span>Updated {new Date(folder.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No folders yet</h3>
              <p className="text-gray-500 mb-6">
                Create your first folder to start organizing your tests
              </p>
              <p className="text-sm text-gray-400">
                Use the sidebar to create a new folder and upload your study materials
              </p>
            </div>
          )}

          {/* Existing Tests Section */}
          {existingTests.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Your Existing Tests</h2>
                <span className="text-sm text-gray-500">{existingTests.length} test{existingTests.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {existingTests.slice(0, 5).map((test, index) => (
                    <div key={test.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{test.testName}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {test.fileName} • {test.quizType} • {test.score?.toFixed(1)}% • {new Date(test.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => router.push(`/quiz/${test.id || index}`)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => router.push(`/retake/${test.id || index}`)}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {existingTests.length > 5 && (
                  <div className="px-4 py-3 bg-gray-50 text-center">
                    <button
                      onClick={() => router.push('/history')}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View all {existingTests.length} tests →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-indigo-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-indigo-900 mb-3">Quick Start</h2>
            <div className="space-y-2 text-sm text-indigo-700">
              <p>• Create folders for different subjects or classes</p>
              <p>• Upload PDFs, Word docs, or text files to generate quizzes</p>
              <p>• Use tags to organize tests within folders</p>
              <p>• Review your quiz history and retake tests anytime</p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                🏠 Home
              </button>
              <button
                onClick={() => router.push('/upload')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </button>
              <button
                onClick={() => router.push('/history')}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <History className="h-4 w-4 mr-2" />
                View All Tests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
