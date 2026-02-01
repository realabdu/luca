'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseDropdownOptions {
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (isOpen: boolean) => void;
  /** Whether to close when clicking outside */
  closeOnClickOutside?: boolean;
  /** Whether to close when pressing Escape */
  closeOnEscape?: boolean;
}

export interface UseDropdownReturn {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Toggle the dropdown */
  toggle: () => void;
  /** Set the open state directly */
  setIsOpen: (isOpen: boolean) => void;
  /** Ref to attach to the dropdown container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to attach to the trigger element */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** Props to spread on the trigger button */
  triggerProps: {
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'listbox';
  };
}

/**
 * Hook for managing dropdown open/close state with click-outside detection.
 *
 * @example
 * function FilterDropdown() {
 *   const { isOpen, toggle, close, containerRef, triggerProps } = useDropdown();
 *
 *   return (
 *     <div ref={containerRef} className="relative">
 *       <button {...triggerProps}>
 *         Filter
 *       </button>
 *       {isOpen && (
 *         <ul className="absolute top-full">
 *           <li onClick={close}>Option 1</li>
 *           <li onClick={close}>Option 2</li>
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 */
export function useDropdown(options: UseDropdownOptions = {}): UseDropdownReturn {
  const {
    defaultOpen = false,
    onOpenChange,
    closeOnClickOutside = true,
    closeOnEscape = true,
  } = options;

  const [isOpen, setIsOpenState] = useState(defaultOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      setIsOpenState(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  const open = useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen, setIsOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (containerRef.current && !containerRef.current.contains(target)) {
        close();
      }
    };

    // Use mousedown for better UX (closes before the click completes)
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickOutside, close]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        // Return focus to trigger
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, close]);

  const triggerProps = {
    onClick: toggle,
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox' as const,
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
    containerRef,
    triggerRef,
    triggerProps,
  };
}
