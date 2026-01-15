"use client";

import React from 'react';

import { cn } from '@/lib/utils';

export type SettingsNavItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

export type SettingsNavGroup = {
  title: string;
  items: SettingsNavItem[];
};

export interface SettingsSidebarNavProps {
  groups: SettingsNavGroup[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function SettingsSidebarNav({ groups, activeId, onChange, className }: SettingsSidebarNavProps) {
  return (
    <nav className={cn('space-y-4', className)} aria-label="Settings navigation">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {group.title}
          </div>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  data-tutorial={`settings-nav-item-${item.id}`}
                  className={cn(
                    'group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-200'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/40'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon ? (
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        isActive
                          ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-white dark:bg-gray-800 dark:text-gray-300 dark:group-hover:bg-gray-900'
                      )}
                    >
                      {item.icon}
                    </span>
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium" title={item.label}>
                      {item.label}
                    </span>
                    {item.description ? (
                      <span
                        className={cn(
                          'mt-0.5 block truncate text-[11px] leading-snug',
                          isActive ? 'text-brand-600/80 dark:text-brand-200/80' : 'text-gray-500 dark:text-gray-400'
                        )}
                        title={item.description}
                      >
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
