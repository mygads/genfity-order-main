/**
 * Staff Management Page (Merchant Owner Only)
 * Route: /admin/dashboard/staff
 * Access: MERCHANT_OWNER only
 */

import { Metadata } from 'next';
import { requireMerchantOwner } from '@/lib/auth/serverAuth';

export const metadata: Metadata = {
  title: 'Kelola Staff | GENFITY Merchant',
  description: 'Manage your merchant staff members',
};

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  // Require MERCHANT_OWNER role - will redirect if unauthorized
  await requireMerchantOwner();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Kelola Staff</h1>
        <p className="mt-1 text-sm text-body">
          Manage your staff members, roles, and permissions
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari staff..."
            className="h-10 w-64 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none"
          />
          <select className="h-10 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="h-10 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
          + Tambah Staff Baru
        </button>
      </div>

      {/* Staff Table */}
      <div className="rounded-lg border border-stroke bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Nama Staff
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                No. Telepon
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-dark">
                Bergabung
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
                <div className="font-medium text-dark">Jane Smith</div>
                <div className="text-sm text-body">Staff ID: S001</div>
              </td>
              <td className="px-6 py-4 text-sm text-dark">jane@example.com</td>
              <td className="px-6 py-4 text-sm text-dark">0812-3456-7890</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-body">05 Nov 2025</td>
              <td className="px-6 py-4 text-right">
                <button className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              </td>
            </tr>
            <tr className="border-b border-stroke">
              <td className="px-6 py-4">
                <div className="font-medium text-dark">Bob Johnson</div>
                <div className="text-sm text-body">Staff ID: S002</div>
              </td>
              <td className="px-6 py-4 text-sm text-dark">bob@example.com</td>
              <td className="px-6 py-4 text-sm text-dark">0813-4567-8901</td>
              <td className="px-6 py-4">
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-body">01 Nov 2025</td>
              <td className="px-6 py-4 text-right">
                <button className="text-sm font-medium text-primary hover:underline">
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Empty State (show when no staff) */}
      {/* <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stroke bg-gray-50 py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-dark">Belum ada staff</h3>
          <p className="mt-1 text-sm text-body">
            Tambahkan staff pertama untuk membantu mengelola merchant Anda
          </p>
          <button className="mt-4 h-10 rounded-lg bg-primary px-6 text-sm font-medium text-white hover:bg-primary/90">
            + Tambah Staff Pertama
          </button>
        </div>
      </div> */}

      {/* Staff Permissions Info */}
      <div className="rounded-lg border border-stroke bg-blue-50 p-4">
        <h3 className="font-semibold text-dark">Permissions Staff</h3>
        <ul className="mt-2 space-y-1 text-sm text-body">
          <li>✓ Mengelola pesanan (view, update status)</li>
          <li>✓ Mengelola menu (view only, tidak bisa edit)</li>
          <li>✗ Tidak bisa melihat laporan revenue</li>
          <li>✗ Tidak bisa mengelola staff lain</li>
        </ul>
      </div>
    </div>
  );
}
