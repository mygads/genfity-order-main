/**
 * Order History & Analytics Page
 * 
 * Comprehensive analytics dashboard showing order statistics, charts,
 * and detailed order history with export capabilities.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaChartLine, FaHistory, FaDownload } from 'react-icons/fa';
import OrderStatsCards from '@/components/orders/OrderStatsCards';
import OrderCharts from '@/components/orders/OrderCharts';
import OrderHistoryTable from '@/components/orders/OrderHistoryTable';
import DateRangeFilter, { DateRange } from '@/components/orders/DateRangeFilter';
import { exportAnalyticsToExcel } from '@/lib/utils/exportOrders';

// ===== TYPES =====

interface OrderStatistics {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByType: Record<string, number>;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
}

interface PaymentStatistics {
  totalRevenue: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  byMethod: Record<string, { count: number; amount: number }>;
}

interface PopularItem {
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface RevenueByDate {
  date: string;
  revenue: number;
  orderCount: number;
}

interface AnalyticsData {
  statistics: OrderStatistics;
  paymentStats: PaymentStatistics;
  popularItems: PopularItem[];
  revenueByDate: RevenueByDate[];
}

interface Order {
  id: string | number;
  orderNumber: string;
  orderType: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  [key: string]: unknown;
}

interface OrderData {
  orders: Order[];
  total: number;
}

// ===== MAIN PAGE =====

export default function OrderHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [merchant, setMerchant] = useState<{ currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date range (default: last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Fetch merchant data
  const fetchMerchant = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch merchant');

      const data = await response.json();
      if (data.success && data.data) {
        setMerchant(data.data);
      }
    } catch (error) {
      console.error('Error fetching merchant:', error);
    }
  }, [router]);

  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const response = await fetch(
        `/api/merchant/orders/analytics?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, router]);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const response = await fetch(
        `/api/merchant/orders?startDate=${startDate}&endDate=${endDate}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      if (data.success) {
        setOrderData({
          orders: data.data,
          total: data.total || data.data.length,
        });
      } else {
        setError(data.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, router]);

  useEffect(() => {
    fetchMerchant();
  }, [fetchMerchant]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else {
      fetchOrders();
    }
  }, [activeTab, fetchAnalytics, fetchOrders]);

  const handleViewOrder = (orderId: string | number) => {
    router.push(`/admin/dashboard/orders/${orderId}`);
  };

  const handleExportAnalytics = () => {
    if (analyticsData) {
      exportAnalyticsToExcel(analyticsData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Order Analytics & History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View comprehensive order statistics, trends, and history
          </p>
        </div>
        {activeTab === 'analytics' && analyticsData && (
          <button
            onClick={handleExportAnalytics}
            className="h-10 px-4 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors flex items-center gap-2"
          >
            <FaDownload />
            Export Analytics
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FaChartLine />
            Analytics & Charts
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FaHistory />
            Order History
          </div>
        </button>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-error-300 bg-error-100 dark:bg-error-900/20 p-4">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {analyticsData ? (
            <OrderStatsCards
              statistics={analyticsData.statistics}
              paymentStats={analyticsData.paymentStats}
              currency={merchant?.currency || 'AUD'}
              loading={loading}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Charts */}
          {analyticsData ? (
            <OrderCharts
              revenueData={analyticsData.revenueByDate}
              popularItems={analyticsData.popularItems}
              currency={merchant?.currency || 'AUD'}
              loading={loading}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Additional Stats */}
          {analyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Orders by Status */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Orders by Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(analyticsData.statistics.ordersByStatus).map(([status, count]: [string, number]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders by Type */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Orders by Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(analyticsData.statistics.ordersByType).map(([type, count]: [string, number]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {type === 'DINE_IN' ? '🍽️ Dine In' : '🥡 Takeaway'}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Payment Methods
                </h3>
                <div className="space-y-3">
                  {Object.entries(analyticsData.paymentStats.byMethod).map(([method, data]: [string, { count: number; amount: number }]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {method.replace(/_/g, ' ')}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {data.count} orders
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Intl.NumberFormat('en-AU', {
                            style: 'currency',
                            currency: merchant?.currency || 'AUD',
                          }).format(data.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && orderData && (
        <OrderHistoryTable
          orders={orderData.orders}
          currency={merchant?.currency || 'AUD'}
          onViewOrder={handleViewOrder}
          loading={loading}
        />
      )}

      {/* Empty State */}
      {!loading && activeTab === 'analytics' && !analyticsData && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
          <FaChartLine size={48} className="mb-4" />
          <p className="text-lg font-medium">No analytics data available</p>
          <p className="text-sm">Try selecting a different date range</p>
        </div>
      )}

      {!loading && activeTab === 'history' && (!orderData || orderData.orders.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
          <FaHistory size={48} className="mb-4" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm">Try selecting a different date range</p>
        </div>
      )}
    </div>
  );
}
