/**
 * KitchenOrderCard Component
 * 
 * Large display card for kitchen staff
 * Shows order items to cook with large, readable text
 */

'use client';

import React from 'react';
import { ORDER_STATUS_COLORS, ORDER_TYPE_ICONS } from '@/lib/constants/orderConstants';
import { OrderTimer } from './OrderTimer';
import type { OrderListItem, OrderWithDetails } from '@/lib/types/order';

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
  const orderTypeIcon = ORDER_TYPE_ICONS[order.orderType as keyof typeof ORDER_TYPE_ICONS];
  
  // Check if order has orderItems (OrderWithDetails) or just _count (OrderListItem)
  const hasOrderItems = 'orderItems' in order && Array.isArray(order.orderItems);
  const items = hasOrderItems ? order.orderItems : [];

  return (
    <div
      className="
        rounded-2xl border-2 border-gray-200 dark:border-gray-800 
        bg-white dark:bg-white/3 
        p-6 shadow-lg
        transition-all duration-200
      "
    >
      {/* Header */}
      <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                #{order.orderNumber}
              </h2>
              <span className="text-3xl" title={order.orderType}>
                {orderTypeIcon}
              </span>
            </div>
            
            {order.tableNumber && (
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                🪑 Table: {order.tableNumber}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <OrderTimer
              startTime={order.placedAt}
              className="text-lg px-4 py-2"
            />
            
            <span
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold
                ${statusConfig.bg} ${statusConfig.text}
              `}
            >
              <span className="text-xl">{statusConfig.icon}</span>
              <span>{statusConfig.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Order Items - Large Display */}
      <div className="mb-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Items to Prepare
        </h3>
        
        {hasOrderItems && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {item.quantity}x {item.menuName}
                    </h4>
                    
                    {/* Addons */}
                    {item.addons && item.addons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.addons.map((addon, addonIdx) => (
                          <p
                            key={addonIdx}
                            className="text-lg text-gray-600 dark:text-gray-400 pl-4"
                          >
                            + {addon.addonName}
                            {addon.quantity > 1 && ` (${addon.quantity}x)`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500 text-white text-3xl font-black">
                      {item.quantity}
                    </span>
                  </div>
                </div>

                {/* Item Notes */}
                {item.notes && (
                  <div className="mt-3 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                    <p className="text-base font-semibold text-warning-800 dark:text-warning-300">
                      📝 Note: {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xl text-gray-400 dark:text-gray-600 italic">
            No items to display
          </p>
        )}
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="mb-6 p-4 bg-error-50 dark:bg-error-900/20 border-2 border-error-200 dark:border-error-800 rounded-xl">
          <p className="text-lg font-bold text-error-800 dark:text-error-300">
            ⚠️ Order Note: {order.notes}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3">
          {order.status === 'ACCEPTED' && onMarkInProgress && (
            <button
              onClick={() => onMarkInProgress(String(order.id))}
              className="
                flex-1 h-16 px-6 rounded-xl
                bg-blue-500 hover:bg-blue-600
                text-white font-bold text-xl
                transition-colors duration-150
                shadow-lg hover:shadow-xl
              "
            >
              🔥 Start Cooking
            </button>
          )}
          
          {order.status === 'IN_PROGRESS' && onMarkReady && (
            <button
              onClick={() => onMarkReady(String(order.id))}
              className="
                flex-1 h-16 px-6 rounded-xl
                bg-success-500 hover:bg-success-600
                text-white font-bold text-xl
                transition-colors duration-150
                shadow-lg hover:shadow-xl
              "
            >
              ✅ Mark as Ready
            </button>
          )}
        </div>
      )}
    </div>
  );
};
