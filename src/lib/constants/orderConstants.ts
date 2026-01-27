/**
 * Order Management Constants
 * 
 * Design system colors, styles, and configurations for Order Management System
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 4
 */

import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

// ===== ORDER STATUS COLORS & LABELS =====
export const ORDER_STATUS_COLORS = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    border: 'border-warning-300 dark:border-warning-700',
    badge: 'bg-warning-500',
    label: 'Pending',
  },
  ACCEPTED: {
    bg: 'bg-brand-100 dark:bg-brand-900/20',
    text: 'text-brand-700 dark:text-brand-400',
    border: 'border-brand-300 dark:border-brand-700',
    badge: 'bg-brand-500',
    label: 'Accepted',
  },
  IN_PROGRESS: {
    bg: 'bg-brand-100 dark:bg-brand-900/20',
    text: 'text-brand-700 dark:text-brand-400',
    border: 'border-brand-300 dark:border-brand-700',
    badge: 'bg-brand-500',
    label: 'In Progress',
  },
  READY: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    border: 'border-success-300 dark:border-success-700',
    badge: 'bg-success-500',
    label: 'Ready',
  },
  COMPLETED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700',
    badge: 'bg-gray-500',
    label: 'Completed',
  },
  CANCELLED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    border: 'border-error-300 dark:border-error-700',
    badge: 'bg-error-500',
    label: 'Cancelled',
  },
} as const satisfies Record<OrderStatus, {
  bg: string;
  text: string;
  border: string;
  badge: string;
  label: string;
}>;

// ===== PAYMENT STATUS COLORS & LABELS =====
export const PAYMENT_STATUS_COLORS = {
  PENDING: {
    bg: 'bg-warning-100 dark:bg-warning-900/20',
    text: 'text-warning-700 dark:text-warning-400',
    border: 'border-warning-300',
    label: 'Unpaid',
  },
  COMPLETED: {
    bg: 'bg-success-100 dark:bg-success-900/20',
    text: 'text-success-700 dark:text-success-400',
    border: 'border-success-300',
    label: 'Paid',
  },
  FAILED: {
    bg: 'bg-error-100 dark:bg-error-900/20',
    text: 'text-error-700 dark:text-error-400',
    border: 'border-error-300',
    label: 'Failed',
  },
  REFUNDED: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300',
    label: 'Refunded',
  },
  CANCELLED: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300',
    label: 'Cancelled',
  },
} as const satisfies Record<PaymentStatus, {
  bg: string;
  text: string;
  border: string;
  label: string;
}>;

// ===== PAYMENT METHOD LABELS =====
export const PAYMENT_METHOD_LABELS = {
  CASH_ON_COUNTER: 'Cash',
  CARD_ON_COUNTER: 'Card',
  CASH_ON_DELIVERY: 'Cash on Delivery',
  MANUAL_TRANSFER: 'Manual transfer',
  QRIS: 'QRIS',
  ONLINE: 'Online',
} as const satisfies Record<PaymentMethod, string>;

// ===== ORDER CARD STYLES =====
export const ORDER_CARD_STYLES = {
  // Card container
  card: 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-4 shadow-sm hover:shadow-md transition-shadow duration-200',
  
  // Card header
  header: 'flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-800',
  orderNumber: 'text-lg font-bold text-gray-800 dark:text-white/90',
  timestamp: 'text-xs text-gray-500 dark:text-gray-400',
  
  // Order info
  infoRow: 'flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300',
  label: 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
  value: 'text-sm font-medium text-gray-800 dark:text-white/90',
  
  // Badge
  badge: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
  
  // Buttons
  primaryButton: 'h-10 px-4 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors duration-150',
  secondaryButton: 'h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
  dangerButton: 'h-10 px-4 rounded-lg bg-error-500 text-white font-medium text-sm hover:bg-error-600 transition-colors duration-150',
} as const;

// ===== RESPONSIVE BREAKPOINTS =====
export const ORDER_BREAKPOINTS = {
  // Kanban columns
  kanban: {
    sm: '1 column',    // Mobile: stack vertically
    md: '2 columns',   // Tablet: 2 side-by-side
    lg: '3 columns',   // Desktop: 3 columns
    xl: '4+ columns',  // Large: all statuses
  },
  
  // Card size
  card: {
    minWidth: '280px',
    maxWidth: '100%',
  },
} as const;

// ===== REFRESH INTERVALS =====
export const ORDER_REFRESH_INTERVALS = {
  realtime: 5000,      // 5 seconds for active orders
  normal: 10000,       // 10 seconds for general view
  history: 30000,      // 30 seconds for history
} as const;

// ===== ORDER STATUS PRIORITY (for sorting) =====
export const ORDER_STATUS_PRIORITY: Record<OrderStatus, number> = {
  PENDING: 1,
  ACCEPTED: 2,
  IN_PROGRESS: 3,
  READY: 4,
  COMPLETED: 5,
  CANCELLED: 6,
} as const;
