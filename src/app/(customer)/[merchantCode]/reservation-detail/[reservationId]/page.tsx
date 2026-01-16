'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useCustomerData } from '@/context/CustomerDataContext';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/common/SkeletonLoaders';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import OrderTotalsBreakdown from '@/components/orders/OrderTotalsBreakdown';
import { FaArrowLeft, FaBoxOpen, FaSpinner, FaUsers, FaClock } from 'react-icons/fa';

interface ReservationDetail {
  id: string;
  status: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  tableNumber: string | null;
  notes?: string | null;
  preorder?: unknown;
  preorderDetails?: null | {
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | string;
    isEstimated?: boolean;
    items: Array<{
      menuId: string;
      menuName: string | null;
      quantity: number;
      unitPrice: number;
      notes: string | null;
      addons: Array<{
        addonItemId: string;
        addonName: string | null;
        unitPrice: number;
        quantity: number;
        subtotal: number;
      }>;
      subtotal: number;
    }>;
    delivery?: null | {
      unit: string | null;
      address: string | null;
      latitude: number;
      longitude: number;
      distanceKm: number;
      feeAmount: number;
    };
    totals: {
      subtotal: number;
      taxAmount: number;
      serviceChargeAmount: number;
      packagingFeeAmount: number;
      deliveryFeeAmount: number;
      discountAmount: number;
      totalAmount: number;
    };
  };
  createdAt: string;
  merchant: {
    name: string;
    code: string;
    currency: string;
    timezone?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  order: null | {
    orderNumber: string;
    mode: 'dinein' | 'takeaway' | 'delivery' | string;
    status: string;
    trackingToken: string;
  };
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const reservationId = params.reservationId as string;
  const mode = searchParams.get('mode') || 'dinein';

  const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();
  const isTableNumberEnabled = contextMerchantInfo?.requireTableNumberForDineIn === true;

  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    initializeData(merchantCode);
  }, [merchantCode, initializeData]);

  useEffect(() => {
    if (!reservationId) return;

    const fetchReservation = async () => {
      const auth = getCustomerAuth();
      if (!auth) {
        router.push(`/login?ref=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/customer/reservations/${reservationId}?mode=${encodeURIComponent(mode)}`, {
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
          },
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          setError(json?.message || tOr(t, 'customer.errors.reservationNotFound', 'Reservation not found'));
          setReservation(null);
          return;
        }

        setReservation(json.data);
      } catch (err) {
        console.error('Failed to fetch reservation:', err);
        setError(tOr(t, 'customer.errors.reservationLoadFailed', 'Failed to load reservation'));
        setReservation(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, router, t]);

  // Use Context data when available (keeps currency/settings ready)
  useEffect(() => {
    if (isInitialized && contextMerchantInfo) {
      // no-op for now (keeps parity with other customer pages)
    }
  }, [isInitialized, contextMerchantInfo]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t('customer.status.pending') },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-700', label: t('customer.status.confirmed') },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: t('customer.status.cancelled') },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleBack = () => {
    router.push(`/${merchantCode}/history?mode=${encodeURIComponent(mode)}`);
  };

  const handleCancel = async () => {
    if (!reservation) return;

    const auth = getCustomerAuth();
    if (!auth) return;

    setCancelling(true);

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
      setReservation(json.data);
    } catch (err) {
      console.error('Cancel reservation error:', err);
      showError(tOr(t, 'customer.history.cancelReservationFailed', 'Failed to cancel reservation'));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center px-4 py-3">
            <Skeleton width="w-10" height="h-10" className="rounded-full" />
            <div className="flex-1 flex justify-center">
              <Skeleton width="w-48" height="h-5" />
            </div>
            <div className="w-10" />
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton width="w-full" height="h-24" className="rounded-xl" />
          <Skeleton width="w-full" height="h-40" className="rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <FaBoxOpen className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium mb-2">{error || tOr(t, 'customer.errors.reservationNotFound', 'Reservation not found')}</p>
        <button
          onClick={handleBack}
          className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium"
        >
          {t('customer.track.goBack')}
        </button>
      </div>
    );
  }

  const isPending = reservation.status.toLowerCase() === 'pending';
  const currency = reservation.merchant?.currency || 'AUD';

  const formatCurrency = (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '-';
    }

    return formatCurrencyUtil(amount, currency, locale);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {tOr(t, 'customer.orderDetail.reservationDetails', 'Reservation details')}
          </h1>
        </div>
      </header>

      <main className="p-4 pb-8 space-y-4">
        {/* Merchant Info Card */}
        {reservation.merchant?.name ? (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-xs text-orange-600 mb-1">Merchant</p>
            <p className="font-bold text-gray-900">{reservation.merchant.name}</p>
          </div>
        ) : null}

        {/* Reservation Info Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">{tOr(t, 'customer.reservationDetails.pillLabel', 'Reservation')}</p>
              <p className="font-mono font-bold text-sm text-gray-900">#{reservation.id}</p>
            </div>
            {getStatusBadge(reservation.status)}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div className="inline-flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-gray-500" />
              <span>{tOr(t, 'customer.orderDetail.partySize', 'Party size')}: <span className="font-semibold">{reservation.partySize}</span></span>
            </div>
            <div className="inline-flex items-center gap-2">
              <FaClock className="w-4 h-4 text-gray-500" />
              <span>{reservation.reservationDate} • {reservation.reservationTime}</span>
            </div>
            {isTableNumberEnabled && reservation.tableNumber ? (
              <div className="text-sm text-gray-700">
                {tOr(t, 'customer.orderDetail.table', 'Table')}: <span className="font-semibold">{reservation.tableNumber}</span>
              </div>
            ) : null}
          </div>

          {isPending ? (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelling}
                className="w-full py-2 text-white bg-red-600 font-semibold rounded-xl text-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <FaSpinner className="h-5 w-5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <span>{t('common.cancel')}</span>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {/* Preorder Items (if any) */}
        {reservation.preorderDetails?.items?.length ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 mb-4">{t('customer.track.orderItems')}</h2>
            <div className="space-y-3">
              {(reservation.preorderDetails.items || []).map((item, idx) => {
                const addonsLabel = (item.addons || [])
                  .map((a) => a.addonName || tOr(t, 'customer.reservationDetails.unknownAddonItem', 'Unknown add-on'))
                  .join(', ');
                const itemTotal = Number(item.subtotal) || 0;
                const menuName = item.menuName || tOr(t, 'customer.reservationDetails.unknownMenuItem', 'Unknown item');

                return (
                  <div key={`${item.menuId}-${idx}`} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.quantity}x {menuName}
                      </p>
                      {addonsLabel ? (
                        <p className="text-xs text-gray-500 mt-0.5">{addonsLabel}</p>
                      ) : null}
                      {item.notes ? (
                        <p className="text-xs text-gray-400 italic mt-0.5">&quot;{item.notes}&quot;</p>
                      ) : null}
                    </div>
                    <span className="font-medium text-gray-700 ml-4">
                      {formatCurrency(itemTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Totals breakdown for preorder (if any) */}
        {reservation.preorderDetails?.totals ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 mb-4">{t('order.paymentDetails')}</h2>
            <OrderTotalsBreakdown
              amounts={reservation.preorderDetails.totals}
              currency={currency}
              locale={locale}
              formatAmount={formatCurrency}
              labels={{
                subtotal: t('customer.payment.subtotal'),
                tax: t('customer.payment.tax'),
                serviceCharge: t('customer.payment.serviceCharge'),
                packagingFee: t('customer.payment.packagingFee'),
                deliveryFee: t('customer.track.deliveryFee'),
                discount: t('customer.payment.voucher.discount'),
                total: t('customer.payment.total'),
              }}
              options={{
                showPackagingFee: reservation.preorderDetails.orderType === 'TAKEAWAY',
                showDeliveryFee: reservation.preorderDetails.orderType === 'DELIVERY',
              }}
            />

            {reservation.preorderDetails.isEstimated ? (
              <p className="mt-3 text-xs text-gray-500">
                {tOr(
                  t,
                  'customer.reservationDetails.estimatedTotalsNote',
                  'Totals are estimated and may change if menu prices/promos change before the merchant confirms your reservation.'
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Linked Order (if any) */}
        {reservation.order?.orderNumber ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('customer.track.orderNumber')}</p>
                <p className="font-mono font-bold text-sm text-gray-900">{reservation.order.orderNumber}</p>
              </div>
              {getStatusBadge(String(reservation.order.status || 'pending'))}
            </div>

            <button
              onClick={() => {
                router.push(
                  `/${merchantCode}/order-detail/${reservation.order!.orderNumber}?mode=${encodeURIComponent(String(reservation.order!.mode || 'dinein'))}&token=${encodeURIComponent(reservation.order!.trackingToken)}`
                );
              }}
              className="mt-4 w-full py-2 text-white bg-orange-500 font-semibold rounded-xl text-sm hover:bg-orange-600 transition-all"
            >
              {t('customer.history.viewOrder')}
            </button>
          </div>
        ) : null}
      </main>

      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title={tOr(t, 'customer.history.cancelReservationConfirmTitle', 'Cancel reservation?')}
        message={tOr(t, 'customer.history.cancelReservationConfirmMessage', 'This will cancel your pending reservation. You cannot undo this action.')}
        cancelText={t('common.no')}
        confirmText={tOr(t, 'customer.history.cancelReservationConfirmYes', 'Yes, cancel')}
        variant="danger"
      />
    </div>
  );
}
