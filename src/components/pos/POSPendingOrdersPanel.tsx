/**
 * POS Pending Orders Panel Component
 * 
 * Side panel showing pending offline orders:
 * - List of orders queued while offline
 * - Manual sync/delete options
 * - Conflict detection (menu items changed)
 * - Orange theme consistent with POS
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  FaTimes,
  FaSync,
  FaTrash,
  FaEdit,
  FaClock,
  FaExclamationTriangle,
  FaWifi,
  FaCheck,
  FaUser,
  FaChair,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PendingOrder } from '@/hooks/useOfflineSync';

// ============================================
// TYPES
// ============================================

interface POSPendingOrdersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrders: PendingOrder[];
  isOnline: boolean;
  isSyncing: boolean;
  onSyncOrders: () => Promise<void>;
  onEditOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  currency: string;
}

// ============================================
// COMPONENT
// ============================================

export const POSPendingOrdersPanel: React.FC<POSPendingOrdersPanelProps> = ({
  isOpen,
  onClose,
  pendingOrders,
  isOnline,
  isSyncing,
  onSyncOrders,
  onEditOrder,
  onDeleteOrder,
  currency,
}) => {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (currency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }
    if (currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp${formatted}`;
    }
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return t('pos.justNow') || 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  // Count total items
  const countItems = (items: PendingOrder['items']): number => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Handle delete with confirmation
  const handleDelete = useCallback((orderId: string) => {
    setDeletingId(orderId);
  }, []);

  const confirmDelete = useCallback((orderId: string) => {
    onDeleteOrder(orderId);
    setDeletingId(null);
  }, [onDeleteOrder]);

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
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-500 dark:bg-yellow-600">
          <div className="flex items-center gap-3">
            <FaWifi className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              {t('pos.pendingOrders') || 'Pending Orders'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-sm font-medium">
              {pendingOrders.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className={`shrink-0 px-4 py-2 flex items-center justify-between text-sm ${
          isOnline 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <FaCheck className="w-3 h-3" />
                <span>{t('pos.online') || 'Online'}</span>
              </>
            ) : (
              <>
                <FaExclamationTriangle className="w-3 h-3" />
                <span>{t('pos.offline') || 'Offline'}</span>
              </>
            )}
          </div>
          {isOnline && pendingOrders.length > 0 && (
            <button
              onClick={onSyncOrders}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FaSync className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? (t('pos.syncing') || 'Syncing...') : (t('pos.syncNow') || 'Sync Now')}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <FaWifi className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">{t('pos.noPendingOrders') || 'No pending orders'}</p>
              <p className="text-xs mt-1">{t('pos.pendingOrdersHint') || 'Orders created offline will appear here'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium">
                          ⏳ {t('pos.pending') || 'Pending'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.orderType === 'DINE_IN' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {order.orderType === 'DINE_IN' ? '🍽️' : '📦'}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <FaClock className="w-3 h-3" />
                        {formatTimeAgo(order.createdAt)}
                      </span>
                    </div>
                    
                    {/* Customer/Table Info */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      {order.tableNumber && (
                        <span className="flex items-center gap-1">
                          <FaChair className="w-3 h-3" />
                          Table {order.tableNumber}
                        </span>
                      )}
                      {order.customer?.name && (
                        <span className="flex items-center gap-1">
                          <FaUser className="w-3 h-3" />
                          {order.customer.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>{countItems(order.items)} {t('pos.items') || 'items'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    {/* Item Names */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={idx}>
                          {item.quantity}x {item.menuName}
                          {idx < Math.min(2, order.items.length - 1) && ', '}
                        </span>
                      ))}
                      {order.items.length > 3 && ` +${order.items.length - 3} more`}
                    </div>

                    {/* Actions */}
                    {deletingId === order.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(order.id)}
                          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                          {t('common.confirmDelete') || 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="py-2 px-3 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t('common.cancel') || 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditOrder(order.id)}
                          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaEdit className="w-3 h-3" />
                          {t('common.edit') || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <FaTrash className="w-3 h-3" />
                          {t('common.delete') || 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('pos.pendingOrdersNote') || 'These orders will sync automatically when online'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSPendingOrdersPanel;
