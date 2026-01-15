/**
 * Special Hours Management Component
 * 
 * Enhanced calendar-based UI for managing holiday and special hours
 * Features:
 * - Visual calendar view
 * - Recurring annual holidays
 * - Quick add presets
 * - Copy schedule templates
 * - Import/Export (CSV)
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/useToast";
import { FaCalendar, FaPlus, FaFileImport, FaFileExport, FaChevronLeft, FaChevronRight, FaRedo, FaCopy } from "react-icons/fa";
import IconToggle from "@/components/ui/IconToggle";
import * as XLSX from "xlsx";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

interface SpecialHour {
  id?: string;
  date: string;
  name: string;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  isDineInEnabled: boolean | null;
  isTakeawayEnabled: boolean | null;
  dineInStartTime: string;
  dineInEndTime: string;
  takeawayStartTime: string;
  takeawayEndTime: string;
  isRecurring?: boolean; // New: repeat annually
}

interface SpecialHoursManagerProps {
  token: string;
  embedded?: boolean;
}

const PRESET_HOLIDAYS = [
  { name: "New Year's Day", month: 0, day: 1 },
  { name: "Australia Day", month: 0, day: 26 },
  { name: "ANZAC Day", month: 3, day: 25 },
  { name: "Christmas Eve", month: 11, day: 24 },
  { name: "Christmas Day", month: 11, day: 25 },
  { name: "Boxing Day", month: 11, day: 26 },
  { name: "New Year's Eve", month: 11, day: 31 },
];

export default function SpecialHoursManager({ token, embedded = false }: SpecialHoursManagerProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHour, setEditingHour] = useState<SpecialHour | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SpecialHour>({
    date: '',
    name: '',
    isClosed: false,
    openTime: '10:00',
    closeTime: '22:00',
    isDineInEnabled: null,
    isTakeawayEnabled: null,
    dineInStartTime: '',
    dineInEndTime: '',
    takeawayStartTime: '',
    takeawayEndTime: '',
    isRecurring: false,
  });

  // Fetch existing special hours
  const fetchSpecialHours = useCallback(async () => {
    try {
      const today = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const response = await fetch(
        `/api/merchant/special-hours?from=${today.toISOString().split('T')[0]}&to=${oneYearLater.toISOString().split('T')[0]}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) {
        setSpecialHours(data.data.map((h: SpecialHour & { date: string }) => ({
          ...h,
          date: new Date(h.date).toISOString().split('T')[0],
        })));
      }
    } catch (error) {
      console.error('Error fetching special hours:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSpecialHours();
  }, [fetchSpecialHours]);

  // Reset form
  const resetForm = () => {
    setFormData({
      date: '',
      name: '',
      isClosed: false,
      openTime: '10:00',
      closeTime: '22:00',
      isDineInEnabled: null,
      isTakeawayEnabled: null,
      dineInStartTime: '',
      dineInEndTime: '',
      takeawayStartTime: '',
      takeawayEndTime: '',
      isRecurring: false,
    });
    setEditingHour(null);
  };

  // Open modal for editing
  const openEditModal = (hour: SpecialHour) => {
    setEditingHour(hour);
    setFormData({
      ...hour,
      openTime: hour.openTime || '10:00',
      closeTime: hour.closeTime || '22:00',
      dineInStartTime: hour.dineInStartTime || '',
      dineInEndTime: hour.dineInEndTime || '',
      takeawayStartTime: hour.takeawayStartTime || '',
      takeawayEndTime: hour.takeawayEndTime || '',
      isRecurring: hour.isRecurring || false,
    });
    setShowAddModal(true);
  };

  // Save special hour
  const saveSpecialHour = async () => {
    if (!formData.date) {
      showError('Error', 'Please select a date');
      return;
    }

    setSaving(true);
    try {
      const url = editingHour?.id
        ? `/api/merchant/special-hours/${editingHour.id}`
        : '/api/merchant/special-hours';

      const response = await fetch(url, {
        method: editingHour?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Saved', 'Special hours saved successfully');
        setShowAddModal(false);
        resetForm();
        fetchSpecialHours();
      } else {
        showError('Error', data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving special hour:', error);
      showError('Error', 'Failed to save special hours');
    } finally {
      setSaving(false);
    }
  };

  // Quick add recurring holiday for current year
  const quickAddHoliday = async (holiday: { name: string; month: number; day: number }) => {
    const currentYear = new Date().getFullYear();
    let year = currentYear;

    // If the date has passed this year, use next year
    const today = new Date();
    const holidayDate = new Date(currentYear, holiday.month, holiday.day);
    if (holidayDate < today) {
      year = currentYear + 1;
    }

    const date = new Date(year, holiday.month, holiday.day);
    const dateStr = date.toISOString().split('T')[0];

    // Check if already exists
    const exists = specialHours.some(h => h.date === dateStr);
    if (exists) {
      showError('Already Exists', `${holiday.name} is already added for ${year}`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/merchant/special-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateStr,
          name: holiday.name,
          isClosed: true,
          isRecurring: true,
          openTime: '10:00',
          closeTime: '22:00',
        }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Added', `${holiday.name} added for ${year}`);
        fetchSpecialHours();
      } else {
        showError('Error', data.message || 'Failed to add');
      }
    } catch {
      showError('Error', 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  // Delete special hour
  const performDeleteSpecialHour = async (id: string) => {
    try {
      const response = await fetch(`/api/merchant/special-hours/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Deleted', 'Special hour deleted');
        fetchSpecialHours();
      } else {
        showError('Error', data.message || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting special hour:', error);
      showError('Error', 'Failed to delete');
    }
  };

  const deleteSpecialHour = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  // Copy existing special hour to new date
  const copyToNextYear = async (hour: SpecialHour) => {
    const currentDate = new Date(hour.date);
    const nextYear = new Date(currentDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextDateStr = nextYear.toISOString().split('T')[0];

    // Check if already exists
    const exists = specialHours.some(h => h.date === nextDateStr);
    if (exists) {
      showError('Already Exists', `Special hours already exist for ${nextDateStr}`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/merchant/special-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...hour,
          id: undefined,
          date: nextDateStr,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Copied', `Copied to ${nextYear.toLocaleDateString()}`);
        fetchSpecialHours();
      } else {
        showError('Error', data.message || 'Failed to copy');
      }
    } catch {
      showError('Error', 'Failed to copy');
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = specialHours.map(h => ({
      Date: h.date,
      Name: h.name,
      'Closed': h.isClosed ? 'Yes' : 'No',
      'Open Time': h.isClosed ? '' : h.openTime,
      'Close Time': h.isClosed ? '' : h.closeTime,
      'Recurring Annual': h.isRecurring ? 'Yes' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Special Hours');
    XLSX.writeFile(wb, `special_hours_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported', `Exported ${specialHours.length} special hours`);
  };

  // Import from Excel
  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

      let imported = 0;
      for (const row of rows) {
        const dateStr = row['Date'];
        if (!dateStr) continue;

        // Check if already exists
        if (specialHours.some(h => h.date === dateStr)) continue;

        const response = await fetch('/api/merchant/special-hours', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: dateStr,
            name: row['Name'] || '',
            isClosed: row['Closed']?.toLowerCase() === 'yes',
            openTime: row['Open Time'] || '10:00',
            closeTime: row['Close Time'] || '22:00',
            isRecurring: row['Recurring Annual']?.toLowerCase() === 'yes',
          }),
        });

        if ((await response.json()).success) imported++;
      }

      if (imported > 0) {
        showSuccess('Imported', `Imported ${imported} special hours`);
        fetchSpecialHours();
      } else {
        showError('No Import', 'No new special hours to import (all dates already exist)');
      }
    } catch {
      showError('Error', 'Failed to import file');
    }

    // Reset input
    e.target.value = '';
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: { date: Date; special?: SpecialHour }[] = [];

    // Padding for previous month
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: new Date(year, month, -startPadding + i + 1) });
    }

    // Actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const special = specialHours.find(h => h.date === dateStr);
      days.push({ date, special });
    }

    return days;
  }, [calendarMonth, specialHours]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-gray-200 rounded dark:bg-gray-700" />
        <div className="h-20 bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Holiday & Special Hours</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Set custom hours for holidays and special occasions
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-lg ${viewMode === 'calendar' ? 'bg-brand-500 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <FaCalendar className="inline h-3 w-3" /> Calendar
            </button>
          </div>

          {/* Quick Add */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Quick Add Holiday
            </button>
            {showQuickAdd && (
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {PRESET_HOLIDAYS.map((holiday) => (
                  <button
                    key={holiday.name}
                    type="button"
                    onClick={() => {
                      quickAddHoliday(holiday);
                      setShowQuickAdd(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {holiday.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Import/Export */}
          <label className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <FaFileImport className="inline h-3 w-3 mr-1" /> Import
            <input type="file" accept=".xlsx,.csv" onChange={importFromExcel} className="hidden" />
          </label>
          <button
            type="button"
            onClick={exportToExcel}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <FaFileExport className="inline h-3 w-3 mr-1" /> Export
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            <FaPlus className="inline h-3 w-3 mr-1" /> Add
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-gray-900 dark:text-white">
              {calendarMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FaChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.date.getMonth() === calendarMonth.getMonth();
              const isToday = day.date.toDateString() === new Date().toDateString();
              const hasSpecial = day.special;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (hasSpecial) {
                      openEditModal(hasSpecial);
                    } else if (isCurrentMonth) {
                      resetForm();
                      setFormData(prev => ({ ...prev, date: day.date.toISOString().split('T')[0] }));
                      setShowAddModal(true);
                    }
                  }}
                  className={`p-2 text-xs rounded-lg relative ${!isCurrentMonth ? 'opacity-30' : ''
                    } ${isToday ? 'ring-2 ring-brand-500' : ''
                    } ${hasSpecial?.isClosed ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      hasSpecial ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  {day.date.getDate()}
                  {hasSpecial && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-current" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" /> Closed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/30" /> Modified Hours
            </span>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {specialHours.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No special hours configured. Use Quick Add Holiday or click Add above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {specialHours.map((hour) => (
                <div
                  key={hour.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hour.isClosed
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                      {hour.isClosed ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {hour.name || formatDate(hour.date)}
                        {hour.isRecurring && (
                          <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <FaRedo className="h-2 w-2 mr-0.5" /> Annual
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(hour.date)} • {hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyToNextYear(hour)}
                      title="Copy to next year"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                    >
                      <FaCopy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(hour)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => hour.id && deleteSpecialHour(hour.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {editingHour ? 'Edit Special Hours' : 'Add Special Hours'}
            </h3>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Christmas Day, New Year's Eve"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                {/* Quick Select Holidays */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {PRESET_HOLIDAYS.slice(0, 6).map((holiday) => (
                    <button
                      key={holiday.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, name: holiday.name }))}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {holiday.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Repeat Annually</p>
                  <p className="text-xs text-gray-500">Auto-copy to next year</p>
                </div>
                <IconToggle
                  checked={Boolean(formData.isRecurring)}
                  onChange={(next) => setFormData(prev => ({ ...prev, isRecurring: next }))}
                  label="Repeat Annually"
                  ariaLabel="Repeat annually"
                  variant="iconOnly"
                />
              </div>

              {/* Closed Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Closed All Day</p>
                  <p className="text-xs text-gray-500">Store will be completely closed</p>
                </div>
                <IconToggle
                  checked={formData.isClosed}
                  onChange={(next) => setFormData(prev => ({ ...prev, isClosed: next }))}
                  label="Closed All Day"
                  ariaLabel="Closed all day"
                  variant="iconOnly"
                />
              </div>

              {/* Hours (if not closed) */}
              {!formData.isClosed && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Store Hours
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData.openTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={formData.closeTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSpecialHour}
                disabled={saving}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Delete special hour"
        message="Are you sure you want to delete this special hour?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={async () => {
          const id = deleteConfirm.id;
          setDeleteConfirm({ open: false, id: null });
          if (!id) return;
          await performDeleteSpecialHour(id);
        }}
      />
    </div>
  );
}
