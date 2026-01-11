'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import { FaFileDownload, FaPrint } from 'react-icons/fa';
import { printReceipt } from '@/lib/utils/unifiedReceipt';
import { DEFAULT_RECEIPT_SETTINGS, type ReceiptSettings } from '@/lib/types/receiptSettings';

interface OrderHistoryItem {
  id: bigint;
  orderNumber: string;
  merchantName: string;
  merchantCode: string;
  mode: 'dinein' | 'takeaway';
  status: string;
  totalAmount: number;
  placedAt: string;
  itemsCount: number;
}

interface ReorderItem {
  menuId: string;
  menuName: string;
  originalPrice: number;
  currentPrice: number | null;
  quantity: number;
  notes: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  reason: string | null;
  addons: Array<{
    id: string;
    name: string;
    originalPrice: number;
    currentPrice: number | null;
    isAvailable: boolean;
    reason: string | null;
  }>;
  allAddonsAvailable: boolean;
}

/**
 * GENFITY Customer Order History Page
 * 
 * @description
 * Displays all past orders for authenticated customer.
 * Shows order cards with status, items, and total amount.
 * 
 * @specification
 * - Container: max-w-[420px] mx-auto bg-white min-h-svh
 * - CustomerHeader with back button
 * - Order cards with status badges
 * - Filter by status (All, Pending, Completed, Cancelled)
 * - Click card → navigate to order detail
 * 
 * @navigation
 * - Back: Returns to ref or profile page
 * - Order card: /[merchantCode]/order-summary-cash?orderNumber={number}&mode={mode}
 * 
 * @security
 * - JWT Bearer token authentication
 * - Hydration-safe rendering (prevents SSR/CSR mismatch)
 */
