/**
 * OrderColumn Component
 * 
 * Droppable column for Kanban board
 * Displays orders grouped by status
 * Professional UI with enhanced drag validation
 */

'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { FaBan, FaCheckSquare, FaSquare, FaMinusSquare } from 'react-icons/fa';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { DraggableOrderCard } from './DraggableOrderCard';
import type { OrderListItem } from '@/lib/types/order';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface OrderColumnProps {
  status: string;
  orders: OrderListItem[];
  onOrderClick: (order: OrderListItem) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  orderNumberDisplayMode?: OrderNumberDisplayMode;
  isInvalidDropZone?: boolean;
  isOver?: boolean;
  selectedOrders?: Set<string>;
  bulkMode?: boolean;
  onToggleSelection?: (orderId: string) => void;
  onSelectAllInColumn?: (status: string, orderIds: string[]) => void;
  onDeselectAllInColumn?: (orderIds: string[]) => void;
  currency?: string;
}

export const OrderColumn: React.FC<OrderColumnProps> = ({
  status,
  orders,
  onOrderClick,
  onStatusChange,
  orderNumberDisplayMode = 'full',
  isInvalidDropZone = false,
  isOver = false,
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  onSelectAllInColumn,
  onDeselectAllInColumn,
  currency = 'AUD',
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusConfig = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS];

  if (!statusConfig) {
    return null;
  }

  // Calculate selection state for this column
  const orderIds = orders.map(o => String(o.id));
  const selectedInColumn = orderIds.filter(id => selectedOrders.has(id));
  const allSelected = orders.length > 0 && selectedInColumn.length === orders.length;
  const someSelected = selectedInColumn.length > 0 && selectedInColumn.length < orders.length;

  const handleSelectAllToggle = () => {
    if (allSelected) {
      // Deselect all in this column
      onDeselectAllInColumn?.(orderIds);
    } else {
      // Select all in this column
      onSelectAllInColumn?.(status, orderIds);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border p-4 bg-white dark:bg-white/3
        h-full min-h-0 flex flex-col
        transition-all duration-200
        ${isInvalidDropZone 
          ? 'border-2 border-error-400 bg-error-50/50 dark:border-error-600 dark:bg-error-900/20 cursor-not-allowed animate-pulse' 
          : isOver 
            ? 'border-2 border-primary-400 bg-primary-50/70 shadow-xl ring-2 ring-primary-200 dark:border-primary-600 dark:bg-primary-900/20 dark:ring-primary-800' 
            : 'border border-gray-200 dark:border-gray-800'
        }
      `}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          {/* Select All Checkbox (only in bulk mode with orders) */}
          {bulkMode && orders.length > 0 && (
            <button
              onClick={handleSelectAllToggle}
              className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
                allSelected
                  ? 'text-primary-500'
                  : someSelected
                    ? 'text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={allSelected ? 'Deselect all' : 'Select all'}
            >
              {allSelected ? (
                <FaCheckSquare className="h-4 w-4" />
              ) : someSelected ? (
                <FaMinusSquare className="h-4 w-4" />
              ) : (
                <FaSquare className="h-4 w-4" />
              )}
            </button>
          )}
          <h3 className={`font-semibold text-sm ${statusConfig.text}`}>
            {statusConfig.label}
          </h3>
          {isInvalidDropZone && (
            <div className="flex items-center gap-1.5 rounded-md bg-error-100 px-2 py-1 dark:bg-error-900/40">
              <FaBan className="h-3 w-3 text-error-600 dark:text-error-400" />
              <span className="text-xs font-medium text-error-700 dark:text-error-400">Cannot drop here</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Show selection count in bulk mode */}
          {bulkMode && selectedInColumn.length > 0 && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {selectedInColumn.length} selected
            </span>
          )}
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Order Cards */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
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
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
                onStatusChange={(newStatus: string) => onStatusChange?.(String(order.id), newStatus)}
                orderNumberDisplayMode={orderNumberDisplayMode}
                currency={currency}
              />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-6 w-6 rounded-full ${statusConfig.bg}`}></div>
          </div>
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
            No orders
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            {isInvalidDropZone ? 'Cannot drop here' : 'Drag orders here'}
          </p>
        </div>
      )}
    </div>
  );
};
