'use client';

import React from 'react';
import { useUserPlan } from '@/contexts/UserPlanContext';
import { getPlanFeatures, getUpgradeMessage } from '@/config/plans';
import { Lock, Crown, Star } from 'lucide-react';

interface FeatureGateProps {
  feature: keyof ReturnType<typeof getPlanFeatures>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  onUpgradeClick?: () => void;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true,
  onUpgradeClick
}: FeatureGateProps) {
  const { plan, planFeatures } = useUserPlan();
  
  const hasAccess = Boolean(planFeatures[feature]);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (!showUpgradePrompt) {
    return null;
  }
  
  return <LockedFeature feature={feature} currentPlan={plan} onUpgradeClick={onUpgradeClick} />;
}

interface LockedFeatureProps {
  feature: keyof ReturnType<typeof getPlanFeatures>;
  currentPlan: string;
  message?: string;
  compact?: boolean;
  onUpgradeClick?: () => void;
}

export function LockedFeature({ 
  feature, 
  currentPlan, 
  message, 
  compact = false,
  onUpgradeClick
}: LockedFeatureProps) {
  const upgradeMessage = message || getUpgradeMessage(currentPlan as any, getFeatureDisplayName(feature));
  
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Lock className="h-4 w-4" />
        <span>Pro Feature</span>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
      <div className="flex justify-center mb-3">
        {getFeatureIcon(feature)}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {getFeatureDisplayName(feature)} - Premium Feature
      </h3>
      <p className="text-gray-600 mb-4">
        {upgradeMessage}
      </p>
                    <button 
                onClick={() => {
                  if (onUpgradeClick) {
                    onUpgradeClick();
                  } else {
                    alert('Upgrade functionality - use PaywallModal component for full experience!');
                  }
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                Upgrade Now
              </button>
    </div>
  );
}

function getFeatureIcon(feature: string) {
  const iconClass = "h-8 w-8 text-gray-400";
  
  switch (feature) {
    case 'folders':
      return <Crown className={iconClass} />;
    case 'aiFeedback':
      return <Star className={iconClass} />;
    case 'metrics':
      return <Crown className={iconClass} />;
    default:
      return <Lock className={iconClass} />;
  }
}

function getFeatureDisplayName(feature: string): string {
  switch (feature) {
    case 'folders':
      return 'Folder Organization';
    case 'aiFeedback':
      return 'AI Feedback & Study Plans';
    case 'metrics':
      return 'Advanced Analytics';
    case 'retakesAllowed':
      return 'Quiz Retakes';
    default:
      return 'Premium Feature';
  }
}

// Usage limit component
interface UsageLimitProps {
  current: number;
  limit: number;
  feature: string;
  className?: string;
}

export function UsageLimit({ current, limit, feature, className = "" }: UsageLimitProps) {
  const percentage = limit === Infinity ? 0 : (current / limit) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = current >= limit && limit !== Infinity;
  
  if (limit === Infinity) {
    return (
      <div className={`text-sm text-green-600 ${className}`}>
        ✨ Unlimited {feature}
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1">
        <span className={isAtLimit ? 'text-red-600' : 'text-gray-600'}>
          {feature}: {current} / {limit}
        </span>
        <span className={`text-xs ${isNearLimit ? 'text-orange-500' : 'text-gray-500'}`}>
          {limit - current} remaining
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
