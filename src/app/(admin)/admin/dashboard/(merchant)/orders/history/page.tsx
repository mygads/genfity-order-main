/**
 * Order History Page
 * 
 * Clean, professional design showing order history with filtering
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaHistory } from 'react-icons/fa';
import OrderHistoryTable from '@/components/orders/OrderHistoryTable';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { DeletePinModal } from '@/components/modals/DeletePinModal';
import DateRangeFilter, { DateRange } from '@/components/orders/DateRangeFilter';
import type { OrderStatus, OrderType } from '@prisma/client';
import { useMerchant } from '@/context/MerchantContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/context/ToastContext';
import { printReceipt } from '@/lib/utils/unifiedReceipt';
import { ReceiptSettings, DEFAULT_RECEIPT_SETTINGS } from '@/lib/types/receiptSettings';

// ===== TYPES =====

interface Order {
  id: string | number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  placedAt: string;
  [key: string]: unknown;
}

interface OrderData {
  orders: Order[];
  total: number;
}

// ===== MAIN PAGE =====

export default function OrderHistoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [_merchant, setMerchant] = useState<{ currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasDeletePin, setHasDeletePin] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteOrderNumber, setDeleteOrderNumber] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Date range (default: last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Use MerchantContext
  const { merchant: merchantData } = useMerchant();

  React.useEffect(() => {
    if (merchantData) {
      setMerchant(merchantData);
      // Check if merchant has delete PIN
      setHasDeletePin(!!merchantData.hasDeletePin);
    }
  }, [merchantData]);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const response = await fetch(
        `/api/merchant/orders?startDate=${startDate}&endDate=${endDate}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      if (data.success) {
        setOrderData({
          orders: data.data,
          total: data.total || data.data.length,
        });
      } else {
        setError(data.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleViewOrder = (orderId: string | number) => {
    setSelectedOrderId(String(orderId));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
    // Refresh data after modal closes
    fetchOrders();
  };

  const handleDeleteOrder = (orderId: string | number) => {
    const order = orderData?.orders.find((o) => String(o.id) === String(orderId));
    setDeleteOrderId(String(orderId));
    setDeleteOrderNumber(order?.orderNumber || null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (pin: string) => {
    if (!deleteOrderId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/merchant/orders/${deleteOrderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to delete order');
    }

    showSuccess('Order deleted successfully');
    setIsDeleteModalOpen(false);
    setDeleteOrderId(null);
    setDeleteOrderNumber(null);
    fetchOrders();
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteOrderId(null);
    setDeleteOrderNumber(null);
  };

  // Print receipt for an order using unified receipt generator
  const handlePrintReceipt = async (orderId: string | number) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch order details
      const response = await fetch(`/api/merchant/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        showError(t('admin.history.printFailed') || 'Failed to load order');
        return;
      }

      const data = await response.json();
      if (!data.success) {
        showError(data.message || 'Failed to load order');
        return;
      }

      const order = data.data;

      // Mint tracking token for QR (token-required public tracking)
      let trackingToken: string | null = null;
      try {
        const mintRes = await fetch(`/api/merchant/orders/${orderId}/tracking-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const mintJson = await mintRes.json();
        if (mintRes.ok && mintJson?.success) {
          trackingToken = mintJson?.data?.trackingToken || null;
        }
      } catch {
        trackingToken = null;
      }
      const rawSettings = (merchantData?.receiptSettings || {}) as Partial<ReceiptSettings>;
      const inferredLanguage: 'en' | 'id' = merchantData?.currency === 'IDR' ? 'id' : 'en';
      const language: 'en' | 'id' =
        rawSettings.receiptLanguage === 'id' || rawSettings.receiptLanguage === 'en'
          ? rawSettings.receiptLanguage
          : inferredLanguage;

      // Merge receipt settings with defaults (avoid missing new fields)
      const settings: ReceiptSettings = {
        ...DEFAULT_RECEIPT_SETTINGS,
        ...rawSettings,
        receiptLanguage: language,
        paperSize: rawSettings.paperSize === '58mm' ? '58mm' : '80mm',
      };

      // Use unified receipt generator
      printReceipt({
        order: {
          orderId: String(orderId),
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          tableNumber: order.tableNumber,
          deliveryUnit: order.deliveryUnit,
          deliveryBuildingName: order.deliveryBuildingName,
          deliveryBuildingNumber: order.deliveryBuildingNumber,
          deliveryFloor: order.deliveryFloor,
          deliveryInstructions: order.deliveryInstructions,
          deliveryAddress: order.deliveryAddress,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          trackingToken,
          placedAt: order.placedAt,
          paidAt: order.paidAt,
          items: (order.orderItems || []).map((item: { 
            quantity: number; 
            menuName: string; 
            unitPrice?: number;
            subtotal: number; 
            notes?: string; 
            addons?: Array<{ addonName: string; addonPrice?: number }> 
          }) => ({
            quantity: item.quantity,
            menuName: item.menuName,
            unitPrice: item.unitPrice,
            subtotal: Number(item.subtotal) || 0,
            notes: item.notes,
            addons: item.addons?.map(addon => ({
              addonName: addon.addonName,
              addonPrice: addon.addonPrice,
            })),
          })),
          subtotal: Number(order.subtotal) || 0,
          taxAmount: Number(order.taxAmount) || 0,
          serviceChargeAmount: Number(order.serviceChargeAmount) || 0,
          packagingFeeAmount: Number(order.packagingFeeAmount) || 0,
          discountAmount: Number(order.discountAmount) || 0,
          totalAmount: Number(order.totalAmount) || 0,
          amountPaid: order.payment?.amountPaid ? Number(order.payment.amountPaid) : undefined,
          changeAmount: order.payment?.changeAmount ? Number(order.payment.changeAmount) : undefined,
          paymentMethod: order.payment?.method,
          paymentStatus: order.payment?.status,
          cashierName: order.cashierName,
        },
        merchant: {
          name: merchantData?.name || '',
          code: merchantData?.code,
          logoUrl: merchantData?.logoUrl,
          address: merchantData?.address,
          phone: merchantData?.phone,
          email: merchantData?.email,
          currency: merchantData?.currency || 'AUD',
        },
        settings,
        language,
      });

      showSuccess(t('admin.history.printSuccess') || 'Receipt printed');
    } catch (error) {
      console.error('Print receipt error:', error);
      showError(t('admin.history.printFailed') || 'Failed to print receipt');
    }
  };

  return (
    <div data-tutorial="order-history-page">
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("admin.history.title")}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("admin.history.subtitle")}
        </p>
      </div>

      {/* Date Range Filter */}
      <div data-tutorial="history-date-filter" className="mb-6">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Order History Table */}
      {orderData && (
        <OrderHistoryTable
          orders={orderData.orders}
          onViewOrder={handleViewOrder}
          onDeleteOrder={handleDeleteOrder}
          onPrintReceipt={handlePrintReceipt}
          hasDeletePin={hasDeletePin}
          loading={loading}
        />
      )}

      {/* Empty State */}
      {!loading && (!orderData || orderData.orders.length === 0) && (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FaHistory className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t("admin.history.noOrders")}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.history.tryDifferentDate")}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !orderData && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse"
            ></div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleCloseModal}
        />
      )}

      {/* Delete PIN Modal */}
      <DeletePinModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        orderNumber={deleteOrderNumber || undefined}
        hasDeletePin={hasDeletePin}
      />
    </div>
  );
}
