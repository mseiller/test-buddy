'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { FolderList } from '@/components/FolderList';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizDisplay from '@/components/QuizDisplay';
import QuizResults from '@/components/QuizResults';
import { OpenRouterService } from '@/services/openRouter';
import { FirebaseService } from '@/services/firebaseService';
import { FileUpload as FileUploadType, Question, UserAnswer, QuizType } from '@/types';
import { ArrowLeft, BookOpen } from 'lucide-react';

type QuizState = 'upload' | 'config' | 'quiz' | 'results';

export default function QuizPage() {
  const { user } = useAuth();
  const { folders } = useFolders();
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState>('upload');
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [testName, setTestName] = useState('');
  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for stored file data from upload page
  useEffect(() => {
    const storedFileData = localStorage.getItem('tempFileUpload');
    if (storedFileData) {
      try {
        const fileData = JSON.parse(storedFileData);
        setUploadedFile(fileData);
        setTestName(fileData.fileName.replace(/\.\w+$/, ''));
        setQuizState('config');
        // Clear the stored data
        localStorage.removeItem('tempFileUpload');
      } catch (error) {
        console.error('Failed to parse stored file data:', error);
      }
    }
  }, []);

  if (!user) {
    router.push('/');
    return null;
  }

  const handleFileProcessed = (fileUpload: FileUploadType) => {
    console.log('File processed:', fileUpload);
    setUploadedFile(fileUpload);
    setTestName(fileUpload.fileName.replace(/\.\w+$/, ''));
    setQuizState('config');
    setError('');
  };

  const handleFileError = (error: string) => {
    console.error('File error:', error);
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
      const testHistory = {
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
      };

      await FirebaseService.saveTestHistory(testHistory);
      console.log('Test history saved successfully');
    } catch (error: any) {
      console.error('Failed to save test history:', error);
      setError('Quiz completed but failed to save to history');
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
        setQuizState('upload');
        break;
      case 'quiz':
        setQuizState('config');
        break;
      case 'results':
        setQuizState('quiz');
        break;
      default:
        router.push('/');
    }
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
                onClick={handleGoHome}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {quizState === 'upload' && 'Upload Document'}
                {quizState === 'config' && 'Configure Quiz'}
                {quizState === 'quiz' && `Quiz: ${testName}`}
                {quizState === 'results' && 'Quiz Results'}
              </h1>
            </div>
            <p className="text-gray-600">
              {quizState === 'upload' && 'Upload a document to generate a quiz'}
              {quizState === 'config' && `Configure your quiz for: ${uploadedFile?.fileName}`}
              {quizState === 'quiz' && 'Answer the questions below'}
              {quizState === 'results' && 'Review your results'}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
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

          {/* Content based on state */}
          {quizState === 'upload' && (
            <div className="max-w-2xl">
              <FileUpload
                onFileProcessed={handleFileProcessed}
                onError={handleFileError}
              />
            </div>
          )}

          {quizState === 'config' && uploadedFile && (
            <div className="max-w-2xl">
              <QuizConfig
                onConfigSubmit={handleConfigSubmit}
                loading={loading}
              />
            </div>
          )}

          {quizState === 'quiz' && questions.length > 0 && (
            <div className="max-w-4xl">
              <QuizDisplay
                questions={questions}
                testName={testName}
                onQuizComplete={handleQuizComplete}
                onGoBack={handleGoBack}
              />
            </div>
          )}

          {quizState === 'results' && (
            <div className="max-w-4xl">
              <QuizResults
                questions={questions}
                answers={answers}
                score={score}
                timeTaken={timeTaken}
                testName={testName}
                onRetakeQuiz={handleRetakeQuiz}
                onGoHome={handleGoHome}
                onNewQuizFromFile={handleNewQuizFromFile}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
