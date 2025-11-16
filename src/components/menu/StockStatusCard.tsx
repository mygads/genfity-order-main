'use client';

import React from 'react';
import { PencilIcon, CheckCircleIcon, CloseIcon } from '@/icons';
import Image from 'next/image';

/**
 * Stock Status Card Component
 * 
 * Professional stock status card with:
 * - Clean neutral design
 * - SVG icons from design system
 * - Color-coded status indicators (subtle)
 * - Quick update actions
 * 
 * Status colors (subtle):
 * - Success: Stock healthy (>5)
 * - Warning: Low stock (1-5)
 * - Error: Out of stock (0)
 */

interface StockStatusCardProps {
  id: number | string; // Can be string due to BigInt serialization
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
  isActive,
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
        badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
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
        badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
      };
    }
    return {
      label: 'OK',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
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
      className={`relative rounded-lg border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-900 ${
        isSelected
          ? 'border-gray-900 ring-2 ring-gray-900/10 dark:border-white dark:ring-white/10'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      {/* Header with Checkbox, Name, and Image */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(id, type)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-800 dark:checked:bg-white"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
              {name}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {type === 'addon' ? 'Add-on' : 'Menu'} {categoryName && `• ${categoryName}`}
            </p>
            {autoResetStock && dailyStockTemplate !== null && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Auto Reset
              </span>
            )}
          </div>
        </div>

        {/* Image with Floating Status Badge */}
        {imageUrl && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="80px"
            />
            {/* Floating Status Badge */}
            <div className="absolute top-1.5 right-1.5">
              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium shadow-sm backdrop-blur-sm ${status.badgeClass}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
          </div>
        )}
        {/* Status Badge without Image */}
        {!imageUrl && (
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${status.badgeClass}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        )}
      </div>

      {/* Stock Quantity */}
      <div className="mb-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
              className="h-10 w-24 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
              min="0"
              autoFocus
            />
            <button
              onClick={handleUpdate}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setNewQty(stockQty || 0);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {stockQty ?? 0}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">units in stock</span>
            </div>
            {dailyStockTemplate !== null && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Daily template: {dailyStockTemplate} units
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Update
            </button>
            {dailyStockTemplate !== null && (
              <button
                onClick={handleReset}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Reset to template"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>

          {(stockQty ?? 0) > 0 && (
            <button
              onClick={handleMarkOutOfStock}
              className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Mark Out of Stock
            </button>
          )}
        </div>
      )}
    </div>
  );
}

