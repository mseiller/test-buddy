/**
 * Advanced Error Boundary
 * Comprehensive React error boundary with recovery strategies
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { ErrorHandler } from '../../services/errors/ErrorHandler';
import { ErrorReporting } from '../../services/errors/ErrorReporting';
// Using inline components instead of importing non-existent UI components

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  isolateFailures?: boolean;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  level?: 'page' | 'section' | 'component';
  componentName?: string;
  showErrorDetails?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRecovering: boolean;
  recoveryAttempted: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorHandler: ErrorHandler;
  private errorReporting: ErrorReporting;
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempted: false
    };

    this.errorHandler = ErrorHandler.getInstance();
    this.errorReporting = ErrorReporting.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableReporting = true, componentName, level = 'component' } = this.props;
    
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Handle error with our error handling system
    this.handleErrorWithSystem(error, errorInfo, componentName, level);

    // Report error if enabled
    if (enableReporting) {
      this.reportError(error, errorInfo, componentName, level);
    }

    // Add breadcrumb
    this.errorReporting.addBreadcrumb({
      timestamp: Date.now(),
      category: 'error',
      message: `Error boundary caught error in ${componentName || 'unknown component'}`,
      level: 'error',
      data: {
        componentStack: errorInfo.componentStack,
        errorStack: error.stack,
        level
      }
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state when resetKeys change
    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some((key, idx) => key !== prevResetKeys[idx]);
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error state when props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private async handleErrorWithSystem(
    error: Error, 
    errorInfo: ErrorInfo, 
    componentName?: string, 
    level?: string
  ) {
    try {
      const recoveryResult = await this.errorHandler.handleError(
        error,
        {
          component: componentName || 'ErrorBoundary',
          action: 'component-render',
          metadata: {
            componentStack: errorInfo.componentStack,
            level,
            retryCount: this.state.retryCount
          }
        },
        {
          severity: level === 'page' ? 'critical' : level === 'section' ? 'high' : 'medium',
          category: 'system',
          maxRetries: this.props.maxRetries || 3
        }
      );

      // If recovery was successful, attempt to reset
      if (recoveryResult.success && this.props.enableRecovery) {
        this.attemptRecovery();
      }
    } catch (handlingError) {
      console.error('Error handling system failed:', handlingError);
    }
  }

  private async reportError(
    error: Error, 
    errorInfo: ErrorInfo, 
    componentName?: string, 
    level?: string
  ) {
    try {
      await this.errorReporting.reportError({
        id: this.state.errorId || 'unknown',
        code: error.name || 'REACT_ERROR',
        message: error.message,
        originalError: error,
        severity: level === 'page' ? 'critical' : level === 'section' ? 'high' : 'medium',
        category: 'system',
        context: {
          component: componentName || 'ErrorBoundary',
          action: 'component-render',
          metadata: {
            componentStack: errorInfo.componentStack,
            level,
            retryCount: this.state.retryCount
          },
          timestamp: Date.now(),
          stackTrace: error.stack
        },
        recoveryStrategy: 'retry',
        retryCount: this.state.retryCount,
        maxRetries: this.props.maxRetries || 3,
        isRecoverable: true,
        userFriendlyMessage: this.getUserFriendlyMessage(level),
        suggestedActions: this.getSuggestedActions(level)
      });
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }
  }

  private getUserFriendlyMessage(level?: string): string {
    switch (level) {
      case 'page':
        return 'We\'re sorry, but something went wrong with this page. Our team has been notified.';
      case 'section':
        return 'This section is temporarily unavailable. Please try refreshing the page.';
      case 'component':
      default:
        return 'A component failed to load properly. You can try refreshing or continue using other features.';
    }
  }

  private getSuggestedActions(level?: string): string[] {
    switch (level) {
      case 'page':
        return ['Refresh the page', 'Go back to the previous page', 'Contact support if the issue persists'];
      case 'section':
        return ['Refresh the page', 'Try again in a few moments', 'Use other features while we fix this'];
      case 'component':
      default:
        return ['Continue using other features', 'Refresh if needed', 'Report if this keeps happening'];
    }
  }

  private attemptRecovery = async () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRecovering: true });

    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 1000 * (this.state.retryCount + 1)));

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
      recoveryAttempted: true
    }));

    // Add recovery breadcrumb
    this.errorReporting.addBreadcrumb({
      timestamp: Date.now(),
      category: 'lifecycle',
      message: `Error boundary attempting recovery (attempt ${this.state.retryCount + 1})`,
      level: 'info',
      data: {
        componentName: this.props.componentName,
        retryCount: this.state.retryCount + 1
      }
    });
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      recoveryAttempted: false
    });

    this.errorReporting.addBreadcrumb({
      timestamp: Date.now(),
      category: 'lifecycle',
      message: 'Error boundary reset',
      level: 'info',
      data: {
        componentName: this.props.componentName
      }
    });
  };

  private handleRetry = () => {
    this.attemptRecovery();
  };

  private handleReset = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private renderErrorFallback() {
    const { fallback, showErrorDetails = false, level = 'component', componentName } = this.props;
    const { error, errorInfo, isRecovering, retryCount, recoveryAttempted } = this.state;

    if (fallback) {
      return fallback;
    }

    const maxRetries = this.props.maxRetries || 3;
    const canRetry = retryCount < maxRetries && this.props.enableRecovery;

    return (
      <div className="m-4 p-6 border border-red-200 bg-red-50 rounded-lg shadow-sm">
        <div className="space-y-4">
          {/* Error Icon and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-800">
                {level === 'page' ? 'Page Error' : level === 'section' ? 'Section Error' : 'Component Error'}
              </h3>
              <p className="text-sm text-red-600">
                {componentName ? `Error in ${componentName}` : 'Something went wrong'}
              </p>
            </div>
          </div>

          {/* User-friendly message */}
          <div className="border border-red-300 bg-red-100 p-4 rounded-md">
            <p className="text-red-800">{this.getUserFriendlyMessage(level)}</p>
          </div>

          {/* Recovery status */}
          {recoveryAttempted && (
            <div className="border border-blue-300 bg-blue-100 p-4 rounded-md">
              <p className="text-blue-800">
                Recovery attempted {retryCount} time{retryCount !== 1 ? 's' : ''}. 
                {canRetry ? ' You can try again.' : ' Maximum retries reached.'}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                disabled={isRecovering}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isRecovering ? 'Retrying...' : `Retry (${maxRetries - retryCount} left)`}
              </button>
            )}
            
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              Reset Component
            </button>

            {level === 'page' && (
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Reload Page
              </button>
            )}
          </div>

          {/* Error details for development */}
          {showErrorDetails && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-800">
                Show Error Details
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div className="mb-2">
                    <strong>Stack Trace:</strong>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Suggested actions */}
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">What you can do:</p>
            <ul className="list-disc list-inside space-y-1">
              {this.getSuggestedActions(level).map((action, index) => (
                <li key={`action-${index}`}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook for manually triggering error boundary
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: Partial<ErrorInfo>) => {
    throw error;
  };
}
