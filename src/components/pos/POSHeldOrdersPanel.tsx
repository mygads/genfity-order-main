/**
 * POS Held Orders Panel Component
 * 
 * Side panel showing held (saved) orders:
 * - List of held orders with customer/table info
 * - Recall order to current cart
 * - Delete held order
 * - Shows time since hold
 * - Orange theme consistent with POS
 */

'use client';

import React from 'react';
import {
  FaTimes,
  FaPlay,
  FaTrash,
  FaClock,
  FaUser,
  FaChair,
  FaShoppingCart,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';

// ============================================
// TYPES
// ============================================

interface CartAddon {
  addonItemId: number | string;
  addonName: string;
  addonPrice: number;
  quantity: number;
}

interface CartItem {
  id: string;
  menuId: number | string;
  menuName: string;
  menuPrice: number;
  quantity: number;
  notes?: string;
  addons: CartAddon[];
  imageUrl?: string;
}

interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export interface HeldOrder {
  id: string;
  createdAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  notes?: string;
  customerInfo?: CustomerInfo;
  items: CartItem[];
  name?: string;
}

interface POSHeldOrdersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onRecallOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  currency: string;
}

// ============================================
// COMPONENT
// ============================================

export const POSHeldOrdersPanel: React.FC<POSHeldOrdersPanelProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onRecallOrder,
  onDeleteOrder,
  currency,
}) => {
  const { t, locale } = useTranslation();

  const formatMoney = (amount: number): string => formatCurrency(amount, currency, locale);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return t('common.time.justNow') || t('pos.justNow') || 'Just now';
    if (diffMins < 60) return (t('common.time.minutesAgo', { count: diffMins }) || `${diffMins}m ago`);
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return (t('common.time.hoursAgo', { count: diffHours }) || `${diffHours}h ago`);
    
    return date.toLocaleDateString();
  };

  // Calculate order total
  const calculateOrderTotal = (items: CartItem[]): number => {
    return items.reduce((total, item) => {
      const itemTotal = item.menuPrice * item.quantity;
      const addonsTotal = item.addons.reduce((sum, addon) => 
        sum + (addon.addonPrice * addon.quantity), 0
      );
      return total + itemTotal + addonsTotal;
    }, 0);
  };

  // Count total items
  const countItems = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-500 dark:bg-orange-600">
          <div className="flex items-center gap-3">
            <FaShoppingCart className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              {t('pos.heldOrders') || 'Held Orders'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-sm font-medium">
              {heldOrders.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {heldOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <FaShoppingCart className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">{t('pos.noHeldOrders') || 'No held orders'}</p>
              <p className="text-xs mt-1">{t('pos.holdOrderHint') || 'Use "Hold" to save orders for later'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.orderType === 'DINE_IN' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {order.orderType === 'DINE_IN'
                            ? `🍽️ ${t('pos.dineIn') || 'Dine In'}`
                            : `📦 ${t('pos.takeaway') || 'Takeaway'}`}
                        </span>
                        {order.tableNumber && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <FaChair className="w-3 h-3" />
                            {t('pos.table')} {order.tableNumber}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <FaClock className="w-3 h-3" />
                        {formatTimeAgo(order.createdAt)}
                      </span>
                    </div>
                    
                    {/* Customer/Order Name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {order.customerInfo?.name ? (
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <FaUser className="w-3 h-3" />
                            {order.customerInfo.name}
                          </span>
                        ) : order.name ? (
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {order.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>
                        {countItems(order.items)}{' '}
                        {locale === 'id'
                          ? (t('pos.item') || 'item')
                          : countItems(order.items) === 1
                            ? (t('pos.item') || 'item')
                            : (t('pos.itemsPlural') || 'items')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatMoney(calculateOrderTotal(order.items))}
                      </span>
                    </div>

                    {/* Item Names */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={item.id}>
                          {item.quantity}x {item.menuName}
                          {idx < Math.min(2, order.items.length - 1) && ', '}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <>
                          {' '}
                          {t('pos.moreItems', { count: order.items.length - 3 }) || `+${order.items.length - 3} more`}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRecallOrder(order.id)}
                        className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <FaPlay className="w-3 h-3" />
                        {t('pos.recall') || 'Recall'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t('pos.confirmDeleteHeldOrder') || 'Delete this held order?')) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('pos.heldOrdersExpiry') || 'Held orders expire after 24 hours'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSHeldOrdersPanel;
