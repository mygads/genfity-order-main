/**
 * Payment Status Badge Component
 * 
 * Visual badge for displaying payment status with appropriate colors.
 * Reusable across Order Management and Payment system.
 */

import React from 'react';
import { PaymentStatus } from '@prisma/client';

// ===== TYPES =====

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

// ===== STATUS CONFIGURATION =====

const STATUS_CONFIG: Record<PaymentStatus, { bg: string; text: string; label: string; icon: string }> = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    label: 'Unpaid',
    icon: '💰',
  },
  COMPLETED: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    label: 'Paid',
    icon: '✓',
  },
  FAILED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    label: 'Failed',
    icon: '❌',
  },
  REFUNDED: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Refunded',
    icon: '↩️',
  },
  CANCELLED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    label: 'Cancelled',
    icon: '🚫',
  },
};

// ===== COMPONENT =====

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className = '' }) => {
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

export default PaymentStatusBadge;
