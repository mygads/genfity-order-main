/**
 * Analytics Page (Super Admin Only)
 * Route: /admin/dashboard/analytics
 * Access: SUPER_ADMIN only
 */

import { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/serverAuth';

export const metadata: Metadata = {
  title: 'Analytics | GENFITY Admin',
  description: 'System-wide analytics and insights',
};

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  // Require SUPER_ADMIN role - will redirect if unauthorized
  await requireSuperAdmin();
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stroke pb-4">
        <h1 className="text-2xl font-bold text-dark">Analytics</h1>
        <p className="mt-1 text-sm text-body">
          System-wide analytics, performance metrics, and business insights
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-3">
        <select className="h-10 rounded-lg border border-stroke px-4 text-sm focus:border-primary focus:outline-none">
          <option value="today">Hari ini</option>
          <option value="week">7 Hari terakhir</option>
          <option value="month">30 Hari terakhir</option>
          <option value="year">Tahun ini</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Total Revenue</div>
          <div className="text-2xl font-bold text-dark">Rp 125,400,000</div>
          <div className="mt-2 text-sm text-green-600">+12.5% dari bulan lalu</div>
        </div>

        {/* Total Orders */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Total Orders</div>
          <div className="text-2xl font-bold text-dark">4,892</div>
          <div className="mt-2 text-sm text-green-600">+8.2% dari bulan lalu</div>
        </div>

        {/* Active Merchants */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Active Merchants</div>
          <div className="text-2xl font-bold text-dark">24</div>
          <div className="mt-2 text-sm text-blue-600">2 merchant baru bulan ini</div>
        </div>

        {/* Total Users */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <div className="mb-2 text-sm text-body">Total Users</div>
          <div className="text-2xl font-bold text-dark">1,283</div>
          <div className="mt-2 text-sm text-green-600">+15.3% dari bulan lalu</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-lg border border-stroke bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-dark">Revenue Trend</h2>
        <div className="flex h-64 items-center justify-center border border-dashed border-stroke">
          <p className="text-sm text-body">Chart will be displayed here</p>
        </div>
      </div>

      {/* Top Merchants & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Merchants by Revenue */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">
            Top Merchants by Revenue
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Warung Makan Sederhana</div>
                <div className="text-sm text-body">245 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 45,200,000</div>
                <div className="text-sm text-green-600">+18%</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Kopi Kenangan</div>
                <div className="text-sm text-body">198 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 32,800,000</div>
                <div className="text-sm text-green-600">+12%</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-dark">Bakso Malang</div>
                <div className="text-sm text-body">167 orders</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-dark">Rp 28,500,000</div>
                <div className="text-sm text-green-600">+9%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <div className="text-sm text-dark">
                  New merchant <span className="font-medium">Ayam Geprek</span>{' '}
                  registered
                </div>
                <div className="text-xs text-body">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <div className="text-sm text-dark">
                  <span className="font-medium">Warung Sederhana</span> updated
                  menu
                </div>
                <div className="text-xs text-body">5 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500"></div>
              <div className="flex-1">
                <div className="text-sm text-dark">
                  Large order (Rp 2,500,000) from{' '}
                  <span className="font-medium">Kopi Kenangan</span>
                </div>
                <div className="text-xs text-body">1 day ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
