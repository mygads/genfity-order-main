/**
 * Skeleton Loader Components
 * Reusable skeleton components for better loading UX
 */

import React from 'react';

/**
 * Base Skeleton Component
 */
export function Skeleton({ className = '', width = 'w-full', height = 'h-4' }: {
  className?: string;
  width?: string;
  height?: string
}) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-3">
        <Skeleton width="w-1/2" height="h-6" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} width="w-full" height="h-4" />
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard Stats Card Skeleton
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton width="w-24" height="h-4" />
          <Skeleton width="w-32" height="h-8" />
        </div>
        <Skeleton width="w-12" height="h-12" className="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-800">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton width="w-full" height="h-4" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton width="w-20" height="h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * List Item Skeleton
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton width="w-16" height="h-16" className="rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-1/2" height="h-5" />
        <Skeleton width="w-3/4" height="h-4" />
      </div>
      <Skeleton width="w-20" height="h-8" className="rounded-lg" />
    </div>
  );
}

/**
 * Dashboard Page Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton width="w-48" height="h-8" />
        <Skeleton width="w-64" height="h-4" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}

/**
 * Menu Page Skeleton
 */
export function MenuPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-48" height="h-8" />
        <div className="flex gap-3">
          <Skeleton width="w-32" height="h-10" className="rounded-lg" />
          <Skeleton width="w-32" height="h-10" className="rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton width="w-48" height="h-10" className="rounded-lg" />
        <Skeleton width="w-32" height="h-10" className="rounded-lg" />
        <Skeleton width="w-24" height="h-10" className="rounded-lg" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}

/**
 * Form Page Skeleton
 */
export function FormPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton width="w-48" height="h-8" />

      {/* Form Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton width="w-32" height="h-4" />
              <Skeleton width="w-full" height="h-10" className="rounded-lg" />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Skeleton width="w-32" height="h-10" className="rounded-lg" />
            <Skeleton width="w-32" height="h-10" className="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Orders Page Skeleton
 */
export function OrdersPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-48" height="h-8" />
        <Skeleton width="w-32" height="h-10" className="rounded-lg" />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="w-24" height="h-10" className="-mb-px" />
        ))}
      </div>

      {/* Order List */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton width="w-32" height="h-6" />
                  <Skeleton width="w-48" height="h-4" />
                </div>
                <Skeleton width="w-24" height="h-8" className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton width="w-full" height="h-4" />
                <Skeleton width="w-3/4" height="h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Customer Order Page Skeleton (Mobile-optimized)
 */
export function CustomerOrderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Banner Skeleton */}
      <Skeleton width="w-full" height="h-48" className="rounded-none" />

      {/* Restaurant Info */}
      <div className="px-4 space-y-3">
        <Skeleton width="w-3/4" height="h-6" />
        <Skeleton width="w-full" height="h-4" />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-4 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="w-24" height="h-9" className="rounded-full shrink-0" />
        ))}
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Staff Page Skeleton
 */
export function StaffPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-32" height="h-8" />
          <Skeleton width="w-64" height="h-4" />
        </div>
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton width="w-64" height="h-10" className="rounded-lg" />
        <Skeleton width="w-40" height="h-10" className="rounded-lg" />
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <Skeleton width="w-14" height="h-14" className="rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton width="w-32" height="h-5" />
                <Skeleton width="w-24" height="h-4" />
                <Skeleton width="w-20" height="h-6" className="rounded-full" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton width="w-20" height="h-8" className="rounded-lg" />
              <Skeleton width="w-20" height="h-8" className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Merchants Page Skeleton
 */
export function MerchantsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-40" height="h-8" />
          <Skeleton width="w-56" height="h-4" />
        </div>
        <Skeleton width="w-40" height="h-10" className="rounded-lg" />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton width="w-72" height="h-10" className="rounded-lg" />
        <Skeleton width="w-40" height="h-10" className="rounded-lg" />
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Merchants Table */}
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}

/**
 * Users Page Skeleton
 */
export function UsersPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-24" height="h-8" />
          <Skeleton width="w-48" height="h-4" />
        </div>
        <Skeleton width="w-32" height="h-10" className="rounded-lg" />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton width="w-64" height="h-10" className="rounded-lg" />
        <Skeleton width="w-40" height="h-10" className="rounded-lg" />
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Users Table */}
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}

/**
 * Revenue Page Skeleton
 */
