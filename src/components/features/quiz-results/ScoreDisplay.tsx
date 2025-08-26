'use client';

import React from 'react';
import { Trophy, CheckCircle, XCircle, Book, Clock } from 'lucide-react';
import { Card } from '@/components/ui';

interface ScoreDisplayProps {
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: number;
  testName: string;
}

export default function ScoreDisplay({
  percentage,
  correctAnswers,
  totalQuestions,
  timeTaken,
  testName
}: ScoreDisplayProps) {
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 91) return 'text-green-600';
    if (score >= 81) return 'text-blue-600';
    if (score >= 71) return 'text-yellow-600';
    if (score >= 61) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 91) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (score >= 81) return <CheckCircle className="h-8 w-8 text-blue-500" />;
    if (score >= 71) return <CheckCircle className="h-8 w-8 text-yellow-500" />;
    if (score >= 61) return <Book className="h-8 w-8 text-orange-500" />;
    return <XCircle className="h-8 w-8 text-red-500" />;
  };

  const getGrade = (score: number) => {
    if (score >= 91) return 'A';
    if (score >= 81) return 'B';
    if (score >= 71) return 'C';
    if (score >= 61) return 'D';
    return 'F';
  };

  return (
    <Card className="text-center mb-8">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        {getScoreIcon(percentage)}
      </div>
      
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
      <h2 className="text-xl text-gray-600 mb-4">{testName}</h2>
      
      {/* Score Card */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className={`text-6xl font-bold mb-2 ${getScoreColor(percentage)}`}>
          {percentage}%
        </div>
        <div className="text-2xl font-semibold text-gray-700 mb-2">
          Grade: {getGrade(percentage)}
        </div>
        <div className="text-gray-600">
          {correctAnswers} out of {totalQuestions} questions correct
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Time Taken</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatTime(timeTaken)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Accuracy</span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {Math.round((correctAnswers / totalQuestions) * 100)}%
          </div>
        </div>
      </div>
    </Card>
  );
}
