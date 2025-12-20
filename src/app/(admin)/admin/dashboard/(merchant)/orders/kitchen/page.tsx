/**
 * Kitchen Display Page
 * 
 * Clean, professional, minimalist design matching orders page
 * Shows ACCEPTED & IN_PROGRESS orders for kitchen staff
 * Features:
 * - Sticky header (always fixed)
 * - Click cards to open detail modal (no loading)
 * - 3-mode display system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaSync, FaExpand, FaCompress, FaEye, FaClock, FaFire, FaPlay, FaCheck, FaShoppingBag } from 'react-icons/fa';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { OrderTimer } from '@/components/orders/OrderTimer';
import { KitchenDisplaySkeleton } from '@/components/common/SkeletonLoaders';
import { useToast } from '@/context/ToastContext';
import type { OrderWithDetails } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { useMerchant } from '@/context/MerchantContext';

const KITCHEN_STATUSES: OrderStatus[] = ['ACCEPTED', 'IN_PROGRESS'];

export default function KitchenDisplayPage() {
  const router = useRouter();
  const { merchant } = useMerchant();
  const { showError } = useToast();

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');
  const merchantCurrency = merchant?.currency || 'AUD';

  // Use ref to track previous order IDs without triggering re-renders
  const previousOrderIdsRef = React.useRef<Set<string>>(new Set());

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isModalOpen] = useState(false);

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const statusFilter = KITCHEN_STATUSES.join(',');
      const response = await fetch(`/api/merchant/orders?status=${statusFilter}&limit=50&includeItems=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const ordersData = await response.json();

      if (ordersData.success) {
        const allOrders = ordersData.data as OrderWithDetails[];

        // Sort by placedAt (oldest first)
        const sortedOrders = allOrders.sort((a, b) =>
          new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
        );

        // Detect new orders and play sound
        const currentOrderIds = new Set(sortedOrders.map((o) => String(o.id)));
        const newOrders = sortedOrders.filter((o) => !previousOrderIdsRef.current.has(String(o.id)));

        if (newOrders.length > 0 && previousOrderIdsRef.current.size > 0) {
          playNotificationSound('newOrder');
        }

        setOrders(sortedOrders);
        previousOrderIdsRef.current = currentOrderIds;
      } else {
        showError(ordersData.error || 'Failed to load orders', 'Connection Error');
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
      showError('Error getting data from server', 'Connection Error');
    } finally {
      setLoading(false);
    }
  }, [router, showError]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 5000);
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

  // Handle status updates
  const handleMarkInProgress = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
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
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleMarkReady = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
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
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Modal handlers
  const handleCardClick = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleOrderUpdate = () => {
    fetchOrders();
  };

  // Group orders by status
  const acceptedOrders = orders.filter(o => o.status === 'ACCEPTED');
  const inProgressOrders = orders.filter(o => o.status === 'IN_PROGRESS');

  if (loading && orders.length === 0) {
    return <KitchenDisplaySkeleton />;
  }

  return (
    <div className={`${displayMode !== 'normal' ? 'fixed inset-0 z-50 overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col' : 'flex flex-col h-[calc(100vh-100px)]'}`}>
      {/* Header - Clean Minimal Design */}
      <div className={`sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${displayMode !== 'normal' ? 'px-6 py-4' : 'pb-4 -mx-6 px-6 pt-0'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Kitchen
            </h1>

            {/* Status Counts - Minimal */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{acceptedOrders.length}</span> pending
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{inProgressOrders.length}</span> cooking
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${autoRefresh
                ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <FaSync className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Auto</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchOrders}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Refresh now"
            >
              <FaSync className="h-3.5 w-3.5" />
            </button>

            {/* Display Mode Toggle */}
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
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${displayMode !== 'normal'
                ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              title={
                displayMode === 'normal' ? 'Clean mode' :
                  displayMode === 'clean' ? 'Fullscreen' :
                    'Exit fullscreen'
              }
            >
              {displayMode === 'normal' ? <FaEye className="h-3.5 w-3.5" /> :
                displayMode === 'clean' ? <FaExpand className="h-3.5 w-3.5" /> :
                  <FaCompress className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-hidden ${displayMode !== 'normal' ? 'px-6 py-6' : 'pt-6'}`}>
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Kitchen Grid - 2 columns, full height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Pending Column */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaClock className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Pending
                  </h2>
                </div>
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {acceptedOrders.length}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {acceptedOrders.map((order) => (
                <KitchenCard
                  key={String(order.id)}
                  order={order}
                  onCardClick={handleCardClick}
                  onAction={(e) => handleMarkInProgress(String(order.id), e)}
                  actionLabel="Start Cooking"
                  actionIcon={<FaPlay className="h-3 w-3" />}
                  actionColor="primary"
                />
              ))}
              {acceptedOrders.length === 0 && (
                <div className="py-16 text-center">
                  <FaClock className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No pending orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Cooking Column */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFire className="h-4 w-4 text-orange-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Cooking
                  </h2>
                </div>
                <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-semibold text-orange-700 dark:text-orange-300">
                  {inProgressOrders.length}
                </span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {inProgressOrders.map((order) => (
                <KitchenCard
                  key={String(order.id)}
                  order={order}
                  onCardClick={handleCardClick}
                  onAction={(e) => handleMarkReady(String(order.id), e)}
                  actionLabel="Mark Ready"
                  actionIcon={<FaCheck className="h-3 w-3" />}
                  actionColor="success"
                />
              ))}
              {inProgressOrders.length === 0 && (
                <div className="py-16 text-center">
                  <FaFire className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No orders cooking</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          orderId={String(selectedOrder.id)}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleOrderUpdate}
          initialOrder={selectedOrder}
          currency={merchantCurrency}
        />
      )}
    </div>
  );
}

