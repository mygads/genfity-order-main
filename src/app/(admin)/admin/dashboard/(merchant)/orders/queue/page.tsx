/**
 * Queue/Lounge Display Page
 * 
 * Large display for customer waiting area
 * Shows READY orders with prominent order numbers
 * Designed for TV/monitor display in restaurant lounge
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaExpand, FaCompress, FaEye, FaBell, FaWifi, FaClock } from 'react-icons/fa';
import type { OrderWithDetails } from '@/lib/types/order';
import { playNotificationSound } from '@/lib/utils/soundNotification';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useContextualHint, CONTEXTUAL_HINTS } from '@/lib/tutorial/components/ContextualHint';
import { KitchenDisplaySkeleton } from '@/components/common/SkeletonLoaders';
import { useMerchant } from '@/context/MerchantContext';
import { formatFullOrderNumber } from '@/lib/utils/format';
import { buildOrderApiUrl, getOrderWsBaseUrl } from '@/lib/utils/orderApiBase';

export default function QueueDisplayPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const { merchant } = useMerchant();

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');
  const [previousOrderIds, setPreviousOrderIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());

  // Show contextual hints on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.ordersQueueFirstVisit);
      // Show sound notification tip after 3 seconds
      const timer = setTimeout(() => {
        showHint(CONTEXTUAL_HINTS.ordersQueueSoundAlert);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, showHint]);

  // Fetch READY orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(buildOrderApiUrl('/api/merchant/orders?status=READY&limit=50'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const readyOrders = data.data as OrderWithDetails[];

        // Sort by actualReadyAt (most recent first)
        const sortedOrders = readyOrders.sort((a, b) => {
          const aTime = a.actualReadyAt ? new Date(a.actualReadyAt).getTime() : 0;
          const bTime = b.actualReadyAt ? new Date(b.actualReadyAt).getTime() : 0;
          return bTime - aTime;
        });

        // Detect new ready orders and play sound
        const currentOrderIds = new Set(sortedOrders.map((o) => String(o.id)));
        const newOrders = sortedOrders.filter((o) => !previousOrderIds.has(String(o.id)));

        if (newOrders.length > 0 && previousOrderIds.size > 0) {
          playNotificationSound('orderReady');
        }

        setOrders(sortedOrders);
        setPreviousOrderIds(currentOrderIds);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch ready orders');
      }
    } catch (err) {
      console.error('Error fetching ready orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [router, previousOrderIds]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (wsConnected) return;
    const interval = setInterval(fetchOrders, 3000); // 3 seconds for quick updates
    return () => clearInterval(interval);
  }, [wsConnected, fetchOrders]);

  // Clock (useful for TV/monitor display)
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // WebSocket refresh (fallback to polling if WS is not available)
  useEffect(() => {
    const wsBase = getOrderWsBaseUrl();
    if (!wsBase) {
      setWsConnected(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setWsConnected(false);
      return;
    }

    const wsUrl = `${wsBase}/ws/merchant/orders?token=${encodeURIComponent(`Bearer ${token}`)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload?.type === 'orders.refresh') {
          fetchOrders();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [fetchOrders]);

  // Handle display mode changes
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-header]') as HTMLElement;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement;

    if (displayMode === 'clean' || displayMode === 'fullscreen') {
      document.body.classList.add('clean-mode');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    }

    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, [displayMode]);

  // Listen to fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && displayMode === 'fullscreen') {
        setDisplayMode('normal');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [displayMode]);

  // Calculate time since order was ready
  const getTimeSinceReady = (readyAt: string | Date | null) => {
    if (!readyAt) return '';
    const now = new Date();
    const ready = new Date(readyAt);
    const diffMs = now.getTime() - ready.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t("admin.queue.justNow");
    if (diffMins === 1) return t("admin.queue.1min");
    if (diffMins < 60) return `${diffMins} ${t("admin.queue.mins")}`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading && orders.length === 0) {
    return <KitchenDisplaySkeleton />;
  }

  return (
    <div data-tutorial="queue-page" className={`${displayMode !== 'normal' ? 'fixed inset-0 z-40 overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col' : 'flex flex-col h-[calc(100vh-100px)]'}`}>
      {/* Header - Display-only */}
      <div className={`sticky top-0 z-30 bg-white/95 backdrop-blur dark:bg-gray-950/85 border-b border-gray-200 dark:border-gray-800 ${displayMode !== 'normal' ? 'px-6 py-4' : 'pb-4 -mx-6 px-6 pt-0'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaBell className="text-success-500" />
              {t("admin.queue.title")}
            </h1>

            {/* Status Count - Minimal */}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{orders.length}</span> {t("admin.queue.readyForPickup")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${wsConnected
              ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-900/40 dark:bg-success-900/15 dark:text-success-300'
              : 'border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
              <FaWifi className="h-3.5 w-3.5" />
            </div>

            {/* Clock */}
            <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              <FaClock className="h-3.5 w-3.5 text-gray-400" />
              <span className="tabular-nums">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Display Mode Toggle */}
            <button
              data-tutorial="queue-display-mode"
              onClick={async () => {
                if (displayMode === 'normal') {
                  setDisplayMode('clean');
                } else if (displayMode === 'clean') {
                  try {
                    await document.documentElement.requestFullscreen();
                    setDisplayMode('fullscreen');
                  } catch (err) {
                    console.error('Error entering fullscreen:', err);
                  }
                } else {
                  try {
                    if (document.fullscreenElement) {
                      await document.exitFullscreen();
                    }
                    setDisplayMode('normal');
                  } catch (err) {
                    console.error('Error exiting fullscreen:', err);
                  }
                }
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${displayMode !== 'normal'
                ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              title={
                displayMode === 'normal' ? t("admin.queue.enterCleanMode") :
                  displayMode === 'clean' ? t("admin.queue.enterFullScreen") :
                    t("admin.queue.exitFullScreen")
              }
            >
              {displayMode === 'normal' ? <FaEye className="h-3.5 w-3.5" /> :
                displayMode === 'clean' ? <FaExpand className="h-3.5 w-3.5" /> :
                  <FaCompress className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto ${displayMode !== 'normal' ? 'px-6 py-6' : 'pt-6'}`}>
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
            <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
          </div>
        )}

        {/* Queue Grid - Display-only cards */}
        {orders.length > 0 ? (
          <div data-tutorial="queue-grid" className={`grid gap-4 ${displayMode !== 'normal'
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
            {orders.map((order, index) => (
              <div
                key={String(order.id)}
                data-tutorial={index === 0 ? "queue-order-card" : undefined}
                className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900 ${index === 0
                  ? 'border-success-300 ring-1 ring-success-200 dark:border-success-700/60 dark:ring-success-900/40'
                  : 'border-gray-200 dark:border-gray-800'
                  }`}
              >
                {/* New badge for most recent */}
                {index === 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full border border-success-200 bg-success-50 px-3 py-1 text-xs font-semibold text-success-800 dark:border-success-900/40 dark:bg-success-900/15 dark:text-success-300">
                      {t("admin.queue.latest")}
                    </span>
                  </div>
                )}

                <div className={`p-6 ${displayMode !== 'normal' ? 'py-10' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("admin.queue.ready")}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                      {getTimeSinceReady(order.actualReadyAt)}
                    </div>
                  </div>

                  <div className={`mt-3 text-center font-black tracking-tight ${displayMode !== 'normal' ? 'text-7xl' : 'text-5xl'} text-gray-900 dark:text-white`}>
                    {formatFullOrderNumber(order.orderNumber, merchant?.code)}
                  </div>

                  <div className={`mt-4 text-center font-semibold ${displayMode !== 'normal' ? 'text-2xl' : 'text-lg'} text-gray-800 dark:text-gray-200`}>
                    {order.customer?.name || (order as unknown as { customerName?: string }).customerName || t('admin.history.customer.guest')}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {order.orderType === 'DINE_IN' ? t("admin.queue.dineIn") : t("admin.queue.takeaway")}
                    </span>
                    {order.orderType === 'DINE_IN' && (order as unknown as { tableNumber?: string }).tableNumber && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {t("admin.queue.table")} {(order as unknown as { tableNumber?: string }).tableNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div data-tutorial="queue-empty-state" className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${displayMode !== 'normal' ? 'min-h-[60vh] py-20' : 'py-16'
            }`}>
            <div className={`rounded-full bg-gray-100 dark:bg-gray-800 ${displayMode !== 'normal' ? 'p-8' : 'p-6'}`}>
              <FaBell className={`text-gray-400 ${displayMode !== 'normal' ? 'h-16 w-16' : 'h-12 w-12'}`} />
            </div>
            <h3 className={`mt-4 font-semibold text-gray-600 dark:text-gray-400 ${displayMode !== 'normal' ? 'text-2xl' : 'text-lg'}`}>
              {t("admin.queue.noOrdersReady")}
            </h3>
            <p className={`mt-2 text-gray-500 dark:text-gray-500 ${displayMode !== 'normal' ? 'text-lg' : 'text-sm'}`}>
              {t("admin.queue.ordersAppearHere")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
