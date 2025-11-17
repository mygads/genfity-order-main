/**
 * OrderColumn Component
 * 
 * Droppable column for Kanban board
 * Displays orders grouped by status
 */

'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { DraggableOrderCard } from './DraggableOrderCard';
import type { OrderListItem } from '@/lib/types/order';

interface OrderColumnProps {
  status: string;
  orders: OrderListItem[];
  onOrderClick: (order: OrderListItem) => void;
  isInvalidDropZone?: boolean;
  isOver?: boolean;
  selectedOrders?: Set<string>;
  bulkMode?: boolean;
  onToggleSelection?: (orderId: string) => void;
}

export const OrderColumn: React.FC<OrderColumnProps> = ({
  status,
  orders,
  onOrderClick,
  isInvalidDropZone = false,
  isOver = false,
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];

  if (!statusConfig) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border p-4 min-h-[600px] bg-white dark:bg-white/3
        transition-all duration-200
        ${isInvalidDropZone 
          ? 'border-error-300 bg-error-50/30 opacity-50 cursor-not-allowed dark:border-error-700 dark:bg-error-900/10' 
          : isOver 
            ? 'border-brand-300 bg-brand-50/50 shadow-lg dark:border-brand-700 dark:bg-brand-900/10' 
            : 'border-gray-200 dark:border-gray-800'
        }
      `}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">{statusConfig.icon}</span>
          <h3 className={`font-semibold text-sm ${statusConfig.text}`}>
            {statusConfig.label}
          </h3>
          {isInvalidDropZone && (
            <span className="text-xs text-error-600 dark:text-error-400">⛔</span>
          )}
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
          {orders.length}
        </span>
      </div>

      {/* Order Cards */}
      <SortableContext 
        items={orders.map(o => String(o.id))} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {orders.map((order) => {
            const isSelected = selectedOrders.has(String(order.id));
            return (
              <div key={String(order.id)} className="relative">
                {bulkMode && (
                  <div className="absolute -left-2 -top-2 z-10">
                    <button
                      onClick={() => onToggleSelection?.(String(order.id))}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <DraggableOrderCard 
                  order={order}
                  onClick={() => onOrderClick(order)}
                />
              </div>
            );
          })}
        </div>
      </SortableContext>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3 opacity-10">{statusConfig.icon}</div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            No orders
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Drag orders here
          </p>
        </div>
      )}
    </div>
  );
};
