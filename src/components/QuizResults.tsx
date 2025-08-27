'use client';

import React, { useState } from 'react';
import { Question, UserAnswer } from '@/types';

// Import the new modular components
import ScoreDisplay from './features/quiz-results/ScoreDisplay';
import QuestionReview from './features/quiz-results/QuestionReview';
import ActionButtons from './features/quiz-results/ActionButtons';
import AIFeedbackSection from './features/quiz-results/AIFeedbackSection';

interface QuizResultsProps {
  questions: Question[];
  answers: UserAnswer[];
  score: number;
  timeTaken: number;
  testName: string;
  onRetakeQuiz: () => void;
  onGoHome: () => void;
  onNewQuizFromFile?: () => void;
  isHistoricalReview?: boolean;
  onBackToHistory?: () => void;
  canUseAiFeedback?: boolean;
  canRetake?: boolean;
}

export default function QuizResults({ 
  questions, 
  answers, 
  timeTaken, 
  testName, 
  onRetakeQuiz, 
  onGoHome,
  onNewQuizFromFile,
  onBackToHistory,
  isHistoricalReview,
  canUseAiFeedback = true,
  canRetake = true
}: QuizResultsProps) {
  const [showReview, setShowReview] = useState(false);

  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Show question review modal
  if (showReview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Question Review</h1>
          <button
            onClick={() => setShowReview(false)}
            className="text-gray-500 hover:text-gray-700 text-lg font-medium"
          >
            ← Back to Results
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = answers.find(a => a.questionId === question.id);
            if (!userAnswer) return null;
            
            return (
              <QuestionReview
                key={question.id}
                question={question}
                userAnswer={userAnswer}
                index={index}
              />
            );
          })}
        </div>

        {/* Back to Results Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowReview(false)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // Main results view
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Score Display */}
      <ScoreDisplay
        percentage={percentage}
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        timeTaken={timeTaken}
        testName={testName}
      />

      {/* AI Feedback Section */}
      <AIFeedbackSection
        testName={testName}
        percentage={percentage}
        questions={questions}
        answers={answers}
        canUseAiFeedback={canUseAiFeedback}
        isHistoricalReview={isHistoricalReview}
      />

      {/* Action Buttons */}
      <ActionButtons
        onRetakeQuiz={onRetakeQuiz}
        onGoHome={onGoHome}
        onNewQuizFromFile={onNewQuizFromFile}
        onBackToHistory={onBackToHistory}
        onShowReview={() => setShowReview(true)}
        isHistoricalReview={isHistoricalReview}
        canRetake={canRetake}
      />
    </div>
  );
}
