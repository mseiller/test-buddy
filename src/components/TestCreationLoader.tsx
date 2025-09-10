'use client';

import { useState, useEffect } from 'react';
import { Brain, Sparkles, BookOpen, Lightbulb } from 'lucide-react';

interface TestCreationLoaderProps {
  isVisible: boolean;
}

const patientMessages = [
  {
    icon: Brain,
    text: "Our AI is analyzing your content...",
    subtext: "Reading through every detail to understand the material"
  },
  {
    icon: Sparkles,
    text: "Crafting thoughtful questions...",
    subtext: "Creating questions that will truly test understanding"
  },
  {
    icon: BookOpen,
    text: "Organizing the perfect quiz...",
    subtext: "Structuring questions for the best learning experience"
  },
  {
    icon: Lightbulb,
    text: "Adding educational insights...",
    subtext: "Ensuring each question promotes deep learning"
  },
  {
    icon: Brain,
    text: "Finalizing your personalized test...",
    subtext: "Almost ready! Just a few more moments"
  }
];

export default function TestCreationLoader({ isVisible }: TestCreationLoaderProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % patientMessages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentMessage = patientMessages[currentMessageIndex];
  const Icon = currentMessage.icon;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-gray-100">
          {/* Animated Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              <Icon className="h-10 w-10 text-white animate-bounce" />
            </div>
            {/* Floating particles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-pink-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-1/2 -left-3 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Main Message */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2 transition-all duration-500">
            {currentMessage.text}
          </h3>
          
          {/* Subtext */}
          <p className="text-gray-600 text-sm mb-6 transition-all duration-500">
            {currentMessage.subtext}
          </p>

          {/* Progress Indicator */}
          <div className="flex justify-center space-x-2 mb-4">
            {patientMessages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentMessageIndex
                    ? 'bg-indigo-500 scale-125'
                    : index < currentMessageIndex
                    ? 'bg-indigo-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Encouraging Message */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
            <p className="text-sm text-indigo-700 font-medium">
              ✨ Great things take time! Your personalized quiz will be worth the wait.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
