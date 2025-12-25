/**
 * Per-Day Mode Schedules Component
 * 
 * Allows setting different mode schedules for each day of the week
 * e.g., Dine In available 11:00-22:00 on weekdays, 10:00-23:00 on weekends
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/useToast";

interface ModeSchedule {
  id?: string;
  mode: 'DINE_IN' | 'TAKEAWAY';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface PerDayModeScheduleProps {
  token: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PerDayModeSchedule({ token }: PerDayModeScheduleProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ModeSchedule[]>([]);
  const [enablePerDaySchedule, setEnablePerDaySchedule] = useState(false);

  // Fetch existing schedules
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/mode-schedules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setSchedules(data.data);
        setEnablePerDaySchedule(true);
      }
    } catch (error) {
      console.error('Error fetching mode schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Initialize default schedules for a mode
  const initializeSchedules = (mode: 'DINE_IN' | 'TAKEAWAY') => {
    const newSchedules: ModeSchedule[] = [];
    for (let day = 0; day < 7; day++) {
      // Check if schedule already exists
      const existing = schedules.find(s => s.mode === mode && s.dayOfWeek === day);
      if (!existing) {
        newSchedules.push({
          mode,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '22:00',
          isActive: true,
        });
      }
    }
    setSchedules(prev => [...prev, ...newSchedules]);
  };

  // Update a schedule
  const updateSchedule = (mode: 'DINE_IN' | 'TAKEAWAY', dayOfWeek: number, field: string, value: string | boolean) => {
    setSchedules(prev => prev.map(s => {
      if (s.mode === mode && s.dayOfWeek === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Save schedules
  const saveSchedules = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/mode-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedules }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Saved', 'Mode schedules updated successfully');
        fetchSchedules();
      } else {
        showError('Error', data.message || 'Failed to save schedules');
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      showError('Error', 'Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  // Render schedule table for a mode
  const renderModeScheduleTable = (mode: 'DINE_IN' | 'TAKEAWAY', label: string) => {
    const modeSchedules = schedules.filter(s => s.mode === mode);
    if (modeSchedules.length === 0) return null;

    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h5 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">{label}</h5>
        <div className="space-y-2">
          {DAYS.map((dayName, dayIndex) => {
            const schedule = modeSchedules.find(s => s.dayOfWeek === dayIndex);
            if (!schedule) return null;

            return (
              <div key={dayIndex} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="checkbox"
                    checked={schedule.isActive}
                    onChange={(e) => updateSchedule(mode, dayIndex, 'isActive', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{dayName.slice(0, 3)}</span>
                </label>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => updateSchedule(mode, dayIndex, 'startTime', e.target.value)}
                  disabled={!schedule.isActive}
                  className="h-8 w-28 rounded border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => updateSchedule(mode, dayIndex, 'endTime', e.target.value)}
                  disabled={!schedule.isActive}
                  className="h-8 w-28 rounded border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="h-4 w-48 bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Per-Day Mode Schedules</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Set different availability hours for each day of the week (e.g., longer hours on weekends)
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Per-Day Schedules</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Override global mode schedules with day-specific times
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={enablePerDaySchedule}
            onChange={(e) => {
              setEnablePerDaySchedule(e.target.checked);
              if (e.target.checked && schedules.length === 0) {
                initializeSchedules('DINE_IN');
                initializeSchedules('TAKEAWAY');
              }
            }}
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
        </label>
      </div>

      {/* Schedule Tables */}
      {enablePerDaySchedule && (
        <>
          {renderModeScheduleTable('DINE_IN', 'Dine In Hours')}
          {renderModeScheduleTable('TAKEAWAY', 'Takeaway Hours')}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveSchedules}
              disabled={saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Per-Day Schedules'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
