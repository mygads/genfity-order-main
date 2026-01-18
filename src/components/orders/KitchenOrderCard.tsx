/**
 * KitchenOrderCard Component
 * 
 * Compact display card for kitchen - matches orders page size
 * Professional UI with React Icons FA, minimal colors
 */

'use client';

import React from 'react';
import { FaUtensils, FaShoppingBag, FaChair, FaStickyNote, FaExclamationTriangle, FaFire, FaCheck, FaCalendarCheck, FaRegClock, FaUsers } from 'react-icons/fa';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { OrderTimer } from './OrderTimer';
import type { OrderListItem, OrderWithDetails } from '@/lib/types/order';
import { useMerchant } from '@/context/MerchantContext';
import { formatFullOrderNumber } from '@/lib/utils/format';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface KitchenOrderCardProps {
  order: OrderListItem | OrderWithDetails;
  onMarkReady?: (orderId: string) => void;
  onMarkInProgress?: (orderId: string) => void;
  showActions?: boolean;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  onMarkReady,
  onMarkInProgress,
  showActions = true,
}) => {
  const statusConfig = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS];
  const { merchant } = useMerchant();
  const { t } = useTranslation();
  const displayOrderNumber = formatFullOrderNumber(order.orderNumber, merchant?.code);
  const scheduledTime = (order as any).scheduledTime as string | null | undefined;
  const isScheduled = Boolean((order as any).isScheduled && scheduledTime);
  const hasAdminChanges = Boolean((order as any)?.editedAt || (order as any)?.editedByUserId);
  
  // Check if order has orderItems (OrderWithDetails) or just _count (OrderListItem)
  const hasOrderItems = 'orderItems' in order && Array.isArray(order.orderItems);
  const items = hasOrderItems ? order.orderItems : [];

  const customerNotes = String(order.notes ?? '').trim();
  const kitchenNotes = String((order as any).kitchenNotes ?? '').trim();

  const hasCustomerNotes = customerNotes.length > 0;
  const hasKitchenNotes = kitchenNotes.length > 0;
  const showCombinedNotes = hasCustomerNotes && hasKitchenNotes && customerNotes === kitchenNotes;

  return (
    <div
      className="
        rounded-xl border border-gray-200 dark:border-gray-800 
        bg-white dark:bg-white/3 
        p-4 shadow-sm hover:shadow-md
        transition-all duration-200
      "
    >
      {/* Header - Compact */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                #{displayOrderNumber}
              </h2>
              {order.reservation ? (
                <div className="flex items-center gap-1.5" title="Reservation order">
                  <FaCalendarCheck className="h-4 w-4 text-brand-600" />
                  <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    <FaUsers className="h-3 w-3" />
                    {order.reservation.partySize}
                  </span>
                </div>
              ) : order.orderType === 'DINE_IN' ? (
                <FaUtensils className="h-4 w-4 text-brand-500" title="Dine In" />
              ) : (
                <FaShoppingBag className="h-4 w-4 text-success-500" title="Takeaway" />
              )}
            </div>
            
            {(order.tableNumber || order.reservation?.tableNumber) && (
              <div className="flex items-center gap-1.5">
                <FaChair className="h-3.5 w-3.5 text-gray-500" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Table {order.tableNumber || order.reservation?.tableNumber}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <OrderTimer
              startTime={order.placedAt}
              className="text-xs px-2 py-1"
            />

            {isScheduled && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                title="Scheduled order"
              >
                <FaRegClock className="h-3 w-3" />
                <span className="font-bold">{scheduledTime}</span>
              </span>
            )}
            
            <span
              className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
                ${statusConfig.bg} ${statusConfig.text}
              `}
            >
              {statusConfig.label}
            </span>
            {hasAdminChanges && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                {t('common.changedByAdmin') || 'Changed by admin'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Order Items - Compact */}
      <div className="mb-3 space-y-2">
        {hasOrderItems && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {item.quantity}x {item.menuName}
                    </h4>
                    
                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.addons.map((addon, addonIdx) => (
                          <p
                            key={addonIdx}
                            className="text-xs text-gray-600 dark:text-gray-400 pl-2"
                          >
                            + {addon.addonName}
                            {addon.quantity > 1 && ` (${addon.quantity}x)`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">
                      {item.quantity}
                    </span>
                  </div>
                </div>

                {/* Item Notes */}
                {item.notes && (
                  <div className="mt-2 p-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded">
                    <div className="flex items-start gap-1.5">
                      <FaStickyNote className="h-3 w-3 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-warning-800 dark:text-warning-300">
                        {item.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 italic">
            No items to display
          </p>
        )}
      </div>

      {/* Notes */}
      {showCombinedNotes ? (
        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
          <div className="flex items-start gap-2">
            <FaStickyNote className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Notes</p>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 wrap-break-word">
                {customerNotes}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!showCombinedNotes && (hasCustomerNotes || hasKitchenNotes) ? (
        <div className="mb-3 space-y-2">
          {hasCustomerNotes ? (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
              <div className="flex items-start gap-2">
                <FaStickyNote className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Customer note</p>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 wrap-break-word">
                    {customerNotes}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {hasKitchenNotes ? (
            <div className="p-2 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900/40 rounded-lg">
              <div className="flex items-start gap-2">
                <FaStickyNote className="h-3.5 w-3.5 text-slate-700 dark:text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Admin note</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 wrap-break-word">
                    {kitchenNotes}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Action Buttons - Compact */}
      {showActions && (
        <div className="flex gap-2">
          {order.status === 'ACCEPTED' && onMarkInProgress && (
            <button
              onClick={() => onMarkInProgress(String(order.id))}
              className="
                flex-1 h-10 px-4 rounded-lg
                bg-brand-500 hover:bg-brand-600
                text-white font-semibold text-sm
                transition-colors duration-150
                shadow-sm hover:shadow
                flex items-center justify-center gap-2
              "
            >
              <FaFire className="h-4 w-4" />
              <span>Start Cooking</span>
            </button>
          )}
          
          {order.status === 'IN_PROGRESS' && onMarkReady && (
            <button
              onClick={() => onMarkReady(String(order.id))}
              className="
                flex-1 h-10 px-4 rounded-lg
                bg-success-500 hover:bg-success-600
                text-white font-semibold text-sm
                transition-colors duration-150
                shadow-sm hover:shadow
                flex items-center justify-center gap-2
              "
            >
              <FaCheck className="h-4 w-4" />
              <span>Mark as Ready</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
