/**
 * OrderTabListView Component
 * 
 * Tab-based layout with table/list underneath
 * Traditional list view organized by status tabs
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrderListCard } from './OrderListCard';
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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-4">
        {ACTIVE_STATUSES.map((status) => {
          const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];
          const count = getStatusCount(status);
          const isActive = activeTab === status;

          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${
                  isActive
                    ? `${statusConfig.bg} ${statusConfig.text} shadow-sm`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:bg-gray-900'
                }
              `}
            >
              <span>{statusConfig.label}</span>
              <span
                className={`
                  inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md text-xs font-bold
                  ${
                    isActive
                      ? 'bg-white/20 text-current'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List Content */}
      <div className="space-y-2">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-6 py-12 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No {ORDER_STATUS_COLORS[activeTab as keyof typeof ORDER_STATUS_COLORS].label.toLowerCase()} orders
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
  );
};
