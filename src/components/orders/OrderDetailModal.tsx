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
  FaTruck,
  FaMapMarkerAlt,
  FaClock,
  FaMoneyBillWave,
  FaCreditCard,
  FaPrint,
  FaCheck,
  FaSpinner,
  FaChevronDown,
  FaImage,
  FaStickyNote,
  FaCalendarCheck,
  FaUsers,
} from 'react-icons/fa';
import Image from 'next/image';
import { ORDER_STATUS_COLORS } from '@/lib/constants/orderConstants';
import { getNextPossibleStatuses } from '@/lib/utils/orderStatusRules';
import { useToast } from '@/context/ToastContext';
import { useMerchant } from '@/context/MerchantContext';
import type { OrderWithDetails } from '@/lib/types/order';
import type { ReceiptSettings } from '@/lib/types/receiptSettings';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { openMerchantOrderReceiptHtmlAndPrint } from '@/lib/utils/receiptHtmlClient';
import { formatFullOrderNumber } from '@/lib/utils/format';
import { formatPaymentMethodLabel } from '@/lib/utils/paymentDisplay';
import OrderTotalsBreakdown from '@/components/orders/OrderTotalsBreakdown';

interface OrderDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  initialOrder?: OrderWithDetails | null;
  currency?: string;
  allowPaymentRecording?: boolean;
  actionMode?: 'default' | 'history';
  viewVariant?: 'default' | 'kitchen';
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onUpdate,
  initialOrder = null,
  currency,
  allowPaymentRecording = true,
  actionMode = 'default',
  viewVariant = 'default',
}) => {
  const [order, setOrder] = useState<OrderWithDetails | null>(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [merchantCurrency, setMerchantCurrency] = useState<string>('AUD');
  const [merchantProfile, setMerchantProfile] = useState<{
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
    receiptSettings?: Partial<ReceiptSettings> | null;
  } | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  const [isEditingAdminNote, setIsEditingAdminNote] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState<string>('');
  const [savingAdminNote, setSavingAdminNote] = useState(false);

  const [isEditingTableNumber, setIsEditingTableNumber] = useState(false);
  const [tableNumberDraft, setTableNumberDraft] = useState('');
  const [savingTableNumber, setSavingTableNumber] = useState(false);

  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; email: string; phone?: string | null }>>(
    []
  );
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriverUserId, setSelectedDriverUserId] = useState<string>('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  const { showSuccess, showError } = useToast();
  const { merchant } = useMerchant();

  const isTableNumberEnabled = merchant?.requireTableNumberForDineIn === true;

  const shouldShowFooterActions = actionMode !== 'history';
  const shouldShowPrintOnly = actionMode === 'history';

  const isKitchenView = viewVariant === 'kitchen';

  const apiOrderId = React.useMemo(() => {
    if (/^\d+$/.test(String(orderId))) return String(orderId);
    const fallback = order?.id !== undefined && order?.id !== null ? String(order.id) : String(orderId);
    return /^\d+$/.test(fallback) ? fallback : String(orderId);
  }, [orderId, order]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditingTableNumber(false);
      setTableNumberDraft('');
      setSavingTableNumber(false);
    }
  }, [isOpen, orderId]);

  const handleSaveTableNumber = useCallback(async () => {
    if (!order) return;
    if (order.orderType !== 'DINE_IN') return;
    if (!isTableNumberEnabled) return;

    const value = tableNumberDraft.trim();
    if (!value) {
      showError('Table number is required', 'Table');
      return;
    }

    setSavingTableNumber(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/merchant/orders/${apiOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tableNumber: value }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Failed to update table number');
      }

      setOrder(json.data);
      setIsEditingTableNumber(false);
      setTableNumberDraft('');
      onUpdate?.();
      showSuccess('Table number updated', 'Success');
    } catch (error) {
      console.error('Error updating table number:', error);
      showError((error as Error).message || 'Failed to update table number', 'Table');
    } finally {
      setSavingTableNumber(false);
    }
  }, [order, apiOrderId, onUpdate, showError, showSuccess, tableNumberDraft, isTableNumberEnabled]);

  const fetchDrivers = useCallback(async () => {
    try {
      setDriversLoading(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/merchant/drivers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Failed to load drivers');
      }

      const list = Array.isArray(json.data) ? json.data : [];
      setDrivers(list);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      showError((error as Error).message || 'Failed to load drivers', 'Drivers');
    } finally {
      setDriversLoading(false);
    }
  }, [showError]);

  const handleSaveDriverAssignment = async () => {
    if (!order) return;

    setAssigningDriver(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/merchant/orders/${apiOrderId}/delivery/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverUserId: selectedDriverUserId ? selectedDriverUserId : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Failed to update driver assignment');
      }

      setOrder(json.data);
      onUpdate?.();
      showSuccess('Driver assignment updated', 'Success');
    } catch (error) {
      console.error('Error saving driver assignment:', error);
      showError((error as Error).message || 'Failed to update driver assignment', 'Assignment Failed');
    } finally {
      setAssigningDriver(false);
    }
  };

  const fetchOrderDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [orderResponse, merchantResponse] = await Promise.all([
        fetch(`/api/merchant/orders/${apiOrderId}`, {
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
        setMerchantProfile(merchantData.data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }, [apiOrderId]);

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
                setMerchantProfile(data.data);
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

  useEffect(() => {
    if (!isOpen || !order) return;
    setIsEditingAdminNote(false);
    setAdminNoteDraft(String((order as any)?.adminNote ?? ''));
  }, [isOpen, orderId, order]);

  const handleSaveAdminNote = async () => {
    if (!order) return;

    setSavingAdminNote(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/merchant/orders/${apiOrderId}/admin-note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNote: adminNoteDraft,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.error || 'Failed to update admin note');
      }

      setOrder(json.data);
      onUpdate?.();
      setIsEditingAdminNote(false);
      showSuccess('Admin note updated', 'Success');
    } catch (error) {
      console.error('Error saving admin note:', error);
      showError((error as Error).message || 'Failed to update admin note', 'Update Failed');
    } finally {
      setSavingAdminNote(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!order || order.orderType !== 'DELIVERY') return;

    fetchDrivers();

    const currentDriverId = (order as any)?.deliveryDriver?.id;
    setSelectedDriverUserId(typeof currentDriverId === 'string' ? currentDriverId : '');
  }, [isOpen, order, fetchDrivers]);

  useEffect(() => {
    if (!allowPaymentRecording) {
      setShowPaymentModal(false);
    }
  }, [allowPaymentRecording]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/merchant/orders/${apiOrderId}/status`, {
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

        // Show success toast
        const statusLabels: Record<OrderStatus, string> = {
          PENDING: 'Pending',
          ACCEPTED: 'Accepted',
          IN_PROGRESS: 'In Progress',
          READY: 'Ready',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
        };
        showSuccess(`Order status updated to ${statusLabels[newStatus]}`, 'Success');
      } else {
        showError(data.error || 'Failed to update order status', 'Update Failed');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Failed to update order status', 'Update Failed');
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
        orderId: apiOrderId,
        requestBody,
      });

      const response = await fetch(`/api/merchant/orders/${apiOrderId}/payment`, {
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

        const methodLabel = formatPaymentMethodLabel({
          orderType: order.orderType,
          paymentStatus: 'COMPLETED',
          paymentMethod,
        });
        showSuccess(`Payment recorded successfully (${methodLabel})`, 'Payment Recorded');
      } else {
        console.error('[OrderDetailModal] Payment failed:', data.error);
        showError(data.error || 'Failed to record payment', 'Payment Failed');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showError('Failed to record payment. Please try again.', 'Payment Failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmCashOnDelivery = async () => {
    if (!order) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/merchant/orders/${apiOrderId}/cod/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        showError(data?.message || data?.error || 'Failed to confirm cash payment', 'Payment Failed');
        return;
      }

      await fetchOrderDetails();
      onUpdate?.();
      showSuccess('Cash on Delivery marked as paid', 'Payment Completed');
    } catch (error) {
      console.error('Error confirming COD payment:', error);
      showError('Failed to confirm cash payment. Please try again.', 'Payment Failed');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!order) return;

    const result = await openMerchantOrderReceiptHtmlAndPrint(apiOrderId);
    if (!result.ok) {
      const message =
        result.reason === 'popup_blocked'
          ? 'Failed to open print window (check popup blocker)'
          : 'Failed to fetch receipt (check connection)';
      showError(message, 'Print');
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (numAmount === 0) return 'Free';
    
    // Use merchantCurrency state (fetched from merchant profile, defaults to AUD)
    if (merchantCurrency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(numAmount));
      return `Rp ${formatted}`;
    }
    // Default: AUD
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
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 flex flex-col"
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
                      #{formatFullOrderNumber(order.orderNumber, merchant?.code)}
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
                          {isTableNumberEnabled
                            ? `Table ${order.tableNumber || '-'}`
                            : 'Dine In'}
                        </>
                      ) : order.orderType === 'DELIVERY' ? (
                        <>
                          <FaTruck className="h-3 w-3" />
                          Delivery
                        </>
                      ) : (
                        <>
                          <FaShoppingBag className="h-3 w-3" />
                          Takeaway
                        </>
                      )}
                    </span>
                  </div>

                  {order.orderType === 'DINE_IN' && isTableNumberEnabled && (
                    <div className="mt-3">
                      {!isEditingTableNumber ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTableNumber(true);
                            setTableNumberDraft(order.tableNumber || '');
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          {order.tableNumber ? 'Edit table number' : 'Add table number'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tableNumberDraft}
                            onChange={(e) => setTableNumberDraft(e.target.value)}
                            maxLength={50}
                            placeholder="Table number"
                            className="h-9 w-40 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-brand-700 dark:focus:ring-brand-900/40"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveTableNumber}
                            disabled={savingTableNumber}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                            title="Save"
                          >
                            {savingTableNumber ? <FaSpinner className="h-3.5 w-3.5 animate-spin" /> : <FaCheck className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingTableNumber(false);
                              setTableNumberDraft('');
                              setSavingTableNumber(false);
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            title="Cancel"
                          >
                            <FaTimes className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Payment Summary */}
              {order.payment && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {order.payment.status === 'COMPLETED' ? (
                      <FaCheck className="h-4 w-4 text-green-600" />
                    ) : null}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.payment.status === 'COMPLETED' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPaymentMethodLabel({
                      orderType: order.orderType,
                      paymentStatus: order.payment.status,
                      paymentMethod: order.payment.paymentMethod,
                    })}{' '}
                    • {formatCurrency(Number((order.payment as any).amount ?? order.totalAmount))}
                  </div>
                </div>
              )}

              {/* Reservation Details */}
              {order.reservation && (
                <div className="mb-4 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Reservation details
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <FaCalendarCheck className="mt-0.5 h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date & time</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                            new Date(order.reservation.reservationDate)
                          )}{' '}
                          • {order.reservation.reservationTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FaUsers className="mt-0.5 h-4 w-4 text-brand-600 dark:text-brand-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Party size</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {order.reservation.partySize}
                        </p>
                      </div>
                    </div>
                    {(order.tableNumber || order.reservation.tableNumber) && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Table</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {order.tableNumber || order.reservation.tableNumber}
                        </p>
                      </div>
                    )}
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

              {/* Delivery Info + Driver Assignment */}
              {order.orderType === 'DELIVERY' && !isKitchenView && (
                <div className="mb-4 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Delivery</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const raw = String((order as any).deliveryStatus || '').trim();
                          const normalized = raw || 'PENDING_ASSIGNMENT';

                          const labels: Record<string, string> = {
                            PENDING_ASSIGNMENT: 'Unassigned',
                            ASSIGNED: 'Assigned',
                            PICKED_UP: 'Picked up',
                            DELIVERED: 'Delivered',
                            FAILED: 'Failed',
                          };

                          return labels[normalized] ?? normalized;
                        })()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Delivery fee</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number((order as any).deliveryFeeAmount || 0))}
                      </p>
                    </div>
                  </div>

                  {((order as any).deliveryAddress || (order as any).deliveryUnit || (order as any).deliveryBuildingName || (order as any).deliveryFloor) && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-sm text-gray-900 dark:text-white/90">
                        {(() => {
                          const prefix = [
                            (order as any).deliveryUnit,
                            (order as any).deliveryBuildingName,
                            (order as any).deliveryBuildingNumber ? `No ${(order as any).deliveryBuildingNumber}` : null,
                            (order as any).deliveryFloor ? `Floor ${(order as any).deliveryFloor}` : null,
                          ].filter(Boolean).join(', ');

                          const addr = String((order as any).deliveryAddress || '').trim();
                          if (prefix && addr) return `${prefix}, ${addr}`;
                          return prefix || addr || '—';
                        })()}
                      </p>

                      {(() => {
                        const lat = (order as any).deliveryLatitude ?? (order as any).deliveryLat;
                        const lng = (order as any).deliveryLongitude ?? (order as any).deliveryLng;

                        const prefix = [
                          (order as any).deliveryUnit,
                          (order as any).deliveryBuildingName,
                          (order as any).deliveryBuildingNumber ? `No ${(order as any).deliveryBuildingNumber}` : null,
                          (order as any).deliveryFloor ? `Floor ${(order as any).deliveryFloor}` : null,
                        ].filter(Boolean).join(', ');
                        const addr = String((order as any).deliveryAddress || '').trim();
                        const addressQuery = (prefix && addr) ? `${prefix}, ${addr}` : (prefix || addr);

                        const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
                        const query = hasCoords ? `${lat},${lng}` : addressQuery;
                        if (!query) return null;

                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(query))}`;
                        return (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                          >
                            <FaMapMarkerAlt className="h-3.5 w-3.5" />
                            View maps
                          </a>
                        );
                      })()}
                    </div>
                  )}

                  {(order as any).deliveryInstructions && (
                    <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-100">
                      <div className="flex items-start gap-2">
                        <FaStickyNote className="mt-0.5 h-4 w-4 text-brand-700 dark:text-brand-300" />
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-300">Delivery instructions</p>
                          <p className="mt-0.5">{String((order as any).deliveryInstructions)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                      <p className="text-sm text-gray-900 dark:text-white/90">
                        {(order as any).deliveryDistanceKm ? `${Number((order as any).deliveryDistanceKm).toFixed(2)} km` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
                      <p className="text-sm text-gray-900 dark:text-white/90">
                        {(order as any).deliveryDriver?.name || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Assign driver
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedDriverUserId}
                        onChange={(e) => setSelectedDriverUserId(e.target.value)}
                        disabled={driversLoading || assigningDriver}
                        className="h-10 flex-1 min-w-55 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="">Unassigned</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleSaveDriverAssignment}
                        disabled={assigningDriver || driversLoading}
                        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                      >
                        {assigningDriver ? 'Saving…' : 'Save'}
                      </button>
                    </div>

                    {!driversLoading && drivers.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        No drivers found. Add a staff member with driver access.
                      </p>
                    )}
                  </div>
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
                        <div className="relative shrink-0">
                          <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            {item.menu?.imageUrl ? (
                              <Image
                                src={item.menu.imageUrl}
                                alt={item.menuName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FaImage className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                          </div>
                          {/* Qty Badge */}
                          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-sm">
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
                            <div className="mt-2 rounded bg-brand-50 dark:bg-brand-900/20 px-2 py-1">
                              <p className="text-xs text-brand-700 dark:text-brand-400">
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

              {/* Notes (Customer note read-only + Admin note editable) */}
              <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40">
                      <FaStickyNote className="h-4 w-4 text-brand-700 dark:text-brand-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Order Notes</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingAdminNote((v) => !v)}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {isEditingAdminNote ? 'Close' : ((order as any)?.adminNote ? 'Edit Note' : 'Add Note')}
                  </button>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Customer note */}
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 px-3 py-2">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Customer note</p>
                    {order.notes ? (
                      <p className="text-sm text-gray-900 dark:text-white/90 wrap-break-word">{order.notes}</p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No customer note</p>
                    )}
                  </div>

                  {/* Existing admin note (read mode) */}
                  {!isEditingAdminNote && ((order as any)?.adminNote || (order as any)?.kitchenNotes) ? (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 px-3 py-2">
                      <p className="text-[11px] font-semibold text-brand-800/80 dark:text-brand-300/80 uppercase tracking-wide mb-1">Kitchen note</p>
                      <p className="text-sm text-brand-900 dark:text-brand-200 wrap-break-word">
                        {String(((order as any)?.kitchenNotes ?? '')).trim() || '—'}
                      </p>
                    </div>
                  ) : null}

                  {/* Edit admin note */}
                  {isEditingAdminNote ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-3">
                      <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Admin note (auto saved as “- admin: …”)
                      </label>
                      <textarea
                        value={adminNoteDraft}
                        onChange={(e) => setAdminNoteDraft(e.target.value)}
                        rows={3}
                        placeholder="Type internal note for kitchen/kanban…"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white/90 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Preview stored note:
                          <span className="ml-2 text-gray-800 dark:text-white/80 font-medium">
                            {(() => {
                              const customerNote = String(order.notes ?? '').trim();
                              const adminNote = String(adminNoteDraft ?? '').trim();
                              if (!adminNote) return '—';
                              return customerNote
                                ? `${customerNote} - admin: ${adminNote}`
                                : `- admin: ${adminNote}`;
                            })()}
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingAdminNote(false);
                              setAdminNoteDraft(String((order as any)?.adminNote ?? ''));
                            }}
                            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            disabled={savingAdminNote}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveAdminNote}
                            className="h-9 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            disabled={savingAdminNote}
                          >
                            {savingAdminNote ? <FaSpinner className="h-3.5 w-3.5 animate-spin" /> : null}
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Price Breakdown */}
              {!isKitchenView ? (
                <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3">
                    <OrderTotalsBreakdown
                      amounts={{
                        subtotal: Number(order.subtotal) || 0,
                        taxAmount: Number(order.taxAmount) || 0,
                        serviceChargeAmount: Number((order as any).serviceChargeAmount || 0),
                        packagingFeeAmount: Number((order as any).packagingFeeAmount || 0),
                        deliveryFeeAmount:
                          String(order.orderType) === 'DELIVERY' ? Number((order as any).deliveryFeeAmount || 0) : 0,
                        discountAmount: Number((order as any).discountAmount || 0),
                        totalAmount: Number(order.totalAmount) || 0,
                      }}
                      currency={merchantCurrency}
                      formatAmount={(amount) => formatCurrency(amount)}
                      options={{
                        showDeliveryFee: String(order.orderType) === 'DELIVERY',
                      }}
                      showTotalRow={false}
                      rowsContainerClassName="space-y-2"
                      rowClassName="flex items-center justify-between text-sm"
                      labelClassName="text-gray-600 dark:text-gray-400"
                      valueClassName="text-gray-900 dark:text-white"
                      discountValueClassName="text-green-700 dark:text-green-400 font-medium"
                    />
                  </div>

                  {/* Total */}
                  <div className="border-t-2 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                      <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
                      <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Fixed Footer Actions */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 px-5 py-4">
              {shouldShowPrintOnly ? (
                <button
                  onClick={handlePrintReceipt}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FaPrint className="h-4 w-4" />
                  Print Receipt
                </button>
              ) : shouldShowFooterActions ? (
                <div className="space-y-2">
                  {/* Payment Actions */}
                  {allowPaymentRecording ? (
                    (!order.payment || order.payment.status === 'PENDING') ? (
                      (order.payment?.paymentMethod === 'CASH_ON_DELIVERY' && (order as any).orderType === 'DELIVERY') ? (
                        <button
                          onClick={handleConfirmCashOnDelivery}
                          disabled={updating}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-success-500 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
                        >
                          <FaMoneyBillWave className="h-4 w-4" />
                          Confirm Cash Received
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          disabled={updating}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-success-500 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
                        >
                          <FaMoneyBillWave className="h-4 w-4" />
                          Record Payment
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handlePrintReceipt}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FaPrint className="h-4 w-4" />
                        Print Receipt
                      </button>
                    )
                  ) : (
                    // Kitchen view: no payment recording. Still allow receipt printing when already paid.
                    (order.payment && order.payment.status !== 'PENDING') ? (
                      <button
                        onClick={handlePrintReceipt}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <FaPrint className="h-4 w-4" />
                        Print Receipt
                      </button>
                    ) : null
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
                      (() => {
                        const next = getNextPossibleStatuses(order.status as OrderStatus);
                        const cancelStatus = next.find((s) => s === 'CANCELLED');
                        const otherStatuses = next.filter((s) => s !== 'CANCELLED');

                        const renderStatusButton = (status: OrderStatus, opts?: { fullWidth?: boolean }) => {
                          const isCancelled = status === 'CANCELLED';
                          const isCompleted = status === 'COMPLETED';

                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusUpdate(status)}
                              disabled={updating}
                              className={`${opts?.fullWidth ? 'w-full' : 'flex-1'} flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium disabled:opacity-50 ${isCancelled
                                ? 'bg-error-500 text-white hover:bg-error-600'
                                : isCompleted
                                  ? 'bg-success-500 text-white hover:bg-success-600'
                                  : 'bg-brand-500 text-white hover:bg-brand-600'
                                }`}
                            >
                              {updating ? (
                                <FaSpinner className="h-4 w-4 animate-spin" />
                              ) : (
                                ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS].label
                              )}
                            </button>
                          );
                        };

                        if (!cancelStatus) {
                          return <div className="flex gap-2">{otherStatuses.map((s) => renderStatusButton(s))}</div>;
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">{renderStatusButton(cancelStatus, { fullWidth: true })}</div>
                            <div className="flex flex-1 justify-end gap-2">{otherStatuses.map((s) => renderStatusButton(s))}</div>
                          </div>
                        );
                      })()
                    )
                  )}
                </div>
              ) : null}
            </div>

            {/* Payment Modal */}
            {allowPaymentRecording && showPaymentModal && (
              <div
                className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPaymentModal(false);
                }}
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
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-brand-500 px-4 text-white hover:bg-brand-600 disabled:opacity-50"
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
      </div >
    </div >
  );
};

export default OrderDetailModal;
