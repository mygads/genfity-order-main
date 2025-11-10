/**
 * Settings Page (Accessible to all admin roles)
 * Route: /admin/dashboard/settings
 * Access: SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pengaturan | GENFITY Admin',
  description: 'Manage your account settings',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Pengaturan</h1>
        <p className="mt-1 text-sm text-body">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Account Information */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Admin User"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Email Address
              </label>
              <input
                type="email"
                defaultValue="admin@genfity.com"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Phone Number
              </label>
              <input
                type="tel"
                defaultValue="+62 812-3456-7890"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button className="h-11 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Current Password
              </label>
              <input
                type="password"
                placeholder="Enter current password"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button className="h-11 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
              Update Password
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Notification Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark">Email notifications for new orders</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark">Email notifications for order updates</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark">Weekly performance reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
              />
              <span className="text-sm text-dark">Monthly revenue summaries</span>
            </label>
          </div>
        </div>

        {/* Language & Timezone */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Language & Timezone
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Language
              </label>
              <select className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark">
                Timezone
              </label>
              <select className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
                <option value="Asia/Jakarta">
                  (GMT+7) Jakarta, Bangkok, Hanoi
                </option>
                <option value="Asia/Singapore">
                  (GMT+8) Singapore, Kuala Lumpur
                </option>
              </select>
            </div>
            <button className="h-11 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
