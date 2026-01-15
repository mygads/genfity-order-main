/**
 * Button Component
 * Reusable button with multiple variants and sizes
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    // Variant styles
    const variantStyles = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 disabled:bg-brand-200 disabled:cursor-not-allowed',
      secondary:
        'bg-transparent text-brand-600 border-2 border-brand-500 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed',
      ghost:
        'bg-transparent text-[#1A1A1A] hover:bg-[#F5F5F5] disabled:opacity-50 disabled:cursor-not-allowed',
      danger:
        'bg-error-600 text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed',
    };

    // Size styles
    const sizeStyles = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'rounded-lg font-semibold',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          'active:scale-[0.98]',

          // Variant styles
          variantStyles[variant],

          // Size styles
          sizeStyles[size],

          // Full width
          isFullWidth && 'w-full',

          // Custom className
          className,
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {!isLoading && leftIcon && <span>{leftIcon}</span>}

        <span>{children}</span>

        {!isLoading && rightIcon && <span>{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
