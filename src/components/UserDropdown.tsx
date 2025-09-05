'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User as UserIcon, History, Folder, BarChart3, LogOut, Crown, Settings, HelpCircle } from 'lucide-react';
import { User as UserType } from '@/types';

interface UserDropdownProps {
  user: UserType;
  plan: string;
  planName: string;
  testsRemaining: number;
  limit: number;
  onNavigate: (destination: string) => void;
  onSignOut: () => void;
  onUpgrade: () => void;
  onPlanManager: () => void;
  canAccessFolders: boolean;
  canAccessMetrics: boolean;
  showUpgradeOption: boolean;
}

export default function UserDropdown({
  user,
  plan,
  planName,
  testsRemaining,
  limit,
  onNavigate,
  onSignOut,
  onUpgrade,
  onPlanManager,
  canAccessFolders,
  canAccessMetrics,
  showUpgradeOption
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (destination: string) => {
    onNavigate(destination);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    onSignOut();
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    onUpgrade();
    setIsOpen(false);
  };

  const handlePlanManager = () => {
    onPlanManager();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center">
          <UserIcon className="h-4 w-4 text-red-600" />
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.displayName || user.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-xs text-gray-500">{planName}</div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Profile Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName || user.email}
                </div>
                <div className="text-xs text-gray-500">{planName}</div>
                {limit !== Infinity && (
                  <div className="text-xs text-gray-400 mt-1">
                    {testsRemaining} tests remaining this month
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Options */}
          <div className="py-1">
            <button
              onClick={() => handleNavigate('history')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <History className="h-4 w-4 text-gray-500" />
              <span>History</span>
            </button>

            {canAccessFolders && (
              <button
                onClick={() => handleNavigate('folders')}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Folder className="h-4 w-4 text-gray-500" />
                <span>Folders</span>
              </button>
            )}

            {canAccessMetrics && (
              <button
                onClick={() => handleNavigate('metrics')}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <span>Analytics</span>
              </button>
            )}

            <button
              onClick={handlePlanManager}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              <span>Plan Settings</span>
            </button>

            <button
              onClick={() => window.open('/support', '_blank')}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-gray-500" />
              <span>Support</span>
            </button>
          </div>

          {/* Upgrade Option */}
          {showUpgradeOption && (
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Crown className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {plan === 'free' ? 'Upgrade to Student' : 'Upgrade to Pro'}
                </span>
              </button>
            </div>
          )}

          {/* Sign Out */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 text-gray-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
