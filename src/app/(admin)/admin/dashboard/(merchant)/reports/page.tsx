/**
 * Reports Page (Merchant Owner Only)
 * Route: /admin/dashboard/reports
 * Access: MERCHANT_OWNER only (staff cannot access)
 */

import { Metadata } from 'next';
import { requireMerchantOwner } from '@/lib/auth/serverAuth';

export const metadata: Metadata = {
  title: 'Reports | GENFITY Merchant',
  description: 'View merchant reports and analytics',
};

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Require MERCHANT_OWNER role - will redirect if unauthorized
  await requireMerchantOwner();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Reports</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Comprehensive reports and analytics for your merchant
        </p>
      </div>

      {/* Date Range & Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <button className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05]">
          📥 Export PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white/90">Rp 45,200,000</div>
          <div className="mt-2 text-sm text-success-600 dark:text-success-400">+18% from last month</div>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white/90">245</div>
          <div className="mt-2 text-sm text-success-600 dark:text-success-400">+12% from last month</div>
        </div>

        {/* Average Order Value */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Average Order Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white/90">Rp 184,490</div>
          <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">Stable</div>
        </div>

        {/* Menu Items Sold */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Items Sold</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white/90">892</div>
          <div className="mt-2 text-sm text-success-600 dark:text-success-400">+15% from last month</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Revenue Trend</h2>
        <div className="flex h-64 items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Chart will be displayed here</p>
        </div>
      </div>

      {/* Top Products & Order Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
            Top Selling Products
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white/90">Nasi Goreng Spesial</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">156 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white/90">Rp 4,680,000</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white/90">Mie Ayam</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">98 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white/90">Rp 1,960,000</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white/90">Es Teh Manis</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">245 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white/90">Rp 1,225,000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Order Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success-500"></div>
                <span className="text-sm text-gray-800 dark:text-white/90">Completed</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white/90">198 (81%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-800 dark:text-white/90">In Progress</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white/90">32 (13%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-error-500"></div>
                <span className="text-sm text-gray-800 dark:text-white/90">Cancelled</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white/90">15 (6%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">Payment Methods</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">165</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cash (67%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">52</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">QRIS (21%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white/90">28</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Transfer (12%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
