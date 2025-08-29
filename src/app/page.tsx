'use client';

import { useState, useEffect } from 'react';
import { User, FileUpload as FileUploadType, Question, UserAnswer, TestHistory as TestHistoryType, QuizType, Folder } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import { OpenRouterService } from '@/services/openRouter';
import { logResult, inferQuizTypeFrom } from '@/services/results';
import { useUserPlan, useUsageStatus } from '@/contexts/UserPlanContext';
import { FeatureGate, UsageLimit } from '@/components/FeatureGate';
import { incrementTestUsage } from '@/services/usageService';
import PaywallModal from '@/components/PaywallModal';
import PlanManager from '@/components/PlanManager';
import { usePaywall } from '@/hooks/usePaywall';
import AuthForm from '@/components/AuthForm';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import QuizResults from '@/components/QuizResults';
import TestHistory from '@/components/TestHistory';
import FolderManager from '@/components/FolderManager';
import MetricsDashboard from '@/components/MetricsDashboard';
import { LogOut, History, Home as HomeIcon, AlertCircle, BookOpen, Folder as FolderIcon, BarChart3, Crown } from 'lucide-react';
import { ErrorManagementService } from '@/services/errors';

import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { SkipLinks } from '@/components/SkipLink';

type AppState = 'auth' | 'home' | 'upload' | 'config' | 'quiz' | 'results' | 'history' | 'folders' | 'metrics';

