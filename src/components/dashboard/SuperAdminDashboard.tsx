'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useState, useEffect, useCallback } from 'react';
import { RevenueChart, CustomerGrowthChart, ActivityHeatmap, NotificationBell } from './superadmin';

interface SuperAdminDashboardProps {
  stats: {
    totalMerchants: number;
    activeMerchants: number;
    totalUsers: number;
    totalOrders: number;
    totalCustomers: number;
  };
  recentMerchants: Array<{
    id: bigint;
    code: string;
    name: string;
    email: string | null;
    city: string | null;
    isActive: boolean;
    createdAt: Date;
  }>;
}

interface ChartData {
  revenueData: Array<{ date: string; revenue: number; orderCount: number }>;
  customerGrowth: Array<{ date: string; newCustomers: number; totalCustomers: number }>;
  activityHeatmap: Array<{ dayOfWeek: number; hour: number; orderCount: number }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalNewCustomers: number;
    currentTotalCustomers: number;
  };
  revenueByCurrency?: {
    IDR: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
    AUD: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  };
}

/**
 * GENFITY Super Admin Dashboard Component
 * 
 * @description
 * Displays system-wide statistics for super admin users:
 * - Total merchants (active/inactive)
 * - Total users (admin/staff)
 * - Total orders and revenue
 * - Recent merchants and orders
 */
export default function SuperAdminDashboard({
  stats,
  recentMerchants,
}: SuperAdminDashboardProps) {
  const { t } = useTranslation();
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    try {
      setChartLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/admin/analytics/charts?period=${chartPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setChartData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setChartLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header with Notification Bell */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('admin.superadmin.dashboard.title') || 'Super Admin Dashboard'}
        </h1>
        <NotificationBell />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Merchants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.superadmin.dashboard.totalMerchants')}
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalMerchants}
              </h3>
              <p className="mt-1 text-sm text-green-600">
                {stats.activeMerchants} {t('common.active').toLowerCase()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20">
              <svg
                className="h-6 w-6 text-brand-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.superadmin.allUsers')}
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Admin & Staff
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <svg
                className="h-6 w-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.superadmin.dashboard.totalOrders')}
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalOrders}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.dashboard.allTime')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <svg
                className="h-6 w-6 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.superadmin.dashboard.totalCustomers')}
              </p>
              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalCustomers}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('admin.roles.customer')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <svg
                className="h-6 w-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.superadmin.dashboard.analyticsOverview') || 'Analytics Overview'}
          </h2>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${chartPeriod === period
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.superadmin.dashboard.revenueOverTime') || 'Revenue Over Time'}
                </h3>
                {chartData?.revenueByCurrency && (
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium">
                        IDR
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Rp {chartData.revenueByCurrency.IDR.totalRevenue.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({chartData.revenueByCurrency.IDR.totalOrders} orders)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium">
                        AUD
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        A${chartData.revenueByCurrency.AUD.totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({chartData.revenueByCurrency.AUD.totalOrders} orders)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {chartLoading ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            ) : chartData?.revenueData ? (
              <RevenueChart data={chartData.revenueData} currency="ALL" />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
                No revenue data available
              </div>
            )}
          </div>

          {/* Customer Growth Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.superadmin.dashboard.customerGrowth') || 'Customer Growth'}
                </h3>
                {chartData?.summary && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    +{chartData.summary.totalNewCustomers} new customers in this period
                  </p>
                )}
              </div>
            </div>
            {chartLoading ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              </div>
            ) : chartData?.customerGrowth ? (
              <CustomerGrowthChart data={chartData.customerGrowth} />
            ) : (
              <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
                No customer data available
              </div>
            )}
          </div>
        </div>

        {/* Activity Heatmap - Full Width */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.superadmin.dashboard.activityHeatmap') || 'Order Activity Heatmap'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Order activity by day and hour (last 30 days)
            </p>
          </div>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : chartData?.activityHeatmap ? (
            <ActivityHeatmap data={chartData.activityHeatmap} />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">
              No activity data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Merchants */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.superadmin.dashboard.recentMerchants')}
          </h3>
          <Link
            href="/admin/dashboard/merchants"
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recentMerchants.map((merchant) => (
            <div
              key={merchant.id.toString()}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {merchant.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {merchant.code} • {merchant.city || 'No city'}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${merchant.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}
              >
                {merchant.isActive ? t('common.active') : t('common.inactive')}
              </span>
            </div>
          ))}
          {recentMerchants.length === 0 && (
            <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
              {t('admin.superadmin.dashboard.noMerchantsYet')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
