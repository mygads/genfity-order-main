import React from 'react';
import { FaToggleOff, FaToggleOn } from 'react-icons/fa';

type IconToggleSize = 'sm' | 'md';
type IconToggleVariant = 'full' | 'iconOnly';

export interface IconToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: React.ReactNode;
  description?: React.ReactNode;
  size?: IconToggleSize;
  variant?: IconToggleVariant;
  ariaLabel?: string;
  className?: string;
}

export default function IconToggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  variant = 'full',
  ariaLabel,
  className = '',
}: IconToggleProps) {
  const iconClassName = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const labelClassName = size === 'sm' ? 'text-sm' : 'text-sm';

  if (variant === 'iconOnly') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`inline-flex items-center select-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
      >
        {checked ? (
          <FaToggleOn className={`${iconClassName} text-brand-500`} />
        ) : (
          <FaToggleOff className={`${iconClassName} text-gray-400`} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 text-left select-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
    >
      <span className="mt-0.5">
        {checked ? (
          <FaToggleOn className={`${iconClassName} text-brand-500`} />
        ) : (
          <FaToggleOff className={`${iconClassName} text-gray-400`} />
        )}
      </span>
      <span className="flex-1">
        <span className={`block ${labelClassName} font-medium text-gray-900 dark:text-white`}>{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
