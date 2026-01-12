'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearDriverAuth, getDriverAuth, getDriverToken } from '@/lib/utils/driverAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from '@/components/common/LanguageSelector';
import { formatCurrency } from '@/lib/utils/format';

type DriverDashboardResponse = {
  success: boolean;
  data?: {
    role: 'DELIVERY';
    merchant?: {
      id: string;
      code: string;
      name: string;
      currency: string;
    };
    stats?: {
      assignedCount: number;
      pickedUpCount: number;
      deliveredTodayCount: number;
    };
    historyFilter?: 'today' | 'yesterday' | '7d' | 'all';
    activeDeliveries?: Array<{
      id: string;
      orderNumber: string;
      deliveryStatus: string;
      deliveryAddress?: string | null;
      deliveryUnit?: string | null;
      deliveryLatitude?: string | number | null;
      deliveryLongitude?: string | number | null;
      deliveryDeliveredAt?: string | null;
      itemsCount: number;
      placedAt: string;
      customer?: {
        name?: string | null;
        phone?: string | null;
      } | null;
      merchant?: {
        id: string;
        code: string;
        name: string;
        currency: string;
      };
      orderStatus?: string;
      totalAmount?: string | number;
      payment?: {
        status?: string;
        paymentMethod?: string;
        amount?: string | number;
        paidAt?: string | null;
      } | null;
    }>;
    historyDeliveries?: Array<{
      id: string;
      orderNumber: string;
      deliveryStatus: string;
      deliveryAddress?: string | null;
      deliveryUnit?: string | null;
      deliveryLatitude?: string | number | null;
      deliveryLongitude?: string | number | null;
      deliveryDeliveredAt?: string | null;
      itemsCount: number;
      placedAt: string;
      customer?: {
        name?: string | null;
        phone?: string | null;
      } | null;
      merchant?: {
        id: string;
        code: string;
        name: string;
        currency: string;
      };
      orderStatus?: string;
      totalAmount?: string | number;
      payment?: {
        status?: string;
        paymentMethod?: string;
        amount?: string | number;
        paidAt?: string | null;
      } | null;
    }>;
    noMerchant?: boolean;
  };
  message?: string;
};

