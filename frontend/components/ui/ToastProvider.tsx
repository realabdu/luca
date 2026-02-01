'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastVariant } from './Toast';

// ============================================================================
// Types
// ============================================================================

interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastData, 'id'>) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functions. Must be used within ToastProvider.
 *
 * @example
 * const toast = useToast();
 *
 * // Using helper methods
 * toast.success('Changes saved');
 * toast.error('Failed to save', 'Please try again');
 *
 * // Using the generic toast method
 * toast.toast({ variant: 'info', title: 'New message', duration: 3000 });
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
  /** Position of the toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

let toastCounter = 0;

/**
 * Provider component for global toast notifications.
 * Place this at the root of your app to enable toasts throughout.
 *
 * @example
 * // In your layout or app root
 * <ToastProvider position="bottom-right">
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({
  children,
  maxToasts = 5,
  position = 'bottom-right',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);

  // Ensure we're mounted before rendering portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (options: Omit<ToastData, 'id'>) => {
      const id = `toast-${++toastCounter}`;
      const newToast: ToastData = { ...options, id };

      setToasts((prev) => {
        // Keep only the most recent toasts up to maxToasts
        const updated = [...prev, newToast];
        return updated.slice(-maxToasts);
      });

      return id;
    },
    [maxToasts]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ variant: 'success', title, description }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      toast({ variant: 'error', title, description }),
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ variant: 'warning', title, description }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      toast({ variant: 'info', title, description }),
    [toast]
  );

  const contextValue: ToastContextValue = {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className={`fixed z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none ${positionStyles[position]}`}
            aria-label="Notifications"
          >
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <Toast
                  id={t.id}
                  variant={t.variant}
                  title={t.title}
                  description={t.description}
                  duration={t.duration}
                  onDismiss={dismiss}
                />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
