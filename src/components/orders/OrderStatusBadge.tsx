/**
 * Order Status Badge Component
 * 
 * Visual badge for displaying order status with appropriate colors.
 * Reusable across Order Management system.
 */

import React from 'react';
import { OrderStatus } from '@prisma/client';

// ===== TYPES =====

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

// ===== STATUS CONFIGURATION =====

const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; label: string; icon: string }> = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    label: 'Pending',
    icon: '⏳',
  },
  ACCEPTED: {
    bg: 'bg-brand-100 dark:bg-brand-900/20',
    text: 'text-brand-700 dark:text-brand-400',
    label: 'Accepted',
    icon: '✓',
  },
  IN_PROGRESS: {
    bg: 'bg-brand-100 dark:bg-brand-900/20',
    text: 'text-brand-700 dark:text-brand-400',
    label: 'In Progress',
    icon: '🔥',
  },
  READY: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    label: 'Ready',
    icon: '✅',
  },
  COMPLETED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    label: 'Completed',
    icon: '📦',
  },
  CANCELLED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    label: 'Cancelled',
    icon: '❌',
  },
};

// ===== COMPONENT =====

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;

