/**
 * Order History & Analytics Page
 * 
 * Professional, clean design with minimal colors (gray/white dominant)
 * Reference: /admin/dashboard/reports page design system
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaChartLine, FaHistory, FaDownload, FaUtensils, FaShoppingBag } from 'react-icons/fa';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import OrderStatsCards from '@/components/orders/OrderStatsCards';
import OrderCharts from '@/components/orders/OrderCharts';
import OrderHistoryTable from '@/components/orders/OrderHistoryTable';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import DateRangeFilter, { DateRange } from '@/components/orders/DateRangeFilter';
import { exportAnalyticsToExcel } from '@/lib/utils/exportOrders';
import type { OrderStatus, OrderType } from '@prisma/client';
import { useMerchant } from '@/context/MerchantContext';

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
  orderType: OrderType;
  status: OrderStatus;
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date range (default: last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Use MerchantContext
  const { merchant: merchantData } = useMerchant();
  
  React.useEffect(() => {
    if (merchantData) {
      setMerchant(merchantData);
    }
  }, [merchantData]);

  // Fetch merchant data (kept for backwards compatibility)
  const fetchMerchant = React.useCallback(async () => {
    if (merchantData) {
      setMerchant(merchantData);
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
    setSelectedOrderId(String(orderId));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
    // Refresh data after modal closes
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else {
      fetchOrders();
    }
  };

  const handleExportAnalytics = () => {
    if (analyticsData) {
      exportAnalyticsToExcel(analyticsData);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Order Analytics & History" />

      {/* Date Range & Export - Professional layout like reports page */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === 'analytics'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <FaChartLine className="h-3.5 w-3.5" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === 'history'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <FaHistory className="h-3.5 w-3.5" />
              History
            </button>
          </div>
        </div>

        {/* Export Button */}
        {activeTab === 'analytics' && analyticsData && (
          <button
            onClick={handleExportAnalytics}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            <FaDownload className="h-4 w-4" />
            Export Analytics
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
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
                  className="h-32 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 animate-pulse"
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
                  className="h-96 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Additional Stats */}
          {analyticsData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Orders by Status */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-6">
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
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
                  Orders by Type
                </h3>
                <div className="space-y-3">
                  {Object.entries(analyticsData.statistics.ordersByType).map(([type, count]: [string, number]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {type === 'DINE_IN' ? (
                          <FaUtensils className="h-4 w-4 text-brand-500" />
                        ) : (
                          <FaShoppingBag className="h-4 w-4 text-success-500" />
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-6">
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

      {/* Empty State - Analytics */}
      {!loading && activeTab === 'analytics' && !analyticsData && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <FaChartLine className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              No Analytics Data
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              There are no orders in the selected date range.
            </p>
          </div>
        </div>
      )}

      {/* Empty State - History */}
      {!loading && activeTab === 'history' && (!orderData || orderData.orders.length === 0) && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <FaHistory className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              No Orders Found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try selecting a different date range.
            </p>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleCloseModal}
        />
      )}
    </div>
  );
}
