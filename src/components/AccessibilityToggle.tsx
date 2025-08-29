'use client';

import React, { useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { AccessibilityPanel } from './AccessibilityPanel';
import Button from '@/components/ui/Button';
import { Settings, Eye, Type, Zap, Keyboard, Monitor } from 'lucide-react';

export const AccessibilityToggle: React.FC = () => {
  const { settings } = useAccessibility();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const activeFeatures = [
    settings.highContrast && { icon: Eye, label: 'High Contrast', color: 'text-yellow-600' },
    settings.fontSize !== 'medium' && { icon: Type, label: 'Large Font', color: 'text-blue-600' },
    settings.reducedMotion && { icon: Zap, label: 'Reduced Motion', color: 'text-green-600' },
    settings.keyboardNavigation && { icon: Keyboard, label: 'Keyboard Nav', color: 'text-purple-600' },
    settings.screenReaderMode && { icon: Monitor, label: 'Screen Reader', color: 'text-orange-600' },
  ].filter(Boolean);

  const handleToggle = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <>
      <div className="relative">
        <Button
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Accessibility settings"
          aria-expanded={isPanelOpen}
          aria-haspopup="dialog"
        >
          <Settings className="w-5 h-5" />
          
          {/* Active features indicator */}
          {activeFeatures.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{activeFeatures.length}</span>
            </div>
          )}
        </Button>

        {/* Quick accessibility status tooltip */}
        {activeFeatures.length > 0 && (
          <div className="absolute bottom-full right-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-xs whitespace-nowrap z-10">
            <div className="font-medium mb-1">Active Features:</div>
            <div className="space-y-1">
              {activeFeatures.map((feature, index) => {
                if (!feature) return null;
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Icon className={`w-3 h-3 ${feature.color}`} />
                    <span>{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

// Floating accessibility button for mobile
export const FloatingAccessibilityButton: React.FC = () => {
  const { settings } = useAccessibility();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const hasActiveFeatures = settings.highContrast || 
                           settings.fontSize !== 'medium' || 
                           settings.reducedMotion || 
                           settings.keyboardNavigation || 
                           settings.screenReaderMode;

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300 ${
          hasActiveFeatures 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-600 text-white hover:bg-gray-700'
        }`}
        aria-label="Accessibility settings"
      >
        <Settings className="w-6 h-6" />
        
        {/* Active features indicator */}
        {hasActiveFeatures && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-xs text-black font-bold">!</span>
          </div>
        )}
      </button>

      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

// Accessibility status bar
export const AccessibilityStatusBar: React.FC = () => {
  const { settings } = useAccessibility();
  const [isVisible, setIsVisible] = useState(false);

  const activeFeatures = [
    settings.highContrast && 'High Contrast',
    settings.fontSize !== 'medium' && `${settings.fontSize} Font`,
    settings.reducedMotion && 'Reduced Motion',
    settings.keyboardNavigation && 'Keyboard Navigation',
    settings.screenReaderMode && 'Screen Reader Mode',
    settings.colorBlindMode !== 'none' && `${settings.colorBlindMode} Color Mode`,
    settings.dyslexiaFriendly && 'Dyslexia Friendly',
  ].filter(Boolean);

  if (activeFeatures.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-sm z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <span className="font-medium">Accessibility Features Active:</span>
          <div className="flex items-center gap-2">
            {activeFeatures.map((feature, index) => (
              <span key={index} className="bg-blue-700 px-2 py-1 rounded text-xs">
                {feature}
              </span>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-blue-200 hover:text-white transition-colors"
          aria-label="Toggle accessibility status bar"
        >
          {isVisible ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      {isVisible && (
        <div className="mt-2 pt-2 border-t border-blue-500">
          <div className="text-xs text-blue-200">
            These features are currently active to improve your experience. 
            You can modify them in the accessibility settings.
          </div>
        </div>
      )}
    </div>
  );
};
