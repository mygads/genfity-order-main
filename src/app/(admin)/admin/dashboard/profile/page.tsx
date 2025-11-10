/**
 * Profile Page (Accessible to all admin roles)
 * Route: /admin/dashboard/profile
 * Access: SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | GENFITY Admin',
  description: 'View and edit your profile',
};

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Profile</h1>
        <p className="mt-1 text-sm text-body">
          View and manage your profile information
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
              AU
            </div>
            <h2 className="text-xl font-semibold text-dark">Admin User</h2>
            <p className="mt-1 text-sm text-body">admin@genfity.com</p>
            <div className="mt-3">
              <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                Super Admin
              </span>
            </div>
            <button className="mt-6 h-10 w-full rounded-lg border border-stroke text-sm font-medium text-dark hover:bg-gray-50">
              Change Avatar
            </button>
          </div>

          {/* Stats */}
          <div className="mt-6 space-y-3 border-t border-stroke pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-body">Member Since</span>
              <span className="text-sm font-medium text-dark">Jan 2025</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-body">Last Login</span>
              <span className="text-sm font-medium text-dark">Today, 10:30 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-body">Account Status</span>
              <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="rounded-lg border border-stroke bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-dark">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Admin"
                    className="h-11 w-full rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue="User"
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
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-dark">
                  Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="w-full rounded-lg border border-stroke px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  defaultValue="System administrator at GENFITY"
                />
              </div>
              <button className="mt-4 h-11 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
                Save Changes
              </button>
            </div>

            {/* Role & Permissions */}
            <div className="rounded-lg border border-stroke bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-dark">
                Role & Permissions
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-dark">View All Merchants</span>
                  <span className="text-xs text-green-600">✓ Granted</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-dark">Manage Users</span>
                  <span className="text-xs text-green-600">✓ Granted</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-dark">System Analytics</span>
                  <span className="text-xs text-green-600">✓ Granted</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <span className="text-sm text-dark">System Settings</span>
                  <span className="text-xs text-green-600">✓ Granted</span>
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="rounded-lg border border-stroke bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-dark">
                Active Sessions
              </h3>
              <div className="space-y-3">
                <div className="flex items-start justify-between rounded-lg border border-stroke p-3">
                  <div>
                    <div className="font-medium text-dark">Windows • Chrome</div>
                    <div className="text-sm text-body">
                      Jakarta, Indonesia • 10:30 AM
                    </div>
                  </div>
                  <span className="text-xs text-green-600">Current</span>
                </div>
                <div className="flex items-start justify-between rounded-lg border border-stroke p-3">
                  <div>
                    <div className="font-medium text-dark">
                      iPhone 14 • Safari
                    </div>
                    <div className="text-sm text-body">
                      Jakarta, Indonesia • Yesterday
                    </div>
                  </div>
                  <button className="text-xs text-red-600 hover:underline">
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
