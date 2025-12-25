/**
 * Order History Page
 * 
 * Clean, professional design showing order history with filtering
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaHistory } from 'react-icons/fa';
import OrderHistoryTable from '@/components/orders/OrderHistoryTable';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import DateRangeFilter, { DateRange } from '@/components/orders/DateRangeFilter';
import type { OrderStatus, OrderType } from '@prisma/client';
import { useMerchant } from '@/context/MerchantContext';
import { useTranslation } from '@/lib/i18n/useTranslation';

// ===== TYPES =====

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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [_merchant, setMerchant] = useState<{ currency: string } | null>(null);
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
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrder = (orderId: string | number) => {
    setSelectedOrderId(String(orderId));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
    // Refresh data after modal closes
    fetchOrders();
  };

  return (
    <div>
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("admin.history.title")}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("admin.history.subtitle")}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Order History Table */}
      {orderData && (
        <OrderHistoryTable
          orders={orderData.orders}
          onViewOrder={handleViewOrder}
          loading={loading}
        />
      )}

      {/* Empty State */}
      {!loading && (!orderData || orderData.orders.length === 0) && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FaHistory className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t("admin.history.noOrders")}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.history.tryDifferentDate")}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !orderData && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse"
            ></div>
          ))}
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