export function RevenuePageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with Date Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton width="w-40" height="h-8" />
          <Skeleton width="w-72" height="h-4" />
        </div>
        <div className="flex gap-3">
          <Skeleton width="w-40" height="h-10" className="rounded-lg" />
          <Skeleton width="w-40" height="h-10" className="rounded-lg" />
          <Skeleton width="w-32" height="h-10" className="rounded-lg" />
        </div>
      </div>

      {/* Revenue Summary Cards - 5 cards in a row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
            <div className="space-y-3">
              <Skeleton width="w-20" height="h-4" />
              <Skeleton width="w-24" height="h-8" />
              <Skeleton width="w-16" height="h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Daily Revenue Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton width="w-48" height="h-6" />
          <Skeleton width="w-24" height="h-6" className="rounded" />
        </div>
        <Skeleton width="w-full" height="h-80" className="rounded-lg" />
      </div>

      {/* Order Breakdown Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton width="w-40" height="h-6" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton width="w-20" height="h-4" />
                <Skeleton width="w-12" height="h-4" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton width="w-40" height="h-6" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton width="w-24" height="h-4" />
                <Skeleton width="w-16" height="h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Revenue Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Skeleton width="w-48" height="h-6" className="mb-4" />
        <TableSkeleton rows={7} columns={5} />
      </div>
    </div>
  );
}

/**
 * Addon Items Page Skeleton
 */
export function AddonItemsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-36" height="h-8" />
          <Skeleton width="w-64" height="h-4" />
        </div>
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton width="w-56" height="h-10" className="rounded-lg" />
        <Skeleton width="w-44" height="h-10" className="rounded-lg" />
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Addon Items Table */}
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}

/**
 * Categories Page Skeleton
 */
export function CategoriesPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-32" height="h-8" />
          <Skeleton width="w-56" height="h-4" />
        </div>
        <Skeleton width="w-40" height="h-10" className="rounded-lg" />
      </div>

      {/* Search */}
      <Skeleton width="w-72" height="h-10" className="rounded-lg" />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4">
              <Skeleton width="w-12" height="h-12" className="rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton width="w-28" height="h-5" />
                <Skeleton width="w-20" height="h-4" />
              </div>
              <div className="flex gap-1">
                <Skeleton width="w-8" height="h-8" className="rounded-lg" />
                <Skeleton width="w-8" height="h-8" className="rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Order History Page Skeleton
 */
export function OrderHistoryPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-40" height="h-8" />
          <Skeleton width="w-56" height="h-4" />
        </div>
        <div className="flex gap-3">
          <Skeleton width="w-36" height="h-10" className="rounded-lg" />
          <Skeleton width="w-28" height="h-10" className="rounded-lg" />
        </div>
      </div>

      {/* Date Range and Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton width="w-48" height="h-10" className="rounded-lg" />
        <Skeleton width="w-48" height="h-10" className="rounded-lg" />
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
        <Skeleton width="w-36" height="h-10" className="rounded-lg" />
      </div>

      {/* Orders Table */}
      <TableSkeleton rows={10} columns={8} />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton width="w-40" height="h-4" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="w-10" height="h-10" className="rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Kitchen Display Page Skeleton
 */
export function KitchenDisplaySkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm dark:bg-gray-950/95 border-b border-gray-200 dark:border-gray-800 pb-4 px-6 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton width="w-48" height="h-8" />
            <Skeleton width="w-64" height="h-4" />
          </div>
          <div className="flex gap-3">
            <Skeleton width="w-24" height="h-10" className="rounded-lg" />
            <Skeleton width="w-24" height="h-10" className="rounded-lg" />
            <Skeleton width="w-10" height="h-10" className="rounded-lg" />
            <Skeleton width="w-10" height="h-10" className="rounded-lg" />
          </div>
        </div>
      </div>

      {/* 2 Column Kanban Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pt-6">
        {/* Pending Column */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <Skeleton width="w-20" height="h-5" />
            <Skeleton width="w-8" height="h-6" className="rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <Skeleton width="w-24" height="h-5" />
                    <Skeleton width="w-16" height="h-5" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <Skeleton width="w-7" height="h-7" className="rounded shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton width="w-3/4" height="h-4" />
                      <Skeleton width="w-1/2" height="h-3" />
                    </div>
                  </div>
                  <Skeleton width="w-full" height="h-10" className="rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cooking Column */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <Skeleton width="w-20" height="h-5" />
            <Skeleton width="w-8" height="h-6" className="rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <Skeleton width="w-24" height="h-5" />
                    <Skeleton width="w-16" height="h-5" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <Skeleton width="w-7" height="h-7" className="rounded shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton width="w-3/4" height="h-4" />
                      <Skeleton width="w-1/2" height="h-3" />
                    </div>
                  </div>
                  <Skeleton width="w-full" height="h-10" className="rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reports Page Skeleton
 */
export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width="w-28" height="h-8" />
          <Skeleton width="w-64" height="h-4" />
        </div>
        <div className="flex gap-3">
          <Skeleton width="w-40" height="h-10" className="rounded-lg" />
          <Skeleton width="w-28" height="h-10" className="rounded-lg" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Report Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton width="w-40" height="h-6" className="mb-4" />
          <Skeleton width="w-full" height="h-72" className="rounded-lg" />
        </div>

        {/* Top Items Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Skeleton width="w-40" height="h-6" className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton width="w-8" height="h-8" className="rounded" />
                  <Skeleton width="w-32" height="h-4" />
                </div>
                <Skeleton width="w-20" height="h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
