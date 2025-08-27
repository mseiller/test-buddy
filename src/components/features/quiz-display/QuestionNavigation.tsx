'use client';

import React from 'react';
import { Flag } from 'lucide-react';
import { Question, UserAnswer } from '@/types';
import { Card } from '@/components/ui';

interface QuestionNavigationProps {
  questions: Question[];
  answers: UserAnswer[];
  currentQuestionIndex: number;
  markedForReview: Set<string>;
  isReviewing: boolean;
  reviewQuestions: string[];
  onGoToQuestion: (index: number) => void;
}

export default function QuestionNavigation({
  questions,
  answers,
  currentQuestionIndex,
  markedForReview,
  isReviewing,
  reviewQuestions,
  onGoToQuestion
}: QuestionNavigationProps) {
  const isAnswered = (index: number): boolean => {
    const answer = answers[index]?.answer;
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer !== '' && answer !== undefined;
  };

  return (
    <Card className="sticky top-6">
      <h3 className="font-medium text-gray-900 mb-3">Questions</h3>
      <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
        {questions.map((question, index) => {
          const answered = isAnswered(index);
          const isMarked = markedForReview.has(question.id);
          const isCurrent = index === currentQuestionIndex;
          const isInReviewList = isReviewing && reviewQuestions.includes(question.id);
          
          return (
            <button
              key={question.id}
              onClick={() => onGoToQuestion(index)}
              disabled={isReviewing && !isInReviewList}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all relative ${
                isCurrent
                  ? 'bg-indigo-600 text-white'
                  : answered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${
                isReviewing && !isInReviewList 
                  ? 'opacity-50 cursor-not-allowed' 
                  : ''
              }`}
            >
              {index + 1}
              {isMarked && (
                <Flag className="h-3 w-3 absolute -top-1 -right-1 text-yellow-500" />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
