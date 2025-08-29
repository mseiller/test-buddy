'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  reducedMotion: boolean;
  focusVisible: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexiaFriendly: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  isHighContrast: boolean;
  isLargeFont: boolean;
  isReducedMotion: boolean;
  isScreenReaderMode: boolean;
  isKeyboardNavigation: boolean;
  isColorBlindMode: boolean;
  isDyslexiaFriendly: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'medium',
  reducedMotion: false,
  focusVisible: true,
  screenReaderMode: false,
  keyboardNavigation: true,
  colorBlindMode: 'none',
  dyslexiaFriendly: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    root.classList.add(`font-${settings.fontSize}`);

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Apply focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }

    // Apply color blind mode
    root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    if (settings.colorBlindMode !== 'none') {
      root.classList.add(`colorblind-${settings.colorBlindMode}`);
    }

    // Apply dyslexia friendly
    if (settings.dyslexiaFriendly) {
      root.classList.add('dyslexia-friendly');
    } else {
      root.classList.remove('dyslexia-friendly');
    }

    // Apply screen reader optimizations
    if (settings.screenReaderMode) {
      root.setAttribute('aria-live', 'polite');
    } else {
      root.removeAttribute('aria-live');
    }

    // Apply keyboard navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  }, [settings]);

  // Listen for system accessibility preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Listen for prefers-reduced-motion
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleChange = (e: MediaQueryListEvent) => {
        setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
      };

      mediaQuery.addEventListener('change', handleChange);
      
      // Set initial value
      setSettings(prev => ({ ...prev, reducedMotion: mediaQuery.matches }));

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return () => {}; // Return empty cleanup function for server-side rendering
  }, []);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
    isHighContrast: settings.highContrast,
    isLargeFont: settings.fontSize === 'large' || settings.fontSize === 'xlarge',
    isReducedMotion: settings.reducedMotion,
    isScreenReaderMode: settings.screenReaderMode,
    isKeyboardNavigation: settings.keyboardNavigation,
    isColorBlindMode: settings.colorBlindMode !== 'none',
    isDyslexiaFriendly: settings.dyslexiaFriendly,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