export default function Home() {
  // CACHE BUST v4 - FORCE NEW BUNDLE HASH
  const [user, setUser] = useState<User | null>(null);
  const { plan, planFeatures, loading: planLoading, refreshUsage, refreshProfile } = useUserPlan();
  const { usage, canCreateTest, testsRemaining, limit } = useUsageStatus();
  const { isPaywallOpen, triggerFeature, hidePaywall, showUpgradePrompt } = usePaywall();
  
  // Initialize error management service - CACHE BUST v4 - FORCE NEW BUNDLE
  const errorManager = ErrorManagementService.getInstance({
    enableErrorHandler: true,
    enableReporting: true,
    enableFallbacks: true,
    enableBreadcrumbs: true,
    enablePerformanceData: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error'
  });


  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
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
  const [showFolderSelection, setShowFolderSelection] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);





  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (userDropdownOpen && !target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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
    setShowFolderSelection(false);
    setAvailableFolders([]);
  };

  const handleFileProcessed = (fileUpload: FileUploadType) => {
    setUploadedFile(fileUpload);
    setAppState('config');
  };

  const handleFileError = (error: string) => {
    setError(error);
  };

  const handleConfigSubmit = async (quizType: QuizType, questionCount: number, name: string) => {
    if (!uploadedFile || !user) return;

    // Check if user can create a test (this should already be handled by UI, but double-check)
    if (!canCreateTest) {
      showUpgradePrompt('usage');
      return;
    }

    setLoading(true);
    setError('');
    setTestName(name);
    
    // Reset retake states when starting new quiz
    setIsRetaking(false);
    setRetakeTestName('');

    try {
      // Add breadcrumb for quiz generation start
      errorManager.addUserActionBreadcrumb('start-quiz-generation', 'quiz-config', {
        quizType,
        questionCount,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType
      });

      // Detect if this is an image-based upload
      const isImageBased = uploadedFile.fileType === 'image' || 
                          Boolean(uploadedFile.fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/));
      
      // Use plan-specific model, or image model if image-based
      const modelToUse = isImageBased ? planFeatures.imageModel || planFeatures.model : planFeatures.model;
      
      // Execute quiz generation with error protection and fallback
      const generatedQuestions = await errorManager.executeWithProtection(
        async () => {
          return await OpenRouterService.generateQuiz(
            uploadedFile.extractedText,
            quizType,
            questionCount,
            modelToUse,
            isImageBased
          );
        },
        {
          operationName: 'quiz-generation',
          component: 'QuizConfig',
          userId: user.uid,
          maxRetries: 2,
          enableCircuitBreaker: true,
          severity: 'high',
          category: 'business',
          fallbackValue: [] // Empty array as fallback
        }
      );

      // If no questions were generated, try with fallback strategy
      if (!generatedQuestions || generatedQuestions.length === 0) {
        const fallbackResult = await errorManager.handleError(
          new Error('No questions generated'),
          {
            operation: 'quiz-generation-fallback',
            component: 'QuizConfig',
            userId: user.uid,
            severity: 'high',
            category: 'business',
            enableFallback: true,
            fallbackData: {
              questionCount: Math.min(questionCount, 10), // Fallback to fewer questions
              simplified: true
            }
          }
        );

        if (fallbackResult.success && fallbackResult.data) {
          setError('Using simplified quiz generation due to service limitations. Generating fewer questions.');
          // Try again with simplified parameters
          const fallbackQuestions = await OpenRouterService.generateQuiz(
            uploadedFile.extractedText,
            quizType,
            Math.min(questionCount, 10),
            modelToUse,
            isImageBased
          );
          if (fallbackQuestions && fallbackQuestions.length > 0) {
            setQuestions(fallbackQuestions);
            setAppState('quiz');
            return;
          }
        }
        
        throw new Error('Failed to generate quiz questions even with fallback strategies');
      }
      
      // Only increment usage counter AFTER successful generation
      await incrementTestUsage(user.uid);
      
      // Check if fewer questions were generated than requested
      if (generatedQuestions.length < questionCount && questionCount > 100) {
        setError(`Generated ${generatedQuestions.length} questions (reduced from ${questionCount} due to model limitations). The free model works best with 100 or fewer questions.`);
      }
      
      setQuestions(generatedQuestions);
      setAppState('quiz');
      
      // Refresh usage data to update UI
      await refreshUsage();

      // Add success breadcrumb
      errorManager.addUserActionBreadcrumb('quiz-generation-success', 'quiz-config', {
        questionsGenerated: generatedQuestions.length,
        requestedCount: questionCount
      });
    } catch (err: unknown) {
      // Handle error with comprehensive error management
      const error = err instanceof Error ? err : new Error(String(err));
      const errorResult = await errorManager.handleError(error, {
        operation: 'quiz-generation',
        component: 'QuizConfig',
        userId: user.uid,
        severity: 'high',
        category: 'business'
      });

      if (errorResult.success && errorResult.data) {
        // Use fallback data if available
        setError('Using fallback quiz generation method');
        if (Array.isArray(errorResult.data) && errorResult.data.length > 0) {
          setQuestions(errorResult.data);
          setAppState('quiz');
          return;
        }
      }

      // Set user-friendly error message
      const userMessage = error.message || 'Failed to generate quiz questions. Please try again or contact support if the problem persists.';
      setError(userMessage);
      
      // Add error breadcrumb
      errorManager.addUserActionBreadcrumb('quiz-generation-failed', 'quiz-config', {
        errorMessage: error.message,
        errorType: error.constructor.name
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (userAnswers: UserAnswer[], timeTaken: number, isIncomplete?: boolean) => {
    if (!user || !uploadedFile) return;

    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const calculatedScore = (correctAnswers / questions.length) * 100;

    setAnswers(userAnswers);
    setScore(calculatedScore);
    setTimeTaken(timeTaken);
    
    // If incomplete, go to results to show the partial score
    setAppState('results');

    // Save to Firebase
    try {
      console.log('Saving test with folderId:', selectedFolder?.id);
      console.log('Selected folder:', selectedFolder);
      console.log('Is incomplete test:', isIncomplete);
      
      const testHistory: Omit<TestHistoryType, 'id'> = {
        userId: user.uid,
        testName: isIncomplete ? `${testName} (In Progress)` : testName,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        extractedText: uploadedFile.extractedText, // Store for retaking
        quizType: questions.length > 0 && questions.every(q => q.type === questions[0]?.type) 
          ? questions[0]?.type as QuizType 
          : 'Mixed',
        questions,
        answers: userAnswers,
        score: calculatedScore,
        createdAt: new Date(),
        ...(isIncomplete ? {} : { completedAt: new Date() }), // Only include completedAt for complete tests
        ...(selectedFolder?.id && { folderId: selectedFolder.id }), // Only include folderId if it exists
      };

      const savedId = await FirebaseService.saveTestHistory(testHistory);
      console.log('Test history saved successfully with ID:', savedId);
      
      // Log result for metrics (only for completed tests)
      if (!isIncomplete) {
        try {
          await logResult(user.uid, {
            testName,
            folderId: selectedFolder?.id || '',
            score: calculatedScore,
            timeTaken,
            quizType: inferQuizTypeFrom(questions),
            questionCount: questions.length,
            retakeOf: isRetaking ? retakeTestName : '', // TODO: Track retakes properly
            topics: [] // TODO: Extract from AI feedback later
          });
          console.log('Result metrics logged successfully');
        } catch (metricsError) {
          console.error('Failed to log result metrics:', metricsError);
          // Don't fail the whole operation if metrics logging fails
        }
      }
      
      if (isIncomplete) {
        setError('Progress saved! You can continue this test later from your history.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to save test history:', message);
      // Show a non-intrusive message to the user
      const displayMessage = isIncomplete 
        ? 'Progress saved locally but may not have been saved to the cloud due to a connection issue.'
        : 'Quiz completed successfully! Note: Test history may not have been saved due to a connection issue.';
      setError(displayMessage);
    }
  };

  const handleRetakeQuiz = () => {
    // Check plan-based retake permissions
    if (!planFeatures.retakesAllowed) {
      showUpgradePrompt('retakes');
      return;
    }

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
    setQuestions([]); // Clear previous questions
    setIsRetaking(false); // Reset retake state
    setRetakeTestName(''); // Clear retake test name
    setAppState('config');
  };

  const handleGoHome = () => {
    resetAppState();
    setAppState('home');
  };

  const loadUserFolders = async () => {
    if (!user) return;
    try {
      const folders = await FirebaseService.getUserFolders(user.uid);
      setAvailableFolders(folders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleCreateNewQuiz = async () => {
    await loadUserFolders();
    setShowFolderSelection(true);
  };

  const handleFolderSelectionComplete = (folder: Folder | null) => {
    setSelectedFolder(folder);
    setShowFolderSelection(false);
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

  const handleViewTest = (test: TestHistoryType) => {
    // Set the test data for review
    setQuestions(test.questions);
    setAnswers(test.answers);
    setScore(test.score || 0);
    setTimeTaken(0); // We don't store time taken for historical tests
    setTestName(test.testName);
    
    // Set up uploadedFile so "New Questions" can work
    if (test.extractedText && test.extractedText.trim() !== '') {
      const fileUpload: FileUploadType = {
        file: new File([test.extractedText], test.fileName),
        extractedText: test.extractedText,
        fileName: test.fileName,
        fileType: test.fileType || test.fileName.split('.').pop() || 'txt'
      };
      setUploadedFile(fileUpload);
    }
    
    setAppState('results');
  };

  const handleRetakeFromHistory = (test: TestHistoryType) => {
    // Check plan-based retake permissions
    if (!planFeatures.retakesAllowed) {
      showUpgradePrompt('retakes');
      return;
    }

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

  // Check if we're in bypass mode
  const isBypassMode = typeof window !== 'undefined' && window.location.search.includes('bypass=true');
  
  if (!user && !isBypassMode) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Use bypass user if in bypass mode and no real user
  const currentUser = user || (isBypassMode ? {
    uid: 'bypass-user-123',
    email: 'bypass@test.com',
    displayName: 'Bypass User (Pro)'
  } as User : null);

  // If no user and not in bypass mode, show auth form
  if (!currentUser) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AccessibilityProvider>
      <div className="min-h-screen bg-gray-50" data-testid="app-container">
        {/* Skip Links for Accessibility */}
        <SkipLinks />
        

        
        {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Test Buddy</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Home Button */}
              <button
                onClick={handleGoHome}
                className={`flex items-center space-x-2 px-3 py-2 transition-colors ${
                  appState === 'home' 
                    ? 'text-indigo-600 bg-indigo-50 rounded-lg' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <HomeIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
              
              {/* Upgrade Button - Show for free and student plans */}
              {(plan === 'free' || plan === 'student') && (
                <button
                  onClick={() => showUpgradePrompt('general')}
                  className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg"
                >
                  <Crown className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">
                    {plan === 'free' ? 'Upgrade' : 'Upgrade to Pro'}
                  </span>
                </button>
              )}
              
                             {/* User Dropdown */}
               <div className="relative user-dropdown">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">
                        {(currentUser.displayName || currentUser.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {currentUser.displayName || currentUser.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {planFeatures.name} Plan
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {currentUser.displayName || currentUser.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {planFeatures.name} Plan
                      </div>
                      {usage && limit !== Infinity && (
                        <div className="text-xs text-gray-500 mt-1">
                          {testsRemaining} tests remaining
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation Items */}
                    <div className="py-1">
                                             <button
                         onClick={handleViewHistory}
                         className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                           appState === 'history' 
                             ? 'text-indigo-600 bg-indigo-50' 
                             : 'text-gray-900 hover:bg-gray-50'
                         }`}
                       >
                        <div className="flex items-center space-x-3">
                          <History className="h-4 w-4" />
                          <span>History</span>
                        </div>
                      </button>
                      
                      {planFeatures.folders && (
                        <button
                          onClick={() => setAppState('folders')}
                                                   className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                           appState === 'folders' 
                             ? 'text-indigo-600 bg-indigo-50' 
                             : 'text-gray-900 hover:bg-gray-50'
                         }`}
                        >
                          <div className="flex items-center space-x-3">
                            <FolderIcon className="h-4 w-4" />
                            <span>Folders</span>
                          </div>
                        </button>
                      )}
                      
                      {planFeatures.metrics && (
                        <button
                          onClick={() => setAppState('metrics')}
                                                   className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                           appState === 'metrics' 
                             ? 'text-indigo-600 bg-indigo-50' 
                             : 'text-gray-900 hover:bg-gray-50'
                         }`}
                        >
                          <div className="flex items-center space-x-3">
                            <BarChart3 className="h-4 w-4" />
                            <span>Analytics</span>
                          </div>
                        </button>
                      )}
                    </div>
                    
                    {/* Settings & Account */}
                    <div className="py-1 border-t border-gray-100">
                      <button
                        onClick={() => setShowPlanManager(true)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Crown className="h-4 w-4" />
                          <span>Plan Settings</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          // Toggle accessibility settings modal
                          setShowAccessibilitySettings(!showAccessibilitySettings);
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Accessibility Settings</span>
                        </div>
                      </button>
                    </div>
                    
                    {/* Sign Out */}
                    <div className="py-1 border-t border-gray-100">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              
              {/* Usage Status */}
              {!planLoading && usage && (
                <div className="max-w-md mx-auto mb-6">
                  <UsageLimit
                    current={usage.testsGenerated}
                    limit={limit}
                    feature="Tests Created This Month"
                    className="text-left"
                  />
                  {!canCreateTest && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        You've reached your monthly limit. Upgrade to create more tests!
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                    onClick={canCreateTest ? handleCreateNewQuiz : () => showUpgradePrompt('usage')}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                      canCreateTest
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {canCreateTest ? 'Start Creating' : 'Upgrade to Create More'}
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
              selectedFolder={selectedFolder || null}
              onUpgradeClick={() => showUpgradePrompt('imageUpload')}
            />
          </div>
        )}

        {appState === 'config' && uploadedFile && (
          <div className="max-w-2xl mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleGoHome}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <HomeIcon className="h-4 w-4" />
                <span>Back to Home</span>
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
            onGoToFolders={() => setAppState('folders')}
            isRetake={isRetaking}
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
            canUseAiFeedback={planFeatures.aiFeedback}
            canRetake={planFeatures.retakesAllowed}
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
            
            <FeatureGate feature="folders" onUpgradeClick={() => showUpgradePrompt('folders')}>
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
                selectedFolder={selectedFolder || null}
                onTestSelect={handleViewTest}
              />
            </FeatureGate>
          </div>
        )}

        {appState === 'metrics' && user && (
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
            
            <FeatureGate feature="metrics" onUpgradeClick={() => showUpgradePrompt('metrics')}>
              <MetricsDashboard userId={user.uid} plan={plan} />
            </FeatureGate>
          </div>
        )}
      </main>

      {/* Paywall Modal */}
      {user && (
        <PaywallModal
          isOpen={isPaywallOpen}
          onClose={hidePaywall}
          currentPlan={plan}
          userId={user.uid}
                          triggerFeature={triggerFeature || ''}
          onUpgrade={async (_newPlan) => {
            await refreshProfile();
            await refreshUsage();
          }}
        />
      )}

      {/* Plan Manager Modal */}
      {user && showPlanManager && (
        <PlanManager
          userId={user.uid}
          onClose={() => setShowPlanManager(false)}
        />
      )}

      {/* Folder Selection Modal */}
      {showFolderSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Where to create your new test?
            </h3>
            <p className="text-gray-600 mb-6">
              Choose where to organize your new quiz
            </p>

            <div className="space-y-3">
              {/* No Folder Option */}
              <button
                onClick={() => handleFolderSelectionComplete(null)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                  <div>
                    <div className="font-medium text-gray-900">No Folder</div>
                    <div className="text-sm text-gray-500">Create test without organizing in a folder</div>
                  </div>
                </div>
              </button>

              {/* Existing Folders */}
              {availableFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelectionComplete(folder)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: folder.color || '#3B82F6' }}
                    ></div>
                    <div>
                      <div className="font-medium text-gray-900">{folder.name}</div>
                      {folder.description && (
                        <div className="text-sm text-gray-500">{folder.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Create New Folder Option */}
              <button
                onClick={() => {
                  setShowFolderSelection(false);
                  setAppState('folders');
                }}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Create New Folder</div>
                    <div className="text-sm text-gray-500">Organize your tests in a new folder</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFolderSelection(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility Settings Modal */}
      {showAccessibilitySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Accessibility Settings</h2>
              <button
                onClick={() => setShowAccessibilitySettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">High Contrast Mode</span>
                <button className="w-12 h-6 bg-gray-200 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 transition-transform"></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">Large Text</span>
                <button className="w-12 h-6 bg-gray-200 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 transition-transform"></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">Screen Reader Support</span>
                <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform"></div>
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAccessibilitySettings(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            © 2024 Test Buddy - AI-Powered Quiz Generator
          </p>
        </div>
      </footer>
    </div>
    </AccessibilityProvider>
  );
}
