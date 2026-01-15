/**
 * POS Cart Panel Component
 * 
 * Left side panel showing current order items
 * - Clean, professional design with brand theme
 * - Shows items, addons, quantities, prices
 * - Per-item notes display
 * - Order notes section
 * - Customer info section (optional)
 * - Total calculation display
 */

'use client';

import React from 'react';
import {
  FaTrash,
  FaMinus,
  FaPlus,
  FaEdit,
  FaStickyNote,
  FaUser,
  FaChair,
  FaShoppingBag,
  FaUtensils,
  FaTimes,
  FaSearch,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';

export interface CartAddon {
  addonItemId: number | string;
  addonName: string;
  addonPrice: number;
  quantity: number;
}

export interface CartItem {
  id: string; // Unique cart item ID (for tracking same menu with different addons)
  menuId: number | string;
  menuName: string;
  menuPrice: number;
  quantity: number;
  notes?: string;
  addons: CartAddon[];
  imageUrl?: string;
}

export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

interface POSCartPanelProps {
  items: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  isTableNumberEnabled?: boolean;
  orderNotes?: string;
  customerInfo?: CustomerInfo;
  currency: string;
  taxPercentage: number;
  serviceChargePercent: number;
  packagingFeeAmount: number;
  enableTax: boolean;
  enableServiceCharge: boolean;
  enablePackagingFee: boolean;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onEditItemNotes: (cartItemId: string) => void;
  onSetOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void;
  onSetTableNumber: () => void;
  onSetOrderNotes: () => void;
  onSetCustomerInfo: () => void;
  onLookupCustomer?: () => void;
  onClearCart: () => void;
  onPlaceOrder: () => void;
  onHoldOrder?: () => void;
  heldOrdersCount?: number;
  onShowHeldOrders?: () => void;
  isPlacingOrder?: boolean;
}

export const POSCartPanel: React.FC<POSCartPanelProps> = ({
  items,
  orderType,
  tableNumber,
  isTableNumberEnabled = true,
  orderNotes,
  customerInfo,
  currency,
  taxPercentage,
  serviceChargePercent,
  packagingFeeAmount,
  enableTax,
  enableServiceCharge,
  enablePackagingFee,
  onUpdateQuantity,
  onRemoveItem,
  onEditItemNotes,
  onSetOrderType,
  onSetTableNumber,
  onSetOrderNotes,
  onSetCustomerInfo,
  onLookupCustomer,
  onClearCart,
  onPlaceOrder,
  onHoldOrder,
  heldOrdersCount = 0,
  onShowHeldOrders,
  isPlacingOrder = false,
}) => {
  const { t, locale } = useTranslation();

  const formatMoney = (amount: number): string => formatCurrency(amount, currency, locale);

  // Calculate totals
  const subtotal = items.reduce((total, item) => {
    const itemTotal = item.menuPrice * item.quantity;
    const addonsTotal = item.addons.reduce((sum, addon) =>
      sum + (addon.addonPrice * addon.quantity), 0
    );
    return total + itemTotal + addonsTotal;
  }, 0);

  const taxAmount = enableTax ? subtotal * (taxPercentage / 100) : 0;
  const serviceChargeAmount = enableServiceCharge ? subtotal * (serviceChargePercent / 100) : 0;
  const packagingFee = (orderType === 'TAKEAWAY' && enablePackagingFee) ? packagingFeeAmount : 0;
  const total = subtotal + taxAmount + serviceChargeAmount + packagingFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('pos.currentOrder')}
          </h2>
          {/* Order type badge */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${orderType === 'DINE_IN'
              ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              : 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              }`}>
              {orderType === 'DINE_IN' ? t('pos.dineIn') : t('pos.takeaway')}
            </span>
            {isTableNumberEnabled && tableNumber && (
              <span className="px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-xs font-medium">
                {t('pos.table')} {tableNumber}
              </span>
            )}
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onSetOrderType('DINE_IN')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${orderType === 'DINE_IN'
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <FaUtensils className="w-4 h-4" />
            {t('pos.dineIn')}
          </button>
          <button
            onClick={() => onSetOrderType('TAKEAWAY')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${orderType === 'TAKEAWAY'
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <FaShoppingBag className="w-4 h-4" />
            {t('pos.takeaway')}
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          {isTableNumberEnabled ? (
            <button
              onClick={onSetTableNumber}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${tableNumber
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <FaChair className="w-3 h-3" />
              {tableNumber ? `${t('pos.table')} ${tableNumber}` : t('pos.addTable')}
            </button>
          ) : null}

          <div className={`flex-1 flex ${onLookupCustomer ? 'gap-1' : ''}`}>
            <button
              onClick={onSetCustomerInfo}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 truncate ${customerInfo?.name || customerInfo?.phone
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <FaUser className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {customerInfo?.name || customerInfo?.phone || t('pos.addCustomer')}
              </span>
            </button>
            {onLookupCustomer && (
              <button
                onClick={onLookupCustomer}
                className="w-8 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                title={t('pos.searchCustomer') || 'Search Customer'}
              >
                <FaSearch className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={onSetOrderNotes}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${orderNotes
              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <FaStickyNote className="w-3 h-3" />
            {orderNotes ? t('pos.hasNotes') : t('pos.addNotes')}
          </button>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <FaShoppingBag className="w-12 h-12 mb-3" />
            <p className="text-sm">{t('pos.emptyCart')}</p>
            <p className="text-xs mt-1">{t('pos.emptyCartHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const itemSubtotal = (item.menuPrice * item.quantity) +
                item.addons.reduce((sum, addon) => sum + (addon.addonPrice * addon.quantity), 0);

              return (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 relative"
                >
                  {/* Item number badge */}
                  <div className="absolute -left-1 -top-1 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shadow">
                    {index + 1}
                  </div>

                  <div className="flex items-start gap-3 pl-4">
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.menuName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatMoney(item.menuPrice)}
                      </p>

                      {/* Addons */}
                      {item.addons.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {item.addons.map((addon, idx) => (
                            <p key={idx} className="text-xs text-brand-600 dark:text-brand-400">
                              + {addon.addonName} {addon.addonPrice > 0 && `(${formatMoney(addon.addonPrice)})`}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5 italic">
                          {t('pos.note') || 'Note'}: {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Quantity & Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-md bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors"
                        >
                          <FaMinus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-md bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 flex items-center justify-center transition-colors"
                        >
                          <FaPlus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditItemNotes(item.id)}
                          className="w-6 h-6 rounded text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center transition-colors"
                          title={t('pos.editNotes')}
                        >
                          <FaEdit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="w-6 h-6 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                          title={t('pos.removeItem')}
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatMoney(itemSubtotal)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Totals & Actions */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        {/* Quantity summary */}
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{t('pos.quantity')}</span>
          <span>{itemCount}</span>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{t('pos.subtotal')}</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {enableTax && taxAmount > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('pos.tax')} ({taxPercentage}%)</span>
              <span>{formatMoney(taxAmount)}</span>
            </div>
          )}
          {enableServiceCharge && serviceChargeAmount > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('pos.serviceCharge')} ({serviceChargePercent}%)</span>
              <span>{formatMoney(serviceChargeAmount)}</span>
            </div>
          )}
          {packagingFee > 0 && (
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('pos.packagingFee')}</span>
              <span>{formatMoney(packagingFee)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Top Row: Clear and Hold */}
          <div className="flex gap-2">
            <button
              onClick={onClearCart}
              disabled={items.length === 0 || isPlacingOrder}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            >
              <FaTimes className="w-3 h-3" />
              {t('pos.clearCart')}
            </button>
            {onHoldOrder && (
              <button
                onClick={onHoldOrder}
                disabled={items.length === 0 || isPlacingOrder}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                <FaStickyNote className="w-3 h-3" />
                {t('pos.hold') || 'Hold'}
              </button>
            )}
          </div>

          {/* Held Orders Button */}
          {onShowHeldOrders && heldOrdersCount > 0 && (
            <button
              onClick={onShowHeldOrders}
              className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors flex items-center justify-center gap-2"
            >
              {t('pos.heldOrders') || 'Held Orders'} ({heldOrdersCount})
            </button>
          )}

          {/* Pay Button */}
          <button
            onClick={onPlaceOrder}
            disabled={items.length === 0 || isPlacingOrder}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isPlacingOrder ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('pos.placingOrder')}
              </>
            ) : (
              <>
                <span>{t('pos.createOrder') || 'Create Order'}</span>
                <span>|</span>
                <span>{formatMoney(total)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSCartPanel;
