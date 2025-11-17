/**
 * OrderKanbanBoard Component
 * 
 * Main Kanban board with drag & drop functionality
 * Real-time order updates and auto-refresh
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { FaBan } from 'react-icons/fa';
import { OrderColumn } from './OrderColumn';
import { OrderCard } from './OrderCard';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { canTransitionStatus } from '@/lib/utils/orderStatusRules';

interface OrderKanbanBoardProps {
  merchantId: bigint;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableDragDrop?: boolean;
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

export const OrderKanbanBoard: React.FC<OrderKanbanBoardProps> = ({
  merchantId,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
  enableDragDrop = true,
  onOrderClick,
  filters = {},
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  currency = 'AUD',
  onRefreshReady,
}) => {
  // merchantId is for future use when implementing merchant-specific filtering
  const _merchantId = merchantId;
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

      const data = await response.json();
      if (data.success) {
        const newOrders = data.data;
        
        // Detect new orders and play sound
        if (previousOrderCount > 0 && newOrders.length > previousOrderCount) {
          const newOrdersCount = newOrders.length - previousOrderCount;
          console.log(`[OrderKanbanBoard] Detected ${newOrdersCount} new order(s)`);
          playNotificationSound('newOrder');
        }
        
        // Only update if data actually changed (prevent unnecessary re-renders)
        setOrders(prevOrders => {
          const hasChanged = JSON.stringify(prevOrders) !== JSON.stringify(newOrders);
          return hasChanged ? newOrders : prevOrders;
        });
        
        setPreviousOrderCount(newOrders.length);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [previousOrderCount]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchOrders);
    }
  }, [onRefreshReady, fetchOrders]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOrders]);

  // Apply filters
  const filteredOrders = orders.filter(order => {
    if (filters.orderType && filters.orderType !== 'ALL' && order.orderType !== filters.orderType) {
      return false;
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL' && order.payment?.status !== filters.paymentStatus) {
      return false;
    }
    if (filters.dateFrom && new Date(order.placedAt) < new Date(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && new Date(order.placedAt) > new Date(filters.dateTo)) {
      return false;
    }
    return true;
  });

  // Group orders by status
  const ordersByStatus = ACTIVE_STATUSES.reduce((acc, status) => {
    acc[status] = filteredOrders.filter(order => order.status === status);
    return acc;
  }, {} as Record<OrderStatus, OrderListItem[]>);

  // Check if drop is valid using proper transition rules
  const isValidDrop = (orderId: string, targetStatus: OrderStatus): boolean => {
    const order = orders.find(o => String(o.id) === orderId);
    if (!order) return false;

    // Use business logic from orderStatusRules
    return canTransitionStatus(order.status, targetStatus);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // Handle drag over - for visual feedback
  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over || !enableDragDrop) return;

    const orderId = String(active.id);
    const newStatus = over.id as OrderStatus;

    // Find the order
    const order = orders.find(o => String(o.id) === orderId);
    if (!order || order.status === newStatus) return;

    // Prevent invalid status transitions
    if (!isValidDrop(orderId, newStatus)) {
      console.warn(`Invalid status transition: ${order.status} → ${newStatus}`);
      // Optional: Add toast notification here
      // toast.error('Invalid status transition. Orders can only move forward or be cancelled.');
      return;
    }

    // Optimistic update
    setOrders(prevOrders =>
      prevOrders.map(o =>
        String(o.id) === orderId ? { ...o, status: newStatus } : o
      )
    );

    // Update on server
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      // Refresh to get latest data
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
      // Revert optimistic update
      await fetchOrders();
      setError(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  // Find active order for drag overlay
  const activeOrder = activeId 
    ? orders.find(o => String(o.id) === activeId)
    : null;

  // Check if current over position is invalid
  const isCurrentlyOverInvalid = activeId && overId && !isValidDrop(activeId, overId as OrderStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTIVE_STATUSES.map(status => {
            const isInvalid = !!(activeId && !isValidDrop(activeId, status));
            return (
              <OrderColumn
                key={status}
                status={status}
                orders={ordersByStatus[status] || []}
                onOrderClick={(order) => onOrderClick?.(order)}
                isInvalidDropZone={isInvalid}
                isOver={overId === status}
                selectedOrders={selectedOrders}
                bulkMode={bulkMode}
                onToggleSelection={onToggleSelection}
                currency={currency}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className={`rotate-2 scale-105 shadow-2xl ${isCurrentlyOverInvalid ? 'opacity-50' : ''}`}>
              <OrderCard 
                order={activeOrder} 
                draggable 
                className={isCurrentlyOverInvalid ? 'ring-4 ring-error-400 dark:ring-error-600' : ''}
                currency={currency}
              />
              {isCurrentlyOverInvalid && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 rounded-full bg-error-500 px-3 py-1.5 shadow-lg">
                    <FaBan className="h-3 w-3 text-white" />
                    <span className="text-xs font-bold text-white">Invalid Move</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/3">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              No Active Orders
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              All orders have been completed or cancelled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
