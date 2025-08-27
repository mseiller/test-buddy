'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Question, UserAnswer, FeedbackSummary } from '@/types';
import { OpenRouterService } from '@/services/openRouter';
import { Card, Button, Alert, LoadingSpinner } from '@/components/ui';

interface AIFeedbackSectionProps {
  testName: string;
  percentage: number;
  questions: Question[];
  answers: UserAnswer[];
  canUseAiFeedback: boolean;
  isHistoricalReview?: boolean;
}

export default function AIFeedbackSection({
  testName,
  percentage,
  questions,
  answers,
  canUseAiFeedback,
  isHistoricalReview = false
}: AIFeedbackSectionProps) {
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await OpenRouterService.generateFeedbackSummary(testName, percentage, questions, answers);
      setFeedback(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load AI feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Generate feedback on mount (skip for historical reviews to avoid re-cost if desired)
    if (!isHistoricalReview && canUseAiFeedback) {
      fetchFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testName, percentage, canUseAiFeedback]);

  if (!canUseAiFeedback) {
    return null;
  }

  return (
    <Card className="mb-8 text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">AI Study Plan</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          loading={loading}
          onClick={fetchFeedback}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && !feedback && (
        <div className="flex items-center space-x-3 text-gray-600">
          <LoadingSpinner size="sm" />
          <span className="text-sm">Analyzing your answers and generating personalized study tips...</span>
        </div>
      )}

      {/* Feedback Content */}
      {feedback && !loading && (
        <div className="space-y-4">
          {/* Overall Assessment */}
          {feedback.overall_assessment && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Overall Assessment</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {feedback.overall_assessment}
              </p>
            </div>
          )}

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-green-700 mb-2">Strengths</h3>
              <ul className="list-disc list-inside space-y-1">
                {feedback.strengths.map((strength, index) => (
                  <li key={`strength-${index}`} className="text-sm text-gray-700">{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Focus Areas */}
          {feedback.focus_areas && feedback.focus_areas.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-orange-700 mb-2">Areas to Focus On</h3>
              <div className="space-y-4">
                {feedback.focus_areas.map((area, index) => (
                  <div key={`focus-area-${index}`} className="border-l-4 border-orange-200 pl-4">
                    <h4 className="font-medium text-gray-900 mb-1">{area.topic}</h4>
                    <p className="text-sm text-gray-600 mb-2">{area.why}</p>
                    {area.examples && area.examples.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Examples:</p>
                        <ul className="list-disc list-inside text-xs text-gray-600">
                          {area.examples.map((example, exIndex) => (
                            <li key={`example-${exIndex}`}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {area.study_actions && area.study_actions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Study Actions:</p>
                        <ul className="list-disc list-inside text-xs text-gray-600">
                          {area.study_actions.map((action, actionIndex) => (
                            <li key={`action-${actionIndex}`}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Next Quiz */}
          {feedback.suggested_next_quiz && (
            <div>
              <h3 className="text-lg font-medium text-indigo-700 mb-2">Suggested Next Quiz</h3>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Difficulty:</p>
                    <span className="capitalize text-gray-700">{feedback.suggested_next_quiz.difficulty}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Question Types:</p>
                    <div className="text-gray-700">
                      {feedback.suggested_next_quiz.question_mix.join(', ')}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Topics:</p>
                    <div className="text-gray-700">
                      {feedback.suggested_next_quiz.target_topics.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!feedback && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Click Generate to get personalized AI study recommendations</p>
        </div>
      )}
    </Card>
  );
}
