'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export interface UseNotificationOptions {
  /** Auto-dismiss duration in milliseconds. Set to 0 to disable. Default: 5000 */
  autoDismissMs?: number;
}

export interface UseNotificationReturn {
  /** Current notification (if any) */
  notification: Notification | null;
  /** Show a success notification */
  showSuccess: (message: string) => void;
  /** Show an error notification */
  showError: (message: string) => void;
  /** Show a warning notification */
  showWarning: (message: string) => void;
  /** Show an info notification */
  showInfo: (message: string) => void;
  /** Dismiss the current notification */
  dismiss: () => void;
  /** Check if a notification is currently showing */
  isVisible: boolean;
}

let notificationCounter = 0;

/**
 * Hook for managing local notification state with auto-dismiss.
 * Useful for inline notifications within a component.
 *
 * For global toast notifications, use the useToast hook from ToastProvider instead.
 *
 * @example
 * function MyComponent() {
 *   const { notification, showSuccess, showError, dismiss } = useNotification();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       showSuccess('Data saved successfully!');
 *     } catch (error) {
 *       showError('Failed to save data');
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {notification && (
 *         <Alert type={notification.type} onDismiss={dismiss}>
 *           {notification.message}
 *         </Alert>
 *       )}
 *       <button onClick={handleSave}>Save</button>
 *     </div>
 *   );
 * }
 */
export function useNotification(
  options: UseNotificationOptions = {}
): UseNotificationReturn {
  const { autoDismissMs = 5000 } = options;
  const [notification, setNotification] = useState<Notification | null>(null);

  // Auto-dismiss effect
  useEffect(() => {
    if (!notification || autoDismissMs <= 0) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [notification, autoDismissMs]);

  const show = useCallback((type: NotificationType, message: string) => {
    setNotification({
      id: `notification-${++notificationCounter}`,
      type,
      message,
    });
  }, []);

  const showSuccess = useCallback(
    (message: string) => show('success', message),
    [show]
  );

  const showError = useCallback(
    (message: string) => show('error', message),
    [show]
  );

  const showWarning = useCallback(
    (message: string) => show('warning', message),
    [show]
  );

  const showInfo = useCallback(
    (message: string) => show('info', message),
    [show]
  );

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
    isVisible: notification !== null,
  };
}
