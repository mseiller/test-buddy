'use client';

import React from 'react';
import { CheckCircle, Flag } from 'lucide-react';
import { Card } from '@/components/ui';

interface ProgressBarProps {
  testName: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  markedForReview: Set<string>;
  isReviewing: boolean;
  reviewQuestionsLength: number;
  currentQuestionId: string;
  reviewQuestions: string[];
  onToggleMarkForReview: () => void;
}

export default function ProgressBar({
  testName,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  markedForReview,
  isReviewing,
  reviewQuestionsLength,
  currentQuestionId,
  reviewQuestions,
  onToggleMarkForReview
}: ProgressBarProps) {
  const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{testName}</h1>
          <p className="text-gray-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Answered Count */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4" />
            <span>{answeredCount}/{totalQuestions} answered</span>
          </div>
          
          {/* Mark for Review Button */}
          <button
            onClick={onToggleMarkForReview}
            className={`p-2 rounded-lg transition-colors ${
              markedForReview.has(currentQuestionId)
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Mark for review"
          >
            <Flag className="h-4 w-4" />
          </button>
          
          {/* Review Status Indicators */}
          {markedForReview.size > 0 && !isReviewing && (
            <div className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              {markedForReview.size} marked for review
            </div>
          )}
          
          {isReviewing && (
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Review Mode ({reviewQuestions.indexOf(currentQuestionId) + 1}/{reviewQuestionsLength})
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </Card>
  );
}
