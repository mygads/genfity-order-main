/**
 * Reports Page (Merchant Owner Only)
 * Route: /admin/dashboard/reports
 * Access: MERCHANT_OWNER only (staff cannot access)
 */

import { Metadata } from 'next';
import { requireMerchantOwner } from '@/lib/auth/serverAuth';

export const metadata: Metadata = {
  title: 'Laporan | GENFITY Merchant',
  description: 'View merchant reports and analytics',
};

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Require MERCHANT_OWNER role - will redirect if unauthorized
  await requireMerchantOwner();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Laporan</h1>
        <p className="mt-1 text-sm text-body">
          Comprehensive reports and analytics for your merchant
        </p>
      </div>

      {/* Date Range & Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select className="h-10 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
            <option value="today">Hari ini</option>
            <option value="week">7 Hari terakhir</option>
            <option value="month">30 Hari terakhir</option>
            <option value="year">Tahun ini</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <button className="h-10 rounded-lg border border-stroke px-6 text-sm font-medium text-dark hover:bg-gray-50">
          📥 Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Total Revenue</div>
          <div className="text-2xl font-bold text-dark">Rp 45,200,000</div>
          <div className="mt-2 text-sm text-green-600">+18% dari bulan lalu</div>
        </div>

        {/* Total Orders */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Total Orders</div>
          <div className="text-2xl font-bold text-dark">245</div>
          <div className="mt-2 text-sm text-green-600">+12% dari bulan lalu</div>
        </div>

        {/* Average Order Value */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Rata-rata Pesanan</div>
          <div className="text-2xl font-bold text-dark">Rp 184,490</div>
          <div className="mt-2 text-sm text-blue-600">Stabil</div>
        </div>

        {/* Menu Items Sold */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Item Terjual</div>
          <div className="text-2xl font-bold text-dark">892</div>
          <div className="mt-2 text-sm text-green-600">+15% dari bulan lalu</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-lg border border-stroke bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-dark">Revenue Trend</h2>
        <div className="flex h-64 items-center justify-center border border-dashed border-stroke">
          <p className="text-sm text-body">Chart will be displayed here</p>
        </div>
      </div>

      {/* Top Products & Order Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Top Selling Products
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Nasi Goreng Spesial</div>
                <div className="text-sm text-body">156 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 4,680,000</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Mie Ayam</div>
                <div className="text-sm text-body">98 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 1,960,000</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Es Teh Manis</div>
                <div className="text-sm text-body">245 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 1,225,000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">Order Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-dark">Completed</span>
              </div>
              <span className="font-semibold text-dark">198 (81%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-dark">In Progress</span>
              </div>
              <span className="font-semibold text-dark">32 (13%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-dark">Cancelled</span>
              </div>
              <span className="font-semibold text-dark">15 (6%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-lg border border-stroke bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-dark">Payment Methods</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-dark">165</div>
            <div className="text-sm text-body">Cash (67%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-dark">52</div>
            <div className="text-sm text-body">QRIS (21%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-dark">28</div>
            <div className="text-sm text-body">Transfer (12%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
