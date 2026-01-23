/**
 * DraggableOrderCard Component
 * 
 * Wrapper around OrderCard with drag & drop functionality
 * Uses useDraggable for cross-column drag support
 */

'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { OrderCard } from './OrderCard';
import type { OrderListItem } from '@/lib/types/order';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface DraggableOrderCardProps {
  order: OrderListItem;
  onClick?: () => void;
  onStatusChange?: (newStatus: string, options?: { forceComplete?: boolean; forceMarkPaid?: boolean }) => void;
  orderNumberDisplayMode?: OrderNumberDisplayMode;
  isFirst?: boolean;
  isLast?: boolean;
  currency?: string;
}

export const DraggableOrderCard: React.FC<DraggableOrderCardProps> = ({
  order,
  onClick,
  onStatusChange,
  orderNumberDisplayMode = 'full',
  // isFirst and isLast are currently unused/kept for drag styling if needed
  isFirst: _isFirst = false,
  isLast: _isLast = false,
  currency = 'AUD',
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: String(order.id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Disable dragging if it's first status and trying to go back
  // Or if it's last status and trying to go forward
  const dragDisabled = false; // Can be extended based on business logic

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      {...attributes}
      {...listeners}
      className={`${dragDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <OrderCard
        order={order}
        draggable={!dragDisabled}
        orderNumberDisplayMode={orderNumberDisplayMode}
        onClick={onClick}
        onStatusChange={onStatusChange}
        onViewDetails={onClick}
        currency={currency}
      />
    </div>
  );
};
