'use client';

import React from 'react';
import { RotateCcw, Home, Eye, Shuffle, History } from 'lucide-react';
import { Button } from '@/components/ui';

interface ActionButtonsProps {
  onRetakeQuiz?: () => void;
  onGoHome: () => void;
  onNewQuizFromFile?: () => void;
  onBackToHistory?: () => void;
  onShowReview: () => void;
  isHistoricalReview?: boolean;
  canRetake?: boolean;
}

export default function ActionButtons({
  onRetakeQuiz,
  onGoHome,
  onNewQuizFromFile,
  onBackToHistory,
  onShowReview,
  isHistoricalReview = false,
  canRetake = true
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {/* Review Answers Button */}
      <Button
        variant="primary"
        icon={Eye}
        onClick={onShowReview}
      >
        Review Answers
      </Button>
      
      {/* Retake Quiz Button */}
      {onRetakeQuiz && canRetake && (
        <Button
          variant="secondary"
          icon={RotateCcw}
          onClick={onRetakeQuiz}
        >
          Retake Quiz
        </Button>
      )}
      
      {/* Retake Disabled (Pro Feature) */}
      {!canRetake && (
        <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
          <RotateCcw className="h-4 w-4" />
          <span>Retake (Pro Feature)</span>
        </div>
      )}
      
      {/* New Questions Button */}
      {onNewQuizFromFile && (
        <Button
          variant="success"
          icon={Shuffle}
          onClick={onNewQuizFromFile}
        >
          New Questions
        </Button>
      )}
      
      {/* Navigation Buttons */}
      {onBackToHistory ? (
        <Button
          variant="ghost"
          icon={History}
          onClick={onBackToHistory}
        >
          Back to History
        </Button>
      ) : (
        <Button
          variant="ghost"
          icon={Home}
          onClick={onGoHome}
        >
          {isHistoricalReview ? 'Back to Home' : 'Home'}
        </Button>
      )}
    </div>
  );
}
