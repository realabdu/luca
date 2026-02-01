'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches rendering errors and displays a fallback UI.
 * Use this to wrap sections of your app that might fail, preventing the entire app from crashing.
 *
 * @example
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <SomeComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
    >
      <div className="size-16 bg-red-50 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-[32px] text-red-600" aria-hidden="true">
          error
        </span>
      </div>
      <h2 className="text-xl font-bold text-text-main mb-2">Something went wrong</h2>
      <p className="text-sm text-text-muted mb-4 max-w-md">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Reusable error fallback component for custom error displays
 */
export interface ErrorFallbackProps {
  title?: string;
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function ErrorFallback({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showRetry = true,
  onRetry,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center"
    >
      <div className="size-12 bg-red-50 flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[24px] text-red-600" aria-hidden="true">
          error
        </span>
      </div>
      <h3 className="text-lg font-semibold text-text-main mb-1">{title}</h3>
      <p className="text-sm text-text-muted mb-4 max-w-sm">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 border border-border-light bg-white text-text-main text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
