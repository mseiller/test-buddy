'use client';

import React from 'react';
import { X, Crown, Star, Check, Zap } from 'lucide-react';
import { UserPlan, PLAN_FEATURES, getPlanFeatures } from '@/config/plans';
import { updateUserPlan } from '@/services/userService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: UserPlan;
  userId: string;
  triggerFeature?: string;
  onUpgrade?: (newPlan: UserPlan) => void;
}

export default function PaywallModal({ 
  isOpen, 
  onClose, 
  currentPlan, 
  userId,
  triggerFeature,
  onUpgrade 
}: PaywallModalProps) {
  const [upgrading, setUpgrading] = React.useState<UserPlan | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async (targetPlan: UserPlan) => {
    try {
      setUpgrading(targetPlan);
      
      // For now, just update the plan directly in Firestore
      // In production, this would integrate with Stripe
      await updateUserPlan(userId, targetPlan);
      
      onUpgrade?.(targetPlan);
      onClose();
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const getFeatureList = (plan: UserPlan) => {
    const features = getPlanFeatures(plan);
    const items = [];
    
    if (features.maxTestsPerMonth === Infinity) {
      items.push('Unlimited tests per month');
    } else {
      items.push(`${features.maxTestsPerMonth} tests per month`);
    }
    
    if (features.retakesAllowed) {
      items.push('Unlimited quiz retakes');
    }
    
    if (features.folders) {
      items.push('Folder organization');
    }
    
    if (features.aiFeedback) {
      items.push('AI feedback & study plans');
    }
    
    if (features.metrics) {
      items.push(`${features.metrics === 'advanced' ? 'Advanced' : 'Basic'} analytics`);
    }
    
    if (features.model.includes('gpt-4')) {
      items.push('GPT-4 powered questions');
    }
    
    if (features.imageUpload) {
      items.push('Image upload & OCR text extraction');
    }
    
    return items;
  };

  const getUpgradeRecommendation = () => {
    if (currentPlan === 'free') {
      if (triggerFeature === 'retakes' || triggerFeature === 'usage') {
        return 'student';
      }
      // Image upload, folders, AI feedback require Pro
      if (triggerFeature === 'imageUpload' || triggerFeature === 'folders' || triggerFeature === 'aiFeedback') {
        return 'pro';
      }
      return 'pro'; // Default to pro for most features
    }
    return 'pro'; // Student to Pro upgrade
  };

  const recommendedPlan = getUpgradeRecommendation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-gray-600">
                {triggerFeature && `Unlock ${triggerFeature} and more premium features`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Student Plan */}
            <div className={`relative rounded-xl border-2 p-6 ${
              recommendedPlan === 'student' 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200'
            }`}>
              {recommendedPlan === 'student' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Recommended
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{PLAN_FEATURES.student.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-blue-600">{PLAN_FEATURES.student.price}</span>
                </div>
                <p className="text-gray-600 mt-2">{PLAN_FEATURES.student.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {getFeatureList('student').map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('student')}
                disabled={upgrading !== null || currentPlan === 'student'}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  currentPlan === 'student'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : upgrading === 'student'
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                }`}
              >
                {upgrading === 'student' ? 'Upgrading...' : 
                 currentPlan === 'student' ? 'Current Plan' : 'Upgrade to Student'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`relative rounded-xl border-2 p-6 ${
              recommendedPlan === 'pro' 
                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                : 'border-gray-200'
            }`}>
              {recommendedPlan === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Recommended
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{PLAN_FEATURES.pro.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-purple-600">{PLAN_FEATURES.pro.price}</span>
                </div>
                <p className="text-gray-600 mt-2">{PLAN_FEATURES.pro.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {getFeatureList('pro').map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading !== null || currentPlan === 'pro'}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  currentPlan === 'pro'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : upgrading === 'pro'
                    ? 'bg-purple-400 text-white cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                }`}
              >
                {upgrading === 'pro' ? 'Upgrading...' : 
                 currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>

          {/* Current Plan Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Current Plan:</span>
                <span className="ml-2 font-medium text-gray-900">{PLAN_FEATURES[currentPlan].name}</span>
              </div>
              <span className="text-sm text-gray-500">
                {PLAN_FEATURES[currentPlan].price}
              </span>
            </div>
          </div>

          {/* Note */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              * This is a demo. In production, this would integrate with Stripe for secure payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
