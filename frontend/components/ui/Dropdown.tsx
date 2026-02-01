'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

// ============================================================================
// Context
// ============================================================================

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerId: string;
  menuId: string;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  itemCount: number;
  registerItem: () => number;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
}

// ============================================================================
// Root
// ============================================================================

export interface DropdownProps {
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({ children, open, onOpenChange }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [itemCount, setItemCount] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);

      // Reset active index when closing
      if (!newOpen) {
        setActiveIndex(-1);
      }
    },
    [isControlled, onOpenChange]
  );

  const id = useId();
  const triggerId = `dropdown-trigger-${id}`;
  const menuId = `dropdown-menu-${id}`;

  const registerItem = useCallback(() => {
    const index = itemCount;
    setItemCount((prev) => prev + 1);
    return index;
  }, [itemCount]);

  // Reset item count when menu opens (for re-registration)
  useEffect(() => {
    if (isOpen) {
      setItemCount(0);
    }
  }, [isOpen]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen,
        triggerId,
        menuId,
        activeIndex,
        setActiveIndex,
        itemCount,
        registerItem,
        triggerRef,
      }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

// ============================================================================
// Trigger
// ============================================================================

export interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

export const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ children, className = '' }, forwardedRef) => {
    const { isOpen, setIsOpen, triggerId, menuId, triggerRef } = useDropdownContext();

    // Merge refs
    const ref = useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, triggerRef]
    );

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
      <button
        ref={ref}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={className}
      >
        {children}
      </button>
    );
  }
);

DropdownTrigger.displayName = 'DropdownTrigger';

// ============================================================================
// Menu
// ============================================================================

export interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  /** Alignment relative to trigger */
  align?: 'start' | 'end';
}

export function DropdownMenu({ children, className = '', align = 'start' }: DropdownMenuProps) {
  const { isOpen, setIsOpen, triggerId, menuId, activeIndex, setActiveIndex, itemCount, triggerRef } =
    useDropdownContext();
  const menuRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen, triggerRef]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(activeIndex < itemCount - 1 ? activeIndex + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(activeIndex > 0 ? activeIndex - 1 : itemCount - 1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(itemCount - 1);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Focus menu when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus();
      setActiveIndex(0);
    }
  }, [isOpen, setActiveIndex]);

  if (!isOpen) return null;

  return (
    <ul
      ref={menuRef}
      id={menuId}
      role="listbox"
      aria-labelledby={triggerId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`
        absolute z-50 mt-1 min-w-[180px] max-h-[300px] overflow-auto
        bg-white border border-gray-200 rounded-lg shadow-lg
        py-1 focus:outline-none
        ${align === 'end' ? 'right-0' : 'left-0'}
        ${className}
      `}
    >
      {children}
    </ul>
  );
}

// ============================================================================
// Item
// ============================================================================

export interface DropdownItemProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function DropdownItem({
  children,
  className = '',
  disabled = false,
  selected = false,
  onSelect,
}: DropdownItemProps) {
  const { activeIndex, setIsOpen, triggerRef } = useDropdownContext();
  const [itemIndex, setItemIndex] = useState(-1);
  const itemRef = useRef<HTMLLIElement>(null);

  // Register item on mount
  useEffect(() => {
    // Use a simple counter approach
    const index = itemRef.current?.parentElement
      ? Array.from(itemRef.current.parentElement.children).indexOf(itemRef.current)
      : -1;
    setItemIndex(index);
  }, []);

  const isActive = activeIndex === itemIndex;

  // Scroll into view when active
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive]);

  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <li
      ref={itemRef}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        px-3 py-2 text-sm cursor-pointer
        transition-colors duration-100
        ${isActive ? 'bg-gray-100' : ''}
        ${selected ? 'font-medium text-black' : 'text-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        ${className}
      `}
    >
      {children}
    </li>
  );
}

// ============================================================================
// Separator
// ============================================================================

export function DropdownSeparator() {
  return <li role="separator" className="my-1 border-t border-gray-200" />;
}
