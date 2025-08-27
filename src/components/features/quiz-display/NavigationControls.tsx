'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface NavigationControlsProps {
  // Navigation state
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isReviewing: boolean;
  reviewQuestions: string[];
  currentQuestionId: string;
  
  // Actions
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  onStartReview: () => void;
  onExitReview: () => void;
  onFinishQuiz: () => void;
  onGoBack: () => void;
  
  // State
  markedForReviewCount: number;
  answeredCount: number;
  totalQuestions: number;
}

export default function NavigationControls({
  isFirstQuestion,
  isLastQuestion,
  isReviewing,
  reviewQuestions,
  currentQuestionId,
  onGoToPrevious,
  onGoToNext,
  onStartReview,
  onExitReview,
  onFinishQuiz,
  onGoBack,
  markedForReviewCount,
  answeredCount,
  totalQuestions
}: NavigationControlsProps) {
  const isReviewingLastQuestion = isReviewing && 
    reviewQuestions.indexOf(currentQuestionId) === reviewQuestions.length - 1;
  
  const isPreviousDisabled = isReviewing 
    ? reviewQuestions.indexOf(currentQuestionId) === 0 
    : isFirstQuestion;
  


  return (
    <div className="flex items-center justify-between">
      {/* Previous Button */}
      <Button
        variant="ghost"
        onClick={onGoToPrevious}
        disabled={isPreviousDisabled}
        icon={ArrowLeft}
        iconPosition="left"
      >
        Previous
      </Button>

      {/* Center Actions */}
      <div className="flex space-x-3">
        {isReviewing ? (
          <>
            <Button
              variant="outline"
              onClick={onExitReview}
            >
              Exit Review
            </Button>
            {isReviewingLastQuestion ? (
              <Button
                variant="success"
                onClick={onFinishQuiz}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onGoToNext}
                icon={ArrowRight}
                iconPosition="right"
              >
                Next Review
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Go Back Button */}
            <Button
              variant="ghost"
              onClick={onGoBack}
            >
              Back to Upload
            </Button>
            
            {/* Review Button (only show if there are marked questions) */}
            {markedForReviewCount > 0 && (
              <Button
                variant="warning"
                onClick={onStartReview}
              >
                Review Marked ({markedForReviewCount})
              </Button>
            )}
            
            {/* Next/Submit Button */}
            {isLastQuestion ? (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={onFinishQuiz}
                >
                  Submit Incomplete ({answeredCount}/{totalQuestions})
                </Button>
                <Button
                  variant="success"
                  onClick={onFinishQuiz}
                >
                  Submit Quiz
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={onGoToNext}
                icon={ArrowRight}
                iconPosition="right"
              >
                Next
              </Button>
            )}
          </>
        )}
      </div>

      {/* Spacer for layout balance */}
      <div className="w-20" />
    </div>
  );
}
