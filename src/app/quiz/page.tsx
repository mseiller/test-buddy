'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { FolderList } from '@/components/FolderList';
import { OpenRouterService } from '@/services/openRouter';
import { FirebaseService } from '@/services/firebaseService';
import { FileUpload as FileUploadType, Question, UserAnswer, QuizType } from '@/types';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import QuizResults from '@/components/QuizResults';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

type QuizState = 'config' | 'quiz' | 'results';

export default function QuizPage() {
  const { user } = useAuth();
  const { folders } = useFolders();
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState>('config');
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [testName, setTestName] = useState('');
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Load file upload data from localStorage
  useEffect(() => {
    if (user) {
      console.log('Quiz page: Checking localStorage for file data...');
      const storedData = localStorage.getItem('tempFileUpload');
      console.log('Quiz page: Stored data found:', storedData ? 'yes' : 'no');
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          console.log('Quiz page: Parsed data:', data);
          setUploadedFile(data);
          setSelectedFolderId(data.folderId);
          // Clear the stored data
          localStorage.removeItem('tempFileUpload');
          console.log('Quiz page: File data loaded successfully');
        } catch (err) {
          console.error('Failed to parse stored file data:', err);
          setError('Failed to load uploaded file data');
        }
      } else {
        console.log('Quiz page: No stored file data found');
      }
    }
  }, [user]);

  if (!user) {
    router.push('/');
    return null;
  }

  // If no file data, redirect to upload
  if (!uploadedFile) {
    router.push('/upload');
    return null;
  }

  const handleConfigSubmit = async (quizType: QuizType, questionCount: number, name: string) => {
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
      setQuizState('quiz');
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
    setQuizState('results');

    // Save to Firebase
    try {
      const testHistory: any = {
        userId: user.uid,
        testName,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        extractedText: uploadedFile.extractedText,
        quizType: questions.every(q => q.type === questions[0].type) 
          ? questions[0].type as QuizType 
          : 'Mixed',
        questions,
        answers: userAnswers,
        score: calculatedScore,
        createdAt: new Date(),
        completedAt: new Date(),
        folderId: selectedFolderId, // Add folder association
      };

      const savedId = await FirebaseService.saveTestHistory(testHistory);
      console.log('Test history saved successfully with ID:', savedId);

      // Update folder test count if we have a folder
      if (selectedFolderId) {
        // TODO: Update folder test count
        console.log('Test saved to folder:', selectedFolderId);
      }
    } catch (error: any) {
      console.error('Failed to save test history:', error);
      setError('Quiz completed successfully! Note: Test history may not have been saved due to a connection issue.');
    }
  };

  const handleRetakeQuiz = () => {
    setAnswers([]);
    setScore(0);
    setTimeTaken(0);
    setQuizState('quiz');
  };

  const handleNewQuizFromFile = () => {
    setAnswers([]);
    setScore(0);
    setTimeTaken(0);
    setQuizState('config');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    switch (quizState) {
      case 'config':
        router.push('/upload');
        break;
      case 'quiz':
        setQuizState('config');
        break;
      case 'results':
        setQuizState('quiz');
        break;
    }
  };

  const getFolderName = () => {
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      return folder?.name || 'Unknown Folder';
    }
    return 'No Folder';
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
              <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
            </div>
            <p className="text-gray-600">
              File: <strong>{uploadedFile.fileName}</strong> • Folder: <strong>{getFolderName()}</strong>
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  {error}
                  <button
                    onClick={() => setError('')}
                    className="ml-2 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quiz States */}
          {quizState === 'config' && (
            <div className="max-w-2xl">
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
                isRetake={false}
                originalTestName=""
              />
            </div>
          )}

          {quizState === 'quiz' && questions.length > 0 && (
            <QuizDisplay
              questions={questions}
              testName={testName}
              onQuizComplete={handleQuizComplete}
              onGoBack={handleGoBack}
            />
          )}

          {quizState === 'results' && (
            <QuizResults
              questions={questions}
              answers={answers}
              score={score}
              timeTaken={timeTaken}
              testName={testName}
              onRetakeQuiz={handleRetakeQuiz}
              onGoHome={handleGoHome}
              onNewQuizFromFile={handleNewQuizFromFile}
              isHistoricalReview={false}
              onBackToHistory={() => router.push('/history')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
