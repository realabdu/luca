'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// Context
// ============================================================================

interface DialogContextValue {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

// ============================================================================
// Root
// ============================================================================

export interface DialogProps {
  children: ReactNode;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
}

export function Dialog({ children, open, onClose }: DialogProps) {
  const id = useId();
  const titleId = `dialog-title-${id}`;
  const descriptionId = `dialog-description-${id}`;

  return (
    <DialogContext.Provider value={{ isOpen: open, onClose, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  );
}

// ============================================================================
// Content
// ============================================================================

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
  /** Width of the dialog */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function DialogContent({ children, className = '', size = 'md' }: DialogContentProps) {
  const { isOpen, onClose, titleId, descriptionId } = useDialogContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Store and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap and restoration
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus the dialog
    dialog.focus();

    // Get all focusable elements
    const getFocusableElements = () => {
      return dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === dialog) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on cleanup
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`
          relative z-10 w-full bg-white rounded-xl shadow-2xl
          focus:outline-none
          ${sizeStyles[size]}
          ${className}
        `}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// Header
// ============================================================================

export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return (
    <div className={`px-6 pt-6 pb-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Title
// ============================================================================

export interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  const { titleId } = useDialogContext();

  return (
    <h2
      id={titleId}
      className={`text-lg font-semibold text-gray-900 ${className}`}
    >
      {children}
    </h2>
  );
}

// ============================================================================
// Description
// ============================================================================

export interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  const { descriptionId } = useDialogContext();

  return (
    <p
      id={descriptionId}
      className={`mt-2 text-sm text-gray-600 ${className}`}
    >
      {children}
    </p>
  );
}

// ============================================================================
// Body
// ============================================================================

export interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

export function DialogBody({ children, className = '' }: DialogBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Footer
// ============================================================================

export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={`px-6 pb-6 pt-4 flex justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Close Button
// ============================================================================

export interface DialogCloseProps {
  children: ReactNode;
  className?: string;
}

export function DialogClose({ children, className = '' }: DialogCloseProps) {
  const { onClose } = useDialogContext();

  return (
    <button
      type="button"
      onClick={onClose}
      className={className}
    >
      {children}
    </button>
  );
}
