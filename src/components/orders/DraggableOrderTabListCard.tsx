/**
 * DraggableOrderTabListCard Component
 * 
 * Wrapper for OrderTabListCard with drag & drop functionality
 * Used in Kanban+List view
 */

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OrderTabListCard } from './OrderTabListCard';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';

interface DraggableOrderTabListCardProps {
  order: OrderListItem;
  onOrderClick: (order: OrderListItem) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  selectedOrders?: Set<string>;
  bulkMode?: boolean;
  onToggleSelection?: (orderId: string) => void;
  showQuickActions?: boolean;
}

export const DraggableOrderTabListCard: React.FC<DraggableOrderTabListCardProps> = ({
  order,
  onOrderClick,
  onStatusChange,
  selectedOrders = new Set(),
  bulkMode = false,
  onToggleSelection,
  showQuickActions = true,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(order.id),
    disabled: bulkMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedOrders.has(String(order.id));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <OrderTabListCard
        order={order}
        onClick={() => onOrderClick(order)}
        onStatusChange={onStatusChange}
        bulkMode={bulkMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        showQuickActions={showQuickActions}
      />
    </div>
  );
};
