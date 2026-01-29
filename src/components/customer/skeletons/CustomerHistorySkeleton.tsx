'use client';

import React from 'react';

export function CustomerHistoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-xl bg-white">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
          </div>

          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerHistoryPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 pb-24">
        <CustomerHistoryListSkeleton />
      </div>
    </div>
  );
}
