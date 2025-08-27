'use client';

import React, { useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Settings, Eye, Type, Zap, Keyboard, Monitor, Palette, BookOpen, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'visual' | 'text' | 'navigation' | 'advanced'>('visual');

  if (!isOpen) return null;

  const tabs = [
    { id: 'visual', label: 'Visual', icon: Eye },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'navigation', label: 'Navigation', icon: Keyboard },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ] as const;

  const colorBlindOptions = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia (Red-Green)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Red-Green)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-Yellow)' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Extra Large' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Accessibility Settings</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close accessibility panel"
            >
              ×
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Visual Tab */}
            {activeTab === 'visual' && (
              <div role="tabpanel" aria-labelledby="visual-tab">
                <div className="space-y-4">
                  {/* High Contrast */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <Eye className="w-5 h-5" />
                        High Contrast
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Increases contrast for better visibility
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.highContrast}
                        onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.highContrast ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.highContrast ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>

                  {/* Color Blind Mode */}
                  <div>
                    <label className="flex items-center gap-2 font-medium mb-2">
                      <Palette className="w-5 h-5" />
                      Color Blind Mode
                    </label>
                    <select
                      value={settings.colorBlindMode}
                      onChange={(e) => updateSettings({ colorBlindMode: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {colorBlindOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <Zap className="w-5 h-5" />
                        Reduced Motion
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Reduces animations and transitions
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.reducedMotion ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Text Tab */}
            {activeTab === 'text' && (
              <div role="tabpanel" aria-labelledby="text-tab">
                <div className="space-y-4">
                  {/* Font Size */}
                  <div>
                    <label className="flex items-center gap-2 font-medium mb-2">
                      <Type className="w-5 h-5" />
                      Font Size
                    </label>
                    <select
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {fontSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dyslexia Friendly */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <BookOpen className="w-5 h-5" />
                        Dyslexia Friendly
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Uses dyslexia-friendly fonts and spacing
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.dyslexiaFriendly}
                        onChange={(e) => updateSettings({ dyslexiaFriendly: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.dyslexiaFriendly ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.dyslexiaFriendly ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tab */}
            {activeTab === 'navigation' && (
              <div role="tabpanel" aria-labelledby="navigation-tab">
                <div className="space-y-4">
                  {/* Keyboard Navigation */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <Keyboard className="w-5 h-5" />
                        Enhanced Keyboard Navigation
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Improves keyboard navigation experience
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.keyboardNavigation}
                        onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.keyboardNavigation ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>

                  {/* Focus Visible */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <Monitor className="w-5 h-5" />
                        Enhanced Focus Indicators
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Makes focus indicators more visible
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.focusVisible}
                        onChange={(e) => updateSettings({ focusVisible: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.focusVisible ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.focusVisible ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div role="tabpanel" aria-labelledby="advanced-tab">
                <div className="space-y-4">
                  {/* Screen Reader Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="flex items-center gap-2 font-medium">
                        <Monitor className="w-5 h-5" />
                        Screen Reader Optimizations
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Optimizes content for screen readers
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.screenReaderMode}
                        onChange={(e) => updateSettings({ screenReaderMode: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.screenReaderMode ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform transform ${
                          settings.screenReaderMode ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>

                  {/* Reset Button */}
                  <div className="pt-4">
                    <Button
                      onClick={resetSettings}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
