'use client';

import React from 'react';
import { Crown, Star, Zap, Settings, Check } from 'lucide-react';
import { useUserPlan, useUsageStatus } from '@/contexts/UserPlanContext';
import { UserPlan, PLAN_FEATURES, getPlanFeatures } from '@/config/plans';
import { UsageLimit } from './FeatureGate';

interface PlanManagerProps {
  userId: string;
  onClose: () => void;
}

export default function PlanManager({ userId, onClose }: PlanManagerProps) {
  const { plan, planFeatures } = useUserPlan();
  const { usage, limit } = useUsageStatus();

  const getPlanIcon = (planType: UserPlan) => {
    switch (planType) {
      case 'free':
        return <Settings className="h-6 w-6" />;
      case 'student':
        return <Star className="h-6 w-6" />;
      case 'pro':
        return <Crown className="h-6 w-6" />;
      default:
        return <Settings className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planType: UserPlan) => {
    switch (planType) {
      case 'free':
        return 'text-gray-600';
      case 'student':
        return 'text-blue-600';
      case 'pro':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPlanBgColor = (planType: UserPlan, isActive: boolean) => {
    if (isActive) {
      switch (planType) {
        case 'free':
          return 'bg-gray-50 border-gray-300';
        case 'student':
          return 'bg-blue-50 border-blue-300';
        case 'pro':
          return 'bg-purple-50 border-purple-300';
        default:
          return 'bg-gray-50 border-gray-300';
      }
    }
    return 'bg-white border-gray-200 hover:border-gray-300';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Plan Management</h2>
              <p className="text-gray-700">View your current plan and available features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Current Plan Status */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getPlanColor(plan)}`}>
                {getPlanIcon(plan)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Plan: {PLAN_FEATURES[plan].name}
                </h3>
                <p className="text-gray-600">{PLAN_FEATURES[plan].price}</p>
              </div>
            </div>
          </div>

          {/* Usage Status */}
          {usage && (
            <div className="mt-4">
              <UsageLimit
                current={usage.testsGenerated}
                limit={limit}
                feature="Tests This Month"
                className="mb-4"
              />
            </div>
          )}

          {/* Feature Summary */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Features:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">{planFeatures.maxTestsPerMonth === Infinity ? 'Unlimited' : planFeatures.maxTestsPerMonth} tests/month</span>
              </div>
              <div className="flex items-center space-x-2">
                {planFeatures.retakesAllowed ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-4 w-4 text-gray-600">×</span>
                )}
                <span className="text-gray-700">Quiz retakes</span>
              </div>
              <div className="flex items-center space-x-2">
                {planFeatures.folders ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-4 w-4 text-gray-600">×</span>
                )}
                <span className="text-gray-700">Folder organization</span>
              </div>
              <div className="flex items-center space-x-2">
                {planFeatures.aiFeedback ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-4 w-4 text-gray-600">×</span>
                )}
                <span className="text-gray-700">AI feedback</span>
              </div>
              <div className="flex items-center space-x-2">
                {planFeatures.metrics ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="h-4 w-4 text-gray-600">×</span>
                )}
                <span className="text-gray-700">{planFeatures.metrics || 'No'} analytics</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">{planFeatures.model.includes('gpt-4') ? 'GPT-4' : 'Free'} model</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Information */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(PLAN_FEATURES) as UserPlan[]).map((planType) => {
              const planInfo = PLAN_FEATURES[planType];
              const isActive = plan === planType;

              return (
                <div
                  key={planType}
                  className={`border-2 rounded-lg p-4 transition-all ${getPlanBgColor(planType, isActive)}`}
                >
                  <div className="text-center mb-4">
                    <div className={`inline-flex p-2 rounded-lg mb-2 ${getPlanColor(planType)}`}>
                      {getPlanIcon(planType)}
                    </div>
                    <h4 className="font-semibold text-gray-900">{planInfo.name}</h4>
                    <p className="text-sm text-gray-600">{planInfo.price}</p>
                  </div>

                  <div className={`w-full py-2 px-4 rounded-lg font-medium text-center ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? 'Current Plan' : 'Upgrade Required'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Plan Management:</strong> To upgrade or change your plan, please use the upgrade options 
              in the main interface. Plan changes are processed through secure payment systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
