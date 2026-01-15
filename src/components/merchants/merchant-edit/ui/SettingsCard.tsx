import React from 'react';

import { cn } from '@/lib/utils';

export interface SettingsCardProps {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SettingsCard({ title, description, rightSlot, children, className }: SettingsCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5',
        'dark:border-gray-800 dark:bg-gray-950',
        className
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </header>

      <div className="mt-4">{children}</div>
    </section>
  );
}
