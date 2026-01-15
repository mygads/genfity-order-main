'use client';

import React from 'react';
import Image from 'next/image';

interface StockStatusCardProps {
  id: number | string;
  type: 'menu' | 'addon';
  name: string;
  categoryName?: string;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock?: boolean;
  isActive: boolean;
  imageUrl?: string | null;
  onUpdateStock: (id: number | string, type: 'menu' | 'addon', newQty: number) => void;
  onResetToTemplate: (id: number | string, type: 'menu' | 'addon') => void;
  isSelected?: boolean;
  onSelect?: (id: number | string, type: 'menu' | 'addon') => void;
}

export default function StockStatusCard({
  id,
  type,
  name,
  categoryName,
  stockQty,
  dailyStockTemplate,
  autoResetStock = false,
  imageUrl,
  onUpdateStock,
  onResetToTemplate,
  isSelected = false,
  onSelect,
}: StockStatusCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [newQty, setNewQty] = React.useState(stockQty || 0);

  const getStockStatus = () => {
    if (stockQty === null || stockQty === 0) {
      return {
        label: 'Out',
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        badgeClass: 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400',
      };
    }
    if (stockQty <= 5) {
      return {
        label: 'Low',
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        badgeClass: 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400',
      };
    }
    return {
      label: 'OK',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badgeClass: 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400',
    };
  };

  const status = getStockStatus();

  const handleUpdate = () => {
    onUpdateStock(id, type, newQty);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (dailyStockTemplate !== null) {
      onResetToTemplate(id, type);
    }
  };

  const handleMarkOutOfStock = () => {
    onUpdateStock(id, type, 0);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-900 ${isSelected
          ? 'border-brand-400 ring-2 ring-brand-500/20 dark:border-brand-600'
          : 'border-gray-200 dark:border-gray-800'
        }`}
    >
      {/* Header with Checkbox, Name, and Image */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(id, type)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Name with truncation */}
            <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={name}>
              {name}
            </h3>
            {/* Type and Category - always show */}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
              {type === 'addon' ? 'Add-on' : 'Menu'} {categoryName ? `• ${categoryName}` : ''}
            </p>
            {/* Auto Reset Badge - always reserve space */}
            <div className="mt-2 h-6">
              {autoResetStock && dailyStockTemplate !== null ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Auto Reset
                </span>
              ) : (
                <span className="invisible inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs">placeholder</span>
              )}
            </div>
          </div>
        </div>

        {/* Image with Floating Status Badge or Status only */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg className="h-6 w-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Floating Status Badge */}
          <div className="absolute -bottom-1 -right-1">
            <span className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-xs font-bold shadow-sm ${status.badgeClass}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stock Quantity - always same height */}
      <div className="mb-4 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
              className="h-10 w-20 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="0"
              autoFocus
            />
            <button
              onClick={handleUpdate}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setNewQty(stockQty || 0);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stockQty ?? 0}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">units</span>
            </div>
            {/* Daily Template - always reserve space */}
            <div className="mt-1 h-4">
              {dailyStockTemplate !== null ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Daily template: {dailyStockTemplate} units
                </p>
              ) : (
                <p className="invisible text-xs">placeholder</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions - always same layout */}
      {!isEditing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update
            </button>
            {/* Reset button - always reserve space */}
            {dailyStockTemplate !== null ? (
              <button
                onClick={handleReset}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Reset to template"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            ) : (
              <div className="w-9" />
            )}
          </div>

          {/* Mark Out of Stock - always show for consistency */}
          <button
            onClick={handleMarkOutOfStock}
            disabled={(stockQty ?? 0) === 0}
            className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Mark Out of Stock
          </button>
        </div>
      )}
    </div>
  );
}

// Skeleton component for loading state
export function StockStatusCardSkeleton() {
  return (
    <div className="relative flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1 h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-6 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Stock quantity skeleton */}
      <div className="mb-4 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="h-9 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-2 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Actions skeleton */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-9 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
