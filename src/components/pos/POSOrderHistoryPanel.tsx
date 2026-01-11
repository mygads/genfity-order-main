/**
 * POS Order History Panel Component
 * 
 * Side panel showing recent orders with:
 * - List of today's orders
 * - Order status and payment info
 * - Refund/void capability with PIN verification
 * - Orange theme consistent with POS
 * - Unified receipt printing with customizable settings
 */

'use client';

import React, { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import {
  FaTimes,
  FaHistory,
  FaReceipt,
  FaUndo,
  FaSearch,
  FaChevronRight,
  FaCheck,
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaExchangeAlt,
  FaUtensils,
  FaShoppingBag,
  FaExclamationTriangle,
  FaPrint,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { DeletePinModal } from '@/components/modals/DeletePinModal';
import { printReceipt } from '@/lib/utils/unifiedReceipt';
import { ReceiptSettings, DEFAULT_RECEIPT_SETTINGS } from '@/lib/types/receiptSettings';
import { useMerchant } from '@/context/MerchantContext';
import { formatCurrency, formatFullOrderNumber } from '@/lib/utils/format';

// ============================================
// TYPES
// ============================================

interface OrderItem {
  id: string;
  menuName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
  addons?: Array<{
    addonName: string;
    addonPrice: number;
    quantity: number;
  }>;
}

interface Order {
  id: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  packagingFeeAmount: number;
  totalAmount: number;
  amountPaid?: number;
  changeAmount?: number;
  discountAmount?: number;
  createdAt: string;
  paidAt?: string;
  items: OrderItem[];
}

interface MerchantInfo {
  name: string;
  code?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  receiptSettings?: Partial<ReceiptSettings> | null;
}

interface POSOrderHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  hasDeletePin?: boolean;
  onRefundSuccess?: () => void;
  merchantInfo?: MerchantInfo;
}

// ============================================
// COMPONENT
// ============================================

export const POSOrderHistoryPanel: React.FC<POSOrderHistoryPanelProps> = ({
  isOpen,
  onClose,
  currency,
  hasDeletePin = true,
  onRefundSuccess,
  merchantInfo,
}) => {
  const { t, locale } = useTranslation();
  const { merchant } = useMerchant();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Fetch today's orders
  const fetcher = async (url: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    // Avoid "Unexpected token '<'" when the server returns an HTML error page.
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Failed to load order history (${res.status}). ${text.slice(0, 120)}`);
    }

    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `Failed to load order history (${res.status})`);
    }
    return data.data;
  };

  const { data: orders, isLoading, error } = useSWR<Order[]>(
    isOpen ? '/api/merchant/orders/pos/history?today=true' : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 30000 }
  );

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = useCallback(
    (amount: number) => formatCurrency(amount, currency, locale),
    [currency, locale]
  );

  // Filter orders by search
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.customerPhone?.includes(query) ||
      order.tableNumber?.includes(query)
    );
  }) || [];

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get payment method icon
  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'CASH_ON_COUNTER':
      case 'CASH':
        return <FaMoneyBillWave className="w-3 h-3 text-green-600" />;
      case 'CARD_ON_COUNTER':
      case 'CARD':
        return <FaCreditCard className="w-3 h-3 text-blue-600" />;
      case 'SPLIT':
        return <FaExchangeAlt className="w-3 h-3 text-purple-600" />;
      default:
        return <FaClock className="w-3 h-3 text-gray-400" />;
    }
  };

  // Handle refund/void
  const handleRefundClick = (order: Order) => {
    setRefundingOrderId(order.id);
    setShowRefundModal(true);
  };

  const handleRefundConfirm = useCallback(async (pin: string) => {
    if (!refundingOrderId) return;
    
    setIsRefunding(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/merchant/orders/pos/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: refundingOrderId,
          deletePin: pin,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Refund failed');
      }

      // Refresh orders list
      mutate('/api/merchant/orders/pos/history?today=true');
      
      // Clear selection if it was the refunded order
      if (selectedOrder?.id === refundingOrderId) {
        setSelectedOrder(null);
      }
      
      setShowRefundModal(false);
      setRefundingOrderId(null);
      onRefundSuccess?.();
    } finally {
      setIsRefunding(false);
    }
  }, [refundingOrderId, selectedOrder, onRefundSuccess]);

  // Print receipt using unified receipt generator
  const handlePrintReceipt = (order: Order) => {
    const rawSettings = (merchantInfo?.receiptSettings || {}) as Partial<ReceiptSettings>;
    const language: 'en' | 'id' =
      rawSettings.receiptLanguage === 'id' || rawSettings.receiptLanguage === 'en'
        ? rawSettings.receiptLanguage
        : locale === 'id'
          ? 'id'
          : 'en';

    // Merge receipt settings with defaults (avoid missing new fields)
    const settings: ReceiptSettings = {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...rawSettings,
      receiptLanguage: language,
      paperSize: rawSettings.paperSize === '58mm' ? '58mm' : '80mm',
    };
    
    // Print using unified receipt generator
    printReceipt({
      order: {
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        placedAt: order.createdAt,
        paidAt: order.paidAt,
        items: order.items.map(item => ({
          quantity: item.quantity,
          menuName: item.menuName,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          notes: item.notes,
          addons: item.addons?.map(addon => ({
            addonName: addon.addonName,
            addonPrice: addon.addonPrice,
          })),
        })),
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        serviceChargeAmount: order.serviceChargeAmount,
        packagingFeeAmount: order.packagingFeeAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        amountPaid: order.amountPaid,
        changeAmount: order.changeAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        cashierName: undefined, // Not available in this context
      },
      merchant: {
        name: merchantInfo?.name || '',
        code: merchantInfo?.code || merchant?.code,
        logoUrl: merchantInfo?.logoUrl,
        address: merchantInfo?.address,
        phone: merchantInfo?.phone,
        email: merchantInfo?.email,
        currency: currency,
      },
      settings,
      language,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Panel */}
        <div className="relative ml-auto w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-500 dark:bg-orange-600">
            <div className="flex items-center gap-3">
              <FaHistory className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">
                {t('pos.orderHistory') || 'Order History'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pos.searchOrders') || 'Search by order #, name, phone...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Order List / Detail View */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FaExclamationTriangle className="w-10 h-10 text-red-500 mb-3" />
                <p className="text-red-500">{t('common.errorLoading')}</p>
              </div>
            ) : selectedOrder ? (
              // Order Detail View
              <div className="p-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="mb-4 text-sm text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                >
                  ← {t('common.back') || 'Back'}
                </button>

                {/* Order Info */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                      #{formatFullOrderNumber(selectedOrder.orderNumber, merchant?.code)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      {selectedOrder.orderType === 'DINE_IN' ? (
                        <FaUtensils className="w-4 h-4" />
                      ) : (
                        <FaShoppingBag className="w-4 h-4" />
                      )}
                      <span>{selectedOrder.orderType === 'DINE_IN' ? t('pos.dineIn') : t('pos.takeaway')}</span>
                      {selectedOrder.tableNumber && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-xs">
                          {t('pos.table')} {selectedOrder.tableNumber}
                        </span>
                      )}
                    </div>
                    
                    {selectedOrder.customerName && (
                      <div>{selectedOrder.customerName}</div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(selectedOrder.paymentMethod)}
                      <span>
                        {selectedOrder.paymentStatus === 'PAID' 
                          ? (t('admin.payment.paid') || 'Paid')
                          : (t('admin.payment.unpaid') || 'Unpaid')
                        }
                      </span>
                    </div>
                    
                    <div className="text-xs">{formatTime(selectedOrder.createdAt)}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('pos.items') || 'Items'}
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.quantity}x {item.menuName}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatMoney(item.subtotal)}
                          </span>
                        </div>
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.addons.map((addon, aidx) => (
                              <p key={aidx} className="text-xs text-orange-600 dark:text-orange-400">
                                + {addon.addonName}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>{t('pos.subtotal')}</span>
                    <span>{formatMoney(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.taxAmount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>{t('pos.tax')}</span>
                      <span>{formatMoney(selectedOrder.taxAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.serviceChargeAmount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>{t('pos.serviceCharge')}</span>
                      <span>{formatMoney(selectedOrder.serviceChargeAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.packagingFeeAmount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>{t('pos.packagingFee')}</span>
                      <span>{formatMoney(selectedOrder.packagingFeeAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.discountAmount && selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>{t('pos.payment.discount') || 'Discount'}</span>
                      <span>-{formatMoney(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('pos.total')}</span>
                    <span>{formatMoney(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintReceipt(selectedOrder)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <FaPrint className="w-4 h-4" />
                    {t('pos.printReceipt') || 'Print'}
                  </button>
                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'REFUNDED' && (
                    <button
                      onClick={() => handleRefundClick(selectedOrder)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-2 transition-colors"
                    >
                      <FaUndo className="w-4 h-4" />
                      {t('pos.refund') || 'Refund/Void'}
                    </button>
                  )}
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400 dark:text-gray-500">
                <FaReceipt className="w-12 h-12 mb-3" />
                <p>{searchQuery ? (t('pos.noOrdersFound') || 'No orders found') : (t('pos.noOrdersToday') || 'No orders today')}</p>
              </div>
            ) : (
              // Order List
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white font-mono">
                          #{formatFullOrderNumber(order.orderNumber, merchant?.code)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'COMPLETED' ? (
                            <FaCheck className="w-2.5 h-2.5 inline" />
                          ) : order.status}
                        </span>
                        {getPaymentIcon(order.paymentMethod)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {order.orderType === 'DINE_IN' ? (
                          <FaUtensils className="w-3 h-3" />
                        ) : (
                          <FaShoppingBag className="w-3 h-3" />
                        )}
                        {order.tableNumber && <span>{t('pos.table')} {order.tableNumber}</span>}
                        <span>{formatTime(order.createdAt)}</span>
                        {order.customerName && <span>• {order.customerName}</span>}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatMoney(order.totalAmount)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.items.length}{' '}
                        {locale === 'id'
                          ? (t('pos.item') || 'item')
                          : order.items.length === 1
                            ? (t('pos.item') || 'item')
                            : (t('pos.itemsPlural') || 'items')}
                      </div>
                    </div>
                    
                    <FaChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                {t('pos.todayOrders') || "Today's Orders"}: <span className="font-medium text-gray-900 dark:text-white">{orders?.length || 0}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t('pos.total')}: <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatMoney(orders?.reduce((sum, o) => sum + (o.status !== 'CANCELLED' && o.status !== 'REFUNDED' ? o.totalAmount : 0), 0) || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund PIN Modal */}
      <DeletePinModal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundingOrderId(null);
        }}
        onConfirm={handleRefundConfirm}
        orderNumber={orders?.find(o => o.id === refundingOrderId)?.orderNumber}
        hasDeletePin={hasDeletePin}
      />
    </>
  );
};

export default POSOrderHistoryPanel;
