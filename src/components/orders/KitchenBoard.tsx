/**
 * KitchenBoard Component
 * 
 * Full-screen kitchen display showing active orders
 * Filters: ACCEPTED & IN_PROGRESS only
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  autoRefresh = true,
  refreshInterval = 5000, // 5 seconds for kitchen (faster than kanban)
}) => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch ACCEPTED and IN_PROGRESS orders
      const promises = KITCHEN_STATUSES.map(status =>
        fetch(`/api/merchant/orders?status=${status}&limit=50`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );

      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(r => r.json()));

      if (data.every(d => d.success)) {
        const allOrders = data.flatMap(d => d.data);
        
        // Sort by placedAt (oldest first)
        const sortedOrders = allOrders.sort((a, b) => {
          return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
        });

        // Detect new orders and play sound
        const currentOrderIds = new Set(sortedOrders.map(o => String(o.id)));
        const newOrders = sortedOrders.filter(o => !previousOrderIds.has(String(o.id)));
        
        if (newOrders.length > 0 && previousOrderIds.size > 0) {
          console.log(`[KitchenBoard] Detected ${newOrders.length} new order(s)`);
          playNotificationSound('newOrder');
        }

        setOrders(sortedOrders);
        setPreviousOrderIds(currentOrderIds);
        setError(null);
      } else {
        throw new Error('Failed to fetch kitchen orders');
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                👨‍🍳 Kitchen Display
              </h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 font-bold text-sm">
                  {acceptedOrders.length} Pending
                </span>
                <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-sm">
                  {inProgressOrders.length} Cooking
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh indicator */}
              {autoRefresh && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400">
                  <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}

              {/* Manual refresh */}
              <button
                onClick={fetchOrders}
                className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Refresh (R)"
              >
                🔄 Refresh
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="h-10 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors"
                title="Toggle Fullscreen (F5)"
              >
                {isFullscreen ? '📱 Exit Fullscreen' : '🖥️ Fullscreen'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-xl text-gray-600 dark:text-gray-400">Loading orders...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="container mx-auto px-6 py-12">
          <div className="bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800 rounded-xl p-6 text-center">
            <p className="text-2xl font-bold text-error-700 dark:text-error-400">
              ⚠️ {error}
            </p>
          </div>
        </div>
      )}

      {/* Orders Grid */}
      {!loading && !error && (
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accepted Orders (Left Column) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="text-3xl">⏳</span>
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
                  <div className="bg-white dark:bg-white/3 rounded-xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-600">
                      ✨ No pending orders
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress Orders (Right Column) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="text-3xl">🔥</span>
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
                  <div className="bg-white dark:bg-white/3 rounded-xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-2xl text-gray-400 dark:text-gray-600">
                      🍳 No orders cooking
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Shortcuts:</p>
        <p className="text-gray-600 dark:text-gray-400">F5 - Fullscreen</p>
        <p className="text-gray-600 dark:text-gray-400">R - Refresh</p>
      </div>
    </div>
  );
};
