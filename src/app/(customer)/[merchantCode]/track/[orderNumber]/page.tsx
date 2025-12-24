'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { formatCurrency } from '@/lib/utils/format';

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
    }>;
    merchant: {
        name: string;
        currency: string;
    };
}

interface StatusStep {
    status: OrderStatus;
    label: string;
    icon: string;
    description: string;
}

const STATUS_STEPS: StatusStep[] = [
    { status: 'PENDING', label: 'Pending', icon: '1', description: 'Waiting for acceptance' },
    { status: 'ACCEPTED', label: 'Accepted', icon: '2', description: 'Order confirmed' },
    { status: 'IN_PROGRESS', label: 'Preparing', icon: '3', description: 'Being prepared' },
    { status: 'READY', label: 'Ready', icon: '4', description: 'Ready for pickup!' },
    { status: 'COMPLETED', label: 'Completed', icon: '✓', description: 'Order completed' },
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

    const merchantCode = params.merchantCode as string;
    const orderNumber = params.orderNumber as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

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
                }) => ({
                    menuName: item.menuName,
                    quantity: item.quantity,
                    menuPrice: convertDecimal(item.menuPrice),
                    notes: item.notes,
                })) || [],
                merchant: {
                    name: data.data.merchant?.name || '',
                    currency: data.data.merchant?.currency || 'AUD',
                },
            });
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
                return '~15-20 min';
            case 'ACCEPTED':
                return '~10-15 min';
            case 'IN_PROGRESS':
                return '~5-10 min';
            case 'READY':
                return 'Ready now!';
            case 'COMPLETED':
                return 'Completed';
            default:
                return '--';
        }
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
                        Order Not Found
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
                    >
                        Go Back
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
                        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white" />
                    </button>

                    <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base">
                        Track Order
                    </h1>

                    <button
                        onClick={() => fetchOrder(true)}
                        disabled={isRefreshing}
                        className="w-10 h-10 flex items-center justify-center -mr-2"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-700 dark:text-white ${isRefreshing ? 'animate-spin' : ''}`} />
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
                        {order.orderType === 'DINE_IN' ? `Table #${order.tableNumber}` : 'Takeaway Order'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Last updated: {lastUpdated.toLocaleTimeString()}
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
                            <h2 className="text-xl font-bold text-red-600 mb-2">Order Cancelled</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                This order has been cancelled.
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
                                                    {/* SVG Icons for each step */}
                                                    {step.status === 'PENDING' && (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}
                                                    {step.status === 'ACCEPTED' && (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}
                                                    {step.status === 'IN_PROGRESS' && (
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                        </svg>
                                                    )}
                                                    {step.status === 'READY' && (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                        </svg>
                                                    )}
                                                    {step.status === 'COMPLETED' && (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Label */}
                                                <span className={`
                          mt-2 text-xs font-medium text-center
                          ${isCurrent ? 'text-orange-600 dark:text-orange-400' :
                                                        isActive ? 'text-gray-900 dark:text-white' :
                                                            'text-gray-400 dark:text-gray-500'}
                        `}>
                                                    {step.label}
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
                                {/* Status Icon - SVG */}
                                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isReady ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'}`}>
                                    {currentStepIndex === 0 && (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    {currentStepIndex === 1 && (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    {currentStepIndex === 2 && (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    )}
                                    {currentStepIndex === 3 && (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    )}
                                    {currentStepIndex === 4 && (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <h2 className={`text-xl font-bold mb-2 ${isReady ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                    {isCompleted ? 'Order Completed!' :
                                        isReady ? 'Your Order is Ready!' :
                                            STATUS_STEPS[currentStepIndex]?.description || 'Processing...'}
                                </h2>

                                {!isCompleted && (
                                    <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-medium">
                                            Estimated: {getEstimatedWaitTime(order.status)}
                                        </span>
                                    </div>
                                )}

                                {isReady && (
                                    <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                                        Please pick up your order at the counter!
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Order Details */}
                <div className="px-6 pb-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Order Items
                    </h3>
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
                                    {item.notes && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            📝 {item.notes}
                                        </p>
                                    )}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {formatCurrency(item.menuPrice * item.quantity, order.merchant.currency)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">Total</span>
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
                    New Order
                </button>
            </div>
        </>
    );
}
