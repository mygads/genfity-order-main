/**
 * OrderDetailModal Component
 * 
 * Modal for viewing full order details and managing order
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { getNextPossibleStatuses } from '@/lib/utils/orderStatusRules';
import type { OrderWithDetails } from '@/lib/types/order';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrderNumberDisplay } from '@/components/payment/OrderNumberDisplay';
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

  const fetchOrderDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setOrder(data.data);
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
        name: 'GENFITY Restaurant', // TODO: Get from merchant context
        currency: 'AUD', // TODO: Get from merchant context
      },
    };

    printReceipt(receiptData);
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          </div>
        ) : order ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  Order #{order.orderNumber}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(order.placedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Order Number Display */}
            <div className="mb-6">
              <OrderNumberDisplay
                orderNumber={order.orderNumber}
                showQRCode={true}
                size="md"
              />
            </div>

            {/* Status & Payment */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Order Status
                </label>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].bg} ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].text}`}>
                    {ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].icon} {ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].label}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Payment Status
                </label>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].bg : PAYMENT_STATUS_COLORS.PENDING.bg} ${order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].text : PAYMENT_STATUS_COLORS.PENDING.text}`}>
                    {order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].icon : PAYMENT_STATUS_COLORS.PENDING.icon} {order.payment ? PAYMENT_STATUS_COLORS[order.payment.status as keyof typeof PAYMENT_STATUS_COLORS].label : PAYMENT_STATUS_COLORS.PENDING.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details (if paid) */}
            {order.payment && order.payment.status === 'COMPLETED' && (
              <div className="mb-6 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                <h3 className="text-sm font-semibold text-success-700 dark:text-success-400 mb-3 flex items-center gap-2">
                  <span>✓</span>
                  <span>Payment Completed</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Method</p>
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {order.payment.paymentMethod.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {formatCurrency(Number(order.payment.amount))}
                    </p>
                  </div>
                  {order.payment.paidAt && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Paid At</p>
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {new Date(order.payment.paidAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {order.payment.paidByUser && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Served By</p>
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {order.payment.paidByUser.name}
                      </p>
                    </div>
                  )}
                </div>
                {order.payment.notes && (
                  <div className="mt-3 pt-3 border-t border-success-200 dark:border-success-800">
                    <p className="text-gray-600 dark:text-gray-400 text-xs">Notes</p>
                    <p className="text-gray-800 dark:text-white/90 text-sm">{order.payment.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Customer Info */}
            {order.customer && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-800 dark:text-white/90">{order.customer.name}</p>
                  {order.customer.phone && <p className="text-gray-600 dark:text-gray-400">{order.customer.phone}</p>}
                  {order.customer.email && <p className="text-gray-600 dark:text-gray-400">{order.customer.email}</p>}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Items</h3>
              <div className="space-y-2">
                {order.orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {item.quantity}x {item.menuName}
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <div className="mt-1 pl-4 space-y-0.5">
                          {item.addons.map((addon, addonIdx) => (
                            <p key={addonIdx} className="text-xs text-gray-600 dark:text-gray-400">
                              + {addon.addonName} (+{formatCurrency(Number(addon.addonPrice))})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">
                      {formatCurrency(Number(item.subtotal))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="mb-6 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800 dark:text-white/90">Total</span>
                <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {formatCurrency(Number(order.totalAmount))}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Payment Actions */}
              <div className="flex gap-3">
                {(!order.payment || order.payment.status === 'PENDING') ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={updating}
                    className="flex-1 h-11 px-4 rounded-lg bg-success-500 text-white font-medium hover:bg-success-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>💰</span>
                    <span>Record Payment</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePrintReceipt}
                    className="flex-1 h-11 px-4 rounded-lg border-2 border-success-500 text-success-600 dark:text-success-400 font-medium hover:bg-success-50 dark:hover:bg-success-900/20 flex items-center justify-center gap-2"
                  >
                    <span>🖨️</span>
                    <span>Print Receipt</span>
                  </button>
                )}
              </div>

              {/* Status Update Actions */}
              {getNextPossibleStatuses(order.status as OrderStatus).length > 0 && (
                <div className="flex gap-3">
                  {getNextPossibleStatuses(order.status as OrderStatus).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={updating}
                      className="flex-1 h-11 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
                    >
                      {ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS].label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50" onClick={() => setShowPaymentModal(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-4">
                    Record Payment
                  </h3>
                  
                  {/* Quick Payment Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleRecordPayment('CASH_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="w-full h-14 px-6 rounded-lg bg-success-500 hover:bg-success-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <span className="text-2xl">💵</span>
                      <div className="text-left">
                        <p className="font-bold">Cash Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleRecordPayment('CARD_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="w-full h-14 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      <span className="text-2xl">💳</span>
                      <div className="text-left">
                        <p className="font-bold">Card Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="w-full h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            Order not found
          </div>
        )}
      </div>
    </div>
  );
};
