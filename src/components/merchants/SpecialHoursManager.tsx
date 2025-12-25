/**
 * Special Hours Management Component
 * 
 * Calendar-based UI for managing holiday and special hours
 * Allows merchants to set custom hours for specific dates
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/useToast";

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
}

interface SpecialHoursManagerProps {
  token: string;
}

const PRESET_HOLIDAYS = [
  { name: "New Year's Day", month: 0, day: 1 },
  { name: "Australia Day", month: 0, day: 26 },
  { name: "Good Friday", month: -1, day: -1 }, // Variable
  { name: "Easter Saturday", month: -1, day: -1 }, // Variable
  { name: "Easter Monday", month: -1, day: -1 }, // Variable
  { name: "ANZAC Day", month: 3, day: 25 },
  { name: "Queen's Birthday", month: -1, day: -1 }, // Variable
  { name: "Christmas Eve", month: 11, day: 24 },
  { name: "Christmas Day", month: 11, day: 25 },
  { name: "Boxing Day", month: 11, day: 26 },
  { name: "New Year's Eve", month: 11, day: 31 },
];

export default function SpecialHoursManager({ token }: SpecialHoursManagerProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHour, setEditingHour] = useState<SpecialHour | null>(null);

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
  });

  // Fetch existing special hours
  const fetchSpecialHours = useCallback(async () => {
    try {
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      const response = await fetch(
        `/api/merchant/special-hours?from=${today.toISOString().split('T')[0]}&to=${threeMonthsLater.toISOString().split('T')[0]}`,
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

  // Delete special hour
  const deleteSpecialHour = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special hour?')) return;

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
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Holiday & Special Hours</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set custom hours for holidays and special occasions
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Add Special Hours
        </button>
      </div>

      {/* List of Special Hours */}
      {specialHours.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No special hours configured. Add holidays or special dates above.
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
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  hour.isClosed 
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
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {hour.name || formatDate(hour.date)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(hour.date)} • {hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(hour)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => hour.id && deleteSpecialHour(hour.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
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

              {/* Closed Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Closed All Day</p>
                  <p className="text-xs text-gray-500">Store will be completely closed on this date</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formData.isClosed}
                    onChange={(e) => setFormData(prev => ({ ...prev, isClosed: e.target.checked }))}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                </label>
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
    </div>
  );
}
