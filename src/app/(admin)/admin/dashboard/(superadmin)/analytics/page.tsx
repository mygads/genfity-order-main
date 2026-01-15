/**
 * Analytics Page (Super Admin Only)
 * Route: /admin/dashboard/analytics
 * Access: SUPER_ADMIN only
 * 
 * ALIGNED WITH DATABASE SCHEMA:
 * - Multi-currency support (AUD, IDR, USD, etc.)
 * - Order status distribution (PENDING, ACCEPTED, IN_PROGRESS, READY, COMPLETED, CANCELLED)
 * - Payment method breakdown (CASH_ON_COUNTER, CARD_ON_COUNTER, etc.)
 * - Payment status tracking
 * - Merchant open/active status
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
    currency: string;
    orderCount: number;
  }>;
  merchantsByMenuPopularity: Array<{
    merchantId: string;
    merchantName: string;
    currency: string;
    itemCount: number;
  }>;
  merchantsByRevenue: Array<{
    merchantId: string;
    merchantName: string;
    currency: string;
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
  // New metrics aligned with database schema
  orderStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
  paymentStatusDistribution: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  revenueByCurrency: Array<{
    currency: string;
    totalRevenue: number;
    orderCount: number;
  }>;
  activeMerchants: number;
  totalMerchants: number;
  // Order Type Analytics
  orderTypeDistribution: Array<{
    type: string;
    count: number;
    totalRevenue: number;
  }>;
  avgOrderValueByType: Array<{
    type: string;
    avgValue: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
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

    fetchAnalytics();
  }, [period]);

  // Format currency with proper symbol based on merchant currency
  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbols: Record<string, string> = {
      AUD: '$',
      USD: '$',
      IDR: 'Rp',
      EUR: '€',
      GBP: '£',
    };

    const symbol = currencySymbols[currency] || currency;

    if (currency === 'IDR') {
      return `${symbol} ${amount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
    }

    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format order status for display
  const formatOrderStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    return method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      ACCEPTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      READY: 'bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-400',
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
    <div data-tutorial="superadmin-analytics-page">
      <PageBreadcrumb pageTitle="Analytics" />

      {/* Date Range Selector */}
      <div className="mb-6 flex items-center gap-3" data-tutorial="analytics-period-selector">
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
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" data-tutorial="analytics-key-metrics">
        {/* Customer Registrations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">New Customers (30 days)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.customerRegistrations.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-success-600 dark:text-success-400">Registered customers</div>
        </div>

        {/* Active Merchants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Active Merchants</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.activeMerchants}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              / {analytics.totalMerchants}
            </span>
          </div>
          <div className="mt-2 text-sm text-blue-light-600 dark:text-blue-light-400">
            {((analytics.activeMerchants / analytics.totalMerchants) * 100).toFixed(1)}% open
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.merchantsByOrders.reduce((sum, m) => sum + m.orderCount, 0).toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {analytics.orderStatusDistribution.length} statuses tracked
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Payment Methods</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {analytics.paymentMethodBreakdown.length}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {analytics.paymentMethodBreakdown.reduce((sum, p) => sum + p.count, 0).toLocaleString()} transactions
          </div>
        </div>
      </div>

      {/* Multi-Currency Revenue Summary */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="analytics-revenue-currency">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Revenue by Currency
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {analytics.revenueByCurrency.map((item) => (
            <div
              key={item.currency}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                {item.currency}
              </div>
              <div className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(item.totalRevenue, item.currency)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {item.orderCount.toLocaleString()} orders
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="analytics-order-status">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Order Status Distribution
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {analytics.orderStatusDistribution.map((item) => (
            <div
              key={item.status}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className={`mb-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                {formatOrderStatus(item.status)}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {item.count.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="analytics-payment-methods">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Payment Method Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-700 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Transactions</th>
                <th className="px-4 py-3 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {analytics.paymentMethodBreakdown.map((item) => {
                const totalTransactions = analytics.paymentMethodBreakdown.reduce((sum, p) => sum + p.count, 0);
                const percentage = (item.count / totalTransactions) * 100;
                return (
                  <tr
                    key={item.method}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {formatPaymentMethod(item.method)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Status Distribution */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="analytics-payment-status">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Payment Status Distribution
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {analytics.paymentStatusDistribution.map((item) => (
            <div
              key={item.status}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className={`mb-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                {formatOrderStatus(item.status)}
              </div>
              <div className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
                {item.count.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.totalAmount.toLocaleString()} total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Type Distribution (DINE_IN vs TAKEAWAY) */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="analytics-order-types">
        <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Order Type Distribution
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {analytics.orderTypeDistribution.map((item) => {
            const avgValue = analytics.avgOrderValueByType.find(a => a.type === item.type);
            const totalOrders = analytics.orderTypeDistribution.reduce((sum, t) => sum + t.count, 0);
            const percentage = (item.count / totalOrders) * 100;

            return (
              <div
                key={item.type}
                className="rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatOrderStatus(item.type)}
                  </h3>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {item.totalRevenue.toLocaleString()} (mixed)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {avgValue ? avgValue.avgValue.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2" data-tutorial="analytics-merchant-charts">
        {/* Merchants by Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
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
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
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

      {/* Revenue by Merchant - Table with Currency */}
      <div className="mb-6" data-tutorial="analytics-top-merchants">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Merchants by Revenue
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-700 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {analytics.merchantsByRevenue.map((m, index) => (
                  <tr
                    key={m.merchantId}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {m.merchantName}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {m.currency}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(m.revenue, m.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Line Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-tutorial="analytics-growth-charts">
        {/* Merchant Growth */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
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
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
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
