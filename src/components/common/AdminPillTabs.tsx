'use client';

import React from 'react';

export type AdminPillTabColor = 'primary' | 'amber' | 'gray';

export type AdminPillTabItem<TId extends string> = {
  id: TId;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  color?: AdminPillTabColor;
  hidden?: boolean;
  title?: string;
};

function badgeClassesFor(color: AdminPillTabColor): string {
  if (color === 'amber') return 'bg-amber-600';
  if (color === 'gray') return 'bg-gray-700 dark:bg-gray-600';
  return 'bg-primary-600';
}

function classesFor(color: AdminPillTabColor, active: boolean): string {
  if (color === 'amber') {
    return active
      ? 'bg-amber-500 text-white shadow-sm'
      : 'text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20';
  }

  if (color === 'gray') {
    return active
      ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';
  }

  // primary
  return active
    ? 'bg-primary-500 text-white shadow-sm'
    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800';
}

export default function AdminPillTabs<TId extends string>(props: {
  items: Array<AdminPillTabItem<TId>>;
  activeId: TId;
  onChange: (id: TId) => void;
  className?: string;
}) {
  const visibleItems = props.items.filter((i) => !i.hidden);
  if (visibleItems.length <= 1) return null;

  return (
    <div
      className={
        'flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900 ' +
        (props.className || '')
      }
    >
      {visibleItems.map((item) => {
        const active = props.activeId === item.id;
        const color = item.color ?? 'primary';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => props.onChange(item.id)}
            className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all ${classesFor(
              color,
              active
            )}`}
            title={item.title}
            aria-pressed={active}
          >
            {item.icon ? <span className="h-3.5 w-3.5">{item.icon}</span> : null}
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label}</span>
            {typeof item.badge === 'number' ? (
              <span
                className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${badgeClassesFor(
                  color
                )}`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