export default function DriverDashboardPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [data, setData] = useState<DriverDashboardResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'PICKED_UP'>('ALL');
  const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | '7d' | 'all'>('today');
  const [codConfirmOrderId, setCodConfirmOrderId] = useState<string | null>(null);
  const [codConfirmChecked, setCodConfirmChecked] = useState(false);
  const [mapPreviewOrderId, setMapPreviewOrderId] = useState<string | null>(null);

  const merchantLabel = useMemo(() => {
    if (!data?.merchant) return t('driver.dashboard.title');
    return `${data.merchant.name} • ${t('driver.dashboard.title')}`;
  }, [data?.merchant, t]);

  const filteredDeliveries = useMemo(() => {
    const deliveries = data?.activeDeliveries ?? [];
    if (statusFilter === 'ALL') return deliveries;
    return deliveries.filter((d) => d.deliveryStatus === statusFilter);
  }, [data?.activeDeliveries, statusFilter]);

  const mapPreviewOrder = useMemo(() => {
    if (!mapPreviewOrderId) return null;
    const all = [...(data?.activeDeliveries ?? []), ...(data?.historyDeliveries ?? [])];
    return all.find((o) => o.id === mapPreviewOrderId) ?? null;
  }, [data?.activeDeliveries, data?.historyDeliveries, mapPreviewOrderId]);

  const formatMoney = useCallback(
    (amount: unknown) => {
      const numeric = typeof amount === 'string' ? Number(amount) : typeof amount === 'number' ? amount : 0;
      const currency = data?.merchant?.currency || 'AUD';
      return formatCurrency(Number.isFinite(numeric) ? numeric : 0, currency, locale);
    },
    [data?.merchant?.currency, locale]
  );

  useEffect(() => {
    const auth = getDriverAuth();
    if (!auth) {
      router.replace('/driver/login?error=unauthorized');
      return;
    }

    if (auth.user.role !== 'DELIVERY') {
      clearDriverAuth();
      router.replace('/driver/login');
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(overrideHistoryFilter?: 'today' | 'yesterday' | '7d' | 'all') {
    setIsLoading(true);
    setError('');

    const token = getDriverToken();
    if (!token) {
      clearDriverAuth();
      router.replace('/driver/login?error=expired');
      return;
    }

    try {
      const history = overrideHistoryFilter ?? historyFilter;
      const res = await fetch(`/api/driver/dashboard?history=${encodeURIComponent(history)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        clearDriverAuth();
        router.replace('/driver/login?error=expired');
        return;
      }

      const json = (await res.json()) as DriverDashboardResponse;

      if (!res.ok || !json.success) {
        setError(json?.message || t('driver.dashboard.error.loadFailed'));
        return;
      }

      if (json.data?.role !== 'DELIVERY') {
        setError(t('driver.dashboard.error.accessDenied'));
        return;
      }

      setData(json.data);
    } catch {
      setError(t('driver.dashboard.error.network'));
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(
    orderId: string,
    deliveryStatus: 'PICKED_UP' | 'DELIVERED' | 'FAILED',
    options?: { confirmCodReceived?: boolean }
  ) {
    const token = getDriverToken();
    if (!token) {
      clearDriverAuth();
      router.replace('/driver/login?error=expired');
      return;
    }

    setIsUpdatingId(orderId);
    try {
      const res = await fetch(`/api/delivery/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deliveryStatus, ...(options?.confirmCodReceived ? { confirmCodReceived: true } : null) }),
      });

      if (res.status === 401 || res.status === 403) {
        clearDriverAuth();
        router.replace('/driver/login?error=expired');
        return;
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || t('driver.dashboard.error.updateFailed'));
        return;
      }

      await load();
    } catch {
      setError(t('driver.dashboard.error.network'));
    } finally {
      setIsUpdatingId(null);
    }
  }

  function logout() {
    clearDriverAuth();
    router.replace('/driver/login');
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 px-4 py-6 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{merchantLabel}</h1>
            {data?.merchant ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('driver.dashboard.merchant')}: {data.merchant.code}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle className="bg-white/80 backdrop-blur border border-gray-200 dark:bg-gray-800/70 dark:border-gray-700" />
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t('common.refresh')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black dark:bg-white/10 dark:hover:bg-white/15"
            >
              {t('driver.dashboard.logout')}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
            {t('common.loading')}
          </div>
        ) : data?.noMerchant ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-200">{t('driver.dashboard.noMerchant')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('driver.dashboard.stats.assigned')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data?.stats?.assignedCount ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('driver.dashboard.stats.pickedUp')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data?.stats?.pickedUpCount ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('driver.dashboard.stats.deliveredToday')}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data?.stats?.deliveredTodayCount ?? 0}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('driver.dashboard.activeDeliveries')}
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'ALL', label: t('common.all') },
                        { key: 'PICKED_UP', label: t('driver.dashboard.filter.inDelivery') },
                        { key: 'ASSIGNED', label: t('driver.dashboard.filter.assigned') },
                      ] as const
                    ).map((opt) => {
                      const active = statusFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setStatusFilter(opt.key)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-[#173C82] text-white border-[#173C82]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!filteredDeliveries || filteredDeliveries.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-600 dark:text-gray-300">
                  {t('driver.dashboard.noActiveDeliveries')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDeliveries.map((o) => {
                    const lat =
                      typeof o.deliveryLatitude === 'string'
                        ? Number(o.deliveryLatitude)
                        : typeof o.deliveryLatitude === 'number'
                          ? o.deliveryLatitude
                          : null;
                    const lng =
                      typeof o.deliveryLongitude === 'string'
                        ? Number(o.deliveryLongitude)
                        : typeof o.deliveryLongitude === 'number'
                          ? o.deliveryLongitude
                          : null;

                    const address = o.deliveryAddress
                      ? o.deliveryUnit
                        ? `${o.deliveryUnit}, ${o.deliveryAddress}`
                        : o.deliveryAddress
                      : '-';

                    const mapsUrl =
                      lat !== null && lng !== null
                        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`
                        : o.deliveryAddress
                          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
                          : null;

                    const isBusy = isUpdatingId === o.id;

                    const isCod = o.payment?.paymentMethod === 'CASH_ON_DELIVERY';
                    const isPaid = o.payment?.status === 'COMPLETED';
                    const codAmount = o.payment?.amount ?? o.totalAmount;

                    const primaryAction:
                      | { label: string; nextStatus: 'PICKED_UP' | 'DELIVERED' }
                      | null =
                      o.deliveryStatus === 'ASSIGNED'
                        ? { label: t('driver.dashboard.actions.pickedUp'), nextStatus: 'PICKED_UP' }
                        : o.deliveryStatus === 'PICKED_UP'
                          ? { label: t('driver.dashboard.actions.delivered'), nextStatus: 'DELIVERED' }
                          : null;

                    return (
                      <div key={o.id} className="px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {t('driver.dashboard.order')} {o.orderNumber}
                            </p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              {t('driver.dashboard.status')}: {o.deliveryStatus}
                            </p>
                            <p className="mt-2 wrap-break-word text-xs text-gray-700 dark:text-gray-200">
                              {t('driver.dashboard.address')}: {address}
                            </p>
                            {o.customer?.phone ? (
                              <p className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                                {t('driver.dashboard.customer')}: {o.customer.phone}
                              </p>
                            ) : null}

                            {isCod ? (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                {t('driver.dashboard.cod.amountDue')}: {formatMoney(codAmount)}
                                {isPaid ? ` • ${t('driver.dashboard.cod.paid')}` : ''}
                              </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {o.customer?.phone ? (
                                <a
                                  href={`tel:${o.customer.phone}`}
                                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30"
                                >
                                  {t('driver.dashboard.call')}
                                </a>
                              ) : null}
                              {mapsUrl ? (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30"
                                >
                                  {t('driver.dashboard.openMaps')}
                                </a>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => setMapPreviewOrderId(o.id)}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30"
                              >
                                {t('driver.dashboard.previewMap')}
                              </button>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-stretch">
                            {primaryAction ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const needsCodConfirm =
                                    primaryAction.nextStatus === 'DELIVERED' && isCod && !isPaid;
                                  if (needsCodConfirm) {
                                    setCodConfirmOrderId(o.id);
                                    setCodConfirmChecked(false);
                                    return;
                                  }

                                  void updateStatus(o.id, primaryAction.nextStatus);
                                }}
                                className={
                                  primaryAction.nextStatus === 'DELIVERED'
                                    ? 'rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60'
                                    : 'rounded-lg bg-[#173C82] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12326c] disabled:opacity-60'
                                }
                              >
                                {primaryAction.label}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('driver.dashboard.historyTitle')}
                  </h2>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'today', label: t('driver.dashboard.historyFilter.today') },
                        { key: 'yesterday', label: t('driver.dashboard.historyFilter.yesterday') },
                        { key: '7d', label: t('driver.dashboard.historyFilter.last7Days') },
                        { key: 'all', label: t('driver.dashboard.historyFilter.all') },
                      ] as const
                    ).map((opt) => {
                      const active = historyFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setHistoryFilter(opt.key);
                            void load(opt.key);
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-[#173C82] text-white border-[#173C82]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!data?.historyDeliveries || data.historyDeliveries.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  {t('driver.dashboard.noHistory')}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.historyDeliveries.map((o) => {
                    const deliveredAt = o.deliveryDeliveredAt ? new Date(o.deliveryDeliveredAt).toLocaleString() : '';
                    return (
                      <div
                        key={o.id}
                        className={`w-full text-left px-4 py-4 transition-colors ${
                          'hover:bg-gray-50 dark:hover:bg-gray-900/20'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {t('driver.dashboard.order')} {o.orderNumber}
                            </p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              {t('driver.dashboard.status')}: {o.deliveryStatus}
                              {deliveredAt ? ` • ${deliveredAt}` : ''}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setMapPreviewOrderId(o.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-900/30"
                            >
                              {t('driver.dashboard.previewMap')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {mapPreviewOrderId ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMapPreviewOrderId(null)} />

          <div className="relative z-10 w-full max-w-3xl mx-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:bg-gray-900 dark:border-gray-800">
            {(() => {
              const order = mapPreviewOrder;
              const address = order?.deliveryAddress
                ? order?.deliveryUnit
                  ? `${order.deliveryUnit}, ${order.deliveryAddress}`
                  : order.deliveryAddress
                : null;

              const lat =
                typeof order?.deliveryLatitude === 'string'
                  ? Number(order.deliveryLatitude)
                  : typeof order?.deliveryLatitude === 'number'
                    ? order.deliveryLatitude
                    : null;
              const lng =
                typeof order?.deliveryLongitude === 'string'
                  ? Number(order.deliveryLongitude)
                  : typeof order?.deliveryLongitude === 'number'
                    ? order.deliveryLongitude
                    : null;

              const query = lat !== null && lng !== null ? `${lat},${lng}` : address;
              const embedUrl = query
                ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
                : null;
              const mapsUrl = query
                ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
                : null;

              return (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {t('driver.dashboard.mapModal.title')} {order?.orderNumber ? `#${order.orderNumber}` : ''}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 truncate">
                        {address || t('driver.dashboard.mapModal.noAddress')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#173C82] px-3 text-xs font-semibold text-white hover:bg-[#12326c]"
                        >
                          {t('driver.dashboard.openMaps')}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setMapPreviewOrderId(null)}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </div>

                  {embedUrl ? (
                    <iframe title="Map preview" src={embedUrl} className="h-130 w-full" loading="lazy" />
                  ) : (
                    <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-300">
                      {t('driver.dashboard.mapModal.noLocation')}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {codConfirmOrderId ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCodConfirmOrderId(null)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:bg-gray-900 dark:border-gray-800">
            {(() => {
              const order = data?.activeDeliveries?.find((o) => o.id === codConfirmOrderId) ?? null;
              const amount = order?.payment?.amount ?? order?.totalAmount;

              return (
                <>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('driver.dashboard.codConfirm.title')}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('driver.dashboard.codConfirm.subtitle')}</p>

                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                    <div className="font-semibold">{t('driver.dashboard.codConfirm.amountLabel')}</div>
                    <div className="mt-1 text-base font-bold">{formatMoney(amount)}</div>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={codConfirmChecked}
                      onChange={(e) => setCodConfirmChecked(e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>{t('driver.dashboard.codConfirm.checkbox')}</span>
                  </label>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCodConfirmOrderId(null)}
                      className="flex-1 h-11 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      disabled={!codConfirmChecked || isUpdatingId === codConfirmOrderId}
                      onClick={() => {
                        const orderId = codConfirmOrderId;
                        setCodConfirmOrderId(null);
                        void updateStatus(orderId, 'DELIVERED', { confirmCodReceived: true });
                      }}
                      className="flex-1 h-11 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {t('driver.dashboard.codConfirm.confirmDelivered')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
