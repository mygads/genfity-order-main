import React from 'react';

import PerDayModeSchedule from '@/components/merchants/PerDayModeSchedule';
import SpecialHoursManager from '@/components/merchants/SpecialHoursManager';
import type { OpeningHour } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface OpeningHoursTabProps {
  authToken: string;
  openingHours: OpeningHour[];
  onOpeningHourChange: (
    dayOfWeek: number,
    field: keyof Pick<OpeningHour, 'isClosed' | 'openTime' | 'closeTime'>,
    value: boolean | string
  ) => void;
}

export default function OpeningHoursTab({
  authToken,
  openingHours,
  onOpeningHourChange,
}: OpeningHoursTabProps) {
  return (
    <div className="space-y-6" data-tutorial="opening-hours-tab-content">
      <SettingsCard
        title="Weekly opening hours"
        description="Set your store's operating hours for each day of the week. Use advanced overrides for holidays and special schedules."
      >
        <div className="space-y-2" data-tutorial="opening-hours-list">
          {openingHours.map((hour) => (
            <div
              key={hour.dayOfWeek}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50 sm:flex-row sm:items-center"
              data-tutorial="opening-hours-row"
            >
              <div className="w-full text-sm font-medium text-gray-900 dark:text-white sm:w-28">{DAYS[hour.dayOfWeek]}</div>

              <div className="flex items-center justify-between gap-3 sm:w-40 sm:justify-start">
                <div className="text-sm text-gray-600 dark:text-gray-300">Closed</div>
                <Switch
                  size="sm"
                  checked={hour.isClosed}
                  onCheckedChange={(checked) => onOpeningHourChange(hour.dayOfWeek, 'isClosed', checked)}
                  aria-label={`Closed on ${DAYS[hour.dayOfWeek]}`}
                />
              </div>

              {!hour.isClosed ? (
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="time"
                    value={hour.openTime}
                    onChange={(e) => onOpeningHourChange(hour.dayOfWeek, 'openTime', e.target.value)}
                    className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="time"
                    value={hour.closeTime}
                    onChange={(e) => onOpeningHourChange(hour.dayOfWeek, 'closeTime', e.target.value)}
                    className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="flex-1 text-xs text-gray-500 dark:text-gray-400">Closed all day</div>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Per-Day Mode Schedules (advanced) */}
      {authToken && (
        <SettingsCard
          title="Advanced: per-day mode schedules"
          description="Optional. Override mode availability by day (e.g. delivery only on weekends)."
        >
          <PerDayModeSchedule token={authToken} embedded />
        </SettingsCard>
      )}

      {/* Special Hours / Holidays (advanced) */}
      {authToken && (
        <SettingsCard
          title="Advanced: special hours & holidays"
          description="Optional. Add one-off hours (holidays, events) and delivery overrides."
        >
          <SpecialHoursManager token={authToken} embedded />
        </SettingsCard>
      )}
    </div>
  );
}
