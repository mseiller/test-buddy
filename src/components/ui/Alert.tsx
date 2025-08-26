'use client';

import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, XCircle, X } from 'lucide-react';

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export default function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = ''
}: AlertProps) {
  const variantConfig = {
    success: {
      containerClass: 'bg-green-50 border border-green-200 text-green-800',
      iconClass: 'text-green-600',
      icon: CheckCircle
    },
    error: {
      containerClass: 'bg-red-50 border border-red-200 text-red-800',
      iconClass: 'text-red-600',
      icon: XCircle
    },
    warning: {
      containerClass: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
      iconClass: 'text-yellow-600',
      icon: AlertTriangle
    },
    info: {
      containerClass: 'bg-blue-50 border border-blue-200 text-blue-800',
      iconClass: 'text-blue-600',
      icon: AlertCircle
    }
  };
  
  const config = variantConfig[variant];
  const Icon = config.icon;
  
  return (
    <div className={`rounded-lg p-4 ${config.containerClass} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 hover:bg-opacity-20 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${config.iconClass}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
