/**
 * OrderKanbanListView Component
 * 
 * Kanban layout with compact list items instead of cards
 * Displays orders in columns by status with list format
 * Supports drag & drop and quick actions
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
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { FaBan } from 'react-icons/fa';
import { DraggableOrderTabListCard } from './DraggableOrderTabListCard';
import { OrderTabListCard } from './OrderTabListCard';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { canTransitionStatus } from '@/lib/utils/orderStatusRules';

interface OrderKanbanListViewProps {
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

export const OrderKanbanListView: React.FC<OrderKanbanListViewProps> = ({
  merchantId,
  autoRefresh = true,
  refreshInterval = 10000,
  enableDragDrop: _enableDragDrop = true,
  onOrderClick,
  filters = {},
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  currency = 'AUD',
  onRefreshReady,
}) => {
  const _merchantId = merchantId;
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const previousDataRef = useRef<string>('');

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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);

    if (!over) return;

    const orderId = String(active.id);
    const oldStatus = orders.find(o => String(o.id) === orderId)?.status as OrderStatus;
    const newStatus = String(over.id) as OrderStatus;

    // Check if valid transition
    if (!canTransitionStatus(oldStatus, newStatus)) {
      return;
    }

    if (oldStatus === newStatus) return;

    // Update order status via API
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
        // Refresh orders
        await fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

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

  // Filter orders by status
  const getOrdersByStatus = (status: OrderStatus) => {
    let filteredOrders = orders.filter((order) => order.status === status);

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

  const activeOrder = activeId ? orders.find(o => String(o.id) === activeId) : null;

  // Droppable Column Component
  const DroppableColumn = ({ status, children }: { status: OrderStatus; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    
    const currentOrder = activeId ? orders.find(o => String(o.id) === activeId) : null;
    const isInvalid = currentOrder ? !canTransitionStatus(currentOrder.status as OrderStatus, status) : false;

    return (
      <div
        ref={setNodeRef}
        className={`
          flex flex-col gap-2 min-h-[400px] rounded-lg p-3 bg-white dark:bg-gray-900
          transition-all duration-200 border
          ${isInvalid 
            ? 'border-2 border-dashed border-error-400 bg-error-50/50 dark:border-error-600 dark:bg-error-900/20' 
            : isOver 
              ? 'border-2 border-brand-400 bg-brand-50/70 dark:border-brand-600 dark:bg-brand-900/20' 
              : 'border-gray-200 dark:border-gray-800'
          }
        `}
      >
        {isInvalid && (
          <div className="flex items-center gap-2 rounded-md bg-error-100 px-3 py-2 dark:bg-error-900/40 mb-2">
            <FaBan className="h-3.5 w-3.5 text-error-600 dark:text-error-400" />
            <span className="text-xs font-medium text-error-700 dark:text-error-400">Cannot drop here</span>
          </div>
        )}
        {children}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ACTIVE_STATUSES.map((status) => {
          const statusOrders = getOrdersByStatus(status);
          const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];

          return (
            <div key={status} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusConfig.bg.replace('bg-opacity-10', '')}`}></div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white/90">
                    {statusConfig.label}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {statusOrders.length}
                </span>
              </div>

              {/* Droppable List Items */}
              <DroppableColumn status={status}>
                <SortableContext 
                  items={statusOrders.map(o => String(o.id))} 
                  strategy={verticalListSortingStrategy}
                >
                  {statusOrders.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-4 py-8 text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        No orders
                      </p>
                    </div>
                  ) : (
                    statusOrders.map((order) => (
                      <DraggableOrderTabListCard
                        key={order.id}
                        order={order}
                        onOrderClick={onOrderClick || (() => {})}
                        onStatusChange={handleStatusChange}
                        currency={currency}
                        bulkMode={bulkMode}
                        selectedOrders={selectedOrders}
                        onToggleSelection={onToggleSelection}
                        showQuickActions={true}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOrder ? (
          <OrderTabListCard
            order={activeOrder}
            currency={currency}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
