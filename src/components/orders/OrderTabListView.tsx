/**
 * OrderTabListView Component
 * 
 * Tab-based layout with table/list underneath
 * Traditional list view organized by status tabs
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrderListCard } from './OrderListCard';
import { OrderTabListSkeleton } from '@/components/common/SkeletonLoaders';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';

interface OrderTabListViewProps {
  merchantId: bigint;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onOrderClick?: (order: OrderListItem) => void;
  filters?: {
    orderType?: OrderType | 'ALL';
    paymentStatus?: PaymentStatus | 'ALL';
    dateFrom?: string;
    dateTo?: string;
  };
  selectedOrders?: Set<string>;
  bulkMode?: boolean;
  onToggleSelection?: (orderId: string) => void;
  currency?: string;
  onRefreshReady?: (refreshFn: () => void) => void;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'READY',
];

export const OrderTabListView: React.FC<OrderTabListViewProps> = ({
  merchantId,
  autoRefresh = true,
  refreshInterval = 10000,
  onOrderClick,
  filters = {},
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  currency = 'AUD',
  onRefreshReady,
}) => {
  const _merchantId = merchantId;

  const [activeTab, setActiveTab] = useState<OrderStatus>('PENDING');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const previousDataRef = useRef<string>('');

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/merchant/orders/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const fetchedOrders: OrderListItem[] = result.data;

        // Smart comparison - only update if data actually changed
        const newDataString = JSON.stringify(fetchedOrders);
        if (previousDataRef.current !== newDataString) {
          setOrders(fetchedOrders);
          previousDataRef.current = newDataString;

          // Play sound if new order
          if (fetchedOrders.length > previousOrderCount) {
            playNotificationSound('newOrder');
          }
          setPreviousOrderCount(fetchedOrders.length);
        }
      } else {
        setError(result.error || 'Failed to load orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [previousOrderCount]);

  // Auto-refresh effect
  useEffect(() => {
    fetchOrders();

    if (autoRefresh) {
      const interval = setInterval(fetchOrders, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchOrders]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchOrders);
    }
  }, [onRefreshReady, fetchOrders]);

  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Filter orders by active tab and filters
  const getFilteredOrders = () => {
    let filteredOrders = orders.filter((order) => order.status === activeTab);

    // Apply additional filters
    if (filters.orderType && filters.orderType !== 'ALL') {
      filteredOrders = filteredOrders.filter(
        (order) => order.orderType === filters.orderType
      );
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
      filteredOrders = filteredOrders.filter(
        (order) => order.payment?.status === filters.paymentStatus
      );
    }

    return filteredOrders;
  };

  // Get count for each status
  const getStatusCount = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="space-y-6">
      {/* Professional Tabs with Underline Indicator */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-1 -mb-px">
          {ACTIVE_STATUSES.map((status) => {
            const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];
            const count = getStatusCount(status);
            const isActive = activeTab === status;

            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`
                  relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all
                  ${isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {/* Status Indicator Dot */}
                <div className={`w-2 h-2 rounded-full ${status === 'PENDING' ? 'bg-warning-500' :
                    status === 'ACCEPTED' ? 'bg-blue-500' :
                      status === 'IN_PROGRESS' ? 'bg-orange-500' :
                        status === 'READY' ? 'bg-success-500' :
                          'bg-gray-400'
                  } ${isActive && status === 'PENDING' ? 'animate-pulse' : ''}`} />

                <span>{statusConfig.label}</span>

                {/* Count Badge */}
                <span
                  className={`
                    inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold
                    ${isActive
                      ? `${statusConfig.bg} ${statusConfig.text}`
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }
                  `}
                >
                  {count}
                </span>

                {/* Active Underline Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List Content with Container */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                No {ORDER_STATUS_COLORS[activeTab as keyof typeof ORDER_STATUS_COLORS].label} Orders
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Orders with this status will appear here
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderListCard
                key={order.id}
                order={order}
                onClick={() => onOrderClick?.(order)}
                onStatusChange={handleStatusChange}
                currency={currency}
                bulkMode={bulkMode}
                isSelected={selectedOrders.has(String(order.id))}
                onToggleSelection={onToggleSelection}
                showQuickActions={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
