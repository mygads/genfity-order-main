/**
 * OrderTabListCard Component
 * 
 * Vertical layout card specifically for Tab List view
 * Order number, table, and customer stacked vertically
 */

'use client';

import React from 'react';
import { FaUser, FaUtensils, FaShoppingBag, FaTruck, FaClock, FaCheckSquare, FaSquare, FaCheck, FaArrowRight, FaCalendarCheck, FaUsers } from 'react-icons/fa';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { formatDistanceToNow } from 'date-fns';
import type { OrderListItem } from '@/lib/types/order';
import { OrderStatus } from '@prisma/client';
import { useMerchant } from '@/context/MerchantContext';
import { formatFullOrderNumber, formatOrderNumberSuffix } from '@/lib/utils/format';
import DriverQuickAssign from '@/components/orders/DriverQuickAssign';

type OrderNumberDisplayMode = 'full' | 'suffix' | 'raw';

interface OrderTabListCardProps {
  order: OrderListItem;
  onClick?: () => void;
  bulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  showQuickActions?: boolean;
  orderNumberDisplayMode?: OrderNumberDisplayMode;
}

export const OrderTabListCard: React.FC<OrderTabListCardProps> = ({
  order,
  onClick,
  bulkMode = false,
  isSelected = false,
  onToggleSelection,
  onStatusChange,
  showQuickActions = false,
  orderNumberDisplayMode = 'full',
}) => {
  const { merchant } = useMerchant();
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const paymentConfig = order.payment
    ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS]
    : PAYMENT_STATUS_COLORS.PENDING;

  const itemCount = order._count?.orderItems || 0;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === 0) {
      return 'Free';
    }

    const currency = merchant?.currency || 'AUD';
    const intlLocale = currency === 'IDR' ? 'id-ID' : 'en-AU';
    const maximumFractionDigits = currency === 'IDR' ? 0 : 2;
    const minimumFractionDigits = currency === 'IDR' ? 0 : 2;

    try {
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency,
        maximumFractionDigits,
        minimumFractionDigits,
      }).format(numAmount);
    } catch {
      return `${currency} ${numAmount.toFixed(maximumFractionDigits)}`;
    }
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
        return { label: 'Accept', status: 'ACCEPTED' as OrderStatus, color: 'bg-brand-500 hover:bg-brand-600' };
      case 'ACCEPTED':
        return { label: 'Start', status: 'IN_PROGRESS' as OrderStatus, color: 'bg-brand-500 hover:bg-brand-600' };
      case 'IN_PROGRESS':
        return { label: 'Ready', status: 'READY' as OrderStatus, color: 'bg-brand-500 hover:bg-brand-600' };
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
        ${isSelected ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-950' : ''}
      `}
    >
      <div className="p-3">
        {/* Top Section: Vertical Stack */}
        <div className="flex items-start gap-2 mb-3">
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

          {/* Vertical Stack: Order Number, Table, Customer */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Order Number with Status */}
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${statusConfig.bg} ${statusConfig.text}`}>
                #{displayOrderNumber}
              </div>
            </div>

            {/* Table Number or Takeaway */}
            {order.reservation ? (
              <div className="flex items-center gap-1.5" title="Reservation order">
                <FaCalendarCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                  <FaUsers className="h-3.5 w-3.5" />
                  {order.reservation.partySize}
                </span>
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                  Table {order.tableNumber || order.reservation.tableNumber || '-'}
                </span>
              </div>
            ) : order.orderType === 'DINE_IN' ? (
              <div className="flex items-center gap-1.5">
                <FaUtensils className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">Table {order.tableNumber || '-'}</span>
              </div>
            ) : order.orderType === 'DELIVERY' ? (
              <div className="flex items-center gap-1.5">
                <FaTruck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">Delivery</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <FaShoppingBag className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
                <span className="text-sm font-semibold text-success-700 dark:text-success-300">Takeaway</span>
              </div>
            )}

            {/* Customer Name */}
            <div className="flex items-center gap-1.5">
              <FaUser className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {order.customer?.name || 'Guest'}
              </span>
            </div>

            {showQuickActions && !bulkMode && order.orderType === 'DELIVERY' ? (
              <div onClick={(e) => e.stopPropagation()}>
                <DriverQuickAssign
                  orderId={String(order.id)}
                  currentDriverId={order.deliveryDriver?.id ? String(order.deliveryDriver.id) : ''}
                />
              </div>
            ) : null}
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
