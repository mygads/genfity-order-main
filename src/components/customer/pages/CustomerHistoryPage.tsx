'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import {
  FaArrowLeft,
  FaClipboardList,
  FaClock,
  FaFileDownload,
  FaMotorcycle,
  FaRedo,
  FaShoppingBag,
  FaSpinner,
  FaUtensils,
  FaUsers
} from 'react-icons/fa';
import {
  customerMerchantHomeUrl,
  customerOrderDetailUrl,
  customerOrderSummaryCashUrl,
  customerOrderUrl,
  customerReservationDetailUrl,
  customerTrackUrl,
  customerLoginUrl
} from '@/lib/utils/customerRoutes';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { triggerPublicOrderReceiptDownload } from '@/lib/utils/receiptPdfClient';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';
import { CustomerHistoryListSkeleton } from '@/components/customer/skeletons/CustomerHistorySkeleton';
import { getCurrentInternalPathWithQuery } from '@/lib/utils/safeRef';

interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantCode: string;
  mode: 'dinein' | 'takeaway' | 'delivery';
  isScheduled?: boolean;
  scheduledTime?: string | null;
  status: string;
  editedAt?: string | null;
  changedByAdmin?: boolean;
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

type ReorderPreviewResponse = {
  merchant: {
    code: string;
    name: string;
    currency: string;
    isOpen: boolean;
  };
  items: ReorderItem[];
  summary: {
    totalItems: number;
    availableItems: number;
    unavailableItems: number;
    canReorder: boolean;
    merchantOpen: boolean;
  };
};

type PendingReorderPreview = {
  order: OrderHistoryItem;
  preview: ReorderPreviewResponse;
  needsSwitch: boolean;
  availableCount: number;
  skipped: Array<{ name: string; reason: string }>;
};

