'use client';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IconProps {
  /** Material Symbols icon name (e.g., "search", "close", "settings") */
  name: string;
  /** Size variant */
  size?: IconSize;
  /** Whether the icon is filled */
  filled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom aria-label for standalone icons (not needed when used inside buttons with aria-label) */
  'aria-label'?: string;
  /** Whether to hide from screen readers (default: true, as icons are usually decorative) */
  'aria-hidden'?: boolean;
}

const sizeStyles: Record<IconSize, string> = {
  xs: 'text-sm',      // 14px
  sm: 'text-base',    // 16px
  md: 'text-xl',      // 20px
  lg: 'text-2xl',     // 24px
  xl: 'text-3xl',     // 30px
  '2xl': 'text-4xl',  // 36px
};

/**
 * Wrapper component for Material Symbols icons with consistent sizing.
 * Uses the material-symbols-outlined font.
 *
 * @example
 * // Basic usage
 * <Icon name="search" />
 *
 * // Different sizes
 * <Icon name="settings" size="lg" />
 *
 * // Filled variant
 * <Icon name="favorite" filled />
 *
 * // With custom styling
 * <Icon name="close" className="text-red-500" />
 */
export function Icon({
  name,
  size = 'md',
  filled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <span
      className={`
        material-symbols-outlined select-none leading-none
        ${sizeStyles[size]}
        ${className}
      `}
      style={{
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      role={ariaLabel ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
