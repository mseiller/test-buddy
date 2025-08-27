'use client';

import React from 'react';
import { Question, UserAnswer } from '@/types';

interface QuestionRendererProps {
  question: Question;
  currentAnswer?: UserAnswer;
  onUpdateAnswer: (answer: string | number | number[] | boolean) => void;
}

export default function QuestionRenderer({
  question,
  currentAnswer,
  onUpdateAnswer
}: QuestionRendererProps) {
  // Helper function for MSQ questions to toggle selection
  const toggleMSQOption = (optionIndex: number) => {
    const currentSelections = (currentAnswer?.answer as number[]) || [];
    const isSelected = currentSelections.includes(optionIndex);
    
    if (isSelected) {
      // Remove the option
      const newSelections = currentSelections.filter(index => index !== optionIndex);
      onUpdateAnswer(newSelections);
    } else {
      // Add the option, but respect selectCount if specified
      if (question.selectCount && currentSelections.length >= question.selectCount) {
        // If we're at the limit, replace the first selection
        const newSelections = [...currentSelections.slice(1), optionIndex];
        onUpdateAnswer(newSelections);
      } else {
        // Add the new selection
        const newSelections = [...currentSelections, optionIndex];
        onUpdateAnswer(newSelections);
      }
    }
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'MCQ':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={`${question.id}-option-${index}`} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={index}
                  checked={currentAnswer?.answer === index}
                  onChange={() => onUpdateAnswer(index)}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'MSQ':
        const currentSelections = (currentAnswer?.answer as number[]) || [];
        const selectCount = question.selectCount;
        const selectText = selectCount 
          ? `Select ${selectCount} answer${selectCount > 1 ? 's' : ''}` 
          : 'Select all that apply';

        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-3">
              {selectText} ({currentSelections.length} selected)
            </p>
            {question.options?.map((option, index) => {
              const isSelected = currentSelections.includes(index);
              const isDisabled = !!(selectCount && !isSelected && currentSelections.length >= selectCount);
              
              return (
                <label key={`${question.id}-option-${index}`} className={`flex items-center space-x-3 cursor-pointer group ${isDisabled ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggleMSQOption(index)}
                    className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case 'True-False':
        const boolAnswer = currentAnswer?.answer as boolean | undefined;
        return (
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="true"
                checked={boolAnswer === true}
                onChange={() => onUpdateAnswer(true)}
                className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className={`group-hover:text-indigo-600 transition-colors ${
                boolAnswer === true ? 'text-indigo-600 font-medium' : 'text-gray-900'
              }`}>
                True
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="false"
                checked={boolAnswer === false}
                onChange={() => onUpdateAnswer(false)}
                className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className={`group-hover:text-indigo-600 transition-colors ${
                boolAnswer === false ? 'text-indigo-600 font-medium' : 'text-gray-900'
              }`}>
                False
              </span>
            </label>
          </div>
        );

      case 'Fill-in-the-blank':
        return (
          <input
            type="text"
            value={Array.isArray(currentAnswer?.answer) || typeof currentAnswer?.answer === 'boolean' ? '' : (currentAnswer?.answer || '')}
            onChange={(e) => onUpdateAnswer(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            placeholder="Enter your answer..."
          />
        );

      case 'Essay':
        return (
          <textarea
            value={Array.isArray(currentAnswer?.answer) || typeof currentAnswer?.answer === 'boolean' ? '' : (currentAnswer?.answer || '')}
            onChange={(e) => onUpdateAnswer(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 min-h-[120px] resize-y"
            placeholder="Enter your detailed answer..."
          />
        );

      default:
        return (
          <div className="text-gray-500 italic">
            Unsupported question type: {question.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex-1 pr-4">
          {question.question}
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {question.type}
        </span>
      </div>

      {/* Question Content */}
      <div className="mb-8">
        {renderQuestionContent()}
      </div>
    </div>
  );
}
