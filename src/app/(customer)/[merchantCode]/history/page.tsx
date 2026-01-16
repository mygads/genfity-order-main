'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import { FaArrowLeft, FaClipboardList, FaClock, FaFileDownload, FaMotorcycle, FaRedo, FaShoppingBag, FaSpinner, FaUtensils, FaUsers } from 'react-icons/fa';
import { customerMerchantHomeUrl, customerOrderUrl, customerTrackUrl } from '@/lib/utils/customerRoutes';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantCode: string;
  mode: 'dinein' | 'takeaway' | 'delivery';
  isScheduled?: boolean;
  scheduledTime?: string | null;
  status: string;
  discountAmount?: number;
  totalAmount: number;
  placedAt: string;
  itemsCount: number;
  trackingToken: string;
}

interface ReservationHistoryItem {
  id: string;
  merchantName: string;
  merchantCode: string;
  status: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  itemsCount: number;
  order: null | {
    orderNumber: string;
    mode: 'dinein' | 'takeaway' | 'delivery' | string;
    status: string;
    trackingToken: string;
  };
  createdAt: string;
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

  const isTableNumberEnabled = contextMerchantInfo?.requireTableNumberForDineIn === true;

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [reservations, setReservations] = useState<ReservationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<ReturnType<typeof getCustomerAuth> | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'orders' | 'reservations'>('all');
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  const [orderToCancel, setOrderToCancel] = useState<OrderHistoryItem | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<ReservationHistoryItem | null>(null);

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

