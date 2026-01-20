'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    FaArrowLeft,
    FaSync,
    FaClock,
    FaCheckCircle,
    FaBolt,
    FaBell,
    FaCheck,
    FaStickyNote,
    FaTruck,
    FaExclamationTriangle,
    FaUsers,
    FaCalculator,
} from 'react-icons/fa';
import { TrackOrderSkeleton } from '@/components/common/SkeletonLoaders';
import { formatCurrency } from '@/lib/utils/format';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';
import FeedbackModal from '@/components/customer/FeedbackModal';
import { customerHistoryUrl, customerMerchantHomeUrl } from '@/lib/utils/customerRoutes';
import { formatPaymentMethodLabel, formatPaymentStatusLabel } from '@/lib/utils/paymentDisplay';
import { useCustomerData } from '@/context/CustomerDataContext';
import OrderTotalsBreakdown from '@/components/orders/OrderTotalsBreakdown';

// Order status types
type OrderStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
type DeliveryStatus = 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED';

interface OrderData {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNumber: string | null;
    isScheduled?: boolean;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    editedAt?: string | null;
    changedByAdmin?: boolean;
    customerName: string;
    subtotal?: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    packagingFeeAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    deliveryStatus?: DeliveryStatus | null;
    deliveryUnit?: string | null;
    deliveryAddress?: string | null;
    deliveryFeeAmount?: number;
    deliveryDistanceKm?: number | null;
    deliveryDeliveredAt?: string | null;
    orderItems: Array<{
        menuName: string;
        quantity: number;
        menuPrice: number;
        subtotal: number;
        notes: string | null;
        addons: Array<{
            name: string;
            price: number;
            quantity: number;
        }>;
    }>;
    merchant: {
        name: string;
        currency: string;
    };
    payment?: {
        status?: string;
        paymentMethod?: string;
        amount?: number;
        paidAt?: string | null;
    } | null;
    completedAt?: string | null;
    placedAt?: string | null;

    reservation?: {
        status: string;
        partySize: number;
        reservationDate: string;
        reservationTime: string;
        tableNumber: string | null;
    } | null;
}

// Group Order Data
interface GroupOrderData {
    isGroupOrder: boolean;
    session?: {
        id: string;
        sessionCode: string;
        participantCount: number;
    };
    participants?: Array<{
        id: string;
        name: string;
        isHost: boolean;
        items: Array<{
            id: string;
            menuName: string;
            menuPrice: number;
            quantity: number;
            subtotal: number;
            notes: string | null;
            addons: Array<{
                name: string;
                price: number;
                quantity: number;
            }>;
        }>;
        subtotal: number;
    }>;
    splitBill?: Array<{
        participantId: string;
        participantName: string;
        isHost: boolean;
        itemCount: number;
        subtotal: number;
        taxShare: number;
        serviceChargeShare: number;
        packagingFeeShare: number;
        total: number;
    }>;
}

interface StatusStep {
    status: OrderStatus;
    labelKey: TranslationKeys;
    icon: string;
    descriptionKey: TranslationKeys;
}

interface DeliveryStatusStep {
    status: DeliveryStatus;
    labelKey: TranslationKeys;
    descriptionKey: TranslationKeys;
}

const STATUS_STEPS: StatusStep[] = [
    { status: 'PENDING', labelKey: 'customer.status.pending', icon: '1', descriptionKey: 'customer.status.pendingDesc' },
    { status: 'ACCEPTED', labelKey: 'customer.status.accepted', icon: '2', descriptionKey: 'customer.status.acceptedDesc' },
    { status: 'IN_PROGRESS', labelKey: 'customer.status.preparing', icon: '3', descriptionKey: 'customer.status.preparingDesc' },
    { status: 'READY', labelKey: 'customer.status.ready', icon: '4', descriptionKey: 'customer.status.readyDesc' },
    { status: 'COMPLETED', labelKey: 'customer.status.completed', icon: '✓', descriptionKey: 'customer.status.completedDesc' },
];

const DELIVERY_STATUS_STEPS: DeliveryStatusStep[] = [
    {
        status: 'PENDING_ASSIGNMENT',
        labelKey: 'customer.deliveryStatus.pendingAssignment',
        descriptionKey: 'customer.deliveryStatus.pendingAssignmentDesc',
    },
    {
        status: 'ASSIGNED',
        labelKey: 'customer.deliveryStatus.assigned',
        descriptionKey: 'customer.deliveryStatus.assignedDesc',
    },
    {
        status: 'PICKED_UP',
        labelKey: 'customer.deliveryStatus.pickedUp',
        descriptionKey: 'customer.deliveryStatus.pickedUpDesc',
    },
    {
        status: 'DELIVERED',
        labelKey: 'customer.deliveryStatus.delivered',
        descriptionKey: 'customer.deliveryStatus.deliveredDesc',
    },
];

type DeliveryTimelineStepKey = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'READY' | 'PICKED_UP' | 'DELIVERED';

