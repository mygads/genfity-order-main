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
import { FaSync, FaExpand, FaCompress, FaEye, FaClock, FaFire, FaPlay, FaCheck } from 'react-icons/fa';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { OrderTimer } from '@/components/orders/OrderTimer';
import type { OrderWithDetails } from '@/lib/types/order';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { OrderStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';

const KITCHEN_STATUSES: OrderStatus[] = ['ACCEPTED', 'IN_PROGRESS'];

export default function KitchenDisplayPage() {
  const router = useRouter();
  
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const statusFilter = KITCHEN_STATUSES.join(',');
      const [ordersResponse, merchantResponse] = await Promise.all([
        fetch(`/api/merchant/orders?status=${statusFilter}&limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/merchant/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const ordersData = await ordersResponse.json();
      const merchantData = await merchantResponse.json();

      if (merchantData.success && merchantData.data?.currency) {
        setMerchantCurrency(merchantData.data.currency);
      }

      if (ordersData.success) {
        const allOrders = ordersData.data as OrderWithDetails[];
        
        // Sort by placedAt (oldest first)
        const sortedOrders = allOrders.sort((a, b) => 
          new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
        );

        // Detect new orders and play sound
        const currentOrderIds = new Set(sortedOrders.map((o) => String(o.id)));
        const newOrders = sortedOrders.filter((o) => !previousOrderIds.has(String(o.id)));
        
        if (newOrders.length > 0 && previousOrderIds.size > 0) {
          playNotificationSound('newOrder');
        }

        setOrders(sortedOrders);
        setPreviousOrderIds(currentOrderIds);
        setError(null);
      } else {
        throw new Error(ordersData.error || 'Failed to fetch kitchen orders');
      }
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading kitchen orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${displayMode !== 'normal' ? 'fixed inset-0 z-50 overflow-auto bg-white dark:bg-gray-950' : ''}`}>
      {/* Header - Always Sticky */}
      <div className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm dark:bg-gray-950/95 border-b border-gray-200 dark:border-gray-800 ${displayMode !== 'normal' ? 'px-6 pt-6 pb-4' : 'pb-4 -mx-6 px-6 pt-0'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Kitchen Display
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Real-time order preparation view • Click cards for details
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Counts */}
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
              <span className="hidden sm:inline">Auto</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={fetchOrders}
              className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FaSync />
            </button>

            {/* Progressive Display Mode */}
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
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`${displayMode !== 'normal' ? 'px-6 pb-6 pt-6' : 'pt-6'}`}>
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
            <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        {/* Kitchen Grid - 2 columns Kanban style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accepted (Pending) Column */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 min-h-[600px]">
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-warning-600 dark:text-warning-400">
                  Pending
                </h2>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30 px-2 text-xs font-semibold text-warning-700 dark:text-warning-300">
                {acceptedOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {acceptedOrders.map((order) => (
                <KitchenCard
                  key={String(order.id)}
                  order={order}
                  onCardClick={handleCardClick}
                  onAction={(e) => handleMarkInProgress(String(order.id), e)}
                  actionLabel="Start"
                  actionIcon={<FaPlay className="h-3 w-3" />}
                  actionColor="primary"
                />
              ))}
              {acceptedOrders.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <FaClock className="h-6 w-6 text-warning-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No pending orders</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress (Cooking) Column */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3 min-h-[600px]">
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                  Cooking
                </h2>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                {inProgressOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {inProgressOrders.map((order) => (
                <KitchenCard
                  key={String(order.id)}
                  order={order}
                  onCardClick={handleCardClick}
                  onAction={(e) => handleMarkReady(String(order.id), e)}
                  actionLabel="Ready"
                  actionIcon={<FaCheck className="h-3 w-3" />}
                  actionColor="success"
                />
              ))}
              {inProgressOrders.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <FaFire className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No orders cooking</p>
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

// Compact Kitchen Card Component (inline)
interface KitchenCardProps {
  order: OrderWithDetails;
  onCardClick: (order: OrderWithDetails) => void;
  onAction: (e: React.MouseEvent) => void;
  actionLabel: string;
  actionIcon: React.ReactNode;
  actionColor: 'primary' | 'success';
}

function KitchenCard({ order, onCardClick, onAction, actionLabel, actionIcon, actionColor }: KitchenCardProps) {
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const items = 'orderItems' in order ? order.orderItems : [];

  return (
    <div
      onClick={() => onCardClick(order)}
      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              #{order.orderNumber}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          {order.tableNumber && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Table {order.tableNumber}
            </p>
          )}
        </div>
        <OrderTimer startTime={order.placedAt} className="text-xs px-2 py-1" />
      </div>

      {/* Items Preview */}
      <div className="mb-3 space-y-1.5">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 truncate">
              {item.quantity}x {item.menuName}
            </span>
            {item.addons && item.addons.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                +{item.addons.length} addon{item.addons.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            +{items.length - 3} more item{items.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-3 p-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
          <p className="text-xs text-warning-700 dark:text-warning-300 line-clamp-2">
            📝 {order.notes}
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onAction}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          actionColor === 'primary'
            ? 'bg-primary-500 hover:bg-primary-600 text-white'
            : 'bg-success-500 hover:bg-success-600 text-white'
        }`}
      >
        {actionIcon}
        {actionLabel}
      </button>
    </div>
  );
}
