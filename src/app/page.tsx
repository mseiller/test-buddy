'use client';

import { useState, useEffect } from 'react';
import { User, FileUpload as FileUploadType, Question, UserAnswer, TestHistory as TestHistoryType, QuizType } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import { OpenRouterService } from '@/services/openRouter';
import AuthForm from '@/components/AuthForm';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import QuizResults from '@/components/QuizResults';
import TestHistory from '@/components/TestHistory';
import { LogOut, History, Home as HomeIcon, AlertCircle, BookOpen } from 'lucide-react';

type AppState = 'auth' | 'upload' | 'config' | 'quiz' | 'results' | 'history';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('auth');
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [testName, setTestName] = useState('');
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = FirebaseService.onAuthStateChange((user) => {
      setUser(user);
      setAppState(user ? 'upload' : 'auth');
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: User) => {
    setUser(user);
    setAppState('upload');
  };

  const handleSignOut = async () => {
    try {
      await FirebaseService.signOut();
      setUser(null);
      setAppState('auth');
      resetAppState();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const resetAppState = () => {
    setUploadedFile(null);
    setQuestions([]);
    setAnswers([]);
    setTestName('');
    setScore(0);
    setTimeTaken(0);
    setError('');
  };

  const handleFileProcessed = (fileUpload: FileUploadType) => {
    setUploadedFile(fileUpload);
    setAppState('config');
  };

  const handleFileError = (error: string) => {
    setError(error);
  };

  const handleConfigSubmit = async (quizType: QuizType, questionCount: number, name: string) => {
    if (!uploadedFile) return;

    setLoading(true);
    setError('');
    setTestName(name);

    try {
      const generatedQuestions = await OpenRouterService.generateQuiz(
        uploadedFile.extractedText,
        quizType,
        questionCount
      );
      
      setQuestions(generatedQuestions);
      setAppState('quiz');
    } catch (error: any) {
      setError(error.message || 'Failed to generate quiz questions');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (userAnswers: UserAnswer[], timeTaken: number) => {
    if (!user || !uploadedFile) return;

    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const calculatedScore = (correctAnswers / questions.length) * 100;

    setAnswers(userAnswers);
    setScore(calculatedScore);
    setTimeTaken(timeTaken);
    setAppState('results');

    // Save to Firebase
    try {
      const testHistory: Omit<TestHistoryType, 'id'> = {
        userId: user.uid,
        testName,
        fileName: uploadedFile.fileName,
        quizType: questions.every(q => q.type === questions[0].type) 
          ? questions[0].type as QuizType 
          : 'Mixed',
        questions,
        answers: userAnswers,
        score: calculatedScore,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      await FirebaseService.saveTestHistory(testHistory);
    } catch (error: any) {
      console.error('Failed to save test history:', error);
      // Don't show error to user as the quiz is complete
    }
  };

  const handleRetakeQuiz = () => {
    setAnswers([]);
    setScore(0);
    setTimeTaken(0);
    setAppState('quiz');
  };

  const handleGoHome = () => {
    resetAppState();
    setAppState('upload');
  };

  const handleGoBack = () => {
    switch (appState) {
      case 'config':
        setAppState('upload');
        break;
      case 'quiz':
        setAppState('config');
        break;
      case 'results':
        setAppState('quiz');
        break;
      case 'history':
        setAppState('upload');
        break;
    }
  };

  const handleViewHistory = () => {
    setAppState('history');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Test Buddy...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Test Buddy</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.displayName || user.email}
              </span>
              
              {appState !== 'history' && (
                <button
                  onClick={handleViewHistory}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
              )}
              
              {appState !== 'upload' && (
                <button
                  onClick={handleGoHome}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
              )}
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto px-6 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 ml-auto"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* App States */}
        {appState === 'upload' && (
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Create Your Quiz
              </h2>
              <p className="text-lg text-gray-600">
                Upload a document and let AI generate personalized quiz questions for you
              </p>
            </div>
            <FileUpload 
              onFileProcessed={handleFileProcessed}
              onError={handleFileError}
            />
          </div>
        )}

        {appState === 'config' && uploadedFile && (
          <div className="max-w-2xl mx-auto px-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Configure Your Quiz
              </h2>
              <p className="text-gray-600">
                File processed: <strong>{uploadedFile.fileName}</strong>
              </p>
            </div>
            <QuizConfig 
              onConfigSubmit={handleConfigSubmit}
              loading={loading}
            />
          </div>
        )}

        {appState === 'quiz' && questions.length > 0 && (
          <QuizDisplay
            questions={questions}
            testName={testName}
            onQuizComplete={handleQuizComplete}
            onGoBack={handleGoBack}
          />
        )}

        {appState === 'results' && (
          <QuizResults
            questions={questions}
            answers={answers}
            score={score}
            timeTaken={timeTaken}
            testName={testName}
            onRetakeQuiz={handleRetakeQuiz}
            onGoHome={handleGoHome}
          />
        )}

        {appState === 'history' && user && (
          <TestHistory userId={user.uid} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            © 2024 Test Buddy - AI-Powered Quiz Generator
          </p>
        </div>
      </footer>
    </div>
  );
}
