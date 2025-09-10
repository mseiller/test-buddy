import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TrialInfoProps {
  isTrial: boolean;
  trialEnd: number | null;
  plan: string;
}

export default function TrialInfo({ isTrial, trialEnd, plan }: TrialInfoProps) {
  if (!isTrial || !trialEnd) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = trialEnd - now;
  
  if (timeLeft <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Trial Expired</h3>
            <p className="text-sm text-red-600">
              Your {plan} trial has ended. Please upgrade to continue using premium features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  const getTimeDisplay = () => {
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  };

  const getAlertLevel = () => {
    if (timeLeft < 86400) { // Less than 1 day
      return 'bg-red-50 border-red-200 text-red-800';
    } else if (timeLeft < 259200) { // Less than 3 days
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    } else {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 ${getAlertLevel()}`}>
      <div className="flex items-center">
        <Clock className="h-5 w-5 mr-2" />
        <div>
          <h3 className="text-sm font-medium">Free Trial Active</h3>
          <p className="text-sm">
            You're currently on a free trial of the {plan} plan. {getTimeDisplay()}
          </p>
          {timeLeft < 86400 && (
            <p className="text-xs mt-1 font-medium">
              Upgrade now to avoid losing access to premium features!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
