/**
 * OrderCard Component
 * 
 * Displays order information in a compact card format
 * Used in Kanban board, list view, and modals
 * Professional UI with React Icons FA
 */

'use client';

import React from 'react';
import { FaUser, FaPhone, FaUtensils, FaShoppingBag, FaClock, FaCheck } from 'react-icons/fa';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { formatDistanceToNow } from 'date-fns';
import type { OrderListItem, OrderWithDetails } from '@/lib/types/order';

interface OrderCardProps {
  order: OrderListItem | OrderWithDetails;
  draggable?: boolean;
  showQuickActions?: boolean;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onViewDetails?: () => void;
  className?: string;
  currency?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  draggable = false,
  showQuickActions = true,
  onClick,
  onStatusChange,
  onViewDetails,
  className = '',
  currency = 'AUD',
}) => {
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const paymentConfig = order.payment 
    ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS]
    : PAYMENT_STATUS_COLORS.PENDING;
  
  // Check if order has orderItems (OrderWithDetails) or just _count (OrderListItem)
  const hasOrderItems = 'orderItems' in order && Array.isArray(order.orderItems);
  const itemCount = hasOrderItems 
    ? order.orderItems.length 
    : ('_count' in order && (order as OrderListItem)._count?.orderItems) || 0;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const locale = currency === 'AUD' ? 'en-AU' : 
                   currency === 'USD' ? 'en-US' : 
                   currency === 'IDR' ? 'id-ID' : 'en-AU';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(numAmount);
  };

  const timeAgo = formatDistanceToNow(new Date(order.placedAt), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl border border-gray-200 dark:border-gray-800 
        bg-white dark:bg-white/3 
        p-4 shadow-sm hover:shadow-md 
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-primary-300 hover:shadow-lg dark:hover:border-primary-700' : ''}
        ${draggable ? 'cursor-move touch-none' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-800 dark:text-white/90 truncate">
              #{order.orderNumber}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <FaClock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {order.orderType === 'DINE_IN' ? (
              <FaUtensils className="h-4 w-4 text-primary-500" title="Dine In" />
            ) : (
              <FaShoppingBag className="h-4 w-4 text-success-500" title="Takeaway" />
            )}
            <span
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
                ${statusConfig.bg} ${statusConfig.text}
              `}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {order.customer && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <FaUser className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-800 dark:text-white/90 font-medium truncate">
              {order.customer.name}
            </span>
          </div>
          {order.customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <FaPhone className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">{order.customer.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Table Number (for DINE_IN) */}
      {order.orderType === 'DINE_IN' && order.tableNumber && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-gray-800 dark:text-white/90 font-medium">
              Table {order.tableNumber}
            </span>
          </div>
        </div>
      )}

      {/* Order Items Summary */}
      {hasOrderItems && (
        <div className="mb-3 space-y-1.5">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Items ({itemCount})
          </div>
          <div className="space-y-1">
            {order.orderItems!.slice(0, 2).map((item, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.quantity}× {item.menuName}
                </span>
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {formatCurrency(Number(item.subtotal))}
                </span>
              </div>
            ))}
            {order.orderItems!.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                +{order.orderItems!.length - 2} more
              </div>
            )}
          </div>
        </div>
      )}

      {!hasOrderItems && itemCount > 0 && (
        <div className="mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Payment Status */}
      <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
              ${paymentConfig.bg} ${paymentConfig.text}
            `}
          >
            {paymentConfig.label}
          </span>
          {order.payment?.paymentMethod && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {order.payment.paymentMethod.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Total Amount */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          Total
        </span>
        <span className="text-lg font-bold text-gray-800 dark:text-white/90">
          {formatCurrency(Number(order.totalAmount))}
        </span>
      </div>

      {/* Quick Actions - Show Completed button for READY status */}
      {showQuickActions && order.status === 'READY' && onStatusChange && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange('COMPLETED');
            }}
            className="w-full h-9 px-4 rounded-lg bg-success-500 text-white font-semibold text-sm hover:bg-success-600 transition-colors duration-150 flex items-center justify-center gap-2"
          >
            <FaCheck className="h-3.5 w-3.5" />
            Complete Order
          </button>
        </div>
      )}
      
      {/* View Details button for non-READY or when onStatusChange not provided */}
      {showQuickActions && onViewDetails && (order.status !== 'READY' || !onStatusChange) && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="w-full h-9 px-4 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors duration-150 flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>
      )}
    </div>
  );
};
