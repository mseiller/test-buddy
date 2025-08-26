'use client';

import React from 'react';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';

interface LoadingCardProps {
  message?: string;
  className?: string;
}

export default function LoadingCard({ 
  message = 'Loading...', 
  className = '' 
}: LoadingCardProps) {
  return (
    <Card className={`text-center ${className}`}>
      <div className="flex items-center justify-center space-x-3">
        <LoadingSpinner size="md" />
        <span className="text-gray-600">{message}</span>
      </div>
    </Card>
  );
}
