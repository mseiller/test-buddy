'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Question, UserAnswer } from '@/types';
import { Card } from '@/components/ui';

interface QuestionReviewProps {
  question: Question;
  userAnswer: UserAnswer;
  index: number;
}

export default function QuestionReview({
  question,
  userAnswer,
  index
}: QuestionReviewProps) {
  const isCorrect = userAnswer.isCorrect;
  const isEssay = question.type === 'Essay';

  const renderUserAnswer = () => {
    if (question.type === 'MCQ') {
      const selectedIndex = userAnswer.answer as number;
      return (
        <div className="text-gray-900">
          {question.options?.[selectedIndex] || 'No answer selected'}
        </div>
      );
    } else if (question.type === 'MSQ') {
      return (
        <div className="text-gray-900">
          {Array.isArray(userAnswer.answer) && userAnswer.answer.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {userAnswer.answer.map((index: number) => (
                <li key={index}>{question.options?.[index] || `Option ${index + 1}`}</li>
              ))}
            </ul>
          ) : (
            <p>No answers selected</p>
          )}
        </div>
      );
    } else {
      return (
        <p className="text-gray-900 whitespace-pre-wrap">
          {userAnswer.answer || 'No answer provided'}
        </p>
      );
    }
  };

  const renderCorrectAnswer = () => {
    if (question.type === 'MCQ') {
      const correctIndex = question.correctAnswer as number;
      return (
        <div className="text-gray-900">
          {question.options?.[correctIndex] || 'Answer not available'}
        </div>
      );
    } else if (question.type === 'MSQ') {
      return (
        <div className="text-gray-900">
          {Array.isArray(question.correctAnswer) ? (
            <ul className="list-disc list-inside space-y-1">
              {question.correctAnswer.map((index: number) => (
                <li key={index}>{question.options?.[index] || `Option ${index + 1}`}</li>
              ))}
            </ul>
          ) : (
            <p>No correct answers defined</p>
          )}
        </div>
      );
    } else {
      return (
        <p className="text-gray-900">
          {question.correctAnswer}
        </p>
      );
    }
  };

  return (
    <Card className={`mb-6 border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              Question {index + 1}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              isCorrect 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isCorrect ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  {isEssay ? 'Needs Review' : 'Incorrect'}
                </>
              )}
            </span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            {question.question}
          </h3>
        </div>
      </div>

      {/* Answers Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Your Answer */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
          <div className={`p-3 rounded-lg ${
            isCorrect ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {renderUserAnswer()}
          </div>
        </div>

        {/* Correct Answer */}
        {!isEssay && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</h4>
            <div className="p-3 bg-green-50 rounded-lg">
              {renderCorrectAnswer()}
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      {question.explanation && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Explanation:</h4>
          <p className="text-sm text-gray-600">{question.explanation}</p>
        </div>
      )}
    </Card>
  );
}
