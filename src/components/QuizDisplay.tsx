'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, Flag, HelpCircle } from 'lucide-react';
import { Question, UserAnswer } from '@/types';

interface QuizDisplayProps {
  questions: Question[];
  testName: string;
  onQuizComplete: (answers: UserAnswer[], timeTaken: number, isIncomplete?: boolean) => void;
  onGoBack: () => void;
  onGoToFolders?: () => void;
  isRetake?: boolean;
}

export default function QuizDisplay({ questions, testName, onQuizComplete, onGoBack, onGoToFolders, isRetake = false }: QuizDisplayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [startTime] = useState(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<string[]>([]);
  
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Initialize answers array
  useEffect(() => {
    const initialAnswers: UserAnswer[] = questions.map(q => ({
      questionId: q.id,
      answer: '',
      isCorrect: false,
    }));
    setAnswers(initialAnswers);
  }, [questions]);

  const getCurrentAnswer = () => {
    return answers.find(a => a.questionId === currentQuestion.id);
  };

  const updateAnswer = (answer: string | number) => {
    setAnswers(prev => prev.map(a => 
      a.questionId === currentQuestion.id 
        ? { ...a, answer } 
        : a
    ));
  };

  const toggleMarkForReview = () => {
    const questionId = currentQuestion.id;
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const startReview = () => {
    const reviewList = Array.from(markedForReview);
    if (reviewList.length > 0) {
      setReviewQuestions(reviewList);
      setIsReviewing(true);
      // Go to first review question
      const firstReviewIndex = questions.findIndex(q => q.id === reviewList[0]);
      if (firstReviewIndex !== -1) {
        setCurrentQuestionIndex(firstReviewIndex);
      }
    } else {
      // No questions marked for review, finish quiz
      handleFinishQuiz();
    }
  };

  const exitReview = () => {
    setIsReviewing(false);
    setReviewQuestions([]);
  };

  const goToNext = () => {
    if (isReviewing) {
      const currentReviewIndex = reviewQuestions.indexOf(currentQuestion.id);
      const nextReviewIndex = currentReviewIndex + 1;
      if (nextReviewIndex < reviewQuestions.length) {
        const nextQuestionId = reviewQuestions[nextReviewIndex];
        const nextQuestionIndex = questions.findIndex(q => q.id === nextQuestionId);
        if (nextQuestionIndex !== -1) {
          setCurrentQuestionIndex(nextQuestionIndex);
        }
      }
    } else if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (isReviewing) {
      const currentReviewIndex = reviewQuestions.indexOf(currentQuestion.id);
      const prevReviewIndex = currentReviewIndex - 1;
      if (prevReviewIndex >= 0) {
        const prevQuestionId = reviewQuestions[prevReviewIndex];
        const prevQuestionIndex = questions.findIndex(q => q.id === prevQuestionId);
        if (prevQuestionIndex !== -1) {
          setCurrentQuestionIndex(prevQuestionIndex);
        }
      }
    } else if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const calculateScore = (userAnswers: UserAnswer[]) => {
    let correct = 0;
    const scoredAnswers = userAnswers.map(userAnswer => {
      const question = questions.find(q => q.id === userAnswer.questionId);
      let isCorrect = false;

      if (question && question.type !== 'Essay') {
        if (question.type === 'MCQ' || question.type === 'True-False') {
          isCorrect = userAnswer.answer === question.correctAnswer;
        } else if (question.type === 'Fill-in-the-blank') {
          const userText = String(userAnswer.answer).toLowerCase().trim();
          const correctText = String(question.correctAnswer).toLowerCase().trim();
          isCorrect = userText === correctText;
        }
      }

      if (isCorrect) correct++;
      return { ...userAnswer, isCorrect };
    });

    return { scoredAnswers, score: (correct / totalQuestions) * 100 };
  };

  const handleFinishQuiz = () => {
    const timeTaken = Date.now() - startTime;
    const { scoredAnswers } = calculateScore(answers);
    onQuizComplete(scoredAnswers, timeTaken);
  };

  const handleSaveIncomplete = () => {
    const timeTaken = Date.now() - startTime;
    const { scoredAnswers } = calculateScore(answers);
    onQuizComplete(scoredAnswers, timeTaken, true); // Pass true to indicate incomplete
  };

  const renderQuestion = () => {
    const currentAnswer = getCurrentAnswer();

    switch (currentQuestion.type) {
      case 'MCQ':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  currentAnswer?.answer === index
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={index}
                  checked={currentAnswer?.answer === index}
                  onChange={() => updateAnswer(index)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                  currentAnswer?.answer === index
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}>
                  {currentAnswer?.answer === index && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'Fill-in-the-blank':
        return (
          <div>
            <input
              type="text"
              value={currentAnswer?.answer || ''}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
          </div>
        );

      case 'True-False':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option, index) => (
              <label
                key={option}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  currentAnswer?.answer === index
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={index}
                  checked={currentAnswer?.answer === index}
                  onChange={() => updateAnswer(index)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                  currentAnswer?.answer === index
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-gray-300'
                }`}>
                  {currentAnswer?.answer === index && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'Essay':
        return (
          <div>
            <textarea
              value={currentAnswer?.answer || ''}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder="Write your essay answer here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getAnsweredCount = () => {
    return answers.filter(a => {
      // Handle different answer types
      if (typeof a.answer === 'number') {
        return true; // Numbers (including 0) are valid answers
      }
      return a.answer !== '';
    }).length;
  };

  const isCurrentQuestionAnswered = () => {
    const current = getCurrentAnswer();
    if (!current) return false;
    
    // Handle different answer types
    if (typeof current.answer === 'number') {
      return true; // Numbers (including 0) are valid answers
    }
    return current.answer !== '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{testName}</h1>
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4" />
              <span>{getAnsweredCount()}/{totalQuestions} answered</span>
            </div>
            <button
              onClick={toggleMarkForReview}
              className={`p-2 rounded-lg transition-colors ${
                markedForReview.has(currentQuestion.id)
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Mark for review"
            >
              <Flag className="h-4 w-4" />
            </button>
            {markedForReview.size > 0 && !isReviewing && (
              <div className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                {markedForReview.size} marked for review
              </div>
            )}
            {isReviewing && (
              <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Review Mode ({reviewQuestions.indexOf(currentQuestion.id) + 1}/{reviewQuestions.length})
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
            <h3 className="font-medium text-gray-900 mb-3">Questions</h3>
            <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
              {questions.map((question, index) => {
                const isAnswered = answers[index]?.answer !== '';
                const isMarked = markedForReview.has(question.id);
                const isCurrent = index === currentQuestionIndex;
                const isInReviewList = isReviewing && reviewQuestions.includes(question.id);
                
                return (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    disabled={isReviewing && !isInReviewList}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all relative ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isAnswered
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
          </div>
        </div>

        {/* Main Question Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Question */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex-1 pr-4">
                  {currentQuestion.question}
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {currentQuestion.type}
                </span>
              </div>
            </div>

            {/* Answer Section */}
            <div className="mb-8">
              {renderQuestion()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevious}
                disabled={isReviewing ? reviewQuestions.indexOf(currentQuestion.id) === 0 : isFirstQuestion}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-3">
                {isReviewing ? (
                  <>
                    <button
                      onClick={exitReview}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
                    >
                      Exit Review
                    </button>
                    {reviewQuestions.indexOf(currentQuestion.id) === reviewQuestions.length - 1 ? (
                      <button
                        onClick={handleFinishQuiz}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      >
                        Finish Quiz
                      </button>
                    ) : (
                      <button
                        onClick={goToNext}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <span>Next Review</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {isLastQuestion ? (
                      <>
                        {markedForReview.size > 0 && (
                          <button
                            onClick={startReview}
                            className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                          >
                            Review Marked ({markedForReview.size})
                          </button>
                        )}
                        <button
                          onClick={handleFinishQuiz}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          Finish Quiz
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={goToNext}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center space-x-4">
        <button
          onClick={onGoBack}
          className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
        >
          ← Back to Setup
        </button>
        {isRetake && onGoToFolders && (
          <button
            onClick={onGoToFolders}
            className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            ← Back to Folders
          </button>
        )}
        <button
          onClick={handleSaveIncomplete}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
        >
          Save Progress & Exit
        </button>
      </div>
    </div>
  );
} 