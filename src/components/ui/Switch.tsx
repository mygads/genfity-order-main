import React from 'react';

import { cn } from '@/lib/utils';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export default function Switch({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
}: SwitchProps) {
  const trackSize = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const thumbSize = size === 'sm' ? 'after:h-4 after:w-4' : 'after:h-5 after:w-5';

  return (
    <label className={cn('relative inline-flex items-center', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <div
        className={cn(
          'rounded-full bg-gray-200 transition-colors',
          trackSize,
          thumbSize,
          'after:absolute after:left-0.5 after:top-0.5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-transform after:content-[\'\']',
          'peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white',
          'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/20',
          'dark:bg-gray-700',
          disabled && 'opacity-60'
        )}
      />
    </label>
  );
}