const DELIVERY_TIMELINE_STEPS: Array<{
    key: DeliveryTimelineStepKey;
    labelKey: TranslationKeys;
    descriptionKey: TranslationKeys;
}> = [
    { key: 'PENDING', labelKey: 'customer.status.pending', descriptionKey: 'customer.status.pendingDesc' },
    { key: 'ACCEPTED', labelKey: 'customer.status.accepted', descriptionKey: 'customer.status.acceptedDesc' },
    { key: 'IN_PROGRESS', labelKey: 'customer.status.preparing', descriptionKey: 'customer.status.preparingDesc' },
    { key: 'READY', labelKey: 'customer.status.ready', descriptionKey: 'customer.status.readyDesc' },
    { key: 'PICKED_UP', labelKey: 'customer.deliveryStatus.pickedUp', descriptionKey: 'customer.deliveryStatus.pickedUpDesc' },
    { key: 'DELIVERED', labelKey: 'customer.deliveryStatus.delivered', descriptionKey: 'customer.deliveryStatus.deliveredDesc' },
];

/**
 * GENFITY - Real-time Order Tracking Page
 * 
 * @description
 * Live order status tracking with:
 * - Animated progress bar
 * - Auto-refresh every 5 seconds
 * - Estimated wait time
 * - Order details
 */
