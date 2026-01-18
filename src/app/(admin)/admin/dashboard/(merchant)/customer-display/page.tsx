/**
 * Customer Display Page
 * Real-time mirror for POS cart and pending order review.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaClock, FaReceipt, FaExpand, FaCircle, FaSync } from 'react-icons/fa';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { formatCurrency, formatFullOrderNumber } from '@/lib/utils/format';
import type {
  CustomerDisplayState,
  CustomerDisplayCartPayload,
  CustomerDisplayOrderPayload,
  CustomerDisplayThankYouPayload,
  CustomerDisplaySessionState,
} from '@/lib/types/customerDisplay';

interface MerchantProfile {
  name: string;
  code: string;
  currency: string;
  timezone?: string | null;
  logoUrl?: string | null;
  promoBannerUrls?: string[];
}

interface CustomerDisplaySessionInfo {
  sessionId: string;
  userId: string;
  staffName?: string | null;
  role?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
  expiresAt: string;
}

export default function CustomerDisplayPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [displayState, setDisplayState] = useState<CustomerDisplayState | null>(null);
  const [availableSessions, setAvailableSessions] = useState<CustomerDisplaySessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isRefreshingSessions, setIsRefreshingSessions] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [promoIndex, setPromoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cachedPromoUrls, setCachedPromoUrls] = useState<string[]>([]);
  const [isPromoPreloading, setIsPromoPreloading] = useState(false);
  const promoCacheRef = useRef<string[]>([]);

  const promoBanners = useMemo(() => merchant?.promoBannerUrls ?? [], [merchant?.promoBannerUrls]);
  const currency = merchant?.currency || 'AUD';
  const timezone = merchant?.timezone || 'Asia/Jakarta';
    const sessionInactiveThresholdMs = 5 * 60 * 1000;

  const fetchMerchantProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const response = await fetch('/api/merchant/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const json = await response.json();
    if (json?.success && json?.data) {
      const data = json.data as MerchantProfile & { promoBannerUrls?: string[] };
      setMerchant({
        name: data.name,
        code: data.code,
        currency: data.currency || 'AUD',
        timezone: data.timezone || null,
        logoUrl: data.logoUrl || null,
        promoBannerUrls: Array.isArray(data.promoBannerUrls) ? data.promoBannerUrls : [],
      });
    }
  }, [router]);

  const fetchDisplayState = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const response = await fetch('/api/merchant/customer-display/state', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const json = await response.json();
    if (json?.success && json?.data) {
      setDisplayState(json.data as CustomerDisplayState);
    }
  }, [router]);

  const fetchSessionList = useCallback(async () => {
    setIsRefreshingSessions(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const response = await fetch('/api/merchant/customer-display/sessions', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setIsRefreshingSessions(false);
      return;
    }

    const json = await response.json();
    if (json?.success && json?.data?.sessions) {
      setAvailableSessions(json.data.sessions as CustomerDisplaySessionInfo[]);
    }
    setIsRefreshingSessions(false);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await fetchMerchantProfile();
      await fetchDisplayState();
      await fetchSessionList();
      if (!cancelled) {
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchMerchantProfile, fetchDisplayState, fetchSessionList]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchDisplayState();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [fetchDisplayState]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchSessionList();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchSessionList]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    handleFullScreenChange();
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement | null;
    const header = document.querySelector('[data-header]') as HTMLElement | null;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement | null;

    document.body.classList.add('clean-mode');
    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';
    if (breadcrumb) breadcrumb.style.display = 'none';

    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      if (promoBanners.length === 0) {
        promoCacheRef.current.forEach((url) => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        promoCacheRef.current = [];
        setCachedPromoUrls((prev) => (prev.length ? [] : prev));
        setIsPromoPreloading((prev) => (prev ? false : prev));
        return;
      }

      setIsPromoPreloading(true);

      const results = await Promise.all(
        promoBanners.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) return url;
            const blob = await response.blob();
            return URL.createObjectURL(blob);
          } catch {
            return url;
          }
        })
      );

      if (cancelled) {
        results.forEach((url) => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
        return;
      }

      promoCacheRef.current.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });

      promoCacheRef.current = results;
      setCachedPromoUrls(results);
      setIsPromoPreloading(false);
    };

    preload();

    return () => {
      cancelled = true;
    };
  }, [promoBanners]);

  useEffect(() => () => {
    promoCacheRef.current.forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!merchant?.code) return;

    const key = `customer_display_session_${merchant.code}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setSelectedSessionId(stored);
    }
  }, [merchant?.code]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!merchant?.code) return;
    if (!selectedSessionId) return;

    const key = `customer_display_session_${merchant.code}`;
    localStorage.setItem(key, selectedSessionId);
  }, [merchant?.code, selectedSessionId]);

  useEffect(() => {
    if (availableSessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    if (selectedSessionId && availableSessions.some((session) => session.sessionId === selectedSessionId)) {
      return;
    }

    const sessionsMap = (displayState?.payload?.sessions || {}) as Record<string, CustomerDisplaySessionState>;
    const best = availableSessions.reduce<null | { sessionId: string; updatedAt: number }>((current, session) => {
      const updatedAt = sessionsMap[session.sessionId]?.updatedAt
        ? new Date(sessionsMap[session.sessionId]?.updatedAt as string).getTime()
        : 0;
      if (!current || updatedAt > current.updatedAt) {
        return { sessionId: session.sessionId, updatedAt };
      }
      return current;
    }, null);

    setSelectedSessionId(best?.sessionId || availableSessions[0].sessionId);
  }, [availableSessions, displayState?.payload?.sessions, selectedSessionId]);

  const sessionMap = useMemo(
    () => (displayState?.payload?.sessions || {}) as Record<string, CustomerDisplaySessionState>,
    [displayState?.payload?.sessions]
  );

  const selectedSession = selectedSessionId ? sessionMap[selectedSessionId] : undefined;
  const activePayload = selectedSessionId
    ? (selectedSession?.payload ?? null)
    : (displayState?.payload ?? null);
  const activeMode = selectedSessionId
    ? (selectedSession?.mode ?? 'IDLE')
    : (displayState?.mode ?? 'IDLE');
  const activeUpdatedAt = selectedSessionId
    ? (selectedSession?.updatedAt ?? null)
    : (displayState?.updatedAt ?? null);
  const activeStaffName = useMemo(() => {
    if (selectedSession?.staffName) return selectedSession.staffName;
    if (!selectedSessionId) return null;
    return availableSessions.find((session) => session.sessionId === selectedSessionId)?.staffName ?? null;
  }, [availableSessions, selectedSession?.staffName, selectedSessionId]);

  const isStale = useMemo(() => {
    if (!activeUpdatedAt) return true;
    const updatedAt = new Date(activeUpdatedAt).getTime();
    return nowTick - updatedAt > 15_000;
  }, [activeUpdatedAt, nowTick]);

  const isSessionLocked = useMemo(() => {
    if (selectedSession?.isLocked !== undefined) return Boolean(selectedSession.isLocked);
    return Boolean(displayState?.isLocked);
  }, [displayState?.isLocked, selectedSession?.isLocked]);

  const cartPayload = activePayload?.cart as CustomerDisplayCartPayload | undefined;
  const orderPayload = activePayload?.order as CustomerDisplayOrderPayload | undefined;
  const thankYouPayload = activePayload?.thankYou as CustomerDisplayThankYouPayload | undefined;

  const hasActiveItems = useMemo(() => {
    const cartItems = cartPayload?.items || [];
    const orderItems = orderPayload?.items || [];
    return cartItems.length > 0 || orderItems.length > 0;
  }, [cartPayload?.items, orderPayload?.items]);

  const showPromo = useMemo(() => {
    if (!displayState) return true;
    if (isSessionLocked) return false;
    if (hasActiveItems) return false;
    if (activeMode === 'IDLE') return true;
    return isStale;
  }, [activeMode, displayState, hasActiveItems, isSessionLocked, isStale]);

  const promoSlides = cachedPromoUrls.length ? cachedPromoUrls : promoBanners;

  useEffect(() => {
    if (!showPromo) return;
    if (promoSlides.length <= 1) return;

    const interval = window.setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promoSlides.length);
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [promoSlides.length, showPromo]);

  const formatAmount = useCallback(
    (amount: number) => formatCurrency(amount, currency, locale),
    [currency, locale]
  );

  const orderTypeLabel = (type: string) => {
    if (type === 'DELIVERY') return tOr(t, 'admin.customerDisplay.orderType.delivery', 'Delivery');
    if (type === 'TAKEAWAY') return tOr(t, 'admin.customerDisplay.orderType.takeaway', 'Takeaway');
    return tOr(t, 'admin.customerDisplay.orderType.dineIn', 'Dine In');
  };

  if (loading && !merchant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
        {t('common.loading') || 'Loading...'}
      </div>
    );
  }

  const cashierLabel = activeStaffName
    ? `${tOr(t, 'admin.customerDisplay.cashierLabel', 'Cashier')}: ${activeStaffName}`
    : `${tOr(t, 'admin.customerDisplay.cashierLabel', 'Cashier')}: ${tOr(t, 'admin.customerDisplay.cashierUnknown', 'Not selected')}`;

  const lastUpdatedLabel = activeUpdatedAt
    ? new Date(activeUpdatedAt).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    })
    : tOr(t, 'admin.customerDisplay.cashierUnknown', 'Not selected');

  const lastUpdatedDateChip = activeUpdatedAt
    ? new Date(activeUpdatedAt).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-AU', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: timezone,
    })
    : '--';

  const lastUpdatedTooltip = activeUpdatedAt
    ? new Date(activeUpdatedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-AU', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    })
    : undefined;

  const formatSessionLabel = (session: CustomerDisplaySessionInfo) => {
    const suffix = session.sessionId.slice(-4).toUpperCase();
    const timeLabel = new Date(session.createdAt).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
    const name = session.staffName || session.userId;
    const updatedAt = sessionMap[session.sessionId]?.updatedAt
      ? new Date(sessionMap[session.sessionId]?.updatedAt as string).getTime()
      : null;
    const isInactive = !updatedAt || nowTick - updatedAt > sessionInactiveThresholdMs;
    const statusLabel = isInactive
      ? tOr(t, 'admin.customerDisplay.sessionInactive', 'Inactive')
      : tOr(t, 'admin.customerDisplay.sessionActive', 'Active');
    return `${name} · ${timeLabel} · #${suffix} · ${statusLabel}`;
  };

  return (
    <div className="fixed inset-0 z-40 flex min-h-screen flex-col bg-linear-to-br from-slate-950 via-slate-900 to-gray-950 text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {merchant?.logoUrl ? (
            <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              <Image src={merchant.logoUrl} alt={merchant.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white">
              {(merchant?.name || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-white">
              {merchant?.name || tOr(t, 'admin.customerDisplay.title', 'Customer Display')}
            </h1>
            <div className="mt-1 text-xs text-white/70">
              {cashierLabel}
            </div>
            <div
              className="mt-1 text-[11px] text-white/50"
              title={lastUpdatedTooltip}
            >
              {tOr(t, 'admin.customerDisplay.lastUpdated', 'Last update')}: {lastUpdatedLabel}
            </div>
            {hasActiveItems && (
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                <FaCircle className="h-2 w-2 text-emerald-300" />
                {tOr(t, 'admin.customerDisplay.liveCart', 'Live cart')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                {tOr(t, 'admin.customerDisplay.selectCashier', 'Cashier')}
              </span>
              {availableSessions.length > 0 ? (
                <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70">
                  <span className="text-[10px] uppercase tracking-wide text-white/50">
                    {tOr(t, 'admin.customerDisplay.lastUpdatedDate', 'Updated')}
                  </span>
                  <span className="text-xs font-semibold text-white/80">{lastUpdatedDateChip}</span>
                </div>
                  <select
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-white outline-none"
                    value={selectedSessionId || ''}
                    onChange={(event) => setSelectedSessionId(event.target.value)}
                  >
                    <option value="" disabled>
                      {tOr(t, 'admin.customerDisplay.selectCashierPlaceholder', 'Select cashier session')}
                    </option>
                    {availableSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>
                        {formatSessionLabel(session)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchSessionList}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 transition hover:bg-white/10"
                    title={tOr(t, 'common.refresh', 'Refresh')}
                    disabled={isRefreshingSessions}
                  >
                    <FaSync className={`h-3 w-3 ${isRefreshingSessions ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/70">
                  {tOr(t, 'admin.customerDisplay.noActiveSessions', 'No active sessions in last 24 hours')}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
            <FaClock className="h-4 w-4" />
            {new Date(nowTick).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-AU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: timezone,
            })}
          </div>
          {!isFullscreen && (
            <button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                } catch {
                  // Ignore fullscreen errors
                }
              }}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
              title={tOr(t, 'admin.customerDisplay.enterFullScreen', 'Enter fullscreen')}
            >
              <FaExpand className="h-3.5 w-3.5" />
              {tOr(t, 'admin.customerDisplay.enterFullScreen', 'Enter fullscreen')}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-6 py-8">
        {showPromo ? (
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
            {promoSlides.length > 0 ? (
              promoSlides.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={`absolute inset-0 transition-opacity duration-700 ${index === promoIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Image src={url} alt="Promotion" fill className="object-cover" priority={index === promoIndex} />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
                </div>
              ))
            ) : isPromoPreloading && promoBanners.length > 0 ? (
              <div className="relative h-full w-full overflow-hidden">
                <div className="absolute inset-0 animate-pulse bg-linear-to-br from-white/5 via-white/10 to-white/5" />
                <div className="absolute bottom-8 left-8 h-5 w-48 rounded-full bg-white/10" />
                <div className="absolute bottom-16 left-8 h-3 w-72 rounded-full bg-white/5" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-linear-to-br from-brand-600 via-brand-500 to-brand-700 text-white">
                <FaReceipt className="h-11 w-11 opacity-80" />
                <h2 className="mt-4 text-4xl font-bold">
                  {tOr(t, 'admin.customerDisplay.promoFallbackTitle', 'Welcome & Enjoy!')}
                </h2>
                <p className="mt-3 max-w-md text-center text-sm text-white/80">
                  {tOr(t, 'admin.customerDisplay.promoFallbackSubtitle', 'Your order updates will appear here.')}
                </p>
              </div>
            )}
          </div>
        ) : displayState?.mode === 'THANK_YOU' && thankYouPayload ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/95 text-gray-900 shadow-2xl">
            <div className="text-center">
              <p className="text-sm font-semibold text-brand-600">
                {tOr(t, 'admin.customerDisplay.thankYouTitle', 'Thank you!')}
              </p>
              <h2 className="mt-3 text-4xl font-bold">
                {tOr(t, 'admin.customerDisplay.thankYouSubtitle', 'Your order is being prepared')}
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                <span className="rounded-full border border-gray-200 px-4 py-2">
                  {tOr(t, 'admin.customerDisplay.orderNumber', 'Order')} #{formatFullOrderNumber(thankYouPayload.orderNumber, merchant?.code)}
                </span>
                {thankYouPayload.tableNumber ? (
                  <span className="rounded-full border border-gray-200 px-4 py-2">
                    {tOr(t, 'admin.customerDisplay.table', 'Table')} {thankYouPayload.tableNumber}
                  </span>
                ) : null}
                {thankYouPayload.customerName ? (
                  <span className="rounded-full border border-gray-200 px-4 py-2">
                    {thankYouPayload.customerName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1.6fr_0.8fr]">
            <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/95 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {displayState?.mode === 'ORDER_REVIEW'
                      ? tOr(t, 'admin.customerDisplay.reviewOrder', 'Order Review')
                      : tOr(t, 'admin.customerDisplay.currentOrder', 'Current Order')}
                  </p>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {orderPayload?.orderNumber
                      ? `#${formatFullOrderNumber(orderPayload.orderNumber, merchant?.code)}`
                      : tOr(t, 'admin.customerDisplay.live', 'Live Cart')}
                  </h2>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {orderTypeLabel(orderPayload?.orderType || cartPayload?.orderType || 'DINE_IN')}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {(orderPayload?.items || cartPayload?.items || []).length > 0 ? (
                  <div className="space-y-4">
                    {(orderPayload?.items || cartPayload?.items || []).map((item, index) => (
                      <div key={`${item.name}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.quantity} × {formatAmount(item.unitPrice)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatAmount(item.lineTotal)}
                          </p>
                        </div>
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-3 space-y-1 text-xs text-gray-500">
                            {item.addons.map((addon, addonIndex) => (
                              <div key={`${addon.name}-${addonIndex}`} className="flex items-center justify-between">
                                <span>+ {addon.quantity}× {addon.name}</span>
                                <span>{formatAmount(addon.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.notes ? (
                          <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                            {item.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    {tOr(t, 'admin.customerDisplay.noItems', 'No items yet')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex h-full flex-col gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl">
                <h3 className="text-sm font-semibold text-gray-700">
                  {tOr(t, 'admin.customerDisplay.summary', 'Summary')}
                </h3>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>{tOr(t, 'admin.customerDisplay.totalItems', 'Items')}</span>
                    <span>{(orderPayload?.totals || cartPayload?.totals)?.itemCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tOr(t, 'admin.customerDisplay.totalQuantity', 'Quantity')}</span>
                    <span>{(orderPayload?.totals || cartPayload?.totals)?.quantityCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tOr(t, 'admin.customerDisplay.subtotal', 'Subtotal')}</span>
                    <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.subtotal || 0)}</span>
                  </div>
                  {(orderPayload?.totals || cartPayload?.totals)?.taxAmount ? (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.tax', 'Tax')}</span>
                      <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.taxAmount || 0)}</span>
                    </div>
                  ) : null}
                  {(orderPayload?.totals || cartPayload?.totals)?.serviceChargeAmount ? (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.serviceCharge', 'Service charge')}</span>
                      <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.serviceChargeAmount || 0)}</span>
                    </div>
                  ) : null}
                  {(orderPayload?.totals || cartPayload?.totals)?.packagingFeeAmount ? (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.packagingFee', 'Packaging')}</span>
                      <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.packagingFeeAmount || 0)}</span>
                    </div>
                  ) : null}
                  {(orderPayload?.totals || cartPayload?.totals)?.deliveryFeeAmount ? (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.deliveryFee', 'Delivery')}</span>
                      <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.deliveryFeeAmount || 0)}</span>
                    </div>
                  ) : null}
                  {(orderPayload?.totals || cartPayload?.totals)?.discountAmount ? (
                    <div className="flex items-center justify-between text-green-600">
                      <span>{tOr(t, 'admin.customerDisplay.discount', 'Discount')}</span>
                      <span>-{formatAmount((orderPayload?.totals || cartPayload?.totals)?.discountAmount || 0)}</span>
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 text-base font-semibold text-gray-900">
                    <span>{tOr(t, 'admin.customerDisplay.total', 'Total')}</span>
                    <span>{formatAmount((orderPayload?.totals || cartPayload?.totals)?.totalAmount || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/95 p-6 text-sm text-gray-600 shadow-2xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>{tOr(t, 'admin.customerDisplay.orderType', 'Order type')}</span>
                    <span>{orderTypeLabel(orderPayload?.orderType || cartPayload?.orderType || 'DINE_IN')}</span>
                  </div>
                  {(orderPayload?.tableNumber || cartPayload?.tableNumber) && (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.table', 'Table')}</span>
                      <span>{orderPayload?.tableNumber || cartPayload?.tableNumber}</span>
                    </div>
                  )}
                  {(orderPayload?.customerName || cartPayload?.customerName) && (
                    <div className="flex items-center justify-between">
                      <span>{tOr(t, 'admin.customerDisplay.customer', 'Customer')}</span>
                      <span>{orderPayload?.customerName || cartPayload?.customerName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
