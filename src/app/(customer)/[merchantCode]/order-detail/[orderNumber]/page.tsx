'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import { useCustomerData } from '@/context/CustomerDataContext';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/common/SkeletonLoaders';
import { FaArrowLeft, FaBoxOpen, FaFileDownload, FaSpinner } from 'react-icons/fa';
import { formatPaymentMethodLabel, formatPaymentStatusLabel } from '@/lib/utils/paymentDisplay';
import OrderTotalsBreakdown from '@/components/orders/OrderTotalsBreakdown';
import { triggerPublicOrderReceiptDownload } from '@/lib/utils/receiptPdfClient';

interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    tableNumber: string | null;
    isScheduled?: boolean;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    deliveryStatus?: string | null;
    deliveryUnit?: string | null;
    deliveryAddress?: string | null;
    deliveryFeeAmount?: number;
    deliveryDistanceKm?: number | null;
    totalAmount: number;
    subtotal: number;  // from Order model
    taxAmount: number;
    serviceChargeAmount: number;
    packagingFeeAmount: number;
    discountAmount?: number;
    placedAt: string;
    completedAt: string | null;
    payment: {
        paymentMethod: string;  // actual field name
        status: string;
        paidBy?: {
            name: string;
            email: string;
        } | null;
    } | null;
    orderItems: Array<{
        id: string;
        menuName: string;
        quantity: number;
        menuPrice: number;  // actual field name
        subtotal: number;
        notes: string | null;
        addons: Array<{
            addonName: string;  // actual field name
            addonPrice: number;  // actual field name
        }>;
    }>;
    merchant: {
        name: string;
        currency: string;
        address?: string;
        phone?: string;
    };
    reservation?: {
        partySize: number;
        reservationDate: string;
        reservationTime: string;
        tableNumber: string | null;
        status?: string;
    };
}

/**
 * Order Detail Page
 * 
 * Shows completed/ready order details with items and payment summary.
 * Read-only view for historical orders.
 */
