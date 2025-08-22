'use client';

import { useState, useEffect } from 'react';
import { User, FileUpload as FileUploadType, Question, UserAnswer, TestHistory as TestHistoryType, QuizType, Folder } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import { OpenRouterService } from '@/services/openRouter';
import AuthForm from '@/components/AuthForm';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import QuizResults from '@/components/QuizResults';
import TestHistory from '@/components/TestHistory';
import FolderManager from '@/components/FolderManager';
import { LogOut, History, Home as HomeIcon, AlertCircle, BookOpen, Folder as FolderIcon } from 'lucide-react';

type AppState = 'auth' | 'home' | 'upload' | 'config' | 'quiz' | 'results' | 'history' | 'folders';

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
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeTestName, setRetakeTestName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null | undefined>(undefined);

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = FirebaseService.onAuthStateChange((user) => {
      setUser(user);
      setAppState(user ? 'home' : 'auth');
      setAuthLoading(false);
      
      // Test Firestore connection when user is authenticated
      if (user) {
        FirebaseService.testFirestoreConnection().then(isConnected => {
          if (!isConnected) {
            console.warn('Firestore connection test failed - test history may not save');
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle URL parameters for folder selection
  useEffect(() => {
    if (user && appState === 'home') {
      const urlParams = new URLSearchParams(window.location.search);
      const folderId = urlParams.get('folder');
      
      if (folderId) {
        // Load the folder and navigate to upload
        FirebaseService.getFolderById(folderId).then(folder => {
          if (folder && folder.userId === user.uid) {
            setSelectedFolder(folder);
            setAppState('upload');
            // Clean up URL
            window.history.replaceState({}, '', '/');
          }
        }).catch(error => {
          console.error('Failed to load folder:', error);
        });
      }
    }
  }, [user, appState]);

  const handleAuthSuccess = (user: User) => {
    setUser(user);
    setAppState('home');
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
    setIsRetaking(false);
    setRetakeTestName('');
    setSelectedFolder(undefined);
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
    
    // Reset retake states when starting new quiz
    setIsRetaking(false);
    setRetakeTestName('');

    try {
      const generatedQuestions = await OpenRouterService.generateQuiz(
        uploadedFile.extractedText,
        quizType,
        questionCount
      );
      
      // Check if fewer questions were generated than requested
      if (generatedQuestions.length < questionCount && questionCount > 25) {
        setError(`Generated ${generatedQuestions.length} questions (reduced from ${questionCount} due to model limitations). The free model works best with 25 or fewer questions.`);
      }
      
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
      console.log('Saving test with folderId:', selectedFolder?.id);
      console.log('Selected folder:', selectedFolder);
      
      const testHistory: Omit<TestHistoryType, 'id'> = {
        userId: user.uid,
        testName,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        extractedText: uploadedFile.extractedText, // Store for retaking
        quizType: questions.every(q => q.type === questions[0].type) 
          ? questions[0].type as QuizType 
          : 'Mixed',
        questions,
        answers: userAnswers,
        score: calculatedScore,
        createdAt: new Date(),
        completedAt: new Date(),
        folderId: selectedFolder?.id, // Include folder ID if test is created within a folder
      };

      const savedId = await FirebaseService.saveTestHistory(testHistory);
      console.log('Test history saved successfully with ID:', savedId);
    } catch (error: any) {
      console.error('Failed to save test history:', error);
      // Show a non-intrusive message to the user
      setError('Quiz completed successfully! Note: Test history may not have been saved due to a connection issue.');
    }
  };

  const handleRetakeQuiz = () => {
    setAnswers([]);
    setScore(0);
    setTimeTaken(0);
    setAppState('quiz');
  };

  const handleNewQuizFromFile = () => {
    // Go back to config to generate new questions from the same file
    setAnswers([]);
    setScore(0);
    setTimeTaken(0);
    setAppState('config');
  };

  const handleGoHome = () => {
    resetAppState();
    setAppState('home');
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

  const handleViewTest = (test: TestHistoryType) => {
    // Set the test data for review
    setQuestions(test.questions);
    setAnswers(test.answers);
    setScore(test.score || 0);
    setTimeTaken(0); // We don't store time taken for historical tests
    setTestName(test.testName);
    setAppState('results');
  };

  const handleRetakeFromHistory = (test: TestHistoryType) => {
    // Check if we have the extracted text for retaking
    if (!test.extractedText || test.extractedText.trim() === '') {
      setError('This test cannot be retaken because the original file content was not saved. Please upload the file again to retake.');
      setAppState('upload');
      return;
    }

    // Create a file upload object from the stored test data
    const fileUpload: FileUploadType = {
      file: new File([test.extractedText], test.fileName), // Create file with stored text
      extractedText: test.extractedText,
      fileName: test.fileName,
      fileType: test.fileType || test.fileName.split('.').pop() || 'txt'
    };
    
    setUploadedFile(fileUpload);
    setIsRetaking(true);
    setRetakeTestName(test.testName);
    setAppState('config');
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
              
              {appState !== 'home' && (
                <button
                  onClick={handleGoHome}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
              )}
              
              {appState !== 'history' && (
                <button
                  onClick={handleViewHistory}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
              )}
              
              {appState !== 'folders' && (
                <button
                  onClick={() => setAppState('folders')}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FolderIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Folders</span>
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
        {appState === 'home' && (
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Welcome to Test Buddy
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                AI-Powered Quiz Generation from Your Documents
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Upload Section */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Create New Quiz
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Upload a document and let AI generate personalized quiz questions for you
                  </p>
                  <button
                    onClick={() => setAppState('upload')}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Start Creating
                  </button>
                </div>
              </div>

              {/* History Section */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    View History
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Review your previous quizzes, retake tests, or analyze your performance
                  </p>
                  <button
                    onClick={handleViewHistory}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    View History
                  </button>
                </div>
              </div>

              {/* Folders Section */}
              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Organize Tests
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create folders to organize your tests by topic, subject, or project
                  </p>
                  <button
                    onClick={() => setAppState('folders')}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Manage Folders
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-6 text-sm text-gray-500">
                <span>📚 Multiple file formats supported</span>
                <span>🤖 AI-powered question generation</span>
                <span>📊 Detailed performance analytics</span>
              </div>
            </div>
          </div>
        )}

        {appState === 'upload' && (
          <div className="max-w-2xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setAppState('home')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
            </div>
            
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
              selectedFolder={selectedFolder}
            />
          </div>
        )}

        {appState === 'config' && uploadedFile && (
          <div className="max-w-2xl mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setAppState('upload')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Back to Upload</span>
              </button>
            </div>
            
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
              isRetake={isRetaking}
              originalTestName={retakeTestName}
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
            onNewQuizFromFile={handleNewQuizFromFile}
            isHistoricalReview={timeTaken === 0}
            onBackToHistory={() => setAppState('history')}
          />
        )}

        {appState === 'history' && user && (
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setAppState('home')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Test History
              </h2>
              <p className="text-lg text-gray-600">
                Review your previous quizzes and performance
              </p>
            </div>
            
            <TestHistory 
              userId={user.uid} 
              onViewTest={handleViewTest}
              onRetakeQuiz={handleRetakeFromHistory}
            />
          </div>
        )}

        {appState === 'folders' && user && (
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setAppState('home')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Back to Home</span>
              </button>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Organize Your Tests
              </h2>
              <p className="text-lg text-gray-600">
                Create folders to organize your tests by topic, subject, or project
              </p>
            </div>
            
            <FolderManager
              userId={user.uid}
              onFolderSelect={setSelectedFolder}
              selectedFolder={selectedFolder}
              onTestSelect={handleViewTest}
            />
          </div>
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
