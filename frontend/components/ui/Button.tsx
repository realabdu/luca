'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
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

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

/**
 * Accessible button component with variants, loading state, and proper ARIA attributes.
 *
 * @example
 * <Button variant="primary" isLoading={isSubmitting}>
 *   Save Changes
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