    // ✅ 4. Fetch history if authenticated (merchant info from context)
    fetchHistory(customerAuth);
  }, [router, merchantCode, mode]);

  /**
   * Fetch orders from API
   * 
   * @param customerAuth - Customer authentication object
   * 
   * @specification STEP_04_API_ENDPOINTS.txt - Order Endpoints
   */
  const fetchHistory = async (customerAuth: NonNullable<ReturnType<typeof getCustomerAuth>>) => {
    setIsLoading(true);

    try {
      const [ordersRes, reservationsRes] = await Promise.all([
        fetch('/api/customer/orders', {
          headers: {
            'Authorization': `Bearer ${customerAuth.accessToken}`,
          },
        }),
        fetch('/api/customer/reservations', {
          headers: {
            'Authorization': `Bearer ${customerAuth.accessToken}`,
          },
        }),
      ]);

      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        setOrders(ordersJson.data || []);
      } else {
        setOrders([]);
      }

      if (reservationsRes.ok) {
        const reservationsJson = await reservationsRes.json();
        setReservations(reservationsJson.data || []);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setOrders([]);
      setReservations([]);
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
      router.push(customerOrderUrl(order.merchantCode, { mode: orderMode }));

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
      const tokenQuery = `?token=${encodeURIComponent(order.trackingToken)}`;
      let response = await fetch(`/api/public/orders/${order.orderNumber}${tokenQuery}`);

      // If public endpoint fails, try constructing full order number with merchant code
      if (!response.ok) {
        const fullOrderNumber = order.orderNumber.includes('-')
          ? order.orderNumber
          : `${order.merchantCode}-${order.orderNumber}`;
        response = await fetch(`/api/public/orders/${fullOrderNumber}${tokenQuery}`);
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
        orderType: orderData.orderType as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
        tableNumber: isTableNumberEnabled ? orderData.tableNumber : null,
        deliveryUnit: orderData.deliveryUnit,
        deliveryAddress: orderData.deliveryAddress,
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
        deliveryFeeAmount: Number(orderData.deliveryFeeAmount) || 0,
        discountAmount: Number(orderData.discountAmount) || 0,
        totalAmount: Number(orderData.totalAmount) || order.totalAmount,
        paymentMethod: orderData.payment?.paymentMethod,
        paymentStatus: orderData.payment?.status,
        currency: orderData.merchant?.currency || merchantCurrency,
        trackingToken: order.trackingToken,
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

  const handleBack = () => {
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else if (merchantCode) {
      router.push(customerMerchantHomeUrl(merchantCode));
    } else {
      // Fallback: get last merchant from localStorage
      const lastMerchant = localStorage.getItem('lastMerchantCode');
      if (lastMerchant) {
        router.push(customerMerchantHomeUrl(lastMerchant));
      } else {
        router.push('/');
      }
    }
  };

  const handleCancelOrder = async (order: OrderHistoryItem) => {
    if (!auth) return;

    setCancellingOrderId(order.id.toString());

    try {
      const response = await fetch(`/api/customer/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        showError(json?.message || tOr(t, 'customer.history.cancelOrderFailed', 'Failed to cancel order'));
        return;
      }

      showSuccess(tOr(t, 'customer.history.cancelOrderSuccess', 'Order cancelled'));
      setOrders((prev) => prev.map((o) => (String(o.id) === String(order.id)
        ? {
            ...o,
            status: 'cancelled',
          }
        : o)));
    } catch (error) {
      console.error('Cancel order error:', error);
      showError(tOr(t, 'customer.history.cancelOrderFailed', 'Failed to cancel order'));
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCancelReservation = async (reservation: ReservationHistoryItem) => {
    if (!auth) return;

    setCancellingReservationId(reservation.id.toString());

    try {
      const response = await fetch(`/api/customer/reservations/${reservation.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        showError(json?.message || tOr(t, 'customer.history.cancelReservationFailed', 'Failed to cancel reservation'));
        return;
      }

      showSuccess(tOr(t, 'customer.history.cancelReservationSuccess', 'Reservation cancelled'));
      setReservations((prev) => prev.map((r) => (String(r.id) === String(reservation.id)
        ? {
            ...r,
            status: 'cancelled',
          }
        : r)));
    } catch (error) {
      console.error('Cancel reservation error:', error);
      showError(tOr(t, 'customer.history.cancelReservationFailed', 'Failed to cancel reservation'));
    } finally {
      setCancellingReservationId(null);
    }
  };

  const handleOrderClick = (order: OrderHistoryItem) => {
    const status = order.status.toLowerCase();
    const token = order.trackingToken;

    // Pending orders go to order-summary-cash; other statuses go to read-only order-detail.
    if (status === 'pending') {
      const currentPath = window.location.pathname + window.location.search;
      router.push(
        `/${order.merchantCode}/order-summary-cash?orderNumber=${encodeURIComponent(order.orderNumber)}&mode=${encodeURIComponent(order.mode)}&token=${encodeURIComponent(token)}&from=history&ref=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    router.push(
      `/${order.merchantCode}/order-detail/${order.orderNumber}?mode=${encodeURIComponent(order.mode)}&token=${encodeURIComponent(token)}`
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { border: string; text: string; labelKey: TranslationKeys }> = {
      pending: { border: 'border-yellow-500', text: 'text-yellow-600', labelKey: 'customer.status.pending' },
      accepted: { border: 'border-blue-500', text: 'text-blue-600', labelKey: 'customer.status.confirmed' },
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
    return formatCurrencyUtil(amount, merchantCurrency, locale);
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

  const getReservationDerivedStatus = (reservation: ReservationHistoryItem): string => {
    const orderStatus = (reservation.order?.status || '').toLowerCase();
    if (orderStatus === 'completed') return 'completed';
    if (orderStatus === 'cancelled') return 'cancelled';
    return reservation.status;
  };

  type UnifiedHistoryItem =
    | {
        kind: 'order';
        key: string;
        status: string;
        sortDate: string;
        order: OrderHistoryItem;
      }
    | {
        kind: 'reservation';
        key: string;
        status: string;
        sortDate: string;
        reservation: ReservationHistoryItem;
      };

  const hasReservations = reservations.length > 0;
  const effectiveType = hasReservations ? typeFilter : 'orders';

  const visibleItems = useMemo<UnifiedHistoryItem[]>(() => {
    const items: UnifiedHistoryItem[] = [];

    if (effectiveType === 'all' || effectiveType === 'orders') {
      for (const order of orders) {
        items.push({
          kind: 'order',
          key: `order_${order.id}`,
          status: order.status,
          sortDate: order.placedAt,
          order,
        });
      }
    }

    if (effectiveType === 'all' || effectiveType === 'reservations') {
      for (const reservation of reservations) {
        const derivedStatus = getReservationDerivedStatus(reservation);
        items.push({
          kind: 'reservation',
          key: `reservation_${reservation.id}`,
          status: derivedStatus,
          sortDate: reservation.createdAt,
          reservation,
        });
      }
    }

    items.sort((a, b) => {
      const tA = new Date(a.sortDate).getTime();
      const tB = new Date(b.sortDate).getTime();
      return tB - tA; // newest first; older items at bottom
    });

    return items;
  }, [effectiveType, orders, reservations]);

  // ✅ HYDRATION FIX: Show loading during SSR → CSR transition
  // if (!isMounted || !auth) {
  //   return <LoadingState type="page" message={LOADING_MESSAGES.LOADING} />;
  // }

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
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          {/* Title */}
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.history.title')}
          </h1>
        </div>

        {/* Type Filter (All / Orders / Reservations) - compact segmented tabs */}
        {hasReservations ? (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-4 py-2">
              <div className="flex w-full rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${typeFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tOr(t, 'customer.history.typeAll', 'All')}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('orders')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${typeFilter === 'orders'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tOr(t, 'customer.history.typeOrders', 'Orders')}
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('reservations')}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${typeFilter === 'reservations'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tOr(t, 'customer.history.typeReservations', 'Reservations')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-20">
            {/* Empty State - SVG Icon */}
            <FaClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-base font-semibold text-gray-900 mb-2">
              {t('customer.history.noOrders')}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {t('customer.history.noOrdersDesc')}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98]"
            >
              {t('customer.history.startOrdering')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((row) => {
              if (row.kind === 'reservation') {
                const reservation = row.reservation;
                const derivedStatus = getReservationDerivedStatus(reservation);
                const isReservationPending = reservation.status.toLowerCase() === 'pending';

                return (
                  <div
                    key={row.key}
                    className="p-4 border border-gray-200 rounded-xl bg-white"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 mb-1 truncate">
                          {reservation.merchantName}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(reservation.createdAt)}</p>
                      </div>
                      {getStatusBadge(derivedStatus)}
                    </div>

                    <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">
                        {tOr(t, 'customer.reservation.title', 'Reservation')}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-700">
                        <span className="inline-flex items-center gap-2">
                          <FaUsers className="w-4 h-4 text-gray-500" />
                          <span>
                            {tOr(t, 'customer.reservation.party', 'Party')}: {reservation.partySize}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <FaClock className="w-4 h-4 text-gray-500" />
                          <span>
                            {reservation.reservationDate} • {reservation.reservationTime}
                          </span>
                        </span>
                        <span>
                          {tOr(t, 'customer.reservation.preorderItems', 'Preorder')}: {reservation.itemsCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                      {reservation.order?.orderNumber && derivedStatus.toLowerCase() === 'completed' ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/${reservation.merchantCode}/order-detail/${reservation.order!.orderNumber}?mode=${encodeURIComponent(String(reservation.order!.mode || 'dinein'))}&token=${encodeURIComponent(reservation.order!.trackingToken)}`
                              );
                            }}
                            className="flex-1 py-2 text-sm font-semibold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 transition-all"
                          >
                            {t('customer.history.viewOrder')}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const receiptOrder: OrderHistoryItem = {
                                id: `reservation_${reservation.id}`,
                                orderNumber: reservation.order!.orderNumber,
                                merchantName: reservation.merchantName,
                                merchantCode: reservation.merchantCode,
                                mode: (reservation.order!.mode as OrderHistoryItem['mode']) || 'dinein',
                                status: reservation.order!.status,
                                discountAmount: 0,
                                totalAmount: 0,
                                placedAt: reservation.createdAt,
                                itemsCount: reservation.itemsCount || 0,
                                trackingToken: reservation.order!.trackingToken,
                              };
                              handleDownloadReceipt(receiptOrder);
                            }}
                            disabled={downloadingOrderId === `reservation_${reservation.id}`}
                            className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {downloadingOrderId === `reservation_${reservation.id}` ? (
                              <>
                                <FaSpinner className="h-4 w-4 animate-spin" />
                                <span>{t('customer.receipt.downloading')}</span>
                              </>
                            ) : (
                              <>
                                <FaFileDownload className="w-4 h-4" />
                                <span>{t('customer.receipt.downloadReceipt')}</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : isReservationPending ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/${reservation.merchantCode}/reservation-detail/${reservation.id}?mode=${encodeURIComponent(mode || 'dinein')}`
                              );
                            }}
                            className="flex-1 py-2 text-sm font-semibold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 transition-all"
                          >
                            {tOr(t, 'customer.history.viewReservationDetail', 'View reservation detail')}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReservationToCancel(reservation);
                            }}
                            disabled={cancellingReservationId === reservation.id.toString()}
                            className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {cancellingReservationId === reservation.id.toString() ? (
                              <>
                                <FaSpinner className="h-4 w-4 animate-spin" />
                                <span>{t('common.loading')}</span>
                              </>
                            ) : (
                              <span>{t('common.cancel')}</span>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            if (!reservation.order?.orderNumber) return;

                            const currentPath = window.location.pathname + window.location.search;

                            router.push(
                              customerTrackUrl(reservation.merchantCode, reservation.order.orderNumber, {
                                mode: reservation.order.mode,
                                token: reservation.order.trackingToken,
                                ref: currentPath,
                              })
                            );
                          }}
                          disabled={!reservation.order?.orderNumber}
                          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${reservation.order?.orderNumber
                            ? 'text-white bg-orange-500 hover:bg-orange-600'
                            : 'text-gray-500 border border-gray-200 bg-gray-50'
                            }`}
                        >
                          {t('customer.history.trackOrder')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              const order = row.order;
              const status = order.status.toLowerCase();
              const isOrderPending = status === 'pending';
              const isOrderActive = !['completed', 'cancelled'].includes(status);

              return (
                <div key={row.key} className="p-4 border border-gray-200 rounded-xl bg-white">
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
                      {order.mode === 'delivery' ? (
                        <FaMotorcycle className="w-4 h-4" />
                      ) : order.mode === 'dinein' ? (
                        <FaUtensils className="w-4 h-4" />
                      ) : (
                        <FaShoppingBag className="w-4 h-4" />
                      )}
                      <span>
                        {order.mode === 'delivery'
                          ? tOr(t, 'customer.mode.delivery', 'Delivery')
                          : order.mode === 'dinein'
                            ? t('customer.mode.dineIn')
                            : t('customer.mode.pickUp')}
                      </span>
                      {order.isScheduled && order.scheduledTime ? (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            {(order.mode === 'delivery'
                              ? tOr(t, 'customer.orderSummary.deliveryAt', 'Delivery at')
                              : order.mode === 'dinein'
                                ? tOr(t, 'customer.orderSummary.dineInAt', 'Dine-in at')
                                : tOr(t, 'customer.orderSummary.pickupAt', 'Pickup at'))}{' '}
                            {order.scheduledTime}
                          </span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span>{order.itemsCount || 0} items</span>
                    </div>
                    <div className="flex flex-col items-end">
                      {order.mode !== 'dinein' && typeof order.discountAmount === 'number' && order.discountAmount > 0 ? (
                        <span className="text-[11px] font-semibold text-green-600">
                          {tOr(t, 'customer.payment.voucher.discount', 'Voucher discount')}: -{formatCurrency(order.discountAmount)}
                        </span>
                      ) : null}
                      <span className="text-base font-bold text-orange-500">{formatCurrency(order.totalAmount)}</span>
                    </div>
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

                    {/* Cancel Button - Only for pending orders */}
                    {isOrderPending && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToCancel(order);
                        }}
                        disabled={cancellingOrderId === order.id.toString()}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {cancellingOrderId === order.id.toString() ? (
                          <>
                            <FaSpinner className="h-4 w-4 animate-spin" />
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <span>{t('common.cancel')}</span>
                        )}
                      </button>
                    )}

                    {/* Track Order Button - Only for active orders */}
                    {isOrderActive && !isOrderPending && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentPath = window.location.pathname + window.location.search;
                          router.push(customerTrackUrl(order.merchantCode, order.orderNumber, {
                            mode: order.mode,
                            token: (order as any).trackingToken,
                            ref: currentPath,
                          }));
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
                            <FaSpinner className="h-4 w-4 animate-spin" />
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <>
                            <FaRedo className="w-4 h-4" />
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
                            handleDownloadReceipt(order);
                          }}
                          disabled={downloadingOrderId === order.id.toString()}
                          className="w-10 h-10 flex items-center justify-center text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('customer.receipt.downloadReceipt')}
                        >
                          {downloadingOrderId === order.id.toString() ? (
                            <FaSpinner className="h-4 w-4 animate-spin" />
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

      {/* Cancel confirmations */}
      <ConfirmationModal
        isOpen={Boolean(orderToCancel)}
        onClose={() => setOrderToCancel(null)}
        onConfirm={() => {
          if (orderToCancel) {
            handleCancelOrder(orderToCancel);
          }
        }}
        title={tOr(t, 'customer.history.cancelOrderConfirmTitle', 'Cancel order?')}
        message={tOr(t, 'customer.history.cancelOrderConfirmMessage', 'This will cancel your pending order. You cannot undo this action.')}
        cancelText={t('common.no')}
        confirmText={tOr(t, 'customer.history.cancelOrderConfirmYes', 'Yes, cancel')}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={Boolean(reservationToCancel)}
        onClose={() => setReservationToCancel(null)}
        onConfirm={() => {
          if (reservationToCancel) {
            handleCancelReservation(reservationToCancel);
          }
        }}
        title={tOr(t, 'customer.history.cancelReservationConfirmTitle', 'Cancel reservation?')}
        message={tOr(t, 'customer.history.cancelReservationConfirmMessage', 'This will cancel your pending reservation. You cannot undo this action.')}
        cancelText={t('common.no')}
        confirmText={tOr(t, 'customer.history.cancelReservationConfirmYes', 'Yes, cancel')}
        variant="danger"
      />
    </div>
  );
}
