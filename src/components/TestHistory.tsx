'use client';

import { useState, useEffect } from 'react';
import { History, Clock, FileText, Trophy, Trash2, Eye, Calendar, RotateCcw } from 'lucide-react';
import { TestHistory as TestHistoryType } from '@/types';
import { FirebaseService } from '@/services/firebaseService';

interface TestHistoryProps {
  userId: string;
  onViewTest?: (testId: string) => void;
  onRetakeQuiz?: (test: TestHistoryType) => void;
}

export default function TestHistory({ userId, onViewTest }: TestHistoryProps) {
  const [tests, setTests] = useState<TestHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTestHistory();
  }, [userId]);

  const loadTestHistory = async () => {
    try {
      setLoading(true);
      const history = await FirebaseService.getUserTestHistory(userId);
      setTests(history);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return;
    }

    try {
      await FirebaseService.deleteTestHistory(testId);
      setTests(prev => prev.filter(test => test.id !== testId));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateScore = (test: TestHistoryType) => {
    if (!test.answers || test.answers.length === 0) return 0;
    const correct = test.answers.filter(a => a.isCorrect).length;
    return Math.round((correct / test.questions.length) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getQuizTypeIcon = (quizType: string) => {
    switch (quizType) {
      case 'MCQ':
        return '📝';
      case 'Fill-in-the-blank':
        return '✏️';
      case 'Essay':
        return '📄';
      case 'Mixed':
        return '🔀';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
            <span className="text-gray-600">Loading test history...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">Error loading test history</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadTestHistory}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <History className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Test History</h1>
        </div>
        <p className="text-gray-600">
          {tests.length === 0 
            ? "You haven't taken any tests yet. Upload a file to create your first quiz!"
            : `You've completed ${tests.length} test${tests.length > 1 ? 's' : ''}.`
          }
        </p>
      </div>

      {tests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Tests Yet</h3>
          <p className="text-gray-600 mb-6">
            Start by uploading a document to create your first quiz and track your progress here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const score = calculateScore(test);
            const completedAt = test.completedAt || test.createdAt;
            
            return (
              <div key={test.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getQuizTypeIcon(test.quizType)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {test.testName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Based on: {test.fileName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(completedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{test.questions.length} questions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="capitalize">{test.quizType}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
                        <Trophy className="h-4 w-4 inline mr-1" />
                        {score}%
                      </div>
                      
                      {test.answers && test.answers.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {test.answers.filter(a => a.isCorrect).length} / {test.questions.length} correct
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {onRetakeQuiz && (
                      <button
                        onClick={() => onRetakeQuiz(test)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Retake quiz with new questions"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    
                    {onViewTest && (
                      <button
                        onClick={() => onViewTest(test.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="View test details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete test"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bars for different question types */}
                {test.quizType === 'Mixed' && test.answers && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Question Type Breakdown:</div>
                    <div className="flex space-x-4 text-xs">
                      {['MCQ', 'Fill-in-the-blank', 'Essay'].map(type => {
                        const typeQuestions = test.questions.filter(q => q.type === type);
                        const typeCorrect = test.answers
                          .filter(a => {
                            const question = test.questions.find(q => q.id === a.questionId);
                            return question?.type === type && a.isCorrect;
                          }).length;
                        
                        if (typeQuestions.length === 0) return null;
                        
                        return (
                          <div key={type} className="flex items-center space-x-2">
                            <span className="text-gray-600">{type}:</span>
                            <span className="font-medium">
                              {typeCorrect}/{typeQuestions.length}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tests.length > 0 && (
        <div className="mt-8 text-center">
          <div className="bg-gray-50 rounded-lg p-4 inline-flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <strong>Total Tests:</strong> {tests.length}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Average Score:</strong> {
                tests.length > 0 
                  ? Math.round(tests.reduce((sum, test) => sum + calculateScore(test), 0) / tests.length)
                  : 0
              }%
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 