/**
 * Kitchen Order Card - Full Details View
 * 
 * Shows complete order information inline so cooks can see everything
 * without clicking. Clean, professional, minimal design.
 */
interface KitchenCardProps {
  order: OrderWithDetails;
  onCardClick: (order: OrderWithDetails) => void;
  onAction: (e: React.MouseEvent) => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  actionColor: 'primary' | 'success';
}

function KitchenCard({ order, onCardClick, onAction, actionLabel, actionIcon, actionColor }: KitchenCardProps) {
  const items = 'orderItems' in order ? order.orderItems : [];
  const isUrgent = (() => {
    const elapsed = Date.now() - new Date(order.placedAt).getTime();
    return elapsed > 10 * 60 * 1000; // 10 minutes
  })();

  return (
    <div
      onClick={() => onCardClick(order)}
      className={`
        rounded-lg border bg-white dark:bg-gray-900 
        transition-all duration-200 cursor-pointer overflow-hidden
        hover:shadow-md
        ${isUrgent
          ? 'border-amber-300 dark:border-amber-700'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}
    >
      {/* Compact Header */}
      <div className={`
        px-4 py-3 border-b
        ${isUrgent
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800'
        }
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              #{order.orderNumber}
            </span>
            {order.tableNumber && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Table {order.tableNumber}
              </span>
            )}
            {order.orderType === 'TAKEAWAY' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <FaShoppingBag className="h-2.5 w-2.5" />
                Takeaway
              </span>
            )}
          </div>
          <OrderTimer
            startTime={order.placedAt}
            className={`text-xs px-2 py-1 rounded font-medium ${isUrgent
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : ''
              }`}
          />
        </div>
      </div>

      {/* Order Items - Full Details */}
      <div className="p-4">
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              {/* Quantity Badge */}
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-brand-100 dark:bg-brand-900/30 text-sm font-bold text-brand-700 dark:text-brand-300">
                  {item.quantity}
                </span>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {item.menuName}
                </p>

                {/* Addons - Show All */}
                {item.addons && item.addons.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {item.addons.map((addon, addonIdx) => (
                      <p key={addonIdx} className="text-xs text-gray-500 dark:text-gray-400 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                        {addon.addonName}
                        {addon.quantity > 1 && ` ×${addon.quantity}`}
                      </p>
                    ))}
                  </div>
                )}

                {/* Item Notes */}
                {item.notes && (
                  <div className="mt-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300 border-l-2 border-amber-400">
                    {item.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order Notes - Prominent */}
        {order.notes && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Order Note</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">
              {order.notes}
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onAction}
          className={`
            mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg 
            text-sm font-semibold transition-colors
            ${actionColor === 'primary'
              ? 'bg-primary-500 hover:bg-primary-600 text-white'
              : 'bg-success-500 hover:bg-success-600 text-white'
            }
          `}
        >
          {actionIcon}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
