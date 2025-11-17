/**
 * KitchenBoard Component
 * 
 * Professional, clean kitchen display with minimal colors
 * Reference: /admin/dashboard/orders page design
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaSync, FaExpand, FaCompress, FaClock, FaFire } from 'react-icons/fa';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { KitchenOrderCard } from './KitchenOrderCard';
import type { OrderWithDetails } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';

interface KitchenBoardProps {
  merchantId: bigint;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const KITCHEN_STATUSES: OrderStatus[] = ['ACCEPTED', 'IN_PROGRESS'];

export const KitchenBoard: React.FC<KitchenBoardProps> = ({
  merchantId: _merchantId,
  autoRefresh: initialAutoRefresh = true,
  refreshInterval = 1000, // 1 second like orders page
}) => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const previousDataRef = useRef<string>('');

  // Fetch kitchen orders with smart comparison
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Use single API call with multiple statuses to reduce connection pool usage
      // Instead of 2 parallel calls, join statuses with comma
      const statusFilter = KITCHEN_STATUSES.join(',');
      
      const response = await fetch(`/api/merchant/orders?status=${statusFilter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const allOrders = data.data as OrderWithDetails[];
        
        // Sort by placedAt (oldest first)
        const sortedOrders = allOrders.sort((a: OrderWithDetails, b: OrderWithDetails) => {
          return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
        });

        // Smart comparison - only update if data actually changed
        const newDataString = JSON.stringify(sortedOrders);
        if (newDataString !== previousDataRef.current) {
          // Detect new orders and play sound
          const currentOrderIds = new Set(sortedOrders.map((o: OrderWithDetails) => String(o.id)));
          const newOrders = sortedOrders.filter((o: OrderWithDetails) => !previousOrderIds.has(String(o.id)));
          
          if (newOrders.length > 0 && previousOrderIds.size > 0) {
            console.log(`[KitchenBoard] Detected ${newOrders.length} new order(s)`);
            playNotificationSound('newOrder');
          }

          setOrders(sortedOrders);
          setPreviousOrderIds(currentOrderIds);
          previousDataRef.current = newDataString;
        }
        
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch kitchen orders');
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [previousOrderIds]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOrders]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchOrders();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleFullscreen, fetchOrders]);

  // Handle status updates
  const handleMarkInProgress = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'READY' }),
      });

      const data = await response.json();
      if (data.success) {
        playNotificationSound('orderReady');
        await fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Group orders by status
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const inProgressOrders = orders.filter(o => o.status === 'IN_PROGRESS');

  return (
    <div>
      <PageBreadcrumb pageTitle="Kitchen Display" />

      {/* Professional Header - Matches orders page */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Status Counts */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
              <FaClock className="h-4 w-4 text-warning-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {acceptedOrders.length} Pending
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
              <FaFire className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {inProgressOrders.length} Cooking
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
              autoRefresh
                ? 'border-success-300 bg-success-50 text-success-700 dark:border-success-800 dark:bg-success-900/20 dark:text-success-400'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {autoRefresh && <div className="h-2 w-2 animate-pulse rounded-full bg-success-500" />}
            <FaSync className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            <FaSync className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            {isFullscreen ? (
              <>
                <FaCompress className="h-3.5 w-3.5" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <FaExpand className="h-3.5 w-3.5" />
                Fullscreen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && orders.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-500">
            <FaSync className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Loading orders...</span>
          </div>
        </div>
      )}

      {/* Orders Grid - Smaller cards matching orders page */}
      {!loading || orders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Accepted Orders (Left Column) */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              <FaClock className="h-5 w-5 text-warning-500" />
              Pending Orders ({acceptedOrders.length})
            </h2>
            
            <div className="space-y-4">
              {acceptedOrders.length > 0 ? (
                acceptedOrders.map((order) => (
                  <KitchenOrderCard
                    key={String(order.id)}
                    order={order}
                    onMarkInProgress={handleMarkInProgress}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
                  <div className="text-center">
                    <FaClock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      No pending orders
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Orders (Right Column) */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              <FaFire className="h-5 w-5 text-blue-500" />
              Cooking ({inProgressOrders.length})
            </h2>
            
            <div className="space-y-4">
              {inProgressOrders.length > 0 ? (
                inProgressOrders.map((order) => (
                  <KitchenOrderCard
                    key={String(order.id)}
                    order={order}
                    onMarkReady={handleMarkReady}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-white/3">
                  <div className="text-center">
                    <FaFire className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      No orders cooking
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
