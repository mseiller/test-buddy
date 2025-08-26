'use client';

import React from 'react';
import Card from './Card';
import Button from './Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export default function ErrorCard({
  title = 'Error',
  message,
  onRetry,
  retryText = 'Try Again',
  className = ''
}: ErrorCardProps) {
  return (
    <Card className={`text-center ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="primary"
            icon={RefreshCw}
            onClick={onRetry}
          >
            {retryText}
          </Button>
        )}
      </div>
    </Card>
  );
}
