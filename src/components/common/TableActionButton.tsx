'use client';

import React from 'react';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/utils';

export type TableActionTone = 'default' | 'danger';

export interface TableActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconType;
  label?: string;
  tone?: TableActionTone;
  containerClassName?: string;
}

export function TableActionButton({
  icon: Icon,
  label,
  tone = 'default',
  className,
  containerClassName,
  type = 'button',
  disabled,
  ...props
}: TableActionButtonProps) {
  const iconColor =
    tone === 'danger'
      ? 'text-error-600 dark:text-error-400'
      : 'text-gray-900 dark:text-gray-100';

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-gray-200 bg-white shadow-sm',
        'dark:border-gray-800 dark:bg-gray-900',
        disabled && 'opacity-60',
        containerClassName,
      )}
    >
      <button
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors',
          'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          'dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-950',
          !label && 'w-9 px-0',
          className,
        )}
        {...props}
      >
        <Icon className={cn('h-4 w-4', iconColor)} />
        {label ? (
          <span className={cn(tone === 'danger' ? 'text-error-700 dark:text-error-300' : 'text-gray-800 dark:text-gray-200')}>
            {label}
          </span>
        ) : null}
      </button>
    </div>
  );
}
