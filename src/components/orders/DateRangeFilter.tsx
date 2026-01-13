/**
 * Date Range Filter Component
 * 
 * Provides preset date range options and custom date picker.
 * Used for filtering analytics and order history by date.
 */

'use client';

import React, { useState } from 'react';
import { FaCalendar } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';

// ===== TYPES =====

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetRange = 'today' | 'week' | 'month' | '3months' | 'year' | 'custom';

// ===== HELPER FUNCTIONS =====

const getPresetDateRange = (preset: PresetRange): DateRange | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekAgo, end: now };
    case 'month':
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: monthAgo, end: now };
    case '3months':
      const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: threeMonthsAgo, end: now };
    case 'year':
      const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { start: yearAgo, end: now };
    case 'custom':
      return null;
    default:
      return null;
  }
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ===== MAIN COMPONENT =====

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const { t, locale } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<PresetRange>('month');
  const [showCustom, setShowCustom] = useState(false);

  const presets: Array<{ id: PresetRange; label: string }> = [
    { id: 'today', label: t('admin.history.dateRange.today') },
    { id: 'week', label: t('admin.history.dateRange.last7Days') },
    { id: 'month', label: t('admin.history.dateRange.last30Days') },
    { id: '3months', label: t('admin.history.dateRange.last90Days') },
    { id: 'year', label: t('admin.history.dateRange.lastYear') },
    { id: 'custom', label: t('admin.history.dateRange.custom') },
  ];

  const handlePresetClick = (preset: PresetRange) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const range = getPresetDateRange(preset);
      if (range) {
        onChange(range);
      }
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', dateValue: string) => {
    const newDate = new Date(dateValue);
    onChange({
      ...value,
      [field]: newDate,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors duration-150 ${
              selectedPreset === preset.id
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Inputs */}
      {showCustom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('admin.history.dateRange.startDate')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={formatDate(value.start)}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
              <FaCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('admin.history.dateRange.endDate')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={formatDate(value.end)}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
              <FaCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <FaCalendar className="text-gray-400" />
        <span>
          {value.start.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}{' '}
          -{' '}
          {value.end.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
};

export default DateRangeFilter;
