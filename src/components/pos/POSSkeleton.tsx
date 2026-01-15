/**
 * POS Skeleton Loading Component
 * 
 * Professional skeleton loading UI for the POS page
 * Matches the layout of the actual POS interface
 */

'use client';

import React from 'react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export const POSSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden -mb-6" style={{ height: 'calc(100vh - 90px)' }}>
      {/* Header Skeleton */}
      <header className="shrink-0 h-14 bg-brand-500 dark:bg-brand-600 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-lg bg-white/20" />
          <Skeleton className="w-32 h-6 rounded bg-white/20" />

          {/* Offline/Sync indicator placeholder */}
          <Skeleton className="hidden sm:block w-28 h-8 rounded-lg bg-white/20" />
        </div>
        <div className="flex items-center gap-2">
          {/* Grid controls */}
          <Skeleton className="hidden md:block w-24 h-8 rounded-lg bg-white/20" />
          <Skeleton className="w-9 h-9 rounded-lg bg-white/20" />
          <Skeleton className="w-24 h-9 rounded-lg bg-white/20" />
          <Skeleton className="hidden sm:block w-9 h-9 rounded-lg bg-white/20" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Product Grid Skeleton (matches current POS layout) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-800 min-w-0">
          {/* Search & Category Bar */}
          <div className="shrink-0 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="w-full h-10 rounded-lg mb-3" />
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="w-20 h-8 rounded-full shrink-0" />
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm">
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-3">
                    <Skeleton className="w-3/4 h-4 mb-2" />
                    <Skeleton className="w-1/2 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Cart Skeleton (matches current POS layout) */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="w-28 h-6" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            {/* Order Type Toggle */}
            <div className="flex gap-2">
              <Skeleton className="flex-1 h-10 rounded-lg" />
              <Skeleton className="flex-1 h-10 rounded-lg" />
            </div>
            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Skeleton className="flex-1 h-9 rounded-lg" />
              <Skeleton className="flex-1 h-9 rounded-lg" />
              <Skeleton className="flex-1 h-9 rounded-lg" />
            </div>
          </div>

          {/* Cart Items Skeleton */}
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Skeleton className="w-32 h-4 mb-2" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      <Skeleton className="w-7 h-7 rounded" />
                      <Skeleton className="w-8 h-7 rounded" />
                      <Skeleton className="w-7 h-7 rounded" />
                    </div>
                    <Skeleton className="w-16 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-20 h-10 rounded-lg" />
              <Skeleton className="flex-1 h-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSkeleton;