export default function OrderHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { t, locale } = useTranslation();
  const { addItem, initializeCart, cart } = useCart();
  const { showSuccess, showError, showWarning } = useToast();

  const merchantCode = params.merchantCode as string | undefined;
  const mode = searchParams.get('mode') as 'dinein' | 'takeaway' | null;
  const ref = searchParams.get('ref');

  // ✅ Use CustomerData Context for instant merchant info access
  const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<ReturnType<typeof getCustomerAuth> | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  // ✅ FIX: Add hydration guard to prevent SSR/CSR mismatch
  const [isMounted, setIsMounted] = useState(false);

  // ✅ Initialize context for this merchant
  useEffect(() => {
    if (merchantCode) {
      initializeData(merchantCode);
    }
  }, [merchantCode, initializeData]);

  // ✅ Use Context data when available (instant navigation)
  useEffect(() => {
    if (isInitialized && contextMerchantInfo) {
      console.log('✅ [HISTORY] Using CustomerData Context - instant load');
      setMerchantCurrency(contextMerchantInfo.currency || 'AUD');
    }
  }, [isInitialized, contextMerchantInfo]);

  /**
   * ✅ FIXED: Hydration-safe authentication check
   * 
   * @description
   * Prevents hydration mismatch by:
   * 1. Setting isMounted flag AFTER client-side hydration completes
   * 2. Loading auth from localStorage only on client-side
   * 3. Showing loading state during SSR → CSR transition
   * 
   * @specification Emergency Troubleshooting - copilot-instructions.md
   * 
   * @security
   * - localStorage only accessed on client-side (after mount)
   * - No SSR/CSR data mismatch
   */
  useEffect(() => {
    // ✅ 1. Mark component as mounted (client-side only)
    setIsMounted(true);

    // ✅ 2. Load auth from localStorage (safe now)
    const customerAuth = getCustomerAuth();
    setAuth(customerAuth);

    // ✅ 3. Redirect if not authenticated
    if (!customerAuth) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = merchantCode
        ? `/login?merchant=${merchantCode}${mode ? `&mode=${mode}` : ''}&ref=${encodeURIComponent(currentPath)}`
        : `/login?ref=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    // ✅ 4. Fetch orders if authenticated (merchant info from context)
    fetchOrders(customerAuth);
  }, [router, merchantCode, mode]);

  /**
   * Fetch orders from API
   * 
   * @param customerAuth - Customer authentication object
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
   */
  const fetchOrders = async (customerAuth: NonNullable<ReturnType<typeof getCustomerAuth>>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customer/orders', {
        headers: {
          'Authorization': `Bearer ${customerAuth.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle re-order functionality
   * 
   * @description
   * Fetches order items from API, validates availability,
   * and adds available items to cart.
   * 
   * @param order - Order to re-order
   */
  const handleReorder = async (order: OrderHistoryItem) => {
    if (!auth) return;

    setReorderingOrderId(order.id.toString());

    try {
      const response = await fetch(`/api/customer/orders/${order.id}/reorder`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        showError(error.message || t('common.error'));
        return;
      }

      const data = await response.json();
      const reorderData = data.data;

      // Check if merchant is open
      if (!reorderData.summary.merchantOpen) {
        showError(t('customer.store.closed'));
        return;
      }

      // Check if any items can be reordered
      if (!reorderData.summary.canReorder) {
        showError(t('customer.reorder.noAvailableItems'));
        return;
      }

      // Initialize cart for this merchant if needed
      const orderMode = order.mode;
      if (!cart || cart.merchantCode !== order.merchantCode || cart.mode !== orderMode) {
        initializeCart(order.merchantCode, orderMode);
      }

      // Add available items to cart
      let addedCount = 0;
      let skippedCount = 0;

      for (const item of reorderData.items as ReorderItem[]) {
        if (item.isAvailable && item.allAddonsAvailable && item.currentPrice !== null) {
          // Prepare addons (only available ones with current prices)
          const validAddons = item.addons
            .filter(addon => addon.isAvailable && addon.currentPrice !== null)
            .map(addon => ({
              id: addon.id,
              name: addon.name,
              price: addon.currentPrice as number,
            }));

          // Add item to cart
          addItem({
            menuId: item.menuId,
            menuName: item.menuName,
            price: item.currentPrice,
            quantity: item.quantity,
            addons: validAddons.length > 0 ? validAddons : undefined,
            notes: item.notes || undefined,
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      // Show success message
      if (addedCount > 0 && skippedCount === 0) {
        showSuccess(t('customer.reorder.success', { count: addedCount }));
      } else if (addedCount > 0 && skippedCount > 0) {
        showWarning(t('customer.reorder.partialSuccess', { added: addedCount, skipped: skippedCount }));
      }

      // Navigate to cart
      router.push(`/${order.merchantCode}/cart?mode=${orderMode}`);

    } catch (error) {
      console.error('Re-order error:', error);
      showError(t('common.error'));
    } finally {
      setReorderingOrderId(null);
    }
  };

  /**
   * Handle download receipt functionality
   * 
   * @description
   * Fetches full order details from API and generates PDF receipt.
   * Uses dynamic import for jsPDF to keep bundle size small.
   * 
   * @param order - Order to download receipt for
   */
  const handleDownloadReceipt = async (order: OrderHistoryItem) => {
    if (!auth) return;

    setDownloadingOrderId(order.id.toString());

    try {
      // Fetch full order details using public endpoint (supports orderNumber lookup)
      let response = await fetch(`/api/public/orders/${order.orderNumber}`);

      // If public endpoint fails, try constructing full order number with merchant code
      if (!response.ok) {
        const fullOrderNumber = order.orderNumber.includes('-')
          ? order.orderNumber
          : `${order.merchantCode}-${order.orderNumber}`;
        response = await fetch(`/api/public/orders/${fullOrderNumber}`);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      const orderData = data.data;

      // Dynamic import for PDF generator (client-side only)
      const { generateOrderReceiptPdf } = await import('@/lib/utils/generateOrderPdf');

      // Prepare data for PDF generation
      const receiptData = {
        orderNumber: orderData.orderNumber,
        merchantName: orderData.merchant?.name || order.merchantName,
        merchantCode: order.merchantCode,
        merchantAddress: orderData.merchant?.address,
        merchantPhone: orderData.merchant?.phone,
        merchantLogo: orderData.merchant?.logoUrl,
        orderType: orderData.orderType as 'DINE_IN' | 'TAKEAWAY',
        tableNumber: orderData.tableNumber,
        customerName: auth.customer.name,
        customerEmail: auth.customer.email,
        customerPhone: auth.customer.phone,
        placedAt: orderData.placedAt,
        items: (orderData.orderItems || []).map((item: { menuName: string; quantity: number; menuPrice: number; addons?: Array<{ addonName: string; addonPrice: number }>; notes?: string | null }) => ({
          menuName: item.menuName,
          quantity: item.quantity,
          price: Number(item.menuPrice) || 0,
          addons: (item.addons || []).map((addon: { addonName: string; addonPrice: number }) => ({
            name: addon.addonName,
            price: Number(addon.addonPrice) || 0,
          })),
          notes: item.notes,
        })),
        subtotal: Number(orderData.subtotal) || 0,
        taxAmount: Number(orderData.taxAmount) || 0,
        serviceChargeAmount: Number(orderData.serviceChargeAmount) || 0,
        packagingFeeAmount: Number(orderData.packagingFeeAmount) || 0,
        totalAmount: Number(orderData.totalAmount) || order.totalAmount,
        paymentMethod: orderData.payment?.paymentMethod,
        paymentStatus: orderData.payment?.status,
        currency: orderData.merchant?.currency || merchantCurrency,
        // Staff who recorded the payment
        recordedBy: orderData.payment?.paidBy ? {
          name: orderData.payment.paidBy.name,
          email: orderData.payment.paidBy.email,
        } : null,
        // Language for receipt (id or en)
        language: locale as 'en' | 'id',
      };

      // Generate and download PDF
      await generateOrderReceiptPdf(receiptData);
      showSuccess(t('customer.receipt.downloadSuccess'));

    } catch (error) {
      console.error('Download receipt error:', error);
      showError(t('customer.receipt.downloadFailed'));
    } finally {
      setDownloadingOrderId(null);
    }
  };

  /**
   * Print receipt using the merchant's receipt template settings.
   * Uses the same unified receipt generator as admin/POS.
   */
  const handlePrintReceipt = async (order: OrderHistoryItem) => {
    setPrintingOrderId(order.id.toString());

    try {
      // Fetch full order details using public endpoint (supports orderNumber lookup)
      let response = await fetch(`/api/public/orders/${order.orderNumber}`);

      // If public endpoint fails, try constructing full order number with merchant code
      if (!response.ok) {
        const fullOrderNumber = order.orderNumber.includes('-')
          ? order.orderNumber
          : `${order.merchantCode}-${order.orderNumber}`;
        response = await fetch(`/api/public/orders/${fullOrderNumber}`);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      const orderData = data.data;

      const orderMerchantCurrency = orderData.merchant?.currency || merchantCurrency;
      const rawSettings = (orderData.merchant?.receiptSettings || {}) as Partial<ReceiptSettings>;
      const inferredLanguage: 'en' | 'id' = orderMerchantCurrency === 'IDR' ? 'id' : 'en';
      const language: 'en' | 'id' =
        rawSettings.receiptLanguage === 'id' || rawSettings.receiptLanguage === 'en'
          ? rawSettings.receiptLanguage
          : inferredLanguage;

      const settings: ReceiptSettings = {
        ...DEFAULT_RECEIPT_SETTINGS,
        ...rawSettings,
        receiptLanguage: language,
        paperSize: rawSettings.paperSize === '58mm' ? '58mm' : '80mm',
      };

      printReceipt({
        order: {
          orderNumber: orderData.orderNumber,
          orderType: orderData.orderType,
          tableNumber: orderData.tableNumber,
          customerName: orderData.customer?.name || auth?.customer?.name,
          customerPhone: orderData.customer?.phone || auth?.customer?.phone,
          placedAt: orderData.placedAt,
          paidAt: orderData.payment?.paidAt,
          items: (orderData.orderItems || []).map((item: any) => ({
            quantity: item.quantity,
            menuName: item.menuName,
            unitPrice: item.menuPrice ? Number(item.menuPrice) : undefined,
            subtotal: Number(item.subtotal) || Number(item.menuPrice) * Number(item.quantity) || 0,
            notes: item.notes,
            addons: (item.addons || []).map((addon: any) => ({
              addonName: addon.addonName,
              addonPrice: Number(addon.addonPrice) || 0,
            })),
          })),
          subtotal: Number(orderData.subtotal) || 0,
          taxAmount: Number(orderData.taxAmount) || 0,
          serviceChargeAmount: Number(orderData.serviceChargeAmount) || 0,
          packagingFeeAmount: Number(orderData.packagingFeeAmount) || 0,
          discountAmount: Number(orderData.discountAmount) || 0,
          totalAmount: Number(orderData.totalAmount) || 0,
          amountPaid: orderData.payment?.amountPaid ? Number(orderData.payment.amountPaid) : undefined,
          changeAmount: orderData.payment?.changeAmount ? Number(orderData.payment.changeAmount) : undefined,
          paymentMethod: orderData.payment?.paymentMethod,
          paymentStatus: orderData.payment?.status,
          cashierName: orderData.payment?.paidBy?.name,
        },
        merchant: {
          name: orderData.merchant?.name || order.merchantName,
          logoUrl: orderData.merchant?.logoUrl,
          address: orderData.merchant?.address,
          phone: orderData.merchant?.phone,
          currency: orderMerchantCurrency,
        },
        settings,
        language,
      });
    } catch (error) {
      console.error('Print receipt error:', error);
      showError(t('customer.receipt.printFailed'));
    } finally {
      setPrintingOrderId(null);
    }
  };

  const handleBack = () => {
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchantCode) {
      router.push(`/${merchantCode}`);
    } else {
      // Fallback: get last merchant from localStorage
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(`/${lastMerchant}`);
      } else {
        router.push('/');
      }
    }
  };

  const handleOrderClick = (order: OrderHistoryItem) => {
    const status = order.status.toLowerCase();

    // If order is completed or ready, go to order-detail page (read-only view)
    if (status === 'completed' || status === 'ready') {
      router.push(`/${order.merchantCode}/order-detail/${order.orderNumber}?mode=${order.mode}`);
    } else {
      // For pending, accepted, in_progress orders, go to order-summary-cash (tracking page)
      router.push(`/${order.merchantCode}/order-summary-cash?orderNumber=${order.orderNumber}&mode=${order.mode}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { border: string; text: string; labelKey: TranslationKeys }> = {
      pending: { border: 'border-yellow-500', text: 'text-yellow-600', labelKey: 'customer.status.pending' },
      confirmed: { border: 'border-blue-500', text: 'text-blue-600', labelKey: 'customer.status.confirmed' },
      in_progress: { border: 'border-orange-500', text: 'text-orange-600', labelKey: 'customer.status.inProgress' },
      ready: { border: 'border-purple-500', text: 'text-purple-600', labelKey: 'customer.status.ready' },
      completed: { border: 'border-green-500', text: 'text-green-600', labelKey: 'customer.status.completed' },
      cancelled: { border: 'border-red-500', text: 'text-red-600', labelKey: 'customer.status.cancelled' },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white border ${config.border} ${config.text}`}>
        {t(config.labelKey)}
      </span>
    );
  };

  /**
   * ✅ FIXED: Format currency using merchant's currency setting
   * 
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number): string => {
    // Special handling for AUD to show A$ prefix
    if (merchantCurrency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }

    // Special handling for IDR - no decimals
    if (merchantCurrency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantCurrency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Filter orders based on selected filter
  const filteredOrders = orders
    .filter(order => {
      if (filter === 'all') return true;
      if (filter === 'pending') return !['completed', 'cancelled'].includes(order.status.toLowerCase());
      if (filter === 'completed') return order.status.toLowerCase() === 'completed';
      if (filter === 'cancelled') return order.status.toLowerCase() === 'cancelled';
      return true;
    })
    // Sort: active orders first, then by newest
    .sort((a, b) => {
      const aIsActive = !['completed', 'cancelled'].includes(a.status.toLowerCase());
      const bIsActive = !['completed', 'cancelled'].includes(b.status.toLowerCase());
      // Active orders first
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      // Then by newest date
      return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
    });

  // ✅ HYDRATION FIX: Show loading during SSR → CSR transition
  if (!isMounted || !auth) {
    return <LoadingState type="page" message={LOADING_MESSAGES.LOADING} />;
  }

  return (
    <div className="">
      {/* Fixed Header - Profile Style */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          {/* Title */}
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.history.title')}
          </h1>
        </div>

        {/* Filter Tabs - Evenly Spaced */}
        <div className="flex border-t border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'all'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 border-b-2 border-transparent'
              }`}
          >
            {t('customer.history.allOrders')}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'pending'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 border-b-2 border-transparent'
              }`}
          >
            {t('customer.history.activeOrders')}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${filter === 'completed'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 border-b-2 border-transparent'
              }`}
          >
            {t('customer.history.completedOrders')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          /* Order History Skeleton Loading */
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 border border-gray-200 rounded-xl bg-white"
              >
                {/* Header Skeleton */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                </div>

                {/* Order Number Skeleton */}
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                </div>

                {/* Footer Skeleton */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            {/* Empty State - SVG Icon */}
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-base font-semibold text-gray-900 mb-2">
              {filter === 'all' ? t('customer.history.noOrders') : t('common.noResults')}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {filter === 'all'
                ? t('customer.history.noOrdersDesc')
                : t('customer.history.noOrdersFiltered', { filter: filter === 'pending' ? t('customer.history.activeOrders').toLowerCase() : t('customer.history.completedOrders').toLowerCase() })}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
              >
                {t('customer.history.startOrdering')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isOrderActive = !['completed', 'cancelled'].includes(order.status.toLowerCase());

              return (
                <div
                  key={order.id.toString()}
                  className="p-4 border border-gray-200 rounded-xl bg-white"
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 mb-1 truncate">
                        {order.merchantName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.placedAt)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Order Number */}
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('customer.track.orderNumber')}</p>
                    <div className="inline-flex items-center rounded overflow-hidden border border-gray-200">
                      {/* Merchant Code (Left - Gray) */}
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 font-mono font-medium text-xs">
                        {order.merchantCode}
                      </span>
                      {/* Order Code (Right - White) */}
                      <span className="px-2 py-1 bg-white text-gray-900 font-mono font-bold text-xs">
                        {order.orderNumber.includes('-')
                          ? order.orderNumber.split('-').slice(1).join('-')
                          : order.orderNumber}
                      </span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {/* Mode Icon - SVG instead of emoji */}
                      {order.mode === 'dinein' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v18H3V3zm2 8h14M7 7v10m10-10v10" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      )}
                      <span>{order.mode === 'dinein' ? t('customer.mode.dineIn') : t('customer.mode.pickUp')}</span>
                      <span>•</span>
                      <span>{order.itemsCount || 0} items</span>
                    </div>
                    <span className="text-base font-bold text-orange-500">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                    {/* View Order Button - Always visible */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className="flex-1 py-2 text-sm font-semibold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 transition-all"
                    >
                      {t('customer.history.viewOrder')}
                    </button>

                    {/* Track Order Button - Only for active orders */}
                    {isOrderActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${order.merchantCode}/track/${order.orderNumber}`);
                        }}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all"
                      >
                        {t('customer.history.trackOrder')}
                      </button>
                    )}

                    {/* Re-order Button - Only for completed orders */}
                    {!isOrderActive && order.status.toLowerCase() === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorder(order);
                        }}
                        disabled={reorderingOrderId === order.id.toString()}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {reorderingOrderId === order.id.toString() ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{t('customer.history.reorder')}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Download Receipt Button - Only for completed orders */}
                    {!isOrderActive && order.status.toLowerCase() === 'completed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintReceipt(order);
                          }}
                          disabled={printingOrderId === order.id.toString()}
                          className="w-10 h-10 flex items-center justify-center text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('customer.receipt.printReceipt')}
                        >
                          {printingOrderId === order.id.toString() ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <FaPrint className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadReceipt(order);
                          }}
                          disabled={downloadingOrderId === order.id.toString()}
                          className="w-10 h-10 flex items-center justify-center text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('customer.receipt.downloadReceipt')}
                        >
                          {downloadingOrderId === order.id.toString() ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <FaFileDownload className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
