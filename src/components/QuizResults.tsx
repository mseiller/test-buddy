'use client';

import { useState } from 'react';
import { Trophy, CheckCircle, XCircle, Clock, Book, RotateCcw, Home, Eye } from 'lucide-react';
import { Question, UserAnswer } from '@/types';

interface QuizResultsProps {
  questions: Question[];
  answers: UserAnswer[];
  score: number;
  timeTaken: number;
  testName: string;
  onRetakeQuiz: () => void;
  onGoHome: () => void;
}

export default function QuizResults({ 
  questions, 
  answers, 
  score, 
  timeTaken, 
  testName, 
  onRetakeQuiz, 
  onGoHome 
}: QuizResultsProps) {
  const [showReview, setShowReview] = useState(false);
  
  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (score >= 60) return <CheckCircle className="h-8 w-8 text-yellow-500" />;
    return <XCircle className="h-8 w-8 text-red-500" />;
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const renderQuestionReview = (question: Question, userAnswer: UserAnswer, index: number) => {
    const isCorrect = userAnswer.isCorrect;
    const isEssay = question.type === 'Essay';

    return (
      <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                {question.type}
              </span>
            </div>
          </div>
          {!isEssay && (
            <div className={`flex items-center space-x-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium">{isCorrect ? 'Correct' : 'Incorrect'}</span>
            </div>
          )}
        </div>

        {/* User's Answer */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
          <div className={`p-3 rounded-lg ${isEssay ? 'bg-blue-50' : isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            {question.type === 'MCQ' ? (
              <p className="text-gray-900">
                {question.options?.[userAnswer.answer as number] || 'No answer selected'}
              </p>
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">
                {userAnswer.answer || 'No answer provided'}
              </p>
            )}
          </div>
        </div>

        {/* Correct Answer (for non-essay questions) */}
        {!isEssay && question.correctAnswer !== undefined && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</h4>
            <div className="p-3 bg-green-100 rounded-lg">
              <p className="text-gray-900">
                {question.type === 'MCQ' 
                  ? question.options?.[question.correctAnswer as number]
                  : question.correctAnswer
                }
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Explanation:</h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-gray-700">{question.explanation}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showReview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Quiz Review - {testName}</h1>
            <button
              onClick={() => setShowReview(false)}
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              ← Back to Results
            </button>
          </div>
          <p className="text-gray-600">
            Review your answers and explanations for each question
          </p>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = answers.find(a => a.questionId === question.id);
            return userAnswer ? renderQuestionReview(question, userAnswer, index) : null;
          })}
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => setShowReview(false)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Results
          </button>
          <button
            onClick={onRetakeQuiz}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Score Display */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            {getScoreIcon(percentage)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
          <h2 className="text-xl text-gray-600 mb-4">{testName}</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="text-6xl font-bold mb-2 ${getScoreColor(percentage)}">
              {percentage}%
            </div>
            <div className="text-2xl font-semibold text-gray-700 mb-2">
              Grade: {getGrade(percentage)}
            </div>
            <div className="text-gray-600">
              {correctAnswers} out of {totalQuestions} questions correct
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600">Time Taken</div>
            <div className="text-xl font-semibold text-blue-600">{formatTime(timeTaken)}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">Correct</div>
            <div className="text-xl font-semibold text-green-600">{correctAnswers}</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-sm text-gray-600">Incorrect</div>
            <div className="text-xl font-semibold text-red-600">{totalQuestions - correctAnswers}</div>
          </div>
        </div>

        {/* Performance Message */}
        <div className="mb-8">
          {percentage >= 90 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-1">Excellent Work! 🎉</h3>
              <p className="text-green-700">Outstanding performance! You've mastered this material.</p>
            </div>
          )}
          {percentage >= 70 && percentage < 90 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold mb-1">Good Job! 👍</h3>
              <p className="text-blue-700">Solid understanding. Review the explanations to improve further.</p>
            </div>
          )}
          {percentage >= 50 && percentage < 70 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-yellow-800 font-semibold mb-1">Keep Practicing 📚</h3>
              <p className="text-yellow-700">You're on the right track. Study the material and try again.</p>
            </div>
          )}
          {percentage < 50 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold mb-1">Need More Study 📖</h3>
              <p className="text-red-700">Review the material thoroughly before retaking the quiz.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Review Answers</span>
          </button>
          
          <button
            onClick={onRetakeQuiz}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retake Quiz</span>
          </button>
          
          <button
            onClick={onGoHome}
            className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>New Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
} 