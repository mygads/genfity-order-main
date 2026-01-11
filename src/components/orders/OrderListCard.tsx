/**
 * OrderListCard Component
 * 
 * Compact horizontal list view for orders
 * Used in Kanban+List and Tab+List modes
 * Professional UI - Responsive, no overflow
 */

'use client';

import React from 'react';
import { FaUser, FaUtensils, FaShoppingBag, FaClock, FaCheckSquare, FaSquare, FaCheck, FaArrowRight } from 'react-icons/fa';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { formatDistanceToNow } from 'date-fns';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';
import { useMerchant } from '@/context/MerchantContext';
import { formatFullOrderNumber, formatOrderNumberSuffix } from '@/lib/utils/format';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface OrderListCardProps {
  order: OrderListItem;
  onClick?: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  showQuickActions?: boolean;
  orderNumberDisplayMode?: OrderNumberDisplayMode;
  draggable?: boolean;
  className?: string;
}

export const OrderListCard: React.FC<OrderListCardProps> = ({
  order,
  onClick,
  bulkMode = false,
  isSelected = false,
  onToggleSelection,
  onStatusChange,
  showQuickActions = false,
  orderNumberDisplayMode = 'full',
  draggable = false,
  className = '',
}) => {
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const paymentConfig = order.payment
    ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS]
    : PAYMENT_STATUS_COLORS.PENDING;

  const { merchant } = useMerchant();
  const itemCount = order._count?.orderItems || 0;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === 0) {
      return 'Free';
    }
    // Default to AUD format
    return `A$${numAmount.toFixed(2)}`;
  };

  const timeAgo = formatDistanceToNow(new Date(order.placedAt), { addSuffix: true });
  const fullOrderNumber = formatFullOrderNumber(order.orderNumber, merchant?.code);
  const displayOrderNumber =
    orderNumberDisplayMode === 'suffix'
      ? formatOrderNumberSuffix(fullOrderNumber)
      : orderNumberDisplayMode === 'raw'
        ? (order.orderNumber ?? '')
        : fullOrderNumber;

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
        return { label: 'Start', status: 'IN_PROGRESS' as OrderStatus, color: 'bg-orange-500 hover:bg-orange-600' };
      case 'IN_PROGRESS':
        return { label: 'Ready', status: 'READY' as OrderStatus, color: 'bg-purple-500 hover:bg-purple-600' };
      case 'READY':
        return { label: 'Done', status: 'COMPLETED' as OrderStatus, color: 'bg-success-500 hover:bg-success-600' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border border-gray-200 dark:border-gray-800 
        bg-white dark:bg-gray-900
        hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700
        transition-all duration-200 overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        ${draggable ? 'cursor-move touch-none' : ''}
        ${isSelected ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-950' : ''}
        ${className}
      `}
    >
      {/* Compact Layout */}
      <div className="p-3">
        {/* Top Row: Order Number, Type, Customer */}
        <div className="flex items-center gap-2 mb-2">
          {/* Bulk Selection */}
          {bulkMode && (
            <button
              onClick={handleCheckboxClick}
              className="shrink-0 text-gray-400 hover:text-brand-500"
            >
              {isSelected ? (
                <FaCheckSquare className="h-4 w-4 text-brand-500" />
              ) : (
                <FaSquare className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Order Number with Status Color */}
          <div className={`shrink-0 px-2 py-1 rounded text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
            #{displayOrderNumber}
          </div>

          {/* Order Type */}
          <div className="shrink-0">
            {order.orderType === 'DINE_IN' ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-brand-50 dark:bg-brand-900/30">
                <FaUtensils className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                {order.tableNumber && (
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">T{order.tableNumber}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-success-50 dark:bg-success-900/30">
                <FaShoppingBag className="h-3 w-3 text-success-600 dark:text-success-400" />
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FaUser className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
              {order.customer?.name || 'Guest'}
            </span>
          </div>
        </div>

        {/* Bottom Row: Time, Items, Price, Payment, Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FaClock className="h-3 w-3" />
            <span className="whitespace-nowrap">{timeAgo}</span>
          </div>

          {/* Items Count */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            • {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>

          {/* Flex spacer */}
          <div className="flex-1" />

          {/* Price */}
          <span className="text-sm font-bold text-gray-800 dark:text-white shrink-0">
            {formatCurrency(Number(order.totalAmount))}
          </span>

          {/* Payment Status */}
          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${paymentConfig.bg} ${paymentConfig.text}`}>
            {paymentConfig.label}
          </span>

          {/* Quick Action Button */}
          {showQuickActions && nextAction && !bulkMode && (
            <button
              onClick={(e) => handleStatusChange(e, nextAction.status)}
              className={`
                shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white
                transition-all ${nextAction.color}
              `}
            >
              {order.status === 'READY' ? (
                <FaCheck className="h-3 w-3" />
              ) : null}
              <span>{nextAction.label}</span>
              {order.status !== 'READY' && (
                <FaArrowRight className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
