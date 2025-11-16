/**
 * Analytics Page (Super Admin Only)
 * Route: /admin/dashboard/analytics
 * Access: SUPER_ADMIN only
 */

'use client';

import { useState, useEffect } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { getAdminToken } from '@/lib/utils/adminAuth';
import BarChart from '@/components/charts/bar/BarChart';
import LineChart from '@/components/charts/line/LineChart';

interface AnalyticsData {
  customerRegistrations: number;
  merchantsByOrders: Array<{
    merchantId: string;
    merchantName: string;
    orderCount: number;
  }>;
  merchantsByMenuPopularity: Array<{
    merchantId: string;
    merchantName: string;
    itemCount: number;
  }>;
  merchantsByRevenue: Array<{
    merchantId: string;
    merchantName: string;
    revenue: number;
  }>;
  merchantGrowth: Array<{
    month: string;
    count: number;
  }>;
  customerGrowth: Array<{
    month: string;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/analytics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Analytics" />

      {/* Date Range Selector */}
      <div className="mb-6 flex items-center gap-3">
        <select 
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="month">Last 30 Days</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Customer Registrations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">New Customers (30 days)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.customerRegistrations.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-success-600 dark:text-success-400">Registered customers</div>
        </div>

        {/* Total Merchants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Total Merchants</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.merchantGrowth.reduce((sum, m) => sum + m.count, 0)}
          </div>
          <div className="mt-2 text-sm text-blue-light-600 dark:text-blue-light-400">Active merchants</div>
        </div>

        {/* Top Revenue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Top Revenue</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Rp {(analytics.merchantsByRevenue[0]?.revenue || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {analytics.merchantsByRevenue[0]?.merchantName || '-'}
          </div>
        </div>

        {/* Most Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Most Orders</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.merchantsByOrders[0]?.orderCount || 0}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {analytics.merchantsByOrders[0]?.merchantName || '-'}
          </div>
        </div>
      </div>

      {/* Bar Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Merchants by Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Most Orders by Merchant
          </h2>
          <BarChart
            data={analytics.merchantsByOrders.map(m => ({
              label: m.merchantName,
              value: m.orderCount,
            }))}
            height={300}
          />
        </div>

        {/* Merchants by Menu Popularity */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Most Popular Menus by Merchant
          </h2>
          <BarChart
            data={analytics.merchantsByMenuPopularity.map(m => ({
              label: m.merchantName,
              value: m.itemCount,
            }))}
            height={300}
          />
        </div>
      </div>

      {/* Revenue Bar Chart - Full Width */}
      <div className="mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Revenue by Merchant
          </h2>
          <BarChart
            data={analytics.merchantsByRevenue.map(m => ({
              label: m.merchantName,
              value: m.revenue,
            }))}
            height={350}
          />
        </div>
      </div>

      {/* Line Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Merchant Growth */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Merchant Growth
          </h2>
          <LineChart
            data={analytics.merchantGrowth.map(m => ({
              label: new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              value: m.count,
            }))}
            height={300}
          />
        </div>

        {/* Customer Growth */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Customer Growth
          </h2>
          <LineChart
            data={analytics.customerGrowth.map(m => ({
              label: new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              value: m.count,
            }))}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}
