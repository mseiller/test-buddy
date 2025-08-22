'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import AuthForm from '@/components/AuthForm';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import { BookOpen, Zap, Shield, Users, FolderIcon } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appState, setAppState] = useState<'auth' | 'upload' | 'config' | 'quiz'>('auth');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [testName, setTestName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const router = useRouter();

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = FirebaseService.onAuthStateChange((user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleAuthSuccess = (user: User) => {
    setUser(user);
    setAppState('upload');
  };

  const handleFileProcessed = (fileUpload: any) => {
    console.log('handleFileProcessed called with:', fileUpload);
    setUploadedFile(fileUpload);
    // Prefill test name from filename
    setTestName(fileUpload.fileName.replace(/\.\w+$/, ''));
    setAppState('config');
    setError(null);
  };

  const generateQuestions = async (fileUpload: any, quizType: string, questionCount: number) => {
    setGeneratingQuestions(true);
    try {
      // For now, create placeholder questions
      const placeholderQuestions = Array.from({ length: questionCount }, (_, i) => ({
        id: `q${i + 1}`,
        question: `Question ${i + 1} from ${fileUpload.fileName}`,
        type: quizType === 'MCQ' ? 'MCQ' : 'Fill-in-the-blank',
        options: quizType === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : [],
        correctAnswer: quizType === 'MCQ' ? 'Option A' : 'Sample answer',
        explanation: `This is a sample question generated from your uploaded content.`
      }));
      
      setQuestions(placeholderQuestions);
      setAppState('quiz');
    } catch (error) {
      console.error('Failed to generate questions:', error);
      setError('Failed to generate quiz questions. Please try again.');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleQuizComplete = async (testHistory: any) => {
    try {
      await FirebaseService.saveTestHistory(testHistory);
      console.log('Test history saved successfully');
      // Reset state and go back to upload
      setAppState('upload');
      setUploadedFile(null);
      setTestName('');
      setQuestions([]);
    } catch (e: any) {
      console.error('Failed to save test history', e);
      setError(e?.message ?? 'Failed to save test history');
    }
  };

  // Debug global state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__tb = {
        uploadedFile,
        appState,
        user,
        testName,
        error,
        questions,
        generatingQuestions
      };
    }
  }, [uploadedFile, appState, user, testName, error, questions, generatingQuestions]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If user is authenticated, show the appropriate interface based on app state
  if (user) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-lg font-semibold text-gray-900">Test Buddy</h1>
              <p className="text-sm text-gray-500">Organize your tests</p>
            </div>

            {/* New Folder Button */}
            <div className="p-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <FolderIcon className="h-4 w-4 mr-2" />
                New Folder
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex-1 p-4 space-y-2">
              <button
                onClick={() => setAppState('upload')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                🏠 Home
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                📁 Dashboard
              </button>
              <button
                onClick={() => router.push('/history')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                📊 View History
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={() => FirebaseService.signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content - Dynamic based on app state */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
              <div>App State: {appState}</div>
              <div>File: {uploadedFile ? uploadedFile.fileName : 'none'}</div>
              <div>Questions: {questions.length}</div>
              <div>Generating: {generatingQuestions ? 'yes' : 'no'}</div>
              <div>Error: {error || 'none'}</div>
            </div>

            {/* Upload State */}
            {appState === 'upload' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.displayName || 'User'}!
                </h1>
                <p className="text-gray-600 mb-8">
                  Get started by creating a folder or uploading a test
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
                  >
                    <FolderIcon className="h-12 w-12 text-indigo-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Create Folder</h3>
                    <p className="text-gray-600">Organize your tests into folders by subject or class</p>
                  </button>
                  
                  <div className="p-6 bg-white border border-gray-200 rounded-lg">
                    <BookOpen className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Test</h3>
                    <p className="text-gray-600 mb-4">Upload a document and generate a new quiz</p>
                    <FileUpload 
                      onFileProcessed={handleFileProcessed} 
                      onError={(error) => setError(error)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Config State */}
            {appState === 'config' && uploadedFile && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Configure Quiz</h1>
                    <p className="text-gray-600">
                      Set up your quiz for: {uploadedFile.fileName}
                    </p>
                  </div>
                  <button
                    onClick={() => setAppState('upload')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Home
                  </button>
                </div>
                <QuizConfig 
                  onConfigSubmit={(quizType, questionCount, testName) => {
                    setTestName(testName);
                    generateQuestions(uploadedFile, quizType, questionCount);
                  }}
                  loading={generatingQuestions}
                />
              </div>
            )}

            {/* Quiz State */}
            {appState === 'quiz' && uploadedFile && questions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Quiz: {testName}</h1>
                  <button
                    onClick={() => setAppState('config')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Config
                  </button>
                </div>
                <QuizDisplay 
                  questions={questions}
                  testName={testName}
                  onQuizComplete={(answers, timeTaken) => {
                    console.log('Quiz completed:', { answers, timeTaken });
                    // Create test history object
                    const testHistory = {
                      testName,
                      fileName: uploadedFile.fileName,
                      questions: questions.length,
                      score: 0, // TODO: Calculate actual score
                      timeTaken,
                      createdAt: new Date().toISOString(),
                      userId: user?.uid
                    };
                    handleQuizComplete(testHistory);
                  }}
                  onGoBack={() => setAppState('config')}
                />
              </div>
            )}

            {/* Quiz Loading State */}
            {appState === 'quiz' && uploadedFile && questions.length === 0 && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz: {testName}</h1>
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Quiz Questions</h3>
                  <p className="text-gray-500 mb-6">
                    Creating questions from: {uploadedFile.fileName}
                  </p>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-sm text-gray-400 mt-4">
                    This may take a few moments...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gray-50 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Transform your</span>{' '}
                  <span className="block text-indigo-600 xl:inline">study materials</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Upload PDFs, Word docs, or text files and instantly generate AI-powered quizzes. 
                  Organize your tests in folders, track your progress, and study more effectively.
                </p>
                
                {/* Auth Form */}
                <div className="mt-8">
                  <AuthForm onAuthSuccess={handleAuthSuccess} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to study smarter
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Smart Quiz Generation</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Upload any document and our AI creates comprehensive quizzes with multiple choice, true/false, and short answer questions.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <Shield className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Organized Learning</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Create folders for different subjects, tag your tests, and keep everything organized in one place.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Instant Results</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Get immediate feedback with detailed explanations for each question to reinforce your learning.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Progress Tracking</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Review your quiz history, retake tests with new questions, and track your improvement over time.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Ready to start studying smarter?</span>
            <span className="block text-indigo-600">Sign up and create your first quiz today.</span>
          </h2>
          <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <span className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600">
                Get started above ↑
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}