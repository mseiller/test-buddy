'use client';

import { useState } from 'react';
import { Settings, BookOpen, CheckSquare, Edit, FileText, Shuffle } from 'lucide-react';
import { QuizType } from '@/types';

interface QuizConfigProps {
  onConfigSubmit: (quizType: QuizType, questionCount: number, testName: string) => void;
  loading?: boolean;
  isRetake?: boolean;
  originalTestName?: string;
}

export default function QuizConfig({ onConfigSubmit, loading = false, isRetake = false, originalTestName }: QuizConfigProps) {
  const [quizType, setQuizType] = useState<QuizType>('MCQ');
  const [questionCount, setQuestionCount] = useState(5);
  const [testName, setTestName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfigSubmit(quizType, questionCount, testName.trim() || `${quizType} Quiz`);
  };

  const quizTypes = [
    {
      type: 'MCQ' as QuizType,
      label: 'Multiple Choice',
      description: 'Questions with 4 answer options',
      icon: CheckSquare,
      color: 'bg-blue-500',
    },
    {
      type: 'Fill-in-the-blank' as QuizType,
      label: 'Fill in the Blank',
      description: 'Complete sentences with missing words',
      icon: Edit,
      color: 'bg-green-500',
    },
    {
      type: 'Essay' as QuizType,
      label: 'Essay Questions',
      description: 'Open-ended questions requiring detailed answers',
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      type: 'Mixed' as QuizType,
      label: 'Mixed Types',
      description: 'Combination of all question types',
      icon: Shuffle,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-6 w-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {isRetake ? 'Retake Quiz Configuration' : 'Quiz Configuration'}
        </h2>
      </div>

      {isRetake && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Shuffle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-blue-800 font-medium">Retaking Quiz</h3>
              <p className="text-blue-700 text-sm">
                Generating new questions from the same content: <strong>{originalTestName}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Name */}
        <div>
          <label htmlFor="testName" className="block text-sm font-medium text-gray-700 mb-2">
            Test Name
          </label>
          <input
            type="text"
            id="testName"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Enter a name for your test (e.g., 'Software Security Quiz')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-black"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to use default name based on quiz type
          </p>
        </div>

        {/* Quiz Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Quiz Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.type}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    quizType === type.type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setQuizType(type.type)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`${type.color} p-2 rounded-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                  {quizType === type.type && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label htmlFor="questionCount" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              id="questionCount"
              min="5"
              max="50"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">
                {questionCount}
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 questions</span>
            <span>50 questions</span>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating Quiz...
              </div>
            ) : (
              'Generate Quiz'
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
} 