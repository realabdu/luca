'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Required label for accessibility - can be visually hidden */
  label: string;
  /** Hide the label visually while keeping it accessible to screen readers */
  hideLabel?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon to display on the left side of the input */
  leftIcon?: ReactNode;
  /** Icon to display on the right side of the input */
  rightIcon?: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const iconPadding = {
  sm: { left: 'pl-9', right: 'pr-9' },
  md: { left: 'pl-10', right: 'pr-10' },
  lg: { left: 'pl-11', right: 'pr-11' },
};

/**
 * Accessible input component with required label (can be visually hidden).
 *
 * @example
 * // Visible label
 * <Input label="Email" type="email" placeholder="you@example.com" />
 *
 * // Hidden label (for search inputs)
 * <Input label="Search campaigns" hideLabel placeholder="Search..." leftIcon={<Icon name="search" />} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hideLabel = false,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      fullWidth = false,
      disabled,
      className = '',
      id: providedId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = !!error;
    const describedBy = [
      ariaDescribedBy,
      hasError ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <label
          htmlFor={id}
          className={
            hideLabel
              ? 'sr-only'
              : 'block text-sm font-medium text-gray-700 mb-1.5'
          }
        >
          {label}
        </label>

        <div className="relative">
          {leftIcon && (
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={`
              block rounded-lg border bg-white text-gray-900
              placeholder:text-gray-400
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${sizeStyles[size]}
              ${leftIcon ? iconPadding[size].left : ''}
              ${rightIcon ? iconPadding[size].right : ''}
              ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-300 focus:border-black focus:ring-black/20'
              }
              ${fullWidth ? 'w-full' : ''}
              ${className}
            `}
            {...props}
          />

          {rightIcon && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {hasError && (
          <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {helperText && !hasError && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
