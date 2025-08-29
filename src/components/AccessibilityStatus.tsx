'use client';

import React, { useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibilityPanel } from './AccessibilityPanel';
import { Settings, Eye, Type, Zap, Keyboard, Monitor, Palette, BookOpen } from 'lucide-react';

export const AccessibilityStatus: React.FC = () => {
  const { settings } = useAccessibility();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const activeFeatures = [
    settings.highContrast && { icon: Eye, label: 'High Contrast', color: 'text-yellow-600' },
    settings.fontSize !== 'medium' && { icon: Type, label: 'Large Font', color: 'text-blue-600' },
    settings.reducedMotion && { icon: Zap, label: 'Reduced Motion', color: 'text-green-600' },
    settings.keyboardNavigation && { icon: Keyboard, label: 'Keyboard Nav', color: 'text-purple-600' },
    settings.screenReaderMode && { icon: Monitor, label: 'Screen Reader', color: 'text-orange-600' },
    settings.colorBlindMode !== 'none' && { icon: Palette, label: 'Color Blind Mode', color: 'text-pink-600' },
    settings.dyslexiaFriendly && { icon: BookOpen, label: 'Dyslexia Friendly', color: 'text-indigo-600' },
  ].filter((feature): feature is { icon: any; label: string; color: string } => Boolean(feature));

  const handleEdit = () => {
    setIsPanelOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Current Status Display */}
        <div className="text-sm">
          {activeFeatures.length === 0 ? (
            <div className="text-gray-500 italic">No accessibility features active</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 mb-2">Active Features:</div>
              {activeFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Icon className={`w-4 h-4 ${feature.color}`} />
                    <span className="text-gray-700">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
        >
          <Settings className="w-4 h-4" />
          <span>Edit Settings</span>
        </button>
      </div>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

