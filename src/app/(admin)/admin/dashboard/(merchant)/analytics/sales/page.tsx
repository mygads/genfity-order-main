/**
 * Sales Analytics Page
 * Route: /admin/dashboard/analytics/sales
 * 
 * Features:
 * - Revenue trends with chart
 * - Top selling items
 * - Peak hours visualization
 * - Order statistics
 * - Payment method breakdown
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

// Dynamic import for ApexCharts (SSR safe)
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />,
});

interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
    completionRate: number;
  };
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topSellingItems: Array<{
    menuId: string;
    menuName: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  orderTypes: Array<{
    type: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year';

export default function SalesAnalyticsPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [currency, setCurrency] = useState('AUD');

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // Fetch merchant info for currency
      const merchantRes = await fetch('/api/merchant/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (merchantRes.ok) {
        const merchantData = await merchantRes.json();
        if (merchantData.success && merchantData.data.currency) {
          setCurrency(merchantData.data.currency);
        }
      }

      const response = await fetch(`/api/merchant/analytics/sales?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, router]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(amount))}`;
    }
    if (currency === 'AUD') {
      return `A$${new Intl.NumberFormat('en-AU', { minimumFractionDigits: 0 }).format(amount)}`;
    }
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format payment method for display
  function formatPaymentMethod(method: string) {
    return method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  // Format order status
  function formatStatus(status: string) {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  // Revenue Trend Chart Options
  const revenueTrendOptions: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif',
    },
    colors: ['#f97316'],
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analytics?.revenueTrend.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
      }) || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '10px' },
        rotate: -45,
        rotateAlways: (analytics?.revenueTrend.length || 0) > 12,
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
          return Math.round(val).toString();
        },
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  };

  // Peak Hours Chart Options  
  const peakHoursOptions: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif',
    },
    colors: ['#3b82f6'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analytics?.peakHours.map(h => `${h.hour}:00`) || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 4,
    },
  };

  // Payment Methods Donut Options
  const paymentMethodsOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Outfit, sans-serif',
    },
    colors: ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'],
    labels: analytics?.paymentMethods.map(p => formatPaymentMethod(p.method)) || [],
    legend: {
      position: 'bottom',
      fontSize: '12px',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="h-[350px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-[350px] bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="analytics-overview">
      <PageBreadcrumb pageTitle={t('admin.analytics.sales')} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.analytics.sales')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your revenue, orders, and sales performance
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'quarter', 'year'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tutorial="customer-insights">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(analytics?.summary.totalRevenue || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {analytics?.summary.totalOrders || 0}
          </div>
          <div className="text-xs text-green-500 mt-1">
            {analytics?.summary.completedOrders} completed
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Average Order Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(analytics?.summary.averageOrderValue || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatPercent(analytics?.summary.completionRate || 0)}
          </div>
          <div className="text-xs text-red-500 mt-1">
            {analytics?.summary.cancelledOrders} cancelled
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5" data-tutorial="trends-chart">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Trend
          </h3>
          <ReactApexChart
            options={revenueTrendOptions}
            series={[{
              name: 'Revenue',
              data: analytics?.revenueTrend.map(d => d.revenue) || [],
            }]}
            type="area"
            height={300}
          />
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Peak Hours
          </h3>
          <ReactApexChart
            options={peakHoursOptions}
            series={[{
              name: 'Orders',
              data: analytics?.peakHours.map(h => h.orders) || [],
            }]}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5" data-tutorial="menu-performance">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Selling Items
          </h3>
          <div className="space-y-3">
            {analytics?.topSellingItems.slice(0, 5).map((item, index) => (
              <div key={item.menuId} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-medium text-brand-600">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {item.menuName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.quantity} sold · {formatCurrency(item.revenue)}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatPercent(item.percentage)}
                </div>
              </div>
            ))}
            {(!analytics?.topSellingItems || analytics.topSellingItems.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No sales data yet</p>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Methods
          </h3>
          {analytics?.paymentMethods && analytics.paymentMethods.length > 0 ? (
            <ReactApexChart
              options={paymentMethodsOptions}
              series={analytics.paymentMethods.map(p => p.count)}
              type="donut"
              height={250}
            />
          ) : (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-sm text-gray-500">No payment data yet</p>
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Order Status
          </h3>
          <div className="space-y-3">
            {analytics?.ordersByStatus.map((status) => (
              <div key={status.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatStatus(status.status)}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {status.count}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      status.status === 'COMPLETED' ? 'bg-green-500' :
                      status.status === 'CANCELLED' ? 'bg-red-500' :
                      status.status === 'PENDING' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!analytics?.ordersByStatus || analytics.ordersByStatus.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No order data yet</p>
            )}
          </div>

          {/* Order Types */}
          {analytics?.orderTypes && analytics.orderTypes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Order Types
              </h4>
              <div className="flex gap-4">
                {analytics.orderTypes.map((type) => (
                  <div key={type.type} className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {type.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      {type.type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