export default function CustomerHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { t, locale } = useTranslation();
  const { addItem, initializeCart, cart } = useCart();
  const { showSuccess, showError, showWarning } = useToast();

  const merchantCode = params.merchantCode as string | undefined;
  const mode = searchParams.get('mode') as 'dinein' | 'takeaway' | null;

  const { pushBack } = useCustomerBackTarget({ includeLastMerchantFallback: true });

  // ✅ Use CustomerData Context for instant merchant info access
  const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

  // Load merchant info if we have a code
  useEffect(() => {
    if (merchantCode && !isInitialized) {
      initializeData(merchantCode);
    }
  }, [merchantCode, isInitialized, initializeData]);

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [reservations, setReservations] = useState<ReservationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<ReturnType<typeof getCustomerAuth> | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'orders' | 'reservations'>('all');
  const [rangeDays, setRangeDays] = useState<number>(() => {
    const raw = searchParams.get('rangeDays');
    const parsed = raw ? Number(raw) : 30;
    if (parsed === 30 || parsed === 60 || parsed === 90 || parsed === 365) return parsed;
    return 30;
  });
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

  const [orderToCancel, setOrderToCancel] = useState<OrderHistoryItem | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<ReservationHistoryItem | null>(null);

  const [pendingReorderPreview, setPendingReorderPreview] = useState<PendingReorderPreview | null>(null);
  const scrollRestoredRef = useRef(false);
  const cartRef = useRef(cart);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const scrollKey = useMemo(() => {
    const code = merchantCode ?? 'all';
    const m = mode ?? 'all';
    return `customer_history_scroll:${code}:${m}`;
  }, [merchantCode, mode]);

  const saveScrollPosition = () => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(scrollKey, String(window.scrollY ?? 0));
    } catch {
      // ignore
    }
  };

  const restoreScrollPosition = () => {
    if (typeof window === 'undefined') return;
    if (scrollRestoredRef.current) return;
    try {
      const raw = sessionStorage.getItem(scrollKey);
      if (!raw) return;
      const y = Number(raw);
      if (!Number.isFinite(y) || y < 0) return;
      scrollRestoredRef.current = true;
      sessionStorage.removeItem(scrollKey);
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'auto' });
      });
    } catch {
      // ignore
    }
  };

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

  useEffect(() => {
    const customerAuth = getCustomerAuth();
    setAuth(customerAuth);

    if (!customerAuth) {
      const currentPath = getCurrentInternalPathWithQuery() ?? window.location.pathname + window.location.search;
      const loginUrl = customerLoginUrl({ merchant: merchantCode, mode: mode || undefined, ref: currentPath });
      router.push(loginUrl);
      return;
    }

    fetchHistory(customerAuth);
  }, [router, merchantCode, mode, rangeDays]);

  useEffect(() => {
    if (!isLoading) {
      restoreScrollPosition();
    }
  }, [isLoading]);

  const fetchHistory = async (customerAuth: NonNullable<ReturnType<typeof getCustomerAuth>>) => {
    setIsLoading(true);

    try {
      const [ordersRes, reservationsRes] = await Promise.all([
        fetch(`/api/customer/orders?rangeDays=${encodeURIComponent(String(rangeDays))}`, {
          headers: {
            'Authorization': `Bearer ${customerAuth.accessToken}`,
          },
        }),
        fetch(`/api/customer/reservations?rangeDays=${encodeURIComponent(String(rangeDays))}`, {
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

  const waitForCartToMatch = async (targetMerchantCode: string, targetMode: OrderHistoryItem['mode']) => {
    const start = Date.now();
    const timeoutMs = 2000;

    while (Date.now() - start < timeoutMs) {
      const currentCart = cartRef.current;
      if (currentCart && currentCart.merchantCode === targetMerchantCode && currentCart.mode === targetMode) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  const reasonLabel = (reason: string | null) => {
    switch (reason) {
      case 'OUT_OF_STOCK':
        return tOr(t, 'customer.reorder.reason.outOfStock', 'Out of stock');
      case 'UNAVAILABLE':
        return tOr(t, 'customer.reorder.reason.unavailable', 'Unavailable');
      case 'DELETED':
        return tOr(t, 'customer.reorder.reason.deleted', 'Removed');
      default:
        return tOr(t, 'customer.reorder.reason.unknown', 'Unavailable');
    }
  };

  const getItemSkipReason = (item: ReorderItem): string | null => {
    if (!item.isAvailable) {
      return reasonLabel(item.reason);
    }

    if (item.currentPrice === null) {
      return reasonLabel('DELETED');
    }

    if (!item.allAddonsAvailable) {
      const badAddons = item.addons.filter((a) => !a.isAvailable || a.currentPrice === null);
      if (badAddons.length === 0) {
        return tOr(t, 'customer.reorder.reason.addonsUnavailable', 'Some addons are unavailable');
      }

      const details = badAddons
        .slice(0, 3)
        .map((a) => `${a.name} (${reasonLabel(a.currentPrice === null ? 'DELETED' : a.reason)})`)
        .join(', ');

      const more = badAddons.length > 3 ? ` +${badAddons.length - 3}` : '';
      return tOr(t, 'customer.reorder.reason.addonsUnavailable', 'Some addons are unavailable') + `: ${details}${more}`;
    }

    return null;
  };

  const fetchReorderPreview = async (order: OrderHistoryItem): Promise<ReorderPreviewResponse | null> => {
    if (!auth) return null;

    const response = await fetch(`/api/customer/orders/${order.id}/reorder`, {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      showError(error?.message || t('common.error'));
      return null;
    }

    const json = await response.json();
    return json?.data ?? null;
  };

  const performReorder = async (
    order: OrderHistoryItem,
    preview: ReorderPreviewResponse,
    options?: { forceSwitchCart?: boolean },
  ) => {
    if (!auth) return;

    setReorderingOrderId(order.id.toString());

    try {
      const orderMode = order.mode;

      const needsSwitch =
        options?.forceSwitchCart ||
        (cart && (cart.merchantCode !== order.merchantCode || cart.mode !== orderMode)) ||
        (merchantCode && merchantCode !== order.merchantCode);

      if (needsSwitch) {
        initializeCart(order.merchantCode, orderMode);
        await waitForCartToMatch(order.merchantCode, orderMode);
      }

      if (!preview.summary.merchantOpen) {
        showError(t('customer.store.closed'));
        return;
      }

      if (!preview.summary.canReorder) {
        showError(t('customer.reorder.noAvailableItems'));
        return;
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const item of preview.items as ReorderItem[]) {
        if (item.isAvailable && item.allAddonsAvailable && item.currentPrice !== null) {
          const validAddons = item.addons
            .filter((addon) => addon.isAvailable && addon.currentPrice !== null)
            .map((addon) => ({
              id: addon.id,
              name: addon.name,
              price: addon.currentPrice as number,
            }));

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

      if (addedCount > 0 && skippedCount === 0) {
        showSuccess(t('customer.reorder.success', { count: addedCount }));
      } else if (addedCount > 0 && skippedCount > 0) {
        showWarning(t('customer.reorder.partialSuccess', { added: addedCount, skipped: skippedCount }));
      }

      router.push(customerOrderUrl(order.merchantCode, { mode: orderMode }));

    } catch (error) {
      console.error('Re-order error:', error);
      showError(t('common.error'));
    } finally {
      setReorderingOrderId(null);
    }
  };

  const handleReorder = async (order: OrderHistoryItem) => {
    if (!auth) return;

    setReorderingOrderId(order.id.toString());

    try {
      const preview = await fetchReorderPreview(order);
      if (!preview) return;

      if (!preview.summary.merchantOpen) {
        showError(t('customer.store.closed'));
        return;
      }

      if (!preview.summary.canReorder) {
        showError(t('customer.reorder.noAvailableItems'));
        return;
      }

      const orderMode = order.mode;
      const needsSwitch =
        (cartRef.current && (cartRef.current.merchantCode !== order.merchantCode || cartRef.current.mode !== orderMode)) ||
        Boolean(merchantCode && merchantCode !== order.merchantCode);

      const skipped = (preview.items || [])
        .map((it) => ({ name: it.menuName, reason: getItemSkipReason(it) }))
        .filter((x): x is { name: string; reason: string } => Boolean(x.reason));

      const availableCount = (preview.items || []).filter((it) => it.isAvailable && it.allAddonsAvailable && it.currentPrice !== null).length;

      // Show modal when we'd switch cart/merchant OR when some items will be skipped.
      if (needsSwitch || skipped.length > 0) {
        setPendingReorderPreview({
          order,
          preview,
          needsSwitch,
          availableCount,
          skipped,
        });
        return;
      }

      await performReorder(order, preview);
    } catch (error) {
      console.error('Re-order preview error:', error);
      showError(t('common.error'));
    } finally {
      setReorderingOrderId(null);
    }
  };

  const handleDownloadReceipt = async (order: OrderHistoryItem) => {
    if (!auth) return;

    setDownloadingOrderId(order.id.toString());

    try {
      const fullOrderNumber = order.orderNumber.includes('-')
        ? order.orderNumber
        : `${order.merchantCode}-${order.orderNumber}`;

      triggerPublicOrderReceiptDownload({
        orderNumber: fullOrderNumber,
        token: order.trackingToken,
      });
      showSuccess(t('customer.receipt.downloadSuccess'));

    } catch (error) {
      console.error('Download receipt error:', error);
      showError(t('customer.receipt.downloadFailed'));
    } finally {
      setDownloadingOrderId(null);
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
    const trackingToken = order.trackingToken;

    if (status === 'pending') {
      saveScrollPosition();
      const currentPath = getCurrentInternalPathWithQuery() ?? window.location.pathname + window.location.search;
      router.push(customerOrderSummaryCashUrl(order.merchantCode, {
        orderNumber: order.orderNumber,
        mode: order.mode,
        token: trackingToken,
        from: 'history',
        ref: currentPath,
      }));
      return;
    }

    saveScrollPosition();
    const currentPath = getCurrentInternalPathWithQuery() ?? window.location.pathname + window.location.search;

    router.push(customerOrderDetailUrl(order.merchantCode, order.orderNumber, {
      mode: order.mode,
      token: trackingToken,
      ref: currentPath,
    }));
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
      return tB - tA;
    });

    return items;
  }, [effectiveType, orders, reservations]);

  return (
    <div className="">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={pushBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.history.title')}
          </h1>
        </div>

        <div className="px-4 pb-3">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            {tOr(t, 'customer.history.rangeLabel', 'Range')}
          </label>
          <select
            value={rangeDays}
            onChange={(e) => {
              const next = Number(e.target.value);
              setRangeDays(next);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value={30}>{tOr(t, 'customer.history.last30Days', 'Last 30 days')}</option>
            <option value={60}>{tOr(t, 'customer.history.last2Months', 'Last 2 months')}</option>
            <option value={90}>{tOr(t, 'customer.history.last3Months', 'Last 3 months')}</option>
            <option value={365}>{tOr(t, 'customer.history.last1Year', 'Last 1 year')}</option>
          </select>
        </div>

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

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <CustomerHistoryListSkeleton rows={5} />
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-20">
            <FaClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-base font-semibold text-gray-900 mb-2">
              {t('customer.history.noOrders')}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {t('customer.history.noOrdersDesc')}
            </p>
            <button
              onClick={() => router.push(merchantCode ? customerMerchantHomeUrl(merchantCode) : '/merchant')}
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
                              router.push(customerOrderDetailUrl(reservation.merchantCode, reservation.order!.orderNumber, {
                                mode: String(reservation.order!.mode || 'dinein'),
                                token: reservation.order!.trackingToken,
                              }));
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
                                customerReservationDetailUrl(reservation.merchantCode, reservation.id, {
                                  mode: mode || 'dinein',
                                })
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
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 mb-1 truncate">
                        {order.merchantName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.placedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(order.status)}
                      {order.changedByAdmin ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          {t('common.changedByAdmin') || 'Changed by admin'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">{t('customer.track.orderNumber')}</p>
                    <div className="inline-flex items-center rounded overflow-hidden border border-gray-200">
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 font-mono font-medium text-xs">
                        {order.merchantCode}
                      </span>
                      <span className="px-2 py-1 bg-white text-gray-900 font-mono font-bold text-xs">
                        {order.orderNumber.includes('-')
                          ? order.orderNumber.split('-').slice(1).join('-')
                          : order.orderNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
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

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order);
                      }}
                      className="flex-1 py-2 text-sm font-semibold text-orange-500 border border-orange-500 rounded-lg hover:bg-orange-50 transition-all"
                    >
                      {t('customer.history.viewOrder')}
                    </button>

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

                    {isOrderActive && !isOrderPending && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentPath = window.location.pathname + window.location.search;
                          router.push(customerTrackUrl(order.merchantCode, order.orderNumber, {
                            mode: order.mode,
                            token: order.trackingToken,
                            ref: currentPath,
                          }));
                        }}
                        className="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-all"
                      >
                        {t('customer.history.trackOrder')}
                      </button>
                    )}

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

      <ConfirmationModal
        isOpen={Boolean(pendingReorderPreview)}
        onClose={() => setPendingReorderPreview(null)}
        onConfirm={() => {
          if (!pendingReorderPreview) return;
          const { order, preview, needsSwitch } = pendingReorderPreview;
          setPendingReorderPreview(null);
          performReorder(order, preview, needsSwitch ? { forceSwitchCart: true } : undefined);
        }}
        title={tOr(t, 'customer.reorder.previewTitle', 'Re-order summary')}
        message={
          <div className="space-y-3">
            {pendingReorderPreview?.needsSwitch ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-800">
                {tOr(
                  t,
                  'customer.reorder.switchMerchantMessage',
                  'Your current cart is for a different merchant. Switching will replace your cart. Continue?'
                )}
              </div>
            ) : null}

            <div className="text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{tOr(t, 'customer.reorder.previewWillAdd', 'Will add')}</span>
                <span className="font-semibold">{pendingReorderPreview?.availableCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{tOr(t, 'customer.reorder.previewWillSkip', 'Will skip')}</span>
                <span className="font-semibold">{pendingReorderPreview?.skipped.length ?? 0}</span>
              </div>
            </div>

            {(pendingReorderPreview?.skipped.length ?? 0) > 0 ? (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  {tOr(t, 'customer.reorder.previewSkippedReason', 'Skipped items (reason)')}
                </div>
                <ul className="max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-3 py-2 text-sm">
                  {pendingReorderPreview?.skipped.slice(0, 8).map((s, idx) => (
                    <li key={`${s.name}-${idx}`} className="py-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{s.name}</span>
                      <span className="text-gray-500"> — {s.reason}</span>
                    </li>
                  ))}
                  {(pendingReorderPreview?.skipped.length ?? 0) > 8 ? (
                    <li className="py-1 text-gray-500">
                      +{(pendingReorderPreview?.skipped.length ?? 0) - 8}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        }
        cancelText={t('common.no')}
        confirmText={tOr(t, 'customer.reorder.previewConfirm', 'Continue')}
        variant="warning"
      />
    </div>
  );
}
