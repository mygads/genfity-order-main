/**
 * OrderDetailModal Component
 * 
 * Clean, professional, minimal modal for viewing full order details
 * - Gray/white dominant palette
 * - React Icons FA for all icons
 * - Minimal use of colors - only for status indicators
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaUtensils,
  FaShoppingBag,
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaPrint,
  FaCheck,
  FaSpinner,
  FaChevronDown,
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
  initialOrder?: OrderWithDetails | null;
  currency?: string;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onUpdate,
  initialOrder = null,
  currency,
}) => {
  const [order, setOrder] = useState<OrderWithDetails | null>(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [merchantCurrency, setMerchantCurrency] = useState<string>('AUD');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

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
      // Check if initialOrder has orderItems (is OrderWithDetails, not OrderListItem)
      const hasOrderItems = initialOrder && 'orderItems' in initialOrder && Array.isArray(initialOrder.orderItems);

      if (hasOrderItems) {
        // Use initialOrder directly without fetching
        setOrder(initialOrder as OrderWithDetails);
        setLoading(false);
        // Still fetch merchant currency if not provided
        if (!currency) {
          const token = localStorage.getItem('accessToken');
          fetch('/api/merchant/profile', {
            headers: { 'Authorization': `Bearer ${token}` },
          })
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data?.currency) {
                setMerchantCurrency(data.data.currency);
              }
            })
            .catch(console.error);
        } else {
          setMerchantCurrency(currency);
        }
      } else {
        fetchOrderDetails();
      }
    }
  }, [isOpen, orderId, initialOrder, currency, fetchOrderDetails]);

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

      const requestBody = {
        paymentMethod,
        amount,
        notes,
      };

      console.log('[OrderDetailModal] Recording payment:', {
        orderId,
        requestBody,
      });

      const response = await fetch(`/api/merchant/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      console.log('[OrderDetailModal] Payment response:', {
        status: response.status,
        data,
      });

      if (data.success) {
        await fetchOrderDetails();
        onUpdate?.();
        setShowPaymentModal(false);
      } else {
        console.error('[OrderDetailModal] Payment failed:', data.error);
        alert(`Payment failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
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
    if (numAmount === 0) return 'Free';
    return `A$${numAmount.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="flex flex-col items-center gap-3">
              <FaSpinner className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          </div>
        ) : order ? (
          <>
            {/* Header - Clean */}
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      #{order.orderNumber}
                    </h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].bg} ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].text}`}>
                      {ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS].label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FaClock className="h-3 w-3" />
                      {formatDateTime(order.placedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      {order.orderType === 'DINE_IN' ? (
                        <>
                          <FaUtensils className="h-3 w-3" />
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'Dine In'}
                        </>
                      ) : (
                        <>
                          <FaShoppingBag className="h-3 w-3" />
                          Takeaway
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {/* Payment Status - Compact */}
              {order.payment && order.payment.status === 'COMPLETED' && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FaCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Paid</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {order.payment.paymentMethod.replace(/_/g, ' ')} • {formatCurrency(Number(order.payment.amount))}
                  </div>
                </div>
              )}

              {/* Customer Info - Collapsible */}
              {order.customer && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FaUser className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.name}</span>
                    </div>
                    <FaChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${showCustomerDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showCustomerDetails && (
                    <div className="mt-1 rounded-lg border border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
                      {order.customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <FaPhone className="h-3 w-3 text-gray-400" />
                          {order.customer.phone}
                        </div>
                      )}
                      {order.customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <FaEnvelope className="h-3 w-3 text-gray-400" />
                          {order.customer.email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Order Items */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Items</p>
                <div className="space-y-3">
                  {order.orderItems && order.orderItems.length > 0 ? order.orderItems.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex gap-3">
                        {/* Menu Image with Qty Badge */}
                        <div className="relative flex-shrink-0">
                          <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            {item.menu?.imageUrl ? (
                              <img
                                src={item.menu.imageUrl}
                                alt={item.menuName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {/* Qty Badge */}
                          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-sm">
                            {item.quantity}
                          </span>
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {item.menuName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.quantity}× {formatCurrency(Number(item.menuPrice))}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                              {formatCurrency(Number(item.subtotal))}
                            </p>
                          </div>

                          {/* Addons */}
                          {item.addons && item.addons.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.addons.map((addon, addonIdx) => (
                                <div key={addonIdx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    + {addon.addonName}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {formatCurrency(Number(addon.addonPrice))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Item Notes */}
                          {item.notes && (
                            <div className="mt-2 rounded bg-amber-50 dark:bg-amber-900/20 px-2 py-1">
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                📝 {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 py-4 text-center">No items</p>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              {order.notes && (
                <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Order Note</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{order.notes}</p>
                </div>
              )}

              {/* Total */}
              <div className="mb-4 rounded-lg border-2 border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {/* Payment Actions */}
                {(!order.payment || order.payment.status === 'PENDING') ? (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={updating}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-success-500 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
                  >
                    <FaMoneyBillWave className="h-4 w-4" />
                    Record Payment
                  </button>
                ) : (
                  <button
                    onClick={handlePrintReceipt}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FaPrint className="h-4 w-4" />
                    Print Receipt
                  </button>
                )}

                {/* Status Actions */}
                {order.status === 'READY' ? (
                  <button
                    onClick={() => handleStatusUpdate('COMPLETED' as OrderStatus)}
                    disabled={updating}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-success-500 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
                  >
                    {updating ? (
                      <FaSpinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <FaCheck className="h-4 w-4" />
                        Mark as Completed
                      </>
                    )}
                  </button>
                ) : (
                  getNextPossibleStatuses(order.status as OrderStatus).length > 0 && (
                    <div className="flex gap-2">
                      {getNextPossibleStatuses(order.status as OrderStatus).map(status => {
                        const isCancelled = status === 'CANCELLED';
                        const isCompleted = status === 'COMPLETED';

                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusUpdate(status)}
                            disabled={updating}
                            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium disabled:opacity-50 ${isCancelled
                                ? 'bg-error-500 text-white hover:bg-error-600'
                                : isCompleted
                                  ? 'bg-success-500 text-white hover:bg-success-600'
                                  : 'bg-primary-500 text-white hover:bg-primary-600'
                              }`}
                          >
                            {updating ? (
                              <FaSpinner className="h-4 w-4 animate-spin" />
                            ) : (
                              ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS].label
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
                    Record Payment
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleRecordPayment('CASH_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-success-500 px-4 text-white hover:bg-success-600 disabled:opacity-50"
                    >
                      <FaMoneyBillWave className="h-5 w-5" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Cash Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleRecordPayment('CARD_ON_COUNTER', Number(order.totalAmount))}
                      disabled={updating}
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-primary-500 px-4 text-white hover:bg-primary-600 disabled:opacity-50"
                    >
                      <FaCreditCard className="h-5 w-5" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Card Payment</p>
                        <p className="text-xs opacity-90">{formatCurrency(Number(order.totalAmount))}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center p-16">
            <p className="text-gray-500 dark:text-gray-400">Order not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailModal;
