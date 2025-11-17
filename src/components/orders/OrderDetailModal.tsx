/**
 * OrderDetailModal Component
 * 
 * Professional redesigned modal for viewing full order details
 * - Clean, minimal color palette (gray/white dominant)
 * - React Icons FA for all icons
 * - English language throughout
 * - Inspired by reports page design system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaTimes, 
  FaUser, 
  FaPhone, 
  FaMapMarkerAlt,
  FaUtensils,
  FaShoppingBag,
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaPrint,
  FaCheck,
  FaSpinner,
} from 'react-icons/fa';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { getNextPossibleStatuses } from '@/lib/utils/orderStatusRules';
import type { OrderWithDetails } from '@/lib/types/order';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { printReceipt, type ReceiptData } from '@/lib/utils/receiptPrinter';

interface OrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [merchantCurrency, setMerchantCurrency] = useState<string>('AUD');

  const fetchOrderDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [orderResponse, merchantResponse] = await Promise.all([
        fetch(`/api/merchant/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/merchant/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      const orderData = await orderResponse.json();
      const merchantData = await merchantResponse.json();
      
      if (orderData.success) {
        setOrder(orderData.data);
      }
      if (merchantData.success && merchantData.data?.currency) {
        setMerchantCurrency(merchantData.data.currency);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId, fetchOrderDetails]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordPayment = async (paymentMethod: PaymentMethod, amount: number, notes?: string) => {
    if (!order) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethod,
          amount,
          notes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchOrderDetails();
        onUpdate?.();
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!order || !order.payment) return;

    const receiptData: ReceiptData = {
      order,
      payment: {
        method: order.payment.paymentMethod,
        amount: Number(order.payment.amount),
        paidAt: order.payment.paidAt || new Date(),
        paidByName: order.payment.paidByUser?.name,
      },
      merchant: {
        name: 'Restaurant', // Merchant name from order
        currency: merchantCurrency,
      },
    };

    printReceipt(receiptData);
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const locale = merchantCurrency === 'AUD' ? 'en-AU' : 
                   merchantCurrency === 'USD' ? 'en-US' : 
                   merchantCurrency === 'IDR' ? 'id-ID' : 'en-AU';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: merchantCurrency,
    }).format(numAmount);
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <FaSpinner className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          </div>
        ) : order ? (
          <>
            {/* Compact Header */}
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                    Order #{order.orderNumber}
                  </h2>
                  {order.orderType === 'DINE_IN' ? (
                    <div className="flex items-center gap-1.5 rounded-md bg-brand-100 px-2 py-1 dark:bg-brand-900/30">
                      <FaUtensils className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                      <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">
                        {order.tableNumber ? `Table ${order.tableNumber}` : 'Dine In'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-md bg-success-100 px-2 py-1 dark:bg-success-900/30">
                      <FaShoppingBag className="h-3 w-3 text-success-600 dark:text-success-400" />
                      <span className="text-xs font-semibold text-success-700 dark:text-success-400">Takeaway</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <FaTimes className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <FaClock className="h-3 w-3" />
                <span>{formatDateTime(order.placedAt)}</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {/* Status & Payment - Compact 2 Column Grid */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                {/* Order Status */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].bg} ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].text}`}>
                    {ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].label}
                  </span>
                </div>

                {/* Payment Status */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Payment</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].bg : PAYMENT_STATUS_COLORS.PENDING.bg} ${order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].text : PAYMENT_STATUS_COLORS.PENDING.text}`}>
                    {order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].label : PAYMENT_STATUS_COLORS.PENDING.label}
                  </span>
                </div>
              </div>

              {/* Payment Details - Compact */}
              {order.payment && order.payment.status === 'COMPLETED' && (
                <div className="mb-4 rounded-lg border border-success-200 bg-success-50/50 p-3 dark:border-success-800 dark:bg-success-900/10">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success-700 dark:text-success-400">
                    <FaCheck className="h-3 w-3" />
                    <span>Payment Completed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div>
                      <span className="text-success-600 dark:text-success-500">Method:</span>
                      <span className="ml-1 font-semibold text-gray-800 dark:text-white/90">
                        {order.payment.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-success-600 dark:text-success-500">Amount:</span>
                      <span className="ml-1 font-semibold text-gray-800 dark:text-white/90">
                        {formatCurrency(Number(order.payment.amount))}
                      </span>
                    </div>
                    {order.payment.paidByUser && (
                      <div className="col-span-2">
                        <span className="text-success-600 dark:text-success-500">Served by:</span>
                        <span className="ml-1 font-semibold text-gray-800 dark:text-white/90">
                          {order.payment.paidByUser.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Info - Compact */}
              {order.customer && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Customer</p>
                  <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 text-sm">
                      <FaUser className="h-3 w-3 text-gray-400" />
                      <span className="font-medium text-gray-800 dark:text-white/90">{order.customer.name}</span>
                    </div>
                    {order.customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaPhone className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{order.customer.phone}</span>
                      </div>
                    )}
                    {order.customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaMapMarkerAlt className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{order.customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items - Compact */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Items</p>
                <div className="space-y-1.5">
                  {order.orderItems.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {item.quantity}× {item.menuName}
                          </p>
                          {item.addons && item.addons.length > 0 && (
                            <div className="mt-1 space-y-0.5 pl-3">
                              {item.addons.map((addon, addonIdx) => (
                                <p key={addonIdx} className="text-xs text-gray-600 dark:text-gray-400">
                                  + {addon.addonName} <span className="font-medium">(+{formatCurrency(Number(addon.addonPrice))})</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="ml-3 text-sm font-bold text-gray-800 dark:text-white/90">
                          {formatCurrency(Number(item.subtotal))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total - Compact */}
              <div className="mb-4 rounded-lg border-2 border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                </div>
              </div>

              {/* Actions - Compact */}
              <div className="space-y-2">
                {/* Payment Actions */}
                {(!order.payment || order.payment.status === 'PENDING') ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={updating}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-success-500 text-sm font-semibold text-white hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaMoneyBillWave className="h-3.5 w-3.5" />
                    <span>Record Payment</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePrintReceipt}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border-2 border-success-500 bg-white text-sm font-semibold text-success-600 hover:bg-success-50 dark:bg-gray-900 dark:text-success-400 dark:hover:bg-success-900/20"
                  >
                    <FaPrint className="h-3.5 w-3.5" />
                    <span>Print Receipt</span>
                  </button>
                )}

                {/* Status Update Actions */}
                {getNextPossibleStatuses(order.status as OrderStatus).length > 0 && (
                  <div className="flex gap-2">
                    {getNextPossibleStatuses(order.status as OrderStatus).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={updating}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updating ? (
                          <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS].label
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Modal - Compact */}
            {showPaymentModal && (
              <div 
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4" 
                onClick={() => setShowPaymentModal(false)}
              >
                <div 
                  className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="mb-3 text-lg font-bold text-gray-800 dark:text-white/90">
                    Record Payment
                  </h3>
                  
                  {/* Quick Payment Buttons - Compact */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleRecordPayment('CASH_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-success-500 text-sm font-semibold text-white hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaMoneyBillWave className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-bold">Cash Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleRecordPayment('CARD_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaCreditCard className="h-4 w-4" />
                      <div className="text-left">
                        <p className="font-bold">Card Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="h-9 w-full rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center p-12">
            <p className="text-center text-gray-600 dark:text-gray-400">Order not found</p>
          </div>
        )}
      </div>
    </div>
  );
};
