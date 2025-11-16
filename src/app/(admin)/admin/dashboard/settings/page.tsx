'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { useToast } from '@/hooks/useToast';

interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  emailNotifications: boolean;
  orderNotifications: boolean;
  marketingEmails: boolean;
}

/**
 * User Preferences Page (Client Component)
 * Route: /admin/dashboard/settings
 * Access: SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF
 * 
 * @description
 * User preferences page for customizing dashboard experience.
 * Allows users to manage theme, language, timezone, notifications, and display formats.
 * Account information and password changes are handled in My Profile page.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'en',
    timezone: 'Asia/Jakarta',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'IDR',
    emailNotifications: true,
    orderNotifications: true,
    marketingEmails: false,
  });

  // Load preferences from API
  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/user/preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to load preferences');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      showError('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to save preferences');
      }

      const data = await response.json();

      if (data.success) {
        showSuccess('Success', 'Preferences saved successfully');
      } else {
        showError('Error', data.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      showError('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setPreferences({
      theme: 'light',
      language: 'en',
      timezone: 'Asia/Jakarta',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'IDR',
      emailNotifications: true,
      orderNotifications: true,
      marketingEmails: false,
    });
    showSuccess('Reset', 'Preferences reset to defaults. Click Save to apply.');
  }

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Preferences" />
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageBreadcrumb pageTitle="Preferences" />
      
      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Appearance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <select 
                value={preferences.theme}
                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose your preferred theme for the dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Language & Region */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Language & Region
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Language
              </label>
              <select 
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Timezone
              </label>
              <select 
                value={preferences.timezone}
                onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="Asia/Jakarta">(GMT+7) Jakarta, Bangkok, Hanoi</option>
                <option value="Asia/Singapore">(GMT+8) Singapore, Kuala Lumpur</option>
                <option value="Asia/Tokyo">(GMT+9) Tokyo, Seoul</option>
                <option value="Australia/Sydney">(GMT+10) Sydney, Melbourne</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <select 
                value={preferences.currency}
                onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
                <option value="USD">USD - US Dollar ($)</option>
                <option value="SGD">SGD - Singapore Dollar (S$)</option>
                <option value="AUD">AUD - Australian Dollar (A$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date & Time Format */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Date & Time Format
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Format
              </label>
              <select 
                value={preferences.dateFormat}
                onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (16/11/2025)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (11/16/2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-11-16)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Time Format
              </label>
              <select 
                value={preferences.timeFormat}
                onChange={(e) => setPreferences({ ...preferences, timeFormat: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Email Notifications
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Receive email notifications for important updates
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Order Notifications
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Get notified when new orders are placed
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.orderNotifications}
                  onChange={(e) => setPreferences({ ...preferences, orderNotifications: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Marketing Emails
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Receive promotional emails and product updates
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.marketingEmails}
                  onChange={(e) => setPreferences({ ...preferences, marketingEmails: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={resetToDefaults}
            className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            Reset to Defaults
          </button>
          <button 
            onClick={savePreferences}
            disabled={saving}
            className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
