'use client';

import { useState, useEffect } from 'react';
import { Trophy, CheckCircle, XCircle, Clock, Book, RotateCcw, Home, Eye, Shuffle, History, Sparkles, RefreshCw } from 'lucide-react';
import { Question, UserAnswer, FeedbackSummary } from '@/types';
import { OpenRouterService } from '@/services/openRouter';

interface QuizResultsProps {
  questions: Question[];
  answers: UserAnswer[];
  score: number;
  timeTaken: number;
  testName: string;
  onRetakeQuiz: () => void;
  onGoHome: () => void;
  onNewQuizFromFile?: () => void;
  isHistoricalReview?: boolean;
  onBackToHistory?: () => void;
}

export default function QuizResults({ 
  questions, 
  answers, 
  score, 
  timeTaken, 
  testName, 
  onRetakeQuiz, 
  onGoHome,
  onNewQuizFromFile,
  onBackToHistory,
  isHistoricalReview
}: QuizResultsProps) {
  const [showReview, setShowReview] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  const correctAnswers = answers.filter(a => a.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  const fetchFeedback = async () => {
    try {
      setFbError(null);
      setFbLoading(true);
      const data = await OpenRouterService.generateFeedbackSummary(testName, percentage, questions, answers);
      setFeedback(data);
    } catch (e: any) {
      setFbError(e?.message ?? 'Failed to load AI feedback');
    } finally {
      setFbLoading(false);
    }
  };

  useEffect(() => {
    // Generate feedback on mount (skip for historical reviews to avoid re-cost if desired)
    if (!isHistoricalReview) {
      fetchFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testName, percentage]);
  
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

  const renderQuestionReview = (question: Question, userAnswer: UserAnswer, index: number) => {
    const isCorrect = userAnswer.isCorrect;
    const isEssay = question.type === 'Essay';

    return (
      <div key={question.id} className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                {question.type}
              </span>
            </div>
          </div>
          {!isEssay && (
            <div className={`flex items-center space-x-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="font-medium">{isCorrect ? 'Correct' : 'Incorrect'}</span>
            </div>
          )}
        </div>

        {/* User's Answer */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
          <div className={`p-3 rounded-lg ${isEssay ? 'bg-blue-50' : isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            {question.type === 'MCQ' ? (
              <p className="text-gray-900">
                {question.options?.[userAnswer.answer as number] || 'No answer selected'}
              </p>
            ) : (
              <p className="text-gray-900 whitespace-pre-wrap">
                {userAnswer.answer || 'No answer provided'}
              </p>
            )}
          </div>
        </div>

        {/* Correct Answer (for non-essay questions) */}
        {!isEssay && question.correctAnswer !== undefined && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</h4>
            <div className="p-3 bg-green-100 rounded-lg">
              <p className="text-gray-900">
                {question.type === 'MCQ' 
                  ? question.options?.[question.correctAnswer as number]
                  : question.correctAnswer
                }
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Explanation:</h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-gray-700">{question.explanation}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (showReview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Test Review - {testName}
            </h1>
            <button
              onClick={() => setShowReview(false)}
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              ← Back to Results
            </button>
          </div>
          <p className="text-gray-600">
            Review your answers and explanations for each question
          </p>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = answers.find(a => a.questionId === question.id);
            return userAnswer ? renderQuestionReview(question, userAnswer, index) : null;
          })}
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => setShowReview(false)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Score Display */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            {getScoreIcon(percentage)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
          <h2 className="text-xl text-gray-600 mb-4">{testName}</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="text-6xl font-bold mb-2 ${getScoreColor(percentage)}">
              {percentage}%
            </div>
            <div className="text-2xl font-semibold text-gray-700 mb-2">
              Grade: {getGrade(percentage)}
            </div>
            <div className="text-gray-600">
              {correctAnswers} out of {totalQuestions} questions correct
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid gap-4 mb-8 ${timeTaken > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
          {timeTaken > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-sm text-gray-600">Time Taken</div>
              <div className="text-xl font-semibold text-blue-600">{formatTime(timeTaken)}</div>
            </div>
          )}
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-600">Correct</div>
            <div className="text-xl font-semibold text-green-600">{correctAnswers}</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-sm text-gray-600">Incorrect</div>
            <div className="text-xl font-semibold text-red-600">{totalQuestions - correctAnswers}</div>
          </div>
        </div>

        {/* Performance Message */}
        <div className="mb-8">
          {percentage >= 91 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-1">Excellent Work! 🎉</h3>
              <p className="text-green-700">Outstanding performance! You&apos;ve mastered this material.</p>
            </div>
          )}
          {percentage >= 81 && percentage < 91 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold mb-1">Good Job! 👍</h3>
              <p className="text-blue-700">Solid understanding. Review the explanations to improve further.</p>
            </div>
          )}
          {percentage >= 71 && percentage < 81 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-yellow-800 font-semibold mb-1">Keep Practicing 📚</h3>
              <p className="text-yellow-700">You&apos;re on the right track. Study the material and try again.</p>
            </div>
          )}
          {percentage >= 61 && percentage < 71 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-orange-800 font-semibold mb-1">Need Improvement 📝</h3>
              <p className="text-orange-700">Focus on the areas you missed and review the material.</p>
            </div>
          )}
          {percentage <= 60 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold mb-1">Need More Study 📖</h3>
              <p className="text-red-700">Review the material thoroughly before retaking the quiz.</p>
            </div>
          )}
        </div>

        {/* AI Study Plan */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">AI Study Plan</h2>
            </div>
            <button
              onClick={fetchFeedback}
              disabled={fbLoading}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-60 transition-colors"
              title="Regenerate tips"
            >
              <RefreshCw className={`h-4 w-4 ${fbLoading ? 'animate-spin' : ''}`} />
              <span>{fbLoading ? 'Generating...' : 'Regenerate'}</span>
            </button>
          </div>

          {fbError && (
            <div className="text-sm text-red-600 mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
              {fbError}
            </div>
          )}

          {fbLoading && !feedback && (
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span>Analyzing your answers and generating personalized study tips...</span>
            </div>
          )}

          {feedback && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 leading-relaxed">{feedback.overall_assessment}</p>
              </div>

              {feedback.strengths?.length > 0 && (
                <div>
                  <h3 className="font-medium text-green-700 mb-2 flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Your Strengths</span>
                  </h3>
                  <ul className="list-disc list-inside text-gray-800 space-y-1 ml-6">
                    {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {feedback.focus_areas?.length > 0 && (
                <div>
                  <h3 className="font-medium text-orange-700 mb-3 flex items-center space-x-2">
                    <Book className="h-4 w-4" />
                    <span>Areas to Focus On</span>
                  </h3>
                  <div className="space-y-4">
                    {feedback.focus_areas.map((fa, i) => (
                      <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <div className="font-semibold text-orange-800 mb-2">{fa.topic}</div>
                        <p className="text-gray-800 mb-3">{fa.why}</p>
                        
                        {fa.examples?.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Your Mistakes:</div>
                            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 ml-2">
                              {fa.examples.map((ex, j) => (
                                <li key={j} className="italic">&ldquo;{ex}&rdquo;</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {fa.study_actions?.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-gray-800 mb-2 flex items-center space-x-1">
                              <Trophy className="h-3 w-3" />
                              <span>Action Steps</span>
                            </div>
                            <ul className="text-sm text-gray-800 space-y-1">
                              {fa.study_actions.map((a, k) => (
                                <li key={k} className="flex items-start space-x-2">
                                  <span className="text-orange-600 font-bold">•</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {feedback.suggested_next_quiz && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h3 className="font-medium text-indigo-800 mb-2 flex items-center space-x-2">
                    <Shuffle className="h-4 w-4" />
                    <span>Suggested Next Quiz</span>
                  </h3>
                  <div className="text-sm text-indigo-700 space-y-1">
                    <div><span className="font-medium">Difficulty:</span> <span className="capitalize">{feedback.suggested_next_quiz.difficulty}</span></div>
                    <div><span className="font-medium">Question Types:</span> {feedback.suggested_next_quiz.question_mix.join(', ')}</div>
                    {feedback.suggested_next_quiz.target_topics?.length > 0 && (
                      <div><span className="font-medium">Focus Topics:</span> {feedback.suggested_next_quiz.target_topics.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Review Answers</span>
          </button>
          
          {onRetakeQuiz && (
            <button
              onClick={onRetakeQuiz}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake Quiz</span>
            </button>
          )}
          
          {onNewQuizFromFile && (
            <button
              onClick={onNewQuizFromFile}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Shuffle className="h-4 w-4" />
              <span>New Questions</span>
            </button>
          )}
          
          {onBackToHistory ? (
            <button
              onClick={onBackToHistory}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <History className="h-4 w-4" />
              <span>Back to History</span>
            </button>
          ) : (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>New Quiz</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 