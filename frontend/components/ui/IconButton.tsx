'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type IconButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required aria-label for accessibility - describes the button action */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<IconButtonVariant, string> = {
  primary:
    'bg-black text-white hover:bg-gray-800 focus-visible:ring-black disabled:bg-gray-400',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 disabled:bg-gray-100 disabled:text-gray-400',
  outline:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500 disabled:border-gray-200 disabled:text-gray-400',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500 disabled:text-gray-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300',
};

const sizeStyles: Record<IconButtonSize, { button: string; icon: string; spinner: string }> = {
  sm: { button: 'p-1.5', icon: 'text-lg', spinner: 'w-3.5 h-3.5' },
  md: { button: 'p-2', icon: 'text-xl', spinner: 'w-4 h-4' },
  lg: { button: 'p-3', icon: 'text-2xl', spinner: 'w-5 h-5' },
};

/**
 * Icon-only button with required aria-label for accessibility.
 * The aria-label prop is required to ensure screen readers can announce the button's purpose.
 *
 * @example
 * <IconButton aria-label="Close dialog" variant="ghost" onClick={onClose}>
 *   <Icon name="close" />
 * </IconButton>
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const styles = sizeStyles[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        aria-label={ariaLabel}
        className={`
          inline-flex items-center justify-center rounded-lg
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${styles.button}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <span
            className={`inline-block border-2 border-current border-t-transparent rounded-full animate-spin ${styles.spinner}`}
            aria-hidden="true"
          />
        ) : (
          <span className={styles.icon} aria-hidden="true">
            {children}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
