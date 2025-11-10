/**
 * Users Management Page (Super Admin Only)
 * Route: /admin/dashboard/users
 * Access: SUPER_ADMIN only
 */

import { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/serverAuth';

export const metadata: Metadata = {
  title: 'Kelola Pengguna | GENFITY Admin',
  description: 'Manage all users in the system',
};

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  // Require SUPER_ADMIN role - will redirect if unauthorized
  await requireSuperAdmin();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Kelola Pengguna</h1>
        <p className="mt-1 text-sm text-body">
          Manage all users, roles, and permissions across the system
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari pengguna..."
            className="h-10 w-64 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
          />
          <select className="h-10 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
            <option value="">Semua Role</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="MERCHANT_OWNER">Merchant Owner</option>
            <option value="MERCHANT_STAFF">Merchant Staff</option>
            <option value="CUSTOMER">Customer</option>
          </select>
          <select className="h-10 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="h-10 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
          + Tambah Pengguna Baru
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-stroke bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Pengguna
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Merchant
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Terdaftar
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-dark">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Sample Data - Replace with actual data */}
            <tr className="border-b border-stroke">
              <td className="px-6 py-4">
                <div className="font-medium text-dark">Admin Sistem</div>
                <div className="text-sm text-body">ID: 1</div>
              </td>
              <td className="px-6 py-4 text-sm text-dark">admin@genfity.com</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                  Super Admin
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-body">-</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-body">01 Jan 2025</td>
              <td className="px-6 py-4 text-right">
                <button className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              </td>
            </tr>
            <tr className="border-b border-stroke">
              <td className="px-6 py-4">
                <div className="font-medium text-dark">John Doe</div>
                <div className="text-sm text-body">ID: 2</div>
              </td>
              <td className="px-6 py-4 text-sm text-dark">john@example.com</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  Merchant Owner
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-dark">Warung Sederhana</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-body">10 Nov 2025</td>
              <td className="px-6 py-4 text-right">
                <button className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">Showing 1 to 10 of 100 results</p>
        <div className="flex items-center gap-2">
          <button className="h-9 rounded-lg border border-stroke px-3 text-sm font-medium text-dark hover:bg-gray-50">
            Previous
          </button>
          <button className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-white">
            1
          </button>
          <button className="h-9 rounded-lg border border-stroke px-3 text-sm font-medium text-dark hover:bg-gray-50">
            2
          </button>
          <button className="h-9 rounded-lg border border-stroke px-3 text-sm font-medium text-dark hover:bg-gray-50">
            3
          </button>
          <button className="h-9 rounded-lg border border-stroke px-3 text-sm font-medium text-dark hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
