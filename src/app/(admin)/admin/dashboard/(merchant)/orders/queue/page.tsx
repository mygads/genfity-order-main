/**
 * Queue/Lounge Display Page
 * 
 * Large display for customer waiting area
 * Shows READY orders with prominent order numbers
 * Designed for TV/monitor display in restaurant lounge
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaSync, FaExpand, FaCompress, FaEye, FaBell, FaCheck } from 'react-icons/fa';
import type { OrderWithDetails } from '@/lib/types/order';
import { playNotificationSound } from '@/lib/utils/soundNotification';

export default function QueueDisplayPage() {
  const router = useRouter();
  
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());

  // Fetch READY orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/orders?status=READY&limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const readyOrders = data.data as OrderWithDetails[];
        
        // Sort by actualReadyAt (most recent first)
        const sortedOrders = readyOrders.sort((a, b) => {
          const aTime = a.actualReadyAt ? new Date(a.actualReadyAt).getTime() : 0;
          const bTime = b.actualReadyAt ? new Date(b.actualReadyAt).getTime() : 0;
          return bTime - aTime;
        });

        // Detect new ready orders and play sound
        const currentOrderIds = new Set(sortedOrders.map((o) => String(o.id)));
        const newOrders = sortedOrders.filter((o) => !previousOrderIds.has(String(o.id)));
        
        if (newOrders.length > 0 && previousOrderIds.size > 0) {
          playNotificationSound('orderReady');
        }

        setOrders(sortedOrders);
        setPreviousOrderIds(currentOrderIds);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch ready orders');
      }
    } catch (err) {
      console.error('Error fetching ready orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [router, previousOrderIds]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 3000); // 3 seconds for quick updates
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Handle display mode changes
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-header]') as HTMLElement;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement;

    if (displayMode === 'clean' || displayMode === 'fullscreen') {
      document.body.classList.add('clean-mode');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    }

    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, [displayMode]);

  // Listen to fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && displayMode === 'fullscreen') {
        setDisplayMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [displayMode]);

  // Handle order completion
  const handleMarkCompleted = async (orderId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      const data = await response.json();
      if (data.success) {
        playNotificationSound('payment');
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Calculate time since order was ready
  const getTimeSinceReady = (readyAt: string | Date | null) => {
    if (!readyAt) return '';
    const now = new Date();
    const ready = new Date(readyAt);
    const diffMs = now.getTime() - ready.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading queue...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${displayMode !== 'normal' ? 'fixed inset-0 z-50 overflow-auto bg-gray-950' : ''}`}>
      {/* Header - Sticky when in clean/fullscreen mode */}
      <div className={`${displayMode !== 'normal' ? 'sticky top-0 z-40 bg-gray-950/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-gray-800 shadow-sm' : ''}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className={`font-bold ${displayMode !== 'normal' ? 'text-4xl text-white' : 'text-2xl text-gray-800 dark:text-white/90'}`}>
              <span className="flex items-center gap-3">
                <FaBell className="text-success-500" />
                Order Ready Queue
              </span>
            </h1>
            <p className={`mt-1 ${displayMode !== 'normal' ? 'text-lg text-gray-400' : 'text-sm text-gray-500 dark:text-gray-400'}`}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} ready for pickup
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <FaSync className={autoRefresh ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Auto Refresh</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchOrders}
              className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FaSync />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Progressive Display Mode: Normal → Clean → Fullscreen */}
            <button
              onClick={async () => {
                if (displayMode === 'normal') {
                  setDisplayMode('clean');
                } else if (displayMode === 'clean') {
                  try {
                    await document.documentElement.requestFullscreen();
                    setDisplayMode('fullscreen');
                  } catch (err) {
                    console.error('Error entering fullscreen:', err);
                  }
                } else {
                  try {
                    if (document.fullscreenElement) {
                      await document.exitFullscreen();
                    }
                    setDisplayMode('normal');
                  } catch (err) {
                    console.error('Error exiting fullscreen:', err);
                  }
                }
              }}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
                displayMode !== 'normal'
                  ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              title={
                displayMode === 'normal' ? 'Enter Clean Mode' :
                displayMode === 'clean' ? 'Enter Full Screen' :
                'Exit Full Screen'
              }
            >
              {displayMode === 'normal' ? <FaEye /> :
               displayMode === 'clean' ? <FaExpand /> :
               <FaCompress />}
              <span className="hidden sm:inline">
                {displayMode === 'normal' ? 'Clean Mode' :
                 displayMode === 'clean' ? 'Full Screen' :
                 'Exit'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`${displayMode !== 'normal' ? 'px-6 pb-6' : 'mt-6'}`}>
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
            <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        {/* Queue Grid - Large order number cards */}
        {orders.length > 0 ? (
          <div className={`grid gap-6 ${
            displayMode !== 'normal'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {orders.map((order, index) => (
              <div
                key={String(order.id)}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  index === 0
                    ? 'border-success-400 bg-linear-to-br from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30 animate-pulse'
                    : 'border-gray-200 bg-white hover:border-success-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-success-600'
                }`}
              >
                {/* New badge for most recent */}
                {index === 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                      Latest
                    </span>
                  </div>
                )}

                <div className={`p-6 text-center ${displayMode !== 'normal' ? 'py-10' : ''}`}>
                  {/* Order Number - Prominently displayed */}
                  <div className={`font-black ${
                    displayMode !== 'normal'
                      ? 'text-7xl'
                      : 'text-5xl'
                  } ${index === 0 ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {order.orderNumber}
                  </div>

                  {/* Customer Name */}
                  <div className={`mt-3 font-semibold ${
                    displayMode !== 'normal' ? 'text-2xl' : 'text-lg'
                  } ${index === 0 ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                    {order.customer?.name || (order as unknown as { customerName?: string }).customerName || 'Guest'}
                  </div>

                  {/* Order Type Badge */}
                  <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    index === 0
                      ? 'bg-white/20 text-white'
                      : order.orderType === 'DINE_IN'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {order.orderType === 'DINE_IN' ? '🍽️ Dine In' : '🥡 Takeaway'}
                    {order.orderType === 'DINE_IN' && (order as unknown as { tableNumber?: string }).tableNumber && ` - Table ${(order as unknown as { tableNumber?: string }).tableNumber}`}
                  </div>

                  {/* Time since ready */}
                  <div className={`mt-3 text-sm ${index === 0 ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                    Ready {getTimeSinceReady(order.actualReadyAt)}
                  </div>

                  {/* Mark as Completed button (for staff) */}
                  <button
                    onClick={() => handleMarkCompleted(String(order.id))}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                      index === 0
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                    }`}
                  >
                    <FaCheck />
                    Picked Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${
            displayMode !== 'normal' ? 'min-h-[60vh] py-20' : 'py-16'
          }`}>
            <div className={`rounded-full bg-gray-100 dark:bg-gray-800 ${displayMode !== 'normal' ? 'p-8' : 'p-6'}`}>
              <FaBell className={`text-gray-400 ${displayMode !== 'normal' ? 'h-16 w-16' : 'h-12 w-12'}`} />
            </div>
            <h3 className={`mt-4 font-semibold text-gray-600 dark:text-gray-400 ${displayMode !== 'normal' ? 'text-2xl' : 'text-lg'}`}>
              No orders ready
            </h3>
            <p className={`mt-2 text-gray-500 dark:text-gray-500 ${displayMode !== 'normal' ? 'text-lg' : 'text-sm'}`}>
              Orders will appear here when they are ready for pickup
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
