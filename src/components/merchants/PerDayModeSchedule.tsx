/**
 * Per-Day Mode Schedules Component
 * 
 * Features:
 * - Set different mode schedules for each day of the week
 * - Copy schedule from one day to others
 * - Apply preset templates (Weekday/Weekend)
 */

"use client";

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { useToast } from "@/hooks/useToast";
import { FaCopy, FaMagic } from "react-icons/fa";
import Switch from "@/components/ui/Switch";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ModeSchedule {
  id?: string;
  mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ModeScheduleApiResponse {
  enabled: boolean;
  schedules: ModeSchedule[];
}

interface PerDayModeScheduleProps {
  token: string;
  embedded?: boolean;
}

export interface PerDayModeScheduleHandle {
  save: (options?: { showToast?: boolean }) => Promise<void>;
  getState: () => { schedules: ModeSchedule[]; enabled: boolean };
  isDirty: () => boolean;
  reset: () => Promise<void>;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const WEEKENDS = [0, 6]; // Sun, Sat

const DAY_DEFS = [
  { dayOfWeek: 0, fullKey: "common.days.sunday", shortKey: "common.days.sun" },
  { dayOfWeek: 1, fullKey: "common.days.monday", shortKey: "common.days.mon" },
  { dayOfWeek: 2, fullKey: "common.days.tuesday", shortKey: "common.days.tue" },
  { dayOfWeek: 3, fullKey: "common.days.wednesday", shortKey: "common.days.wed" },
  { dayOfWeek: 4, fullKey: "common.days.thursday", shortKey: "common.days.thu" },
  { dayOfWeek: 5, fullKey: "common.days.friday", shortKey: "common.days.fri" },
  { dayOfWeek: 6, fullKey: "common.days.saturday", shortKey: "common.days.sat" },
] as const;

// Preset templates
const TEMPLATES = {
  weekday: { startTime: "11:00", endTime: "21:00", isActive: true },
  weekend: { startTime: "10:00", endTime: "22:00", isActive: true },
  closed: { startTime: "10:00", endTime: "22:00", isActive: false },
};

function buildSchedulesSnapshot(enabled: boolean, schedules: ModeSchedule[]): string {
  const normalized = schedules
    .map((s) => ({
      mode: s.mode,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
    }))
    .sort((a, b) => {
      if (a.mode !== b.mode) return a.mode.localeCompare(b.mode);
      return a.dayOfWeek - b.dayOfWeek;
    });
  return JSON.stringify({ enabled, schedules: normalized });
}

const PerDayModeSchedule = forwardRef<PerDayModeScheduleHandle, PerDayModeScheduleProps>(function PerDayModeSchedule(
  { token, embedded = false },
  ref
) {
  const { error: showError, success: showSuccess } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<ModeSchedule[]>([]);
  const [enablePerDaySchedule, setEnablePerDaySchedule] = useState(false);
  const initialSnapshotRef = useRef<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySource, setCopySource] = useState<{ mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; dayOfWeek: number } | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);

  const setInitialSnapshot = useCallback((enabled: boolean, nextSchedules: ModeSchedule[]) => {
    initialSnapshotRef.current = buildSchedulesSnapshot(enabled, nextSchedules);
  }, []);

  // Fetch existing schedules
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/merchant/mode-schedules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const payload = (data?.success ? data.data : null) as ModeScheduleApiResponse | null;

      if (payload && typeof payload.enabled === 'boolean' && Array.isArray(payload.schedules)) {
        setSchedules(payload.schedules);
        setEnablePerDaySchedule(payload.enabled);
        setInitialSnapshot(payload.enabled, payload.schedules);
        return;
      }

      // Backwards-compatible fallback: older API returned an array.
      if (data?.success && Array.isArray(data.data)) {
        setSchedules(data.data);
        const enabled = data.data.length > 0;
        setEnablePerDaySchedule(enabled);
        setInitialSnapshot(enabled, data.data);
        return;
      }

      setSchedules([]);
      setEnablePerDaySchedule(false);
      setInitialSnapshot(false, []);
    } catch (error) {
      console.error('Error fetching mode schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [token, setInitialSnapshot]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const ensureAllModeDayRows = useCallback((prevSchedules: ModeSchedule[]) => {
    const nextSchedules = [...prevSchedules];
    const modes: ModeSchedule["mode"][] = ["DINE_IN", "TAKEAWAY", "DELIVERY"];

    for (const mode of modes) {
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const existing = nextSchedules.find((s) => s.mode === mode && s.dayOfWeek === dayOfWeek);
        if (existing) continue;
        const isWeekend = WEEKENDS.includes(dayOfWeek);
        const template = isWeekend ? TEMPLATES.weekend : TEMPLATES.weekday;
        nextSchedules.push({
          mode,
          dayOfWeek,
          ...template,
        });
      }
    }

    return nextSchedules;
  }, []);

  const addMissingScheduleRow = useCallback((mode: ModeSchedule["mode"], dayOfWeek: number) => {
    setSchedules((prev) => {
      const existing = prev.find((s) => s.mode === mode && s.dayOfWeek === dayOfWeek);
      if (existing) return prev;
      const isWeekend = WEEKENDS.includes(dayOfWeek);
      const template = isWeekend ? TEMPLATES.weekend : TEMPLATES.weekday;
      return [
        ...prev,
        {
          mode,
          dayOfWeek,
          ...template,
        },
      ];
    });
  }, []);

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

    setSchedules((prev) => {
      const next = [...prev];
      for (const dayOfWeek of copyTargetDays) {
        const index = next.findIndex((s) => s.mode === copySource.mode && s.dayOfWeek === dayOfWeek);
        if (index >= 0) {
          next[index] = {
            ...next[index],
            startTime: sourceSchedule.startTime,
            endTime: sourceSchedule.endTime,
            isActive: sourceSchedule.isActive,
          };
        } else {
          next.push({
            mode: copySource.mode,
            dayOfWeek,
            startTime: sourceSchedule.startTime,
            endTime: sourceSchedule.endTime,
            isActive: sourceSchedule.isActive,
          });
        }
      }
      return next;
    });

    showSuccess(
      t("admin.perDaySchedules.toast.copiedTitle"),
      t("admin.perDaySchedules.toast.copiedMessage", {
        day: t(DAY_DEFS[copySource.dayOfWeek].fullKey),
        count: copyTargetDays.length,
      })
    );
    setShowCopyModal(false);
    setCopySource(null);
    setCopyTargetDays([]);
  };

  // Apply preset template to all days
  const applyTemplate = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', template: 'weekday-weekend' | 'all-same' | 'closed-sunday') => {
    const getTemplateForDay = (dayOfWeek: number) => {
      if (template === "weekday-weekend") {
        const isWeekend = WEEKENDS.includes(dayOfWeek);
        return isWeekend ? TEMPLATES.weekend : TEMPLATES.weekday;
      }
      if (template === "all-same") {
        return TEMPLATES.weekday;
      }
      if (template === "closed-sunday") {
        if (dayOfWeek === 0) return TEMPLATES.closed;
        return TEMPLATES.weekday;
      }
      return null;
    };

    setSchedules((prev) => {
      const updated = prev.map((s) => {
        if (s.mode !== mode) return s;
        const nextTemplate = getTemplateForDay(s.dayOfWeek);
        if (!nextTemplate) return s;
        return { ...s, ...nextTemplate };
      });

      const existingDaySet = new Set(updated.filter((s) => s.mode === mode).map((s) => s.dayOfWeek));
      const toAdd: ModeSchedule[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if (existingDaySet.has(dayOfWeek)) continue;
        const nextTemplate = getTemplateForDay(dayOfWeek) ?? TEMPLATES.weekday;
        toAdd.push({
          mode,
          dayOfWeek,
          ...nextTemplate,
        });
      }

      return [...updated, ...toAdd];
    });

    const templateKeyMap: Record<typeof template, string> = {
      "weekday-weekend": "admin.perDaySchedules.templates.weekdayWeekend",
      "all-same": "admin.perDaySchedules.templates.allSameHours",
      "closed-sunday": "admin.perDaySchedules.templates.closedSundays",
    };
    showSuccess(
      t("admin.perDaySchedules.toast.appliedTitle"),
      t("admin.perDaySchedules.toast.appliedMessage", {
        template: t(templateKeyMap[template]),
      })
    );
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
  const saveSchedules = async (options?: { showToast?: boolean }) => {
    const showToast = options?.showToast !== false;
    setSaving(true);
    try {
      // Persist the enabled flag explicitly; do not mutate schedules on disable.
      const schedulesToSave = schedules;

      const response = await fetch('/api/merchant/mode-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: enablePerDaySchedule, schedules: schedulesToSave }),
      });
      const data = await response.json();
      if (data.success) {
        if (showToast) {
          showSuccess(t("admin.perDaySchedules.toast.savedTitle"), t("admin.perDaySchedules.toast.savedMessage"));
        }
        fetchSchedules();
      } else {
        if (showToast) {
          showError(t("common.error"), data.message || t("admin.perDaySchedules.error.saveFailed"));
          return;
        }
        throw new Error(data.message || 'Failed to save schedules');
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      if (showToast) {
        showError(t("common.error"), t("admin.perDaySchedules.error.saveFailed"));
        return;
      }
      throw error instanceof Error ? error : new Error('Failed to save schedules');
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: (options) => saveSchedules(options),
    getState: () => ({ schedules, enabled: enablePerDaySchedule }),
    isDirty: () => {
      if (!initialSnapshotRef.current) return false;
      return buildSchedulesSnapshot(enablePerDaySchedule, schedules) !== initialSnapshotRef.current;
    },
    reset: async () => {
      await fetchSchedules();
    },
  }), [schedules, enablePerDaySchedule, fetchSchedules]);

  // Render schedule table for a mode
  const renderModeScheduleTable = (mode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY', label: string) => {
    const modeSchedules = schedules.filter(s => s.mode === mode);
    if (modeSchedules.length === 0) return null;

    const missingDayDefs = DAY_DEFS.filter((d) => !modeSchedules.some((s) => s.dayOfWeek === d.dayOfWeek));

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
                <FaMagic className="h-3 w-3" /> {t("admin.perDaySchedules.templates.button")}
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'weekday-weekend')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("admin.perDaySchedules.templates.weekdayWeekend")}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'all-same')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("admin.perDaySchedules.templates.allSameHours")}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(mode, 'closed-sunday')}
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("admin.perDaySchedules.templates.closedSundays")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {missingDayDefs.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="font-medium">{t("admin.perDaySchedules.fallbackHint.title")}</div>
            <div>
              {t("admin.perDaySchedules.fallbackHint.desc", {
                count: missingDayDefs.length,
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {DAY_DEFS.map((dayDef) => {
            const dayIndex = dayDef.dayOfWeek;
            const dayShort = t(dayDef.shortKey);
            const dayFull = t(dayDef.fullKey);
            const schedule = modeSchedules.find(s => s.dayOfWeek === dayIndex);
            if (!schedule) {
              return (
                <div key={dayIndex} className="flex items-center gap-2">
                  <div className="w-24">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dayShort}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {t("admin.perDaySchedules.globalFallbackBadge")}
                    </span>
                    <button
                      type="button"
                      onClick={() => addMissingScheduleRow(mode, dayIndex)}
                      className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-800"
                    >
                      {t("common.add")}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={dayIndex} className="flex items-center gap-2">
                <div className="w-24">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dayShort}</span>
                    <Switch
                      size="sm"
                      checked={schedule.isActive}
                      onCheckedChange={(next) => updateSchedule(mode, dayIndex, 'isActive', next)}
                      aria-label={t("admin.perDaySchedules.dayActiveAria", { day: dayFull })}
                    />
                  </div>
                </div>
                {schedule.isActive ? (
                  <>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => updateSchedule(mode, dayIndex, 'startTime', e.target.value)}
                      className="h-8 w-24 rounded border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => updateSchedule(mode, dayIndex, 'endTime', e.target.value)}
                      className="h-8 w-24 rounded border border-gray-200 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {t("admin.perDaySchedules.closedBadge")}
                    </span>
                    <span className="text-xs text-gray-400">—</span>
                  </div>
                )}
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => openCopyModal(mode, dayIndex)}
                  title={t("admin.perDaySchedules.copyButtonTitle")}
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
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t("admin.perDaySchedules.title")}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("admin.perDaySchedules.description")}
            </p>
          </div>
        </>
      )}

      {/* Enable Toggle */}
      <div
        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
        data-tutorial="per-day-schedule-enable"
      >
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.perDaySchedules.enable.title")}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("admin.perDaySchedules.enable.desc")}
          </p>
        </div>
        <Switch
          size="sm"
          checked={enablePerDaySchedule}
          onCheckedChange={(next) => {
            setEnablePerDaySchedule(next);
            if (next) {
              setSchedules((prev) => ensureAllModeDayRows(prev));
            }
          }}
          aria-label={t("admin.perDaySchedules.enable.aria")}
        />
      </div>

      {/* Schedule Tables */}
      {enablePerDaySchedule && (
        <>
          {renderModeScheduleTable('DINE_IN', t("admin.perDaySchedules.mode.dineInHours"))}
          {renderModeScheduleTable('TAKEAWAY', t("admin.perDaySchedules.mode.takeawayHours"))}
          {renderModeScheduleTable('DELIVERY', t("admin.perDaySchedules.mode.deliveryHours"))}

          {/* Embedded mode: use the fixed footer Save Changes */}
          {!embedded && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => saveSchedules()}
                disabled={saving}
                data-tutorial="per-day-schedule-save"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("admin.perDaySchedules.saveButton")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Copy Modal */}
      {showCopyModal && copySource && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCopyModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.perDaySchedules.copyModal.title", {
                day: t(DAY_DEFS[copySource.dayOfWeek].fullKey),
              })}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t("admin.perDaySchedules.copyModal.subtitle")}
            </p>

            {/* Quick Select */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => selectDayGroup('weekdays')}
                className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {t("admin.perDaySchedules.copyModal.quick.weekdays")}
              </button>
              <button
                type="button"
                onClick={() => selectDayGroup('weekends')}
                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
              >
                {t("admin.perDaySchedules.copyModal.quick.weekends")}
              </button>
              <button
                type="button"
                onClick={() => selectDayGroup('all')}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
              >
                {t("common.all")}
              </button>
            </div>

            {/* Day Checkboxes */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DAY_DEFS.map((dayDef) => {
                const dayName = t(dayDef.fullKey);
                const dayIndex = dayDef.dayOfWeek;
                return (
                <div
                  key={dayIndex}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${dayIndex === copySource.dayOfWeek
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50 dark:bg-gray-800'
                      : copyTargetDays.includes(dayIndex)
                        ? 'bg-brand-50 border-brand-500 dark:bg-brand-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                >
                  <Switch
                    size="sm"
                    checked={copyTargetDays.includes(dayIndex)}
                    disabled={dayIndex === copySource.dayOfWeek}
                    onCheckedChange={() => toggleCopyTargetDay(dayIndex)}
                    aria-label={t("admin.perDaySchedules.copyModal.selectDayAria", { day: dayName })}
                  />
                  <span className="text-sm">{dayName}</span>
                </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={applyCopy}
                disabled={copyTargetDays.length === 0}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {t("admin.perDaySchedules.copyModal.copyButton", { count: copyTargetDays.length })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

});

export default PerDayModeSchedule;