export default function OrderTrackPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, locale } = useTranslation();

    const merchantCode = params.merchantCode as string;
    const orderNumber = params.orderNumber as string;
    const token = searchParams.get('token') || '';

    const { merchantInfo: contextMerchantInfo, initializeData } = useCustomerData();
    const isTableNumberEnabled = contextMerchantInfo?.requireTableNumberForDineIn === true;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [groupOrderData, setGroupOrderData] = useState<GroupOrderData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSplitBill, setShowSplitBill] = useState(false);

    const [waitEstimate, setWaitEstimate] = useState<{
        minMinutes: number;
        maxMinutes: number;
        cappedAt60: boolean;
        queueAhead: number;
        queuePosition?: number | null;
        basePrepMinutes: number | null;
        status: OrderStatus;
        isScheduled?: boolean;
    } | null>(null);

    useEffect(() => {
        initializeData(merchantCode);
    }, [merchantCode, initializeData]);

    // Feedback modal state
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [hasFeedback, setHasFeedback] = useState(false);
    const [feedbackChecked, setFeedbackChecked] = useState(false);
    const [completionTimeMinutes, setCompletionTimeMinutes] = useState<number | null>(null);

    const fetchWaitTimeEstimate = useCallback(async (status: OrderStatus) => {
        if (status === 'READY' || status === 'COMPLETED' || status === 'CANCELLED') {
            setWaitEstimate(null);
            return;
        }

        try {
            const response = await fetch(
                `/api/public/orders/${orderNumber}/wait-time?token=${encodeURIComponent(token)}`
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            if (!data?.success || !data?.data) return;

            setWaitEstimate(data.data);
        } catch {
            // Best-effort only
        }
    }, [orderNumber, token]);

    // Fetch order data
    const fetchOrder = useCallback(async (showLoadingSpinner = false) => {
        if (showLoadingSpinner) setIsRefreshing(true);

        try {
            const query = `?token=${encodeURIComponent(token)}`;
            const response = await fetch(`/api/public/orders/${orderNumber}${query}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || t('customer.errors.orderLoadFailed'));
                return;
            }

            if (data?.data?.status) {
                await fetchWaitTimeEstimate(data.data.status as OrderStatus);
            }

            // Convert decimal values
            const convertDecimal = (value: unknown): number => {
                if (!value) return 0;
                if (typeof value === 'number') return value;
                if (typeof value === 'string') return parseFloat(value) || 0;
                if (typeof value === 'object' && value !== null && 'd' in value && Array.isArray((value as { d: number[] }).d)) {
                    const decimalObj = value as { s?: number; e?: number; d: number[] };
                    const sign = decimalObj.s || 1;
                    const exponent = decimalObj.e ?? 0;
                    const digits = decimalObj.d[0] || 0;
                    const digitsLength = digits.toString().length;
                    return sign * digits * Math.pow(10, exponent - digitsLength + 1);
                }
                return 0;
            };

            setOrder({
                id: data.data.id,
                orderNumber: data.data.orderNumber,
                status: data.data.status,
                orderType: data.data.orderType,
                tableNumber: data.data.tableNumber,
                customerName: data.data.customerName,
                editedAt: data.data.editedAt ?? null,
                changedByAdmin: Boolean(data.data.editedAt),
                subtotal: convertDecimal(data.data.subtotal),
                taxAmount: convertDecimal(data.data.taxAmount),
                serviceChargeAmount: convertDecimal(data.data.serviceChargeAmount),
                packagingFeeAmount: convertDecimal(data.data.packagingFeeAmount),
                discountAmount: convertDecimal(data.data.discountAmount),
                totalAmount: convertDecimal(data.data.totalAmount),
                createdAt: data.data.createdAt,
                updatedAt: data.data.updatedAt,
                completedAt: data.data.completedAt,
                placedAt: data.data.placedAt,
                deliveryStatus: data.data.deliveryStatus,
                deliveryUnit: data.data.deliveryUnit ?? null,
                deliveryAddress: data.data.deliveryAddress,
                deliveryFeeAmount: convertDecimal(data.data.deliveryFeeAmount),
                deliveryDistanceKm: data.data.deliveryDistanceKm ? convertDecimal(data.data.deliveryDistanceKm) : null,
                deliveryDeliveredAt: data.data.deliveryDeliveredAt ?? null,
                reservation: data.data.reservation
                    ? {
                            status: data.data.reservation.status,
                            partySize: data.data.reservation.partySize,
                            reservationDate: data.data.reservation.reservationDate,
                            reservationTime: data.data.reservation.reservationTime,
                            tableNumber: data.data.reservation.tableNumber ?? null,
                        }
                    : null,
                orderItems: data.data.orderItems?.map((item: {
                    menuName: string;
                    quantity: number;
                    menuPrice: unknown;
                    subtotal?: unknown;
                    notes?: string;
                    addons?: Array<{ addonName?: string; name?: string; price?: unknown; addonPrice?: unknown; subtotal?: unknown; quantity?: number }>;
                }) => ({
                    menuName: item.menuName,
                    quantity: item.quantity,
                    menuPrice: convertDecimal(item.menuPrice),
                    subtotal: convertDecimal(item.subtotal),
                    notes: item.notes,
                    addons: (item.addons || []).map((addon) => ({
                        name: addon.addonName || addon.name || '',
                        price: convertDecimal(addon.addonPrice ?? addon.price),
                        quantity: addon.quantity || 1,
                    })),
                })) || [],
                merchant: {
                    name: data.data.merchant?.name || '',
                    currency: data.data.merchant?.currency || 'AUD',
                },
                                payment: data.data.payment
                                    ? {
                                            status: data.data.payment.status,
                                            paymentMethod: data.data.payment.paymentMethod,
                                            amount: convertDecimal(data.data.payment.amount),
                                            paidAt: data.data.payment.paidAt || null,
                                        }
                                    : null,
            });

            // Fetch group order details (if any)
            try {
                const groupResponse = await fetch(`/api/public/orders/${orderNumber}/group-details?token=${encodeURIComponent(token)}`);
                const groupData = await groupResponse.json();
                if (groupResponse.ok && groupData.success) {
                    setGroupOrderData(groupData.data);
                }
            } catch {
                // Not a group order or error fetching - ignore
                setGroupOrderData(null);
            }

            setLastUpdated(new Date());
            setError('');
        } catch (err) {
            console.error('Error fetching order:', err);
            setError(t('customer.errors.orderLoadFailed'));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [orderNumber, token, t]);

    // Initial fetch
    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    // Auto-refresh every 5 seconds (only if not completed/cancelled)
    useEffect(() => {
        if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            return;
        }

        const interval = setInterval(() => {
            fetchOrder(false); // Silent refresh
        }, 5000);

        return () => clearInterval(interval);
    }, [order, fetchOrder]);

    // Check if feedback exists for this order
    useEffect(() => {
        if (!orderNumber || feedbackChecked) return;

        const checkFeedback = async () => {
            try {
                const response = await fetch(`/api/public/orders/${orderNumber}/feedback?token=${encodeURIComponent(token)}`);
                const data = await response.json();
                if (data.success) {
                    setHasFeedback(data.hasFeedback);
                }
            } catch (error) {
                console.error('Failed to check feedback:', error);
            } finally {
                setFeedbackChecked(true);
            }
        };

        checkFeedback();
    }, [orderNumber, feedbackChecked]);

    // Auto-show feedback modal when order is completed and no feedback yet
    useEffect(() => {
        if (!order || !feedbackChecked) return;

        const isDelivery = order.orderType === 'DELIVERY';
        const isDelivered = order.deliveryStatus === 'DELIVERED' || !!order.deliveryDeliveredAt;

        if (isDelivery && isDelivered && !hasFeedback) {
            const completedAt = order.deliveryDeliveredAt || order.completedAt;
            if (completedAt && order.placedAt) {
                const completedTime = new Date(completedAt).getTime();
                const placedTime = new Date(order.placedAt).getTime();
                const minutes = Math.round((completedTime - placedTime) / (1000 * 60));
                setCompletionTimeMinutes(minutes);
            }
            const timer = setTimeout(() => {
                setShowFeedbackModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [order, feedbackChecked, hasFeedback]);

    // Handle feedback submission
    const handleFeedbackSubmit = async (feedback: {
        overallRating: number;
        serviceRating?: number;
        foodRating?: number;
        comment?: string;
    }) => {
        const response = await fetch(`/api/public/orders/${orderNumber}/feedback?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedback),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to submit feedback');
        }

        setHasFeedback(true);
    };

    // Determine receipt language based on currency
    const feedbackLanguage: 'en' | 'id' = order?.merchant?.currency === 'IDR' ? 'id' : 'en';

    // Get current step index
    const getCurrentStepIndex = (status: OrderStatus): number => {
        if (status === 'CANCELLED') return -1;
        return STATUS_STEPS.findIndex(step => step.status === status);
    };

    const getCurrentDeliveryStepIndex = (status: DeliveryStatus | null | undefined): number => {
        if (!status) return 0;
        const idx = DELIVERY_STATUS_STEPS.findIndex(step => step.status === status);
        return idx >= 0 ? idx : 0;
    };

    const getCurrentDeliveryTimelineIndex = (o: OrderData): number => {
        if (o.deliveryStatus === 'DELIVERED') return 5;
        if (o.deliveryStatus === 'PICKED_UP') return 4;

        if (o.status === 'COMPLETED' && o.orderType === 'DELIVERY') {
            return 5;
        }

        if (o.status === 'READY') return 3;
        if (o.status === 'IN_PROGRESS') return 2;
        if (o.status === 'ACCEPTED') return 1;
        return 0;
    };

    // Calculate estimated wait time based on status
    const getEstimatedWaitTime = (status: OrderStatus): string => {
        if (waitEstimate && waitEstimate.status === status && waitEstimate.maxMinutes >= 1) {
            const unit = locale === 'id' ? 'menit' : 'min';
            return `~${waitEstimate.minMinutes}-${waitEstimate.maxMinutes} ${unit}`;
        }

        switch (status) {
            case 'PENDING':
                return t('customer.track.estimated.pending');
            case 'ACCEPTED':
                return t('customer.track.estimated.accepted');
            case 'IN_PROGRESS':
                return t('customer.track.estimated.inProgress');
            case 'READY':
                return t('customer.track.estimated.ready');
            case 'COMPLETED':
                return t('customer.status.completed');
            default:
                return '--';
        }
    };

    // Format price - show "Free" for zero prices
    const formatPrice = (amount: number, currency: string) => {
        if (amount === 0) return 'Free';
        return formatCurrency(amount, currency);
    };

    // Handle back navigation
    const handleBack = () => {
        const ref = searchParams.get('ref');
        if (ref) {
            router.replace(decodeURIComponent(ref));
            return;
        }

        const back = searchParams.get('back');
        if (back === 'history') {
            const mode = searchParams.get('mode');
            router.replace(customerHistoryUrl(merchantCode, { mode: mode || undefined }));
            return;
        }

        router.replace(customerMerchantHomeUrl(merchantCode));
    };

    // Handle new order
    const handleNewOrder = () => {
        router.push(customerMerchantHomeUrl(merchantCode));
    };

    // Loading state
    if (isLoading) {
        return <TrackOrderSkeleton />;
    }

    // Error state
    if (error || !order) {
        return (
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <FaExclamationTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <p className="text-base text-gray-900 font-semibold mb-2">
                        {t('customer.track.orderNotFound')}
                    </p>
                    <p className="text-sm text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
                    >
                        {t('customer.track.goBack')}
                    </button>
                </div>
            </div>
        );
    }

    const currentStepIndex = getCurrentStepIndex(order.status);
    const isCancelled = order.status === 'CANCELLED';
    const isCompleted = order.status === 'COMPLETED';
    const isReady = order.status === 'READY';
    const isDeliveryTimelineMode = searchParams.get('mode') === 'delivery' && order.orderType === 'DELIVERY';
    const currentDeliveryTimelineIndex = isDeliveryTimelineMode ? getCurrentDeliveryTimelineIndex(order) : 0;

    return (
        <>
            {/* Header - Profile Style */}
            <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
                <div className="flex items-center px-4 py-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center -ml-2"
                        aria-label="Go back"
                    >
                        <FaArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>

                    <h1 className="flex-1 text-center font-semibold text-gray-900 text-base">
                        {t('customer.track.title')}
                    </h1>

                    <button
                        onClick={() => fetchOrder(true)}
                        disabled={isRefreshing}
                        className="w-10 h-10 flex items-center justify-center -mr-2"
                        aria-label="Refresh"
                    >
                        <FaSync className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-32">
                {/* Order Number Badge */}
                <div className="px-6 py-6 text-center border-b border-gray-200">
                    <div className="inline-flex items-center rounded-lg mb-3 overflow-hidden border border-gray-200">
                        {/* Merchant Code (Left - Gray) */}
                        <span className="px-4 py-2 bg-gray-100 text-gray-500 font-mono font-medium text-lg">
                            {merchantCode.toUpperCase()}
                        </span>
                        {/* Order Code (Right - White) */}
                        <span className="px-4 py-2 bg-white text-gray-900 font-mono font-bold text-lg">
                            {order.orderNumber.includes('-')
                                ? order.orderNumber.split('-').slice(1).join('-')
                                : order.orderNumber}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        {order.orderType === 'DINE_IN'
                            ? (isTableNumberEnabled && order.tableNumber
                                ? `${t('admin.orders.table')} #${order.tableNumber}`
                                : tOr(t, 'customer.track.dineInOrder', 'Dine-in order'))
                            : order.orderType === 'DELIVERY'
                                ? t('customer.track.deliveryOrder')
                                : t('customer.track.takeawayOrder')}
                    </p>

                    {order.reservation ? (
                        <div className="mt-3 inline-flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm">
                            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-semibold text-gray-800">
                                <span className="inline-flex items-center gap-2">
                                    <FaUsers className="h-4 w-4 text-gray-500" />
                                    <span>
                                        {tOr(t, 'customer.reservation.party', 'Party')}: {order.reservation.partySize}
                                    </span>
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <FaClock className="h-4 w-4 text-gray-500" />
                                    <span>
                                        {order.reservation.reservationDate} • {order.reservation.reservationTime}
                                    </span>
                                </span>
                            </div>

                            {String(order.reservation.status || '').toUpperCase() === 'ACCEPTED' &&
                            isTableNumberEnabled && (order.reservation.tableNumber || order.tableNumber) ? (
                                <div className="text-xs font-semibold text-gray-800">
                                    {tOr(t, 'admin.orders.table', 'Table')} #{order.reservation.tableNumber || order.tableNumber}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {order.isScheduled && order.scheduledTime && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                            <FaClock className="h-3 w-3" />
                                                <span>
                                                    {(order.orderType === 'DELIVERY'
                                                      ? tOr(t, 'customer.orderSummary.deliveryAt', 'Delivery at')
                                                      : order.orderType === 'DINE_IN'
                                                        ? tOr(t, 'customer.orderSummary.dineInAt', 'Dine-in at')
                                                        : tOr(t, 'customer.orderSummary.pickupAt', 'Pickup at'))}{' '}
                                                    {order.scheduledTime}
                                                </span>
                        </div>
                    )}
                    {order.changedByAdmin && (
                        <div className="mt-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                            {t('common.changedByAdmin') || 'Changed by admin'}
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        {t('customer.track.lastUpdated')} {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                {/* Status Progress */}
                <div className="px-6 py-6">
                    {isCancelled ? (
                        /* Cancelled State */
                        <div className="text-center py-8">
                            <FaExclamationTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <h2 className="text-xl font-bold text-red-600 mb-2">{t('customer.track.orderCancelled')}</h2>
                            <p className="text-sm text-gray-600">
                                {t('customer.status.cancelledDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {isDeliveryTimelineMode ? (
                                <>
                                    {/* Combined Delivery Timeline Progress */}
                                    <div className="relative mb-8">
                                        <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />
                                        <div
                                            className="absolute top-4 left-0 h-1 bg-orange-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(currentDeliveryTimelineIndex / (DELIVERY_TIMELINE_STEPS.length - 1)) * 100}%` }}
                                        />

                                        <div className="relative flex justify-between">
                                            {DELIVERY_TIMELINE_STEPS.map((step, index) => {
                                                const isActive = index <= currentDeliveryTimelineIndex;
                                                const isCurrent = index === currentDeliveryTimelineIndex;

                                                return (
                                                    <div key={step.key} className="flex flex-col items-center">
                                                        <div
                                                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-sm
                              transition-all duration-300
                              ${isCurrent
                                                                    ? 'bg-orange-500 text-white ring-4 ring-orange-200 scale-110'
                                                                    : isActive
                                                                        ? 'bg-orange-500 text-white'
                                                                        : 'bg-gray-200 text-gray-500'}
                            `}
                                                        >
                                                            {step.key === 'PENDING' && <FaClock className="w-4 h-4" />}
                                                            {step.key === 'ACCEPTED' && <FaCheckCircle className="w-4 h-4" />}
                                                            {step.key === 'IN_PROGRESS' && <FaBolt className="w-4 h-4" />}
                                                            {step.key === 'READY' && <FaBell className="w-4 h-4" />}
                                                            {step.key === 'PICKED_UP' && <FaTruck className="w-4 h-4" />}
                                                            {step.key === 'DELIVERED' && <FaCheck className="w-4 h-4" />}
                                                        </div>

                                                        <span
                                                            className={`
                            mt-2 text-xs font-medium text-center
                            ${isCurrent ? 'text-orange-600' : isActive ? 'text-gray-900' : 'text-gray-400'}
                          `}
                                                        >
                                                            {t(step.labelKey)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Current Delivery Timeline Card */}
                                    <div className="p-6 rounded-xl text-center mb-6 bg-white border border-gray-200">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-orange-100 text-orange-600">
                                            {currentDeliveryTimelineIndex === 0 && <FaClock className="w-6 h-6" />}
                                            {currentDeliveryTimelineIndex === 1 && <FaCheckCircle className="w-6 h-6" />}
                                            {currentDeliveryTimelineIndex === 2 && <FaBolt className="w-6 h-6" />}
                                            {currentDeliveryTimelineIndex === 3 && <FaBell className="w-6 h-6" />}
                                            {currentDeliveryTimelineIndex === 4 && <FaTruck className="w-6 h-6" />}
                                            {currentDeliveryTimelineIndex === 5 && <FaCheck className="w-6 h-6" />}
                                        </div>

                                        <h2 className="text-xl font-bold mb-2 text-gray-900">
                                            {order.deliveryStatus === 'DELIVERED' || currentDeliveryTimelineIndex >= 5
                                                ? t('customer.deliveryStatus.deliveredDesc')
                                                : t(DELIVERY_TIMELINE_STEPS[currentDeliveryTimelineIndex]?.descriptionKey) ||
                                                t('customer.loading.processingOrder')}
                                        </h2>

                                        {currentDeliveryTimelineIndex < 4 && (
                                            <div className="text-gray-600">
                                                <div className="flex items-center justify-center gap-2">
                                                    <FaClock className="w-5 h-5" />
                                                    <span className="text-sm font-medium">
                                                        {t('customer.track.estimated')} {getEstimatedWaitTime(order.status)}
                                                    </span>
                                                </div>
                                                {waitEstimate?.queuePosition && waitEstimate.queuePosition >= 1 && (
                                                    <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                                                        <FaCalculator className="w-4 h-4" />
                                                        <span>
                                                            {t('customer.track.queuePosition', { position: waitEstimate.queuePosition })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {currentDeliveryTimelineIndex === 3 && (
                                            <p className="mt-3 text-sm text-green-600 font-medium">
                                                {t('customer.track.deliveryReadyMessage')}
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Progress Bar */}
                                    <div className="relative mb-8">
                                        {/* Background Bar */}
                                        <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />

                                        {/* Active Bar */}
                                        <div
                                            className="absolute top-4 left-0 h-1 bg-orange-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                                        />

                                        {/* Steps */}
                                        <div className="relative flex justify-between">
                                            {STATUS_STEPS.map((step, index) => {
                                                const isActive = index <= currentStepIndex;
                                                const isCurrent = index === currentStepIndex;

                                                return (
                                                    <div key={step.status} className="flex flex-col items-center">
                                                        {/* Circle */}
                                                        <div
                                                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-sm
                              transition-all duration-300
                              ${isCurrent
                                                                    ? 'bg-orange-500 text-white ring-4 ring-orange-200 scale-110'
                                                                    : isActive
                                                                        ? 'bg-orange-500 text-white'
                                                                        : 'bg-gray-200 text-gray-500'}
                            `}
                                                        >
                                                            {/* FA Icons for each step */}
                                                            {step.status === 'PENDING' && <FaClock className="w-4 h-4" />}
                                                            {step.status === 'ACCEPTED' && <FaCheckCircle className="w-4 h-4" />}
                                                            {step.status === 'IN_PROGRESS' && <FaBolt className="w-4 h-4" />}
                                                            {step.status === 'READY' && <FaBell className="w-4 h-4" />}
                                                            {step.status === 'COMPLETED' && <FaCheck className="w-4 h-4" />}
                                                        </div>

                                                        {/* Label */}
                                                        <span
                                                            className={`
                            mt-2 text-xs font-medium text-center
                            ${isCurrent ? 'text-orange-600' : isActive ? 'text-gray-900' : 'text-gray-400'}
                          `}
                                                        >
                                                            {t(step.labelKey)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Current Status Card */}
                                    <div
                                        className={`
                  p-6 rounded-xl text-center mb-6 bg-white
                  ${isReady ? 'border-2 border-green-500' : 'border border-gray-200'}
                `}
                                    >
                                        {/* Status Icon - FA Icons */}
                                        <div
                                            className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isReady ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}
                                        >
                                            {currentStepIndex === 0 && <FaClock className="w-6 h-6" />}
                                            {currentStepIndex === 1 && <FaCheckCircle className="w-6 h-6" />}
                                            {currentStepIndex === 2 && <FaBolt className="w-6 h-6" />}
                                            {currentStepIndex === 3 && <FaBell className="w-6 h-6" />}
                                            {currentStepIndex === 4 && <FaCheck className="w-6 h-6" />}
                                        </div>
                                        <h2 className={`text-xl font-bold mb-2 ${isReady ? 'text-green-600' : 'text-gray-900'}`}>
                                            {isCompleted
                                                ? t('customer.track.orderCompleted')
                                                : isReady
                                                    ? t('customer.track.orderReady')
                                                    : t(STATUS_STEPS[currentStepIndex]?.descriptionKey) || t('customer.loading.processingOrder')}
                                        </h2>

                                        {!isCompleted && (
                                            <div className="text-gray-600">
                                                <div className="flex items-center justify-center gap-2">
                                                    <FaClock className="w-5 h-5" />
                                                    <span className="text-sm font-medium">
                                                        {t('customer.track.estimated')} {getEstimatedWaitTime(order.status)}
                                                    </span>
                                                </div>
                                                {waitEstimate?.queuePosition && waitEstimate.queuePosition >= 1 && (
                                                    <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                                                        <FaCalculator className="w-4 h-4" />
                                                        <span>
                                                            {t('customer.track.queuePosition', { position: waitEstimate.queuePosition })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isReady && (
                                            <p className="mt-3 text-sm text-green-600 font-medium">
                                                {order.orderType === 'DELIVERY'
                                                    ? t('customer.track.deliveryReadyMessage')
                                                    : t('customer.track.pickupMessage')}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Payment Summary */}
                            {order.payment && (
                                <div className="border border-gray-200 rounded-xl p-6 bg-white mb-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-900">{t('customer.payment.title')}</p>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.payment.status === 'COMPLETED'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                        >
                                            {formatPaymentStatusLabel(order.payment.status, { t }) || '—'}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-gray-500">{t('customer.track.paymentMethod')}</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatPaymentMethodLabel({
                                                    orderType: order.orderType,
                                                    paymentStatus: order.payment.status,
                                                    paymentMethod: order.payment.paymentMethod,
                                                }, { t })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t('customer.track.paymentAmount')}</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {typeof order.payment.amount === 'number'
                                                    ? formatPrice(order.payment.amount, order.merchant.currency)
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <p className="text-xs text-gray-500">{t('customer.track.paymentPaidAt')}</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {order.payment.paidAt ? new Date(order.payment.paidAt).toLocaleString() : '—'}
                                            </p>
                                            {order.payment.paymentMethod === 'CASH_ON_DELIVERY' && order.payment.status === 'PENDING' && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {t('customer.track.payDriverHint')}
                                                </p>
                                            )}
                                            {order.orderType !== 'DELIVERY' && order.payment.status !== 'COMPLETED' && (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {t('customer.track.payAtCashierHint')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Delivery Details / Progress (Delivery orders only) */}
                            {order.orderType === 'DELIVERY' && isDeliveryTimelineMode ? (
                                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                                    <p className="text-sm font-semibold text-gray-900">{t('customer.track.deliverySectionTitle')}</p>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="text-xs text-gray-500">{t('customer.track.deliveryAddress')}</p>
                                            <p className="mt-1 text-sm font-medium text-gray-900">
                                                {order.deliveryAddress
                                                    ? (order.deliveryUnit
                                                        ? `${order.deliveryUnit}, ${order.deliveryAddress}`
                                                        : order.deliveryAddress)
                                                    : t('customer.track.deliveryNoAddress')}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="text-xs text-gray-500">{t('customer.track.deliveryFee')}</p>
                                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                                {formatPrice(order.deliveryFeeAmount || 0, order.merchant.currency)}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="text-xs text-gray-500">{t('customer.track.deliveryDistance')}</p>
                                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                                {order.deliveryDistanceKm !== null && order.deliveryDistanceKm !== undefined
                                                    ? `${Number(order.deliveryDistanceKm).toFixed(2)} km`
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-gray-200 p-4">
                                            <p className="text-xs text-gray-500">{t('customer.track.deliveryStatus')}</p>
                                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                                {order.deliveryStatus === 'FAILED'
                                                    ? t('customer.deliveryStatus.failed')
                                                    : order.deliveryStatus === 'DELIVERED'
                                                        ? t('customer.deliveryStatus.delivered')
                                                        : order.deliveryStatus === 'PICKED_UP'
                                                            ? t('customer.deliveryStatus.pickedUp')
                                                            : order.deliveryStatus === 'ASSIGNED'
                                                                ? t('customer.deliveryStatus.assigned')
                                                                : t('customer.deliveryStatus.pendingAssignment')}
                                            </p>
                                            {order.deliveryDeliveredAt ? (
                                                <p className="mt-1 text-xs text-gray-500">{new Date(order.deliveryDeliveredAt).toLocaleString()}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : order.orderType === 'DELIVERY' ? (
                                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{t('customer.track.deliverySectionTitle')}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {order.deliveryAddress
                                                    ? (order.deliveryUnit
                                                        ? `${order.deliveryUnit}, ${order.deliveryAddress}`
                                                        : order.deliveryAddress)
                                                    : t('customer.track.deliveryNoAddress')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">{t('customer.track.deliveryFee')}</p>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatPrice(order.deliveryFeeAmount || 0, order.merchant.currency)}
                                            </p>
                                            {order.deliveryDistanceKm !== null && order.deliveryDistanceKm !== undefined && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t('customer.track.deliveryDistance')} {Number(order.deliveryDistanceKm).toFixed(2)} km
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {order.deliveryStatus === 'FAILED' ? (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                <FaExclamationTriangle className="w-6 h-6" />
                                            </div>
                                            <p className="text-base font-semibold text-red-600">{t('customer.deliveryStatus.failed')}</p>
                                            <p className="text-sm text-gray-600 mt-1">{t('customer.deliveryStatus.failedDesc')}</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Delivery Progress Bar */}
                                            <div className="relative mb-6">
                                                <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 rounded-full" />

                                                <div
                                                    className="absolute top-4 left-0 h-1 bg-orange-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(getCurrentDeliveryStepIndex(order.deliveryStatus || 'PENDING_ASSIGNMENT') / (DELIVERY_STATUS_STEPS.length - 1)) * 100}%`,
                                                    }}
                                                />

                                                <div className="relative flex justify-between">
                                                    {DELIVERY_STATUS_STEPS.map((step, index) => {
                                                        const currentDeliveryIndex = getCurrentDeliveryStepIndex(order.deliveryStatus || 'PENDING_ASSIGNMENT');
                                                        const isActive = index <= currentDeliveryIndex;
                                                        const isCurrent = index === currentDeliveryIndex;

                                                        return (
                                                            <div key={step.status} className="flex flex-col items-center">
                                                                <div
                                                                    className={`
                                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                                      transition-all duration-300
                                      ${isCurrent
                                                                            ? 'bg-orange-500 text-white ring-4 ring-orange-200 scale-110'
                                                                            : isActive
                                                                                ? 'bg-orange-500 text-white'
                                                                                : 'bg-gray-200 text-gray-500'}
                                    `}
                                                                >
                                                                    {step.status === 'PENDING_ASSIGNMENT' && <FaClock className="w-4 h-4" />}
                                                                    {step.status === 'ASSIGNED' && <FaCheckCircle className="w-4 h-4" />}
                                                                    {step.status === 'PICKED_UP' && <FaTruck className="w-4 h-4" />}
                                                                    {step.status === 'DELIVERED' && <FaCheck className="w-4 h-4" />}
                                                                </div>

                                                                <span className={`
                                      mt-2 text-xs font-medium text-center
                                      ${isCurrent ? 'text-orange-600' : isActive ? 'text-gray-900' : 'text-gray-400'}
                                    `}>
                                                                    {t(step.labelKey)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-base font-semibold text-gray-900">
                                                    {t(
                                                        DELIVERY_STATUS_STEPS[
                                                            getCurrentDeliveryStepIndex(order.deliveryStatus || 'PENDING_ASSIGNMENT')
                                                        ]?.descriptionKey
                                                    )}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </>
                    )}
                </div>

                {/* Group Order Badge (if applicable) */}
                {groupOrderData?.isGroupOrder && groupOrderData.session && (
                    <div className="px-6 pb-4">
                        <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                    <FaUsers className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-purple-700">
                                        Group Order
                                    </p>
                                    <p className="text-xs text-purple-600">
                                        {groupOrderData.session.participantCount} participants • Code: {groupOrderData.session.sessionCode}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSplitBill(!showSplitBill)}
                                className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                                {showSplitBill ? 'Hide Split' : 'Split Bill'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Split Bill View (Group Orders) */}
                {groupOrderData?.isGroupOrder && showSplitBill && groupOrderData.splitBill && (
                    <div className="px-6 pb-4">
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <FaCalculator className="w-4 h-4" />
                                    Bill Split by Participant
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {groupOrderData.splitBill.map((participant) => (
                                    <div key={participant.participantId} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {participant.participantName}
                                                </span>
                                                {participant.isHost && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-600 rounded">
                                                        HOST
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-orange-500">
                                                {formatCurrency(participant.total, order.merchant.currency)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            <div className="flex justify-between">
                                                <span>Items ({participant.itemCount})</span>
                                                <span>{formatCurrency(participant.subtotal, order.merchant.currency)}</span>
                                            </div>
                                            {participant.taxShare > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Tax share</span>
                                                    <span>{formatCurrency(participant.taxShare, order.merchant.currency)}</span>
                                                </div>
                                            )}
                                            {participant.serviceChargeShare > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Service share</span>
                                                    <span>{formatCurrency(participant.serviceChargeShare, order.merchant.currency)}</span>
                                                </div>
                                            )}
                                            {participant.packagingFeeShare > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Packaging share</span>
                                                    <span>{formatCurrency(participant.packagingFeeShare, order.merchant.currency)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Order Details - Show by participant for group orders */}
                <div className="px-6 pb-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                        {t('customer.track.orderItems')}
                    </h3>

                    {/* Group Order: Show items by participant */}
                    {groupOrderData?.isGroupOrder && groupOrderData.participants ? (
                        <div className="space-y-4">
                            {groupOrderData.participants.map((participant) => (
                                <div key={participant.id} className="bg-gray-50 rounded-xl overflow-hidden">
                                    {/* Participant Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {participant.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">
                                                {participant.name}
                                            </span>
                                            {participant.isHost && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-600 rounded">
                                                    HOST
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {formatCurrency(participant.subtotal, order.merchant.currency)}
                                        </span>
                                    </div>
                                    {/* Participant Items */}
                                    <div className="divide-y divide-gray-200">
                                        {participant.items.length > 0 ? (
                                            participant.items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-start px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {item.quantity}x {item.menuName}
                                                        </p>
                                                        {item.addons.length > 0 && (
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                + {item.addons.map(a => a.name).join(', ')}
                                                            </p>
                                                        )}
                                                        {item.notes && (
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                📝 {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {formatCurrency(item.subtotal, order.merchant.currency)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-500 italic">
                                                No items ordered
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Regular Order: Show items normally */
                        <div className="space-y-3">
                            {order.orderItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {item.quantity}x {item.menuName}
                                        </p>
                                        {item.addons && item.addons.length > 0 && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                + {item.addons.map(a => {
                                                    const addonPrice = a.price * (a.quantity || 1);
                                                    return addonPrice > 0 ? `${a.name} (${formatPrice(addonPrice, order.merchant.currency)})` : `${a.name} (Free)`;
                                                }).join(', ')}
                                            </p>
                                        )}
                                        {item.notes && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                <FaStickyNote className="inline w-3 h-3 mr-1" />{item.notes}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {formatPrice(item.subtotal, order.merchant.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <OrderTotalsBreakdown
                            amounts={{
                                subtotal: Number(order.subtotal || 0),
                                taxAmount: Number(order.taxAmount || 0),
                                serviceChargeAmount: Number(order.serviceChargeAmount || 0),
                                packagingFeeAmount: Number(order.packagingFeeAmount || 0),
                                deliveryFeeAmount: order.orderType === 'DELIVERY' ? Number(order.deliveryFeeAmount || 0) : 0,
                                discountAmount: Number(order.discountAmount || 0),
                                totalAmount: Number(order.totalAmount || 0),
                            }}
                            currency={order.merchant.currency}
                            locale={locale}
                            formatAmount={(amount) => formatCurrency(amount, order.merchant.currency, locale)}
                            labels={{
                                subtotal: tOr(t, 'customer.payment.subtotal', 'Subtotal'),
                                tax: tOr(t, 'customer.payment.inclTax', 'Tax'),
                                serviceCharge: tOr(t, 'customer.payment.serviceCharge', 'Service Charge'),
                                packagingFee: tOr(t, 'customer.payment.packagingFee', 'Packaging Fee'),
                                deliveryFee: tOr(t, 'customer.track.deliveryFee', 'Delivery fee'),
                                discount: tOr(t, 'customer.payment.voucher.discount', 'Voucher discount'),
                                total: t('customer.payment.total'),
                            }}
                            options={{
                                showDeliveryFee: order.orderType === 'DELIVERY',
                            }}
                            rowClassName="flex justify-between items-center"
                            labelClassName="text-sm text-gray-600"
                            valueClassName="text-sm font-semibold text-gray-900"
                            discountValueClassName="text-sm font-semibold text-green-600"
                            totalRowClassName="flex justify-between items-center"
                            totalLabelClassName="text-base font-semibold text-gray-900"
                            totalValueClassName="text-lg font-bold text-orange-500"
                        />
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 max-w-125 mx-auto px-6 py-4 bg-white border-t border-gray-200 space-y-3">

                <button
                    onClick={handleNewOrder}
                    className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98] shadow-sm"
                >
                    {t('customer.orderSummary.newOrder')}
                </button>
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
                onSubmit={handleFeedbackSubmit}
                orderNumber={order.orderNumber}
                completionTimeMinutes={completionTimeMinutes}
                language={feedbackLanguage}
            />
        </>
    );
}