export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams(); // Added to read token from query params
    const { t, locale } = useTranslation();

    const merchantCode = params.merchantCode as string;
    const orderNumber = params.orderNumber as string;
    const mode = searchParams.get('mode') || 'takeaway';

    const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

    const isTableNumberEnabled = contextMerchantInfo?.requireTableNumberForDineIn === true;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [merchantCurrency, setMerchantCurrency] = useState('AUD');
    const [downloadingReceipt, setDownloadingReceipt] = useState(false);

    const { showSuccess, showError } = useToast();

    // Initialize context for this merchant
    useEffect(() => {
        initializeData(merchantCode);
    }, [merchantCode, initializeData]);

    // Use Context data when available
    useEffect(() => {
        if (isInitialized && contextMerchantInfo) {
            setMerchantCurrency(contextMerchantInfo.currency || 'AUD');
        }
    }, [isInitialized, contextMerchantInfo]);

    // Fetch order details
    useEffect(() => {
        const fetchOrder = async () => {
            const auth = getCustomerAuth();
            if (!auth) {
                router.push(`/login?ref=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                return;
            }

            const token = searchParams.get('token') || '';
            if (!token) {
                setError(t('customer.errors.trackingTokenMissing'));
                setIsLoading(false);
                return;
            }

            try {
                const publicResponse = await fetch(buildOrderApiUrl(`/api/public/orders/${orderNumber}?token=${encodeURIComponent(token)}`));
                if (publicResponse.ok) {
                    const publicData = await publicResponse.json();
                    if (publicData.success) {
                        setOrder(publicData.data);
                    } else {
                        setError(publicData.error || t('customer.errors.orderNotFound'));
                    }
                } else {
                    setError(t('customer.errors.orderNotFound'));
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
                setError(t('customer.errors.orderLoadFailed'));
            } finally {
                setIsLoading(false);
            }
        };

        if (orderNumber) {
            fetchOrder();
        }
    }, [orderNumber, router, searchParams]);

    const formatCurrency = (amount: number): string => {
        // Handle undefined/null amount
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '-';
        }

        const currency = order?.merchant?.currency || merchantCurrency;
        return formatCurrencyUtil(amount, currency, locale);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const localeTag = locale === 'id' ? 'id-ID' : 'en-AU';
        return new Intl.DateTimeFormat(localeTag, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t('customer.status.pending') },
            accepted: { bg: 'bg-blue-100', text: 'text-blue-700', label: t('customer.status.confirmed') },
            in_progress: { bg: 'bg-orange-100', text: 'text-orange-700', label: t('customer.status.inProgress') },
            ready: { bg: 'bg-purple-100', text: 'text-purple-700', label: t('customer.status.ready') },
            completed: { bg: 'bg-green-100', text: 'text-green-700', label: t('customer.status.completed') },
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
        router.push(`/${merchantCode}/history?mode=${mode}`);
    };

    /**
     * Handle download receipt functionality
     */
    const handleDownloadReceipt = async () => {
        if (!order) return;

        const auth = getCustomerAuth();
        if (!auth) return;

        setDownloadingReceipt(true);

        try {
            const token = searchParams.get('token') || '';
            if (!token) {
                showError(t('customer.errors.trackingTokenMissing'));
                return;
            }

            triggerPublicOrderReceiptDownload({
                orderNumber,
                token,
            });
            showSuccess(t('customer.receipt.downloadSuccess'));

        } catch (error) {
            console.error('Download receipt error:', error);
            showError(t('customer.receipt.downloadFailed'));
        } finally {
            setDownloadingReceipt(false);
        }
    };

    const canDownloadReceipt = order
        ? !['pending', 'cancelled'].includes(order.status.toLowerCase())
        : false;

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
                    <div className="flex items-center px-4 py-3">
                        <Skeleton width="w-10" height="h-10" className="rounded-full" />
                        <div className="flex-1 flex justify-center">
                            <Skeleton width="w-32" height="h-5" />
                        </div>
                        <div className="w-10" />
                    </div>
                </header>
                <div className="p-4 space-y-4">
                    <Skeleton width="w-full" height="h-24" className="rounded-xl" />
                    <Skeleton width="w-full" height="h-48" className="rounded-xl" />
                    <Skeleton width="w-full" height="h-32" className="rounded-xl" />
                </div>
            </div>
        );
    }

    // Error state
    if (error || !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <FaBoxOpen className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium mb-2">{error || t('customer.track.orderNotFound')}</p>
                <button
                    onClick={handleBack}
                    className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium"
                >
                    {t('customer.track.goBack')}
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
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
                        {t('customer.history.viewOrder')}
                    </h1>
                </div>
            </header>

            <main className="p-4 pb-8 space-y-4">
                {/* Merchant Info Card */}
                {order.merchant?.name && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p className="text-xs text-orange-600 mb-1">Merchant</p>
                        <p className="font-bold text-gray-900">{order.merchant.name}</p>
                    </div>
                )}

                {/* Order Info Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">{t('customer.track.orderNumber')}</p>
                            <div className="inline-flex items-center rounded-lg overflow-hidden border border-gray-200">
                                {/* Merchant Code (Left - Gray) */}
                                <span className="px-3 py-1.5 bg-gray-100 text-gray-500 font-mono font-medium text-sm">
                                    {merchantCode.toUpperCase()}
                                </span>
                                {/* Order Code (Right - White) */}
                                <span className="px-3 py-1.5 bg-white text-gray-900 font-mono font-bold text-sm">
                                    {order.orderNumber.includes('-')
                                        ? order.orderNumber.split('-').slice(1).join('-')
                                        : order.orderNumber}
                                </span>
                            </div>
                        </div>
                        {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                        <p>{formatDate(order.placedAt)}</p>
                        <p className="mt-1">
                            {order.orderType === 'DINE_IN'
                                ? t('customer.track.dineInOrder')
                                : order.orderType === 'DELIVERY'
                                    ? t('customer.track.deliveryOrder')
                                    : t('customer.track.takeawayOrder')}
                                                        {isTableNumberEnabled && order.tableNumber
                                                            ? ` • ${t('customer.orderDetail.tableLabel', { tableNumber: order.tableNumber })}`
                                                            : ''}
                        </p>

                        {order.isScheduled && order.scheduledTime && (
                            <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                <span>
                                    {(order.orderType === 'DELIVERY'
                                        ? tOr(t, 'customer.orderSummary.deliveryAt', 'Delivery at')
                                        : order.orderType === 'DINE_IN'
                                          ? tOr(t, 'customer.orderSummary.dineInAt', 'Dine-in at')
                                          : tOr(t, 'customer.orderSummary.pickupAt', 'Pickup at'))}{' '}
                                    {order.scheduledTime}
                                </span>
                            </p>
                        )}
                        {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                            <p className="mt-1">
                                {t('customer.track.deliveryAddress')}: {order.deliveryUnit ? `${order.deliveryUnit}, ${order.deliveryAddress}` : order.deliveryAddress}
                            </p>
                        )}
                        {order.reservation ? (
                            <div className="mt-3 rounded-lg border border-gray-200 px-3 py-2">
                                <p className="text-xs font-semibold text-black">{t('customer.orderDetail.reservationDetails')}</p>
                                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-black">
                                    <span>{t('customer.orderDetail.partySize')}</span>
                                    <span className="font-medium text-right">{order.reservation.partySize}</span>
                                    <span>{t('customer.orderDetail.date')}</span>
                                    <span className="font-medium text-right">{order.reservation.reservationDate}</span>
                                    <span>{t('customer.orderDetail.time')}</span>
                                    <span className="font-medium text-right">{order.reservation.reservationTime}</span>
                                    {isTableNumberEnabled && order.reservation.tableNumber ? (
                                        <>
                                            <span>{t('customer.orderDetail.table')}</span>
                                            <span className="font-medium text-right">{order.reservation.tableNumber}</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h2 className="font-bold text-gray-900 mb-4">{t('customer.track.orderItems')}</h2>
                    <div className="space-y-3">
                        {(order.orderItems || []).map((item) => {
                            const menuPrice = Number(item.menuPrice) || 0;
                            const addonsTotal = (item.addons || []).reduce((sum, a) => sum + (Number(a.addonPrice) || 0), 0);
                            const itemTotal = (menuPrice + addonsTotal) * item.quantity;

                            return (
                                <div key={item.id} className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">
                                            {item.quantity}x {item.menuName}
                                        </p>
                                        {(item.addons || []).length > 0 && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {(item.addons || []).map(a => a.addonName).join(', ')}
                                            </p>
                                        )}
                                        {item.notes && (
                                            <p className="text-xs text-gray-400 italic mt-0.5">&quot;{item.notes}&quot;</p>
                                        )}
                                    </div>
                                    <span className="font-medium text-gray-700 ml-4">
                                        {formatCurrency(itemTotal)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <h2 className="font-bold text-gray-900 mb-4">{t('order.paymentDetails')}</h2>
                    <OrderTotalsBreakdown
                        amounts={{
                            subtotal: Number(order.subtotal) || 0,
                            taxAmount: Number(order.taxAmount) || 0,
                            serviceChargeAmount: Number(order.serviceChargeAmount) || 0,
                            packagingFeeAmount: Number(order.packagingFeeAmount) || 0,
                            deliveryFeeAmount: order.orderType === 'DELIVERY' ? (Number(order.deliveryFeeAmount) || 0) : 0,
                            discountAmount: Number(order.discountAmount || 0) || 0,
                            totalAmount: Number(order.totalAmount) || 0,
                        }}
                        currency={order.merchant?.currency || 'AUD'}
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
                            showDeliveryFee: order.orderType === 'DELIVERY',
                        }}
                    />

                    {/* Payment Method */}
                    {order.payment && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('customer.orderDetail.paymentMethod')}</span>
                                <span className="font-medium text-gray-900">
                                    {formatPaymentMethodLabel({
                                        orderType: order.orderType,
                                        paymentStatus: order.payment.status,
                                        paymentMethod: order.payment.paymentMethod,
                                    }, { t })}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">{t('customer.orderDetail.paymentStatus')}</span>
                                <span className={`font-medium ${order.payment.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {formatPaymentStatusLabel(order.payment.status, { t }) || '-'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Download Receipt Button (hide for PENDING/CANCELLED) */}
                {canDownloadReceipt ? (
                    <button
                        onClick={handleDownloadReceipt}
                        disabled={downloadingReceipt}
                        className="w-full py-2 text-white bg-orange-500 font-semibold rounded-xl text-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {downloadingReceipt ? (
                            <>
                                <FaSpinner className="h-5 w-5 animate-spin" />
                                <span>{t('customer.receipt.downloading')}</span>
                            </>
                        ) : (
                            <>
                                <FaFileDownload className="w-5 h-5" />
                                <span>{t('customer.receipt.downloadReceipt')}</span>
                            </>
                        )}
                    </button>
                ) : null}
            </main>
        </div>
    );
}
