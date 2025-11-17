/**
 * OrderFilters Component
 * 
 * Advanced filtering system for orders with order type, payment status, and date range
 * Professional, clean UI following design system
 */

'use client';

import React from 'react';
import { FaFilter, FaTimes, FaCalendar, FaUtensils, FaMoneyBillWave } from 'react-icons/fa';
import { OrderType, PaymentStatus } from '@prisma/client';

export interface OrderFilters {
  orderType: OrderType | 'ALL';
  paymentStatus: PaymentStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
}

interface OrderFiltersProps {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  onReset: () => void;
}

export const OrderFiltersComponent: React.FC<OrderFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = 
    filters.orderType !== 'ALL' || 
    filters.paymentStatus !== 'ALL' || 
    filters.dateFrom !== '' || 
    filters.dateTo !== '';

  const activeFilterCount = [
    filters.orderType !== 'ALL',
    filters.paymentStatus !== 'ALL',
    filters.dateFrom !== '',
    filters.dateTo !== '',
  ].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Filter Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90"
        >
          <FaFilter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FaTimes className="h-3 w-3" />
              Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Order Type Filter */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <FaUtensils className="h-3 w-3" />
              Order Type
            </label>
            <select
              value={filters.orderType}
              onChange={(e) => handleFilterChange('orderType', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="ALL">All Types</option>
              <option value="DINE_IN">🍽️ Dine In</option>
              <option value="TAKEAWAY">🥡 Takeaway</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <FaMoneyBillWave className="h-3 w-3" />
              Payment Status
            </label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">💰 Pending</option>
              <option value="COMPLETED">✓ Paid</option>
              <option value="FAILED">❌ Failed</option>
              <option value="REFUNDED">↩️ Refunded</option>
              <option value="CANCELLED">🚫 Cancelled</option>
            </select>
          </div>

          {/* Date From Filter */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <FaCalendar className="h-3 w-3" />
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          {/* Date To Filter */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <FaCalendar className="h-3 w-3" />
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
      )}
    </div>
  );
};
