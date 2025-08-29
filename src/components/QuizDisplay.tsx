'use client';

import React, { useState, useEffect } from 'react';
import { Question, UserAnswer } from '@/types';

// Import the new modular components
import ProgressBar from './features/quiz-display/ProgressBar';
import QuestionNavigation from './features/quiz-display/QuestionNavigation';
import QuestionRenderer from './features/quiz-display/QuestionRenderer';
import NavigationControls from './features/quiz-display/NavigationControls';

interface QuizDisplayProps {
  questions: Question[];
  testName: string;
  onQuizComplete: (answers: UserAnswer[], timeTaken: number, isIncomplete?: boolean) => void;
  onGoBack: () => void;
  onGoToFolders?: () => void;
  isRetake?: boolean;
}

export default function QuizDisplay({ 
  questions, 
  testName, 
  onQuizComplete, 
  onGoBack 
}: QuizDisplayProps) {
  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [startTime] = useState(Date.now());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<string[]>([]);

  // Derived values
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Initialize answers array
  useEffect(() => {
    const initialAnswers: UserAnswer[] = questions.map(q => ({
      questionId: q.id,
      answer: q.type === 'MSQ' ? [] : '', // Initialize MSQ questions with empty array
      isCorrect: false,
    }));
    setAnswers(initialAnswers);
  }, [questions]);

  // Helper functions
  const getCurrentAnswer = () => {
    if (!currentQuestion) return undefined;
    return answers.find(a => a.questionId === currentQuestion.id);
  };

  const updateAnswer = (answer: string | number | number[] | boolean) => {
    if (!currentQuestion) return;
    setAnswers(prev => prev.map(a => 
      a.questionId === currentQuestion.id 
        ? { ...a, answer } 
        : a
    ));
  };

  const getAnsweredCount = () => {
    return answers.filter(a => {
      if (Array.isArray(a.answer)) {
        return a.answer.length > 0;
      }
      return a.answer !== '' && a.answer !== undefined;
    }).length;
  };



  // Navigation functions
  const goToQuestion = (index: number) => {
    if (isReviewing) {
      const question = questions[index];
      if (!question) return;
      
      const reviewIndex = reviewQuestions.findIndex(qId => qId === question.id);
      if (reviewIndex !== -1) {
        const actualQuestionIndex = questions.findIndex(q => q.id === reviewQuestions[reviewIndex]);
        setCurrentQuestionIndex(actualQuestionIndex);
      }
    } else {
      setCurrentQuestionIndex(index);
    }
  };

  const goToNext = () => {
    if (!currentQuestion) return;
    
    if (isReviewing) {
      const currentReviewIndex = reviewQuestions.indexOf(currentQuestion.id);
      if (currentReviewIndex < reviewQuestions.length - 1) {
        const nextQuestionId = reviewQuestions[currentReviewIndex + 1];
        const nextIndex = questions.findIndex(q => q.id === nextQuestionId);
        setCurrentQuestionIndex(nextIndex);
      }
    } else {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const goToPrevious = () => {
    if (!currentQuestion) return;
    
    if (isReviewing) {
      const currentReviewIndex = reviewQuestions.indexOf(currentQuestion.id);
      if (currentReviewIndex > 0) {
        const prevQuestionId = reviewQuestions[currentReviewIndex - 1];
        const prevIndex = questions.findIndex(q => q.id === prevQuestionId);
        setCurrentQuestionIndex(prevIndex);
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    }
  };

  // Review functions
  const toggleMarkForReview = () => {
    if (!currentQuestion) return;
    
    const newMarked = new Set(markedForReview);
    if (newMarked.has(currentQuestion.id)) {
      newMarked.delete(currentQuestion.id);
    } else {
      newMarked.add(currentQuestion.id);
    }
    setMarkedForReview(newMarked);
  };

  const startReview = () => {
    if (markedForReview.size > 0) {
      const reviewList = Array.from(markedForReview);
      setReviewQuestions(reviewList);
      setIsReviewing(true);
      // Go to first marked question
      const firstMarkedIndex = questions.findIndex(q => q.id === reviewList[0]);
      setCurrentQuestionIndex(firstMarkedIndex);
    }
  };

  const exitReview = () => {
    setIsReviewing(false);
    setReviewQuestions([]);
  };

  // Quiz completion
  const handleFinishQuiz = (isIncomplete = false) => {
    const timeTaken = Date.now() - startTime;
    
    // Update answers with final scores
    const finalAnswers = answers.map((answer, index) => {
      const question = questions[index];
      if (!question) return answer;
      
      let isCorrect = false;
      
      switch (question.type) {
        case 'MCQ':
          isCorrect = answer.answer === question.correctAnswer;
          break;
        case 'MSQ':
          const userSelections = answer.answer as number[];
          const correctSelections = question.correctAnswer as number[];
          isCorrect = Array.isArray(userSelections) && 
                     Array.isArray(correctSelections) &&
                     userSelections.length === correctSelections.length &&
                     userSelections.every(selection => correctSelections.includes(selection));
          break;
        case 'True-False':
          isCorrect = answer.answer === question.correctAnswer;
          break;
        case 'Fill-in-the-blank':
          const userText = (answer.answer as string).toLowerCase().trim();
          const correctText = (question.correctAnswer as string).toLowerCase().trim();
          isCorrect = userText === correctText;
          break;
        case 'Essay':
          isCorrect = false; // Essays need manual grading
          break;
      }
      
      return { ...answer, isCorrect };
    });
    
    onQuizComplete(finalAnswers, timeTaken, isIncomplete);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <ProgressBar
        testName={testName}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        answeredCount={getAnsweredCount()}
        markedForReview={markedForReview}
        isReviewing={isReviewing}
        reviewQuestionsLength={reviewQuestions.length}
        currentQuestionId={currentQuestion?.id || ''}
        reviewQuestions={reviewQuestions}
        onToggleMarkForReview={toggleMarkForReview}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1">
          <QuestionNavigation
            questions={questions}
            answers={answers}
            currentQuestionIndex={currentQuestionIndex}
            markedForReview={markedForReview}
            isReviewing={isReviewing}
            reviewQuestions={reviewQuestions}
            onGoToQuestion={goToQuestion}
          />
        </div>

        {/* Main Question Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Question Renderer */}
            {currentQuestion && getCurrentAnswer() && (
              <QuestionRenderer
                question={currentQuestion}
                currentAnswer={getCurrentAnswer()!}
                onUpdateAnswer={updateAnswer}
              />
            )}

            {/* Navigation Controls */}
            <NavigationControls
              isFirstQuestion={isFirstQuestion}
              isLastQuestion={isLastQuestion}
              isReviewing={isReviewing}
              reviewQuestions={reviewQuestions}
              currentQuestionId={currentQuestion?.id || ''}
              onGoToPrevious={goToPrevious}
              onGoToNext={goToNext}
              onStartReview={startReview}
              onExitReview={exitReview}
              onFinishQuiz={() => handleFinishQuiz(false)}
              onGoBack={onGoBack}
              markedForReviewCount={markedForReview.size}
              answeredCount={getAnsweredCount()}
              totalQuestions={totalQuestions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
