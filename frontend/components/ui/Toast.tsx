'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, { bg: string; icon: string; iconName: string }> = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    iconName: 'check_circle',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    iconName: 'error',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    iconName: 'warning',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    iconName: 'info',
  },
};

/**
 * Individual toast notification component with auto-dismiss and manual close.
 */
export function Toast({
  id,
  variant = 'info',
  title,
  description,
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const styles = variantStyles[variant];

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  // Handle exit animation
  useEffect(() => {
    if (!isExiting) return;

    const timer = setTimeout(() => {
      onDismiss(id);
    }, 200); // Match animation duration

    return () => clearTimeout(timer);
  }, [isExiting, id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border shadow-lg
        transition-all duration-200
        ${styles.bg}
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <Icon name={styles.iconName} size="md" className={styles.icon} aria-hidden />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="
          p-1 rounded-md text-gray-400
          hover:text-gray-600 hover:bg-black/5
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
          transition-colors
        "
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
