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
import { useToast } from '@/context/ToastContext';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { canTransitionStatus } from '@/lib/utils/orderStatusRules';
import { buildOrderApiUrl, getOrderWsBaseUrl } from '@/lib/utils/orderApiBase';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface OrderKanbanListViewProps {
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
  orderNumberDisplayMode = 'full',
  filters = {},
  searchQuery = '',
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  currency: _currency = 'AUD',
  onRefreshReady,
}) => {
  const _merchantId = merchantId;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const previousDataRef = useRef<string>('');
  const { showError } = useToast();
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

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
        showError('Authentication required', 'Auth Error');
        return;
      }

      const response = await fetch(buildOrderApiUrl('/api/merchant/orders/active'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders from server');
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
        showError(result.error || 'Failed to load orders', 'Connection Error');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      showError('Error getting data from server', 'Connection Error');
    } finally {
      setLoading(false);
    }
  }, [previousOrderCount, showError]);

  // Auto-refresh effect
  useEffect(() => {
    fetchOrders();

    if (autoRefresh && !wsConnected) {
      const interval = setInterval(fetchOrders, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, wsConnected, refreshInterval, fetchOrders]);

  // WebSocket refresh (fallback to polling if WS is not available)
  useEffect(() => {
    const wsBase = getOrderWsBaseUrl();
    if (!wsBase) {
      setWsConnected(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setWsConnected(false);
      return;
    }

    const wsUrl = `${wsBase}/ws/merchant/orders?token=${encodeURIComponent(`Bearer ${token}`)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload?.type === 'orders.refresh') {
          fetchOrders();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [fetchOrders]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(fetchOrders);
    }
  }, [onRefreshReady, fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (updatingOrders.has(orderId)) return;

    const previousOrders = orders;
    setUpdatingOrders(prev => new Set(prev).add(orderId));

    // Optimistic UI
    setOrders(prev => prev.map(o => (String(o.id) === orderId ? { ...o, status: newStatus } : o)));

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(buildOrderApiUrl(`/api/merchant/orders/${orderId}/status`), {
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

      const json = await response.json();
      if (!json?.success) {
        throw new Error(json?.error || 'Failed to update order status');
      }

      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      setOrders(previousOrders);
      showError(error instanceof Error ? error.message : 'Failed to update order', 'Update Failed');
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

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

    await updateOrderStatus(orderId, newStatus);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filteredOrders = filteredOrders.filter((order) => {
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        const customerName = order.customer?.name?.toLowerCase() || '';
        const customerPhone = order.customer?.phone?.toLowerCase() || '';
        const tableNumber = order.tableNumber?.toLowerCase() || '';

        return (
          orderNumber.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          tableNumber.includes(query)
        );
      });
    }

    return filteredOrders;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          <span className="text-sm font-medium">Loading orders...</span>
        </div>
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
          flex flex-col gap-2 rounded-lg p-3 bg-white dark:bg-gray-900
          flex-1 min-h-0 overflow-y-auto
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
      <div className="h-full min-h-0 overflow-x-auto pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 min-w-350 h-full min-h-0">
          {ACTIVE_STATUSES.map((status) => {
            const statusOrders = getOrdersByStatus(status);
            const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];

            return (
              <div key={status} className="flex flex-col gap-3 min-h-0">
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
                        onOrderClick={onOrderClick || (() => { })}
                        onStatusChange={handleStatusChange}
                        bulkMode={bulkMode}
                        selectedOrders={selectedOrders}
                        onToggleSelection={onToggleSelection}
                        showQuickActions={true}
                        orderNumberDisplayMode={orderNumberDisplayMode}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOrder ? (
          <OrderTabListCard
            order={activeOrder}
            orderNumberDisplayMode={orderNumberDisplayMode}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
