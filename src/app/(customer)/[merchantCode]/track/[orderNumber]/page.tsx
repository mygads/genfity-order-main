'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaSync, FaClock, FaCheckCircle, FaBolt, FaBell, FaCheck, FaTimes, FaUsers, FaCalculator, FaStickyNote } from 'react-icons/fa';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { formatCurrency } from '@/lib/utils/format';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { TranslationKeys } from '@/lib/i18n';

// Order status types
type OrderStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface OrderData {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber: string | null;
    customerName: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    orderItems: Array<{
        menuName: string;
        quantity: number;
        menuPrice: number;
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

const STATUS_STEPS: StatusStep[] = [
    { status: 'PENDING', labelKey: 'customer.status.pending', icon: '1', descriptionKey: 'customer.status.pendingDesc' },
    { status: 'ACCEPTED', labelKey: 'customer.status.accepted', icon: '2', descriptionKey: 'customer.status.acceptedDesc' },
    { status: 'IN_PROGRESS', labelKey: 'customer.status.preparing', icon: '3', descriptionKey: 'customer.status.preparingDesc' },
    { status: 'READY', labelKey: 'customer.status.ready', icon: '4', descriptionKey: 'customer.status.readyDesc' },
    { status: 'COMPLETED', labelKey: 'customer.status.completed', icon: '✓', descriptionKey: 'customer.status.completedDesc' },
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
    const { t } = useTranslation();

    const merchantCode = params.merchantCode as string;
    const orderNumber = params.orderNumber as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [groupOrderData, setGroupOrderData] = useState<GroupOrderData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSplitBill, setShowSplitBill] = useState(false);

    // Fetch order data
    const fetchOrder = useCallback(async (showLoadingSpinner = false) => {
        if (showLoadingSpinner) setIsRefreshing(true);

        try {
            const response = await fetch(`/api/public/orders/${orderNumber}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Failed to load order');
                return;
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
                totalAmount: convertDecimal(data.data.totalAmount),
                createdAt: data.data.createdAt,
                updatedAt: data.data.updatedAt,
                orderItems: data.data.orderItems?.map((item: {
                    menuName: string;
                    quantity: number;
                    menuPrice: unknown;
                    notes?: string;
                    addons?: Array<{ addonName?: string; name?: string; price?: unknown; quantity?: number }>;
                }) => ({
                    menuName: item.menuName,
                    quantity: item.quantity,
                    menuPrice: convertDecimal(item.menuPrice),
                    notes: item.notes,
                    addons: (item.addons || []).map((addon) => ({
                        name: addon.addonName || addon.name || '',
                        price: convertDecimal(addon.price),
                        quantity: addon.quantity || 1,
                    })),
                })) || [],
                merchant: {
                    name: data.data.merchant?.name || '',
                    currency: data.data.merchant?.currency || 'AUD',
                },
            });

            // Fetch group order details (if any)
            try {
                const groupResponse = await fetch(`/api/public/orders/${orderNumber}/group-details`);
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
            setError('Failed to load order');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [orderNumber]);

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

    // Get current step index
    const getCurrentStepIndex = (status: OrderStatus): number => {
        if (status === 'CANCELLED') return -1;
        return STATUS_STEPS.findIndex(step => step.status === status);
    };

    // Calculate estimated wait time based on status
    const getEstimatedWaitTime = (status: OrderStatus): string => {
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
        router.back();
    };

    // Handle new order
    const handleNewOrder = () => {
        router.push(`/${merchantCode}`);
    };

    // Loading state
    if (isLoading) {
        return <LoadingState type="page" message={LOADING_MESSAGES.ORDER_DETAILS} />;
    }

    // Error state
    if (error || !order) {
        return (
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-base text-gray-900 dark:text-white font-semibold mb-2">
                        {t('customer.track.orderNotFound')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
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

    return (
        <>
            {/* Header - Profile Style */}
            <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
                <div className="flex items-center px-4 py-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center -ml-2"
                        aria-label="Go back"
                    >
                        <FaArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
                    </button>

                    <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base">
                        {t('customer.track.title')}
                    </h1>

                    <button
                        onClick={() => fetchOrder(true)}
                        disabled={isRefreshing}
                        className="w-10 h-10 flex items-center justify-center -mr-2"
                        aria-label="Refresh"
                    >
                        <FaSync className={`w-5 h-5 text-gray-700 dark:text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-32">
                {/* Order Number Badge */}
                <div className="px-6 py-6 text-center border-b border-gray-200 dark:border-gray-800">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3">
                        <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                            {order.orderNumber}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.orderType === 'DINE_IN' ? `${t('admin.orders.table')} #${order.tableNumber}` : t('customer.track.takeawayOrder')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {t('customer.track.lastUpdated')} {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                {/* Status Progress */}
                <div className="px-6 py-6">
                    {isCancelled ? (
                        /* Cancelled State */
                        <div className="text-center py-8">
                            <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <h2 className="text-xl font-bold text-red-600 mb-2">{t('customer.track.orderCancelled')}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('customer.status.cancelledDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Progress Bar */}
                            <div className="relative mb-8">
                                {/* Background Bar */}
                                <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />

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
                            ${isCurrent ? 'bg-orange-500 text-white ring-4 ring-orange-200 dark:ring-orange-900 scale-110' :
                                                            isActive ? 'bg-orange-500 text-white' :
                                                                'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
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
                                                <span className={`
                          mt-2 text-xs font-medium text-center
                          ${isCurrent ? 'text-orange-600 dark:text-orange-400' :
                                                        isActive ? 'text-gray-900 dark:text-white' :
                                                            'text-gray-400 dark:text-gray-500'}
                        `}>
                                                    {t(step.labelKey)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Current Status Card */}
                            <div className={`
                p-6 rounded-xl text-center mb-6 bg-white dark:bg-gray-800
                ${isReady ? 'border-2 border-green-500' : 'border border-gray-200 dark:border-gray-700'}
              `}>
                                {/* Status Icon - FA Icons */}
                                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isReady ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'}`}>
                                    {currentStepIndex === 0 && <FaClock className="w-6 h-6" />}
                                    {currentStepIndex === 1 && <FaCheckCircle className="w-6 h-6" />}
                                    {currentStepIndex === 2 && <FaBolt className="w-6 h-6" />}
                                    {currentStepIndex === 3 && <FaBell className="w-6 h-6" />}
                                    {currentStepIndex === 4 && <FaCheck className="w-6 h-6" />}
                                </div>
                                <h2 className={`text-xl font-bold mb-2 ${isReady ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                    {isCompleted ? t('customer.track.orderCompleted') :
                                        isReady ? t('customer.track.orderReady') :
                                            t(STATUS_STEPS[currentStepIndex]?.descriptionKey) || t('customer.loading.processingOrder')}
                                </h2>

                                {!isCompleted && (
                                    <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                                        <FaClock className="w-5 h-5" />
                                        <span className="text-sm font-medium">
                                            {t('customer.track.estimated')} {getEstimatedWaitTime(order.status)}
                                        </span>
                                    </div>
                                )}

                                {isReady && (
                                    <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                                        {t('customer.track.pickupMessage')}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Group Order Badge (if applicable) */}
                {groupOrderData?.isGroupOrder && groupOrderData.session && (
                    <div className="px-6 pb-4">
                        <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                        Group Order
                                    </p>
                                    <p className="text-xs text-purple-600 dark:text-purple-400">
                                        {groupOrderData.session.participantCount} participants • Code: {groupOrderData.session.sessionCode}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSplitBill(!showSplitBill)}
                                className="px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-colors"
                            >
                                {showSplitBill ? 'Hide Split' : 'Split Bill'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Split Bill View (Group Orders) */}
                {groupOrderData?.isGroupOrder && showSplitBill && groupOrderData.splitBill && (
                    <div className="px-6 pb-4">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Bill Split by Participant
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {groupOrderData.splitBill.map((participant) => (
                                    <div key={participant.participantId} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {participant.participantName}
                                                </span>
                                                {participant.isHost && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                                                        HOST
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-orange-500">
                                                {formatCurrency(participant.total, order.merchant.currency)}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
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
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        {t('customer.track.orderItems')}
                    </h3>

                    {/* Group Order: Show items by participant */}
                    {groupOrderData?.isGroupOrder && groupOrderData.participants ? (
                        <div className="space-y-4">
                            {groupOrderData.participants.map((participant) => (
                                <div key={participant.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
                                    {/* Participant Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                {participant.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {participant.name}
                                            </span>
                                            {participant.isHost && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">
                                                    HOST
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {formatCurrency(participant.subtotal, order.merchant.currency)}
                                        </span>
                                    </div>
                                    {/* Participant Items */}
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {participant.items.length > 0 ? (
                                            participant.items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-start px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {item.quantity}x {item.menuName}
                                                        </p>
                                                        {item.addons.length > 0 && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                + {item.addons.map(a => a.name).join(', ')}
                                                            </p>
                                                        )}
                                                        {item.notes && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                📝 {item.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {formatCurrency(item.subtotal, order.merchant.currency)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
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
                                    className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {item.quantity}x {item.menuName}
                                        </p>
                                        {item.addons && item.addons.length > 0 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                + {item.addons.map(a => {
                                                    const addonPrice = a.price * (a.quantity || 1);
                                                    return addonPrice > 0 ? `${a.name} (${formatPrice(addonPrice, order.merchant.currency)})` : `${a.name} (Free)`;
                                                }).join(', ')}
                                            </p>
                                        )}
                                        {item.notes && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                <FaStickyNote className="inline w-3 h-3 mr-1" />{item.notes}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {formatPrice(item.menuPrice * item.quantity, order.merchant.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">{t('customer.payment.total')}</span>
                        <span className="text-lg font-bold text-orange-500">
                            {formatCurrency(order.totalAmount, order.merchant.currency)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 max-w-[500px] mx-auto px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-3">

                <button
                    onClick={handleNewOrder}
                    className="w-full h-12 bg-orange-500 text-white text-base font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98] shadow-sm"
                >
                    {t('customer.orderSummary.newOrder')}
                </button>
            </div>
        </>
    );
}
