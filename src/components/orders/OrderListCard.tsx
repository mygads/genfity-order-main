/**
 * OrderListCard Component
 * 
 * Compact horizontal list view for orders
 * Used in Kanban+List and Tab+List modes
 * Professional UI with minimal height
 * Supports drag & drop and quick actions
 */

'use client';

import React from 'react';
import { FaUser, FaUtensils, FaShoppingBag, FaClock, FaCheckSquare, FaSquare, FaCheck, FaArrowRight } from 'react-icons/fa';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { formatDistanceToNow } from 'date-fns';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';

interface OrderListCardProps {
  order: OrderListItem;
  onClick?: () => void;
  currency?: string;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  showQuickActions?: boolean;
  draggable?: boolean;
  className?: string;
}

export const OrderListCard: React.FC<OrderListCardProps> = ({
  order,
  onClick,
  currency = 'AUD',
  bulkMode = false,
  isSelected = false,
  onToggleSelection,
  onStatusChange,
  showQuickActions = false,
  draggable = false,
  className = '',
}) => {
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const paymentConfig = order.payment 
    ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS]
    : PAYMENT_STATUS_COLORS.PENDING;
  
  const itemCount = order._count?.orderItems || 0;

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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(String(order.id));
    }
  };

  const handleStatusChange = (e: React.MouseEvent, newStatus: OrderStatus) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(String(order.id), newStatus);
    }
  };

  // Determine next status action
  const getNextAction = () => {
    switch (order.status) {
      case 'PENDING':
        return { label: 'Accept', status: 'ACCEPTED' as OrderStatus, color: 'bg-blue-500 hover:bg-blue-600' };
      case 'ACCEPTED':
        return { label: 'Start Cooking', status: 'IN_PROGRESS' as OrderStatus, color: 'bg-orange-500 hover:bg-orange-600' };
      case 'IN_PROGRESS':
        return { label: 'Mark Ready', status: 'READY' as OrderStatus, color: 'bg-purple-500 hover:bg-purple-600' };
      case 'READY':
        return { label: 'Complete', status: 'COMPLETED' as OrderStatus, color: 'bg-success-500 hover:bg-success-600' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-4 px-4 py-3
        rounded-lg border border-gray-200 dark:border-gray-800 
        bg-white dark:bg-white/3 
        hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800
        transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${draggable ? 'cursor-move touch-none' : ''}
        ${isSelected ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-gray-950' : ''}
        ${className}
      `}
    >
      {/* Bulk Selection Checkbox */}
      {bulkMode && (
        <button
          onClick={handleCheckboxClick}
          className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors"
        >
          {isSelected ? (
            <FaCheckSquare className="h-5 w-5 text-brand-500" />
          ) : (
            <FaSquare className="h-5 w-5" />
          )}
        </button>
      )}

      {/* Order Number & Time */}
      <div className="flex flex-col min-w-[140px] shrink-0">
        <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
          #{order.orderNumber}
        </h4>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <FaClock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Order Type Icon */}
      <div className="shrink-0">
        {order.orderType === 'DINE_IN' ? (
          <FaUtensils className="h-4 w-4 text-brand-500" title="Dine In" />
        ) : (
          <FaShoppingBag className="h-4 w-4 text-success-500" title="Takeaway" />
        )}
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-2 min-w-[180px] flex-1">
        <FaUser className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {order.customer?.name || 'Guest'}
        </span>
      </div>

      {/* Items Count */}
      <div className="text-xs text-gray-500 dark:text-gray-400 min-w-20 text-center shrink-0">
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </div>

      {/* Total Amount */}
      <div className="text-sm font-bold text-gray-800 dark:text-white/90 min-w-[100px] text-right shrink-0">
        {formatCurrency(Number(order.totalAmount))}
      </div>

      {/* Status Badge */}
      <div className="shrink-0">
        <span
          className={`
            inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap
            ${statusConfig.bg} ${statusConfig.text}
          `}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Payment Status Badge */}
      <div className="shrink-0">
        <span
          className={`
            inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap
            ${paymentConfig.bg} ${paymentConfig.text}
          `}
        >
          {paymentConfig.label}
        </span>
      </div>

      {/* Quick Action Button */}
      {showQuickActions && nextAction && !bulkMode && (
        <div className="shrink-0">
          <button
            onClick={(e) => handleStatusChange(e, nextAction.status)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white
              transition-all duration-200 shadow-sm hover:shadow-md
              ${nextAction.color}
            `}
          >
            {order.status === 'READY' ? (
              <>
                <FaCheck className="h-3.5 w-3.5" />
                <span>{nextAction.label}</span>
              </>
            ) : (
              <>
                <span>{nextAction.label}</span>
                <FaArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
