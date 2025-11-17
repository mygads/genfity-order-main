/**
 * DraggableOrderCard Component
 * 
 * Wrapper around OrderCard with drag & drop functionality
 */

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OrderCard } from './OrderCard';
import type { OrderListItem } from '@/lib/types/order';

interface DraggableOrderCardProps {
  order: OrderListItem;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  currency?: string;
}

export const DraggableOrderCard: React.FC<DraggableOrderCardProps> = ({
  order,
  onClick,
  onStatusChange,
  isFirst = false,
  isLast = false,
  currency = 'AUD',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(order.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Disable dragging if it's first status and trying to go back
  // Or if it's last status and trying to go forward
  const dragDisabled = false; // Can be extended based on business logic

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={dragDisabled ? 'opacity-50 cursor-not-allowed' : ''}
    >
      <OrderCard 
        order={order}
        draggable={!dragDisabled}
        onClick={onClick}
        onStatusChange={onStatusChange}
        onViewDetails={onClick}
        currency={currency}
      />
    </div>
  );
};
