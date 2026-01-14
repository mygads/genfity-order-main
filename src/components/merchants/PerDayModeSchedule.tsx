/**
 * Per-Day Mode Schedules Component
 * 
 * Features:
 * - Set different mode schedules for each day of the week
 * - Copy schedule from one day to others
 * - Apply preset templates (Weekday/Weekend)
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { FaCopy, FaMagic } from "react-icons/fa";
import IconToggle from "@/components/ui/IconToggle";

interface ModeSchedule {
  id?: string;
  mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface PerDayModeScheduleProps {
  token: string;
  embedded?: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const WEEKENDS = [0, 6]; // Sun, Sat

// Preset templates
const TEMPLATES = {
  weekday: { startTime: "11:00", endTime: "21:00", isActive: true },
  weekend: { startTime: "10:00", endTime: "22:00", isActive: true },
  closed: { startTime: "10:00", endTime: "22:00", isActive: false },
};

export default function PerDayModeSchedule({ token, embedded = false }: PerDayModeScheduleProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ModeSchedule[]>([]);
  const [enablePerDaySchedule, setEnablePerDaySchedule] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySource, setCopySource] = useState<{ mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; dayOfWeek: number } | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);

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
  const initializeSchedules = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY') => {
    const newSchedules: ModeSchedule[] = [];
    for (let day = 0; day < 7; day++) {
      const existing = schedules.find(s => s.mode === mode && s.dayOfWeek === day);
      if (!existing) {
        const isWeekend = WEEKENDS.includes(day);
        const template = isWeekend ? TEMPLATES.weekend : TEMPLATES.weekday;
        newSchedules.push({
          mode,
          dayOfWeek: day,
          ...template,
        });
      }
    }
    setSchedules(prev => [...prev, ...newSchedules]);
  };

  // Update a schedule
  const updateSchedule = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', dayOfWeek: number, field: string, value: string | boolean) => {
    setSchedules(prev => prev.map(s => {
      if (s.mode === mode && s.dayOfWeek === dayOfWeek) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Copy schedule from source day to target days
  const applyCopy = () => {
    if (!copySource) return;

    const sourceSchedule = schedules.find(
      s => s.mode === copySource.mode && s.dayOfWeek === copySource.dayOfWeek
    );
    if (!sourceSchedule) return;

    setSchedules(prev => prev.map(s => {
      if (s.mode === copySource.mode && copyTargetDays.includes(s.dayOfWeek)) {
        return {
          ...s,
          startTime: sourceSchedule.startTime,
          endTime: sourceSchedule.endTime,
          isActive: sourceSchedule.isActive,
        };
      }
      return s;
    }));

    showSuccess('Copied', `Applied ${DAYS[copySource.dayOfWeek]} schedule to ${copyTargetDays.length} days`);
    setShowCopyModal(false);
    setCopySource(null);
    setCopyTargetDays([]);
  };

  // Apply preset template to all days
  const applyTemplate = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', template: 'weekday-weekend' | 'all-same' | 'closed-sunday') => {
    setSchedules(prev => prev.map(s => {
      if (s.mode !== mode) return s;

      if (template === 'weekday-weekend') {
        const isWeekend = WEEKENDS.includes(s.dayOfWeek);
        return {
          ...s,
          ...(isWeekend ? TEMPLATES.weekend : TEMPLATES.weekday),
        };
      } else if (template === 'all-same') {
        return {
          ...s,
          ...TEMPLATES.weekday,
        };
      } else if (template === 'closed-sunday') {
        if (s.dayOfWeek === 0) {
          return { ...s, ...TEMPLATES.closed };
        }
        return { ...s, ...TEMPLATES.weekday };
      }
      return s;
    }));

    const templateNames = {
      'weekday-weekend': 'Weekday/Weekend',
      'all-same': 'All Same Hours',
      'closed-sunday': 'Closed Sundays',
    };
    showSuccess('Applied', `${templateNames[template]} template applied`);
  };

  // Open copy modal
  const openCopyModal = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', dayOfWeek: number) => {
    setCopySource({ mode, dayOfWeek });
    setCopyTargetDays([]);
    setShowCopyModal(true);
  };

  // Toggle target day for copy
  const toggleCopyTargetDay = (day: number) => {
    if (day === copySource?.dayOfWeek) return; // Can't copy to self
    setCopyTargetDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Quick select all weekdays or weekends
  const selectDayGroup = (group: 'weekdays' | 'weekends' | 'all') => {
    const days = group === 'weekdays' ? WEEKDAYS : group === 'weekends' ? WEEKENDS : [0, 1, 2, 3, 4, 5, 6];
    setCopyTargetDays(days.filter(d => d !== copySource?.dayOfWeek));
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
  const renderModeScheduleTable = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', label: string) => {
    const modeSchedules = schedules.filter(s => s.mode === mode);
    if (modeSchedules.length === 0) return null;

    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h5>
          {/* Template Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <FaMagic className="h-3 w-3" /> Templates
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'weekday-weekend')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Weekday/Weekend
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'all-same')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All Same Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'closed-sunday')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Closed Sundays
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {DAYS.map((dayName, dayIndex) => {
            const schedule = modeSchedules.find(s => s.dayOfWeek === dayIndex);
            if (!schedule) return null;

            return (
              <div key={dayIndex} className="flex items-center gap-2">
                <div className="w-24">
                  <IconToggle
                    checked={schedule.isActive}
                    onChange={(next) => updateSchedule(mode, dayIndex, 'isActive', next)}
                    label={dayName.slice(0, 3)}
                    size="sm"
                    className="items-center gap-2"
                  />
                </div>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => updateSchedule(mode, dayIndex, 'startTime', e.target.value)}
                  disabled={!schedule.isActive}
                  className="h-8 w-24 rounded border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => updateSchedule(mode, dayIndex, 'endTime', e.target.value)}
                  disabled={!schedule.isActive}
                  className="h-8 w-24 rounded border border-gray-200 bg-white px-2 text-sm disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
                />
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => openCopyModal(mode, dayIndex)}
                  title="Copy to other days"
                  className="p-1.5 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <FaCopy className="h-3 w-3" />
                </button>
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
      {!embedded && (
        <>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Per-Day Mode Schedules</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Set different availability hours for each day (e.g., longer hours on weekends)
            </p>
          </div>
        </>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Per-Day Schedules</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Override global mode schedules with day-specific times
          </p>
        </div>
        <IconToggle
          checked={enablePerDaySchedule}
          onChange={(next) => {
            setEnablePerDaySchedule(next);
            if (next && schedules.length === 0) {
              initializeSchedules('DINE_IN');
              initializeSchedules('TAKEAWAY');
              initializeSchedules('DELIVERY');
            }
          }}
          label="Enable Per-Day Schedules"
          ariaLabel="Enable per-day schedules"
          variant="iconOnly"
        />
      </div>

      {/* Schedule Tables */}
      {enablePerDaySchedule && (
        <>
          {renderModeScheduleTable('DINE_IN', 'Dine In Hours')}
          {renderModeScheduleTable('TAKEAWAY', 'Takeaway Hours')}
          {renderModeScheduleTable('DELIVERY', 'Delivery Hours')}

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

      {/* Copy Modal */}
      {showCopyModal && copySource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCopyModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Copy {DAYS[copySource.dayOfWeek]} Schedule
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select days to copy this schedule to:
            </p>

            {/* Quick Select */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => selectDayGroup('weekdays')}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={() => selectDayGroup('weekends')}
                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
              >
                Weekends
              </button>
              <button
                type="button"
                onClick={() => selectDayGroup('all')}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              >
                All
              </button>
            </div>

            {/* Day Checkboxes */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DAYS.map((dayName, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${dayIndex === copySource.dayOfWeek
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50 dark:bg-gray-800'
                      : copyTargetDays.includes(dayIndex)
                        ? 'bg-brand-50 border-brand-500 dark:bg-brand-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                >
                  <IconToggle
                    checked={copyTargetDays.includes(dayIndex)}
                    disabled={dayIndex === copySource.dayOfWeek}
                    onChange={(_) => toggleCopyTargetDay(dayIndex)}
                    label={dayName}
                    ariaLabel={`Select ${dayName}`}
                    variant="iconOnly"
                    size="sm"
                  />
                  <span className="text-sm">{dayName}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCopy}
                disabled={copyTargetDays.length === 0}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Copy to {copyTargetDays.length} Day{copyTargetDays.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
