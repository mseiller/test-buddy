'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Home, History, Folder, BarChart3, Crown, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { AccessibilityStatus } from './AccessibilityStatus';
import { User } from '@/types';

interface UserProfileDropdownProps {
  user: User;
  plan: string;
  planFeatures: any;
  planLoading: boolean;
  usage: any;
  testsRemaining: number;
  limit: number;
  appState: string;
  onNavigate: (state: 'home' | 'upload' | 'config' | 'quiz' | 'results' | 'history' | 'folders' | 'metrics') => void;
  onShowPlanManager: () => void;
  onShowUpgradePrompt: (feature: string) => void;
  onSignOut: () => void;
}

export default function UserProfileDropdown({
  user,
  plan,
  planFeatures,
  planLoading,
  usage,
  testsRemaining,
  limit,
  appState,
  onNavigate,
  onShowPlanManager,
  onShowUpgradePrompt,
  onSignOut
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (state: 'home' | 'upload' | 'config' | 'quiz' | 'results' | 'history' | 'folders' | 'metrics') => {
    onNavigate(state);
    setIsOpen(false);
  };

  const handleUpgrade = (feature: string) => {
    onShowUpgradePrompt(feature);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.displayName || user.email}
          </div>
          {!planLoading && (
                      <div className="text-xs text-gray-600">
            {planFeatures.name} • {testsRemaining} tests left
          </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {user.displayName || user.email}
                </div>
                <div className="text-sm text-gray-600">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Status */}
          {!planLoading && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Current Plan</span>
                <button
                  onClick={() => onShowPlanManager()}
                  className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium hover:bg-blue-200 transition-colors"
                >
                  {planFeatures.name}
                </button>
              </div>
              {usage && limit !== Infinity && (
                <div className="mt-2 text-sm text-gray-600">
                  {testsRemaining} of {limit} tests remaining
                </div>
              )}
            </div>
          )}

          {/* Navigation Section */}
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Navigation
            </div>
            
            {appState !== 'home' && (
              <button
                onClick={() => handleNavigate('home')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            )}

            {appState !== 'history' && (
              <button
                onClick={() => handleNavigate('history')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <History className="w-4 h-4" />
                <span>Test History</span>
              </button>
            )}

            {appState !== 'folders' && planFeatures.folders && (
              <button
                onClick={() => handleNavigate('folders')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Folder className="w-4 h-4" />
                <span>Folders</span>
              </button>
            )}

            {appState !== 'metrics' && planFeatures.metrics && (
              <button
                onClick={() => handleNavigate('metrics')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
            )}
          </div>

          {/* Accessibility Section */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Accessibility
            </div>
            <AccessibilityStatus />
          </div>

          {/* Upgrade Section */}
          {(plan === 'free' || plan === 'student') && (
            <div className="px-4 py-2 border-b border-gray-100">
              <button
                onClick={() => handleUpgrade('general')}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Crown className="w-4 h-4" />
                <span className="font-medium">
                  {plan === 'free' ? 'Upgrade to Pro' : 'Upgrade to Pro'}
                </span>
              </button>
            </div>
          )}

          {/* Account Actions */}
          <div className="px-4 py-2">
            <button
              onClick={() => onShowPlanManager()}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Account Settings</span>
            </button>
            
            <button
              onClick={onSignOut}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
