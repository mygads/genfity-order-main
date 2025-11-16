"use client";

import React from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onQuickSelect?: (days: number) => void;
}

/**
 * Date Range Picker Component
 * Allows users to select custom date ranges or use quick filters
 */
export default function DateRangePicker({ 
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onQuickSelect,
}: DateRangePickerProps) {
  const quickFilters = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'This Year', days: 365 },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Date Range
      </h2>
      
      {/* Quick Filters */}
      {onQuickSelect && (
        <div className="mb-4 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.days}
              onClick={() => onQuickSelect(filter.days)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label 
            htmlFor="startDate" 
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={endDate}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
          />
        </div>
        
        <div>
          <label 
            htmlFor="endDate" 
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            max={new Date().toISOString().split('T')[0]}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
          />
        </div>
      </div>

      {/* Date Range Display */}
      <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Selected Range:{' '}
          <span className="font-semibold text-gray-900 dark:text-white/90">
            {new Date(startDate).toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
            {' '}-{' '}
            {new Date(endDate).toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
