/**
 * OrderKanbanBoard Component
 * 
 * Main Kanban board with drag & drop functionality
 * Real-time order updates using SWR for caching & auto-refresh
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import useSWR from 'swr';
import { OrderColumn } from './OrderColumn';
import { OrderCard } from './OrderCard';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { canTransitionStatus } from '@/lib/utils/orderStatusRules';
import { shouldConfirmUnpaidBeforeComplete, shouldConfirmUnpaidBeforeInProgress } from '@/lib/utils/orderPaymentRules';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface OrderKanbanBoardProps {
  merchantId: bigint;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableDragDrop?: boolean;
  onOrderClick?: (order: OrderListItem) => void;
  orderNumberDisplayMode?: OrderNumberDisplayMode;
  filters?: {
    orderType?: OrderType | 'ALL';
    paymentStatus?: PaymentStatus | 'ALL';
    dateFrom?: string;
    dateTo?: string;
  };
  searchQuery?: string;
  selectedOrders?: Set<string>;
  bulkMode?: boolean;
  onToggleSelection?: (orderId: string) => void;
  onSelectAllInColumn?: (status: string, orderIds: string[]) => void;
  onDeselectAllInColumn?: (orderIds: string[]) => void;
  currency?: string;
  onRefreshReady?: (refreshFn: () => void) => void;
}

const BOARD_STATUSES: OrderStatus[] = [
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
  orderNumberDisplayMode = 'full',
  filters = {},
  searchQuery = '',
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  onSelectAllInColumn,
  onDeselectAllInColumn,
  currency = 'AUD',
  onRefreshReady,
}) => {
  // merchantId is for future use when implementing merchant-specific filtering
  const _merchantId = merchantId;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showUnpaidConfirm, setShowUnpaidConfirm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; newStatus: OrderStatus } | null>(null);
  const [showUnpaidCompleteConfirm, setShowUnpaidCompleteConfirm] = useState(false);
  const [pendingCompleteStatusChange, setPendingCompleteStatusChange] = useState<{ orderId: string; newStatus: OrderStatus } | null>(null);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set()); // Track orders being updated
  const previousOrderCountRef = useRef(0);
  const { showError, showSuccess } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // SWR fetcher with auth
  const fetcher = async (url: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch orders from server');
    }

    return res.json();
  };

  // Use SWR for automatic caching, revalidation, and polling
  const { data, error, isLoading, mutate } = useSWR(
    '/api/merchant/orders/active',
    fetcher,
    {
      refreshInterval: autoRefresh ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      shouldRetryOnError: true,
      errorRetryCount: Infinity,
      errorRetryInterval: 5000,
      onSuccess: (data) => {
        if (data.success) {
          const newOrders = data.data;
          // Detect new orders and play sound
          if (previousOrderCountRef.current > 0 && newOrders.length > previousOrderCountRef.current) {
            const newOrdersCount = newOrders.length - previousOrderCountRef.current;
            console.log(`[OrderKanbanBoard] Detected ${newOrdersCount} new order(s)`);
            playNotificationSound('newOrder');
          }
          previousOrderCountRef.current = newOrders.length;
        }
      },
    }
  );

  // Extract orders from SWR data
  const orders: OrderListItem[] = data?.success ? data.data : [];
  const loading = isLoading && !data; // Only show loading on initial load

  // Show error toast when fetch fails
  useEffect(() => {
    if (error && !loading) {
      showError('Error getting data from server', 'Connection Error');
    }
  }, [error, loading, showError]);

  // Fetch function for backwards compatibility
  const fetchOrders = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchOrders);
    }
  }, [onRefreshReady, fetchOrders]);

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
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      const orderNumber = order.orderNumber?.toLowerCase() || '';
      const customerName = order.customer?.name?.toLowerCase() || '';
      const customerPhone = order.customer?.phone?.toLowerCase() || '';
      const tableNumber = order.tableNumber?.toLowerCase() || '';

      const matchesSearch =
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        tableNumber.includes(query);

      if (!matchesSearch) {
        return false;
      }
    }
    return true;
  });

  // Group orders by status
  const ordersByStatus = BOARD_STATUSES.reduce((acc, status) => {
    acc[status] = filteredOrders.filter(order => order.status === status);
    return acc;
  }, {} as Record<OrderStatus, OrderListItem[]>);

  // Check if drop is valid using proper transition rules
  const isValidDrop = (orderId: string, targetStatus: OrderStatus): boolean => {
    const order = orders.find(o => String(o.id) === orderId);
    if (!order) return false;

    // If dropping in the same column (not actually moving), allow it
    if (order.status === targetStatus) return true;

    // Use business logic from orderStatusRules for actual status changes
    return canTransitionStatus(order.status, targetStatus);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // Handle drag over - for visual feedback
  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    // Only set overId if it's a valid status column
    if (overId && BOARD_STATUSES.includes(overId as OrderStatus)) {
      setOverId(overId);
    } else {
      setOverId(null);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || !enableDragDrop) return;

    const orderId = String(active.id);
    let targetStatus = String(over.id);

    // Check if the target is a valid status column
    // If not, it might be another order card - in that case, find the column it belongs to
    if (!BOARD_STATUSES.includes(targetStatus as OrderStatus)) {
      // The drop target is an order card, find which column it belongs to
      const targetOrder = orders.find(o => String(o.id) === targetStatus);
      if (targetOrder) {
        targetStatus = targetOrder.status;
      } else {
        console.warn('Invalid drop target:', targetStatus);
        return;
      }
    }

    const newStatus = targetStatus as OrderStatus;

    // Find the order
    const order = orders.find(o => String(o.id) === orderId);
    if (!order || order.status === newStatus) return;

    // Prevent invalid status transitions
    if (!isValidDrop(orderId, newStatus)) {
      console.warn(`Invalid status transition: ${order.status} → ${newStatus}`);
      return;
    }

    // Check if dragging from ACCEPTED to IN_PROGRESS with unpaid order
    if (
      order.status === 'ACCEPTED' &&
      newStatus === 'IN_PROGRESS' &&
      shouldConfirmUnpaidBeforeInProgress(order)
    ) {
      setPendingStatusChange({ orderId, newStatus });
      setShowUnpaidConfirm(true);
      return;
    }

    // Check if dragging from READY to COMPLETED with unpaid order
    if (
      order.status === 'READY' &&
      newStatus === 'COMPLETED' &&
      shouldConfirmUnpaidBeforeComplete(order)
    ) {
      setPendingCompleteStatusChange({ orderId, newStatus });
      setShowUnpaidCompleteConfirm(true);
      return;
    }

    await updateOrderStatus(orderId, newStatus);
  };

  // Handle status change from button click
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const targetStatus = newStatus as OrderStatus;

    const order = orders.find(o => String(o.id) === orderId);
    if (order && order.status === 'READY' && targetStatus === 'COMPLETED' && shouldConfirmUnpaidBeforeComplete(order)) {
      setPendingCompleteStatusChange({ orderId, newStatus: targetStatus });
      setShowUnpaidCompleteConfirm(true);
      return;
    }

    await updateOrderStatus(orderId, targetStatus);
  };

  // Common function to update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    // ✅ Prevent double-click / fast-click race conditions
    if (updatingOrders.has(orderId)) {
      console.log(`[OrderKanbanBoard] Order ${orderId} is already being updated, skipping...`);
      return;
    }

    // Mark order as being updated
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    try {
      // Save current scroll positions for all columns
      const scrollPositions = new Map<Element, { scrollTop: number; scrollLeft: number }>();

      // Save scroll position of main container and all column containers
      const mainContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
      if (mainContainer && mainContainer.parentElement) {
        scrollPositions.set(mainContainer.parentElement, {
          scrollTop: mainContainer.parentElement.scrollTop,
          scrollLeft: mainContainer.parentElement.scrollLeft,
        });
      }

      // Save scroll positions of all order list containers within columns
      const columnContainers = document.querySelectorAll('.space-y-3');
      columnContainers.forEach(container => {
        if (container.parentElement) {
          scrollPositions.set(container.parentElement, {
            scrollTop: container.parentElement.scrollTop,
            scrollLeft: container.parentElement.scrollLeft,
          });
        }
      });

      // Optimistic update using SWR mutate
      const currentData = data;

      // Update local data optimistically
      mutate(
        {
          ...currentData,
          data: orders.map(o =>
            String(o.id) === orderId ? { ...o, status: newStatus } : o
          ),
        },
        false // Don't revalidate immediately
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

        const responseData = await response.json();

        if (!response.ok || !responseData.success) {
          console.error('Order status update failed:', {
            status: response.status,
            error: responseData.error,
            orderId,
            newStatus,
          });
          throw new Error(responseData.error || 'Failed to update order status');
        }

        // Refresh to get latest data from server
        await mutate();

        // Show success toast with status label
        const statusLabels: Record<OrderStatus, string> = {
          PENDING: 'Pending',
          ACCEPTED: 'Accepted',
          IN_PROGRESS: 'In Progress',
          READY: 'Ready',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
        };
        showSuccess(`Order status updated to ${statusLabels[newStatus]}`, 'Success');

        // Restore scroll positions after DOM updates
        setTimeout(() => {
          scrollPositions.forEach((position, container) => {
            container.scrollTop = position.scrollTop;
            container.scrollLeft = position.scrollLeft;
          });
        }, 0);
      } catch (err) {
        console.error('Error updating order status:', err);
        // Revert optimistic update by refetching
        await mutate();

        // Restore scroll positions after revert
        setTimeout(() => {
          scrollPositions.forEach((position, container) => {
            container.scrollTop = position.scrollTop;
            container.scrollLeft = position.scrollLeft;
          });
        }, 0);

        showError(err instanceof Error ? err.message : 'Failed to update order', 'Update Failed');
      }
    } finally {
      // ✅ Remove order from updating set
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full min-h-0 overflow-x-auto pb-2">
          <div className="grid grid-cols-1 gap-4 h-full min-h-0 md:grid-cols-2 lg:grid-cols-4 min-w-full">
            {BOARD_STATUSES.map(status => {
              const isInvalid = !!(activeId && !isValidDrop(activeId, status));
              return (
                <OrderColumn
                  key={status}
                  status={status}
                  orders={ordersByStatus[status] || []}
                  onOrderClick={(order) => onOrderClick?.(order)}
                  onStatusChange={handleStatusChange}
                  orderNumberDisplayMode={orderNumberDisplayMode}
                  isInvalidDropZone={isInvalid}
                  isOver={overId === status}
                  selectedOrders={selectedOrders}
                  bulkMode={bulkMode}
                  onToggleSelection={onToggleSelection}
                  onSelectAllInColumn={onSelectAllInColumn}
                  onDeselectAllInColumn={onDeselectAllInColumn}
                  currency={currency}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className={`relative rotate-2 scale-105 shadow-2xl ${isCurrentlyOverInvalid ? 'opacity-50' : ''}`}>
              {/* Stacked cards effect for bulk selection */}
              {bulkMode && selectedOrders.size > 1 && selectedOrders.has(String(activeOrder.id)) && (
                <>
                  {/* Background cards to show stack effect */}
                  <div className="absolute -top-1 -left-1 h-full w-full rounded-xl border border-gray-200 bg-white shadow-lg rotate-[-4deg] dark:border-gray-700 dark:bg-gray-800" />
                  {selectedOrders.size > 2 && (
                    <div className="absolute -top-2 -left-2 h-full w-full rounded-xl border border-gray-200 bg-white shadow-md rotate-[-8deg] dark:border-gray-700 dark:bg-gray-800" />
                  )}
                </>
              )}

              {/* Main dragged card */}
              <div className="relative">
                <OrderCard
                  order={activeOrder}
                  draggable
                  orderNumberDisplayMode={orderNumberDisplayMode}
                  className={isCurrentlyOverInvalid ? 'ring-4 ring-error-400 dark:ring-error-600' : ''}
                  currency={currency}
                />
              </div>

              {/* Bulk count badge */}
              {bulkMode && selectedOrders.size > 1 && selectedOrders.has(String(activeOrder.id)) && (
                <div className="absolute -top-3 -right-3 z-20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg ring-2 ring-white dark:ring-gray-900">
                    <span className="text-sm font-bold">{selectedOrders.size}</span>
                  </div>
                </div>
              )}

              {/* Invalid drop indicator */}
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

      {/* Unpaid Order Confirmation Modal for Drag & Drop */}
      <ConfirmationModal
        isOpen={showUnpaidConfirm}
        onClose={() => {
          setShowUnpaidConfirm(false);
          setPendingStatusChange(null);
        }}
        onConfirm={() => {
          if (pendingStatusChange) {
            updateOrderStatus(pendingStatusChange.orderId, pendingStatusChange.newStatus);
            setPendingStatusChange(null);
          }
        }}
        title="Unpaid Order"
        message="This order has not been paid yet. Do you want to continue marking it as In Progress?"
        confirmText="Continue Anyway"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Unpaid Complete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnpaidCompleteConfirm}
        onClose={() => {
          setShowUnpaidCompleteConfirm(false);
          setPendingCompleteStatusChange(null);
        }}
        onConfirm={() => {
          if (pendingCompleteStatusChange) {
            updateOrderStatus(pendingCompleteStatusChange.orderId, pendingCompleteStatusChange.newStatus);
            setPendingCompleteStatusChange(null);
          }
        }}
        title="Unpaid Order"
        message="This order is not marked as paid yet. Completing it will mark the payment as paid. Continue?"
        confirmText="Complete & Mark Paid"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};
