'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useCustomerData } from '@/context/CustomerDataContext';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/common/SkeletonLoaders';
import { FaFileDownload } from 'react-icons/fa';

interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    tableNumber: string | null;
    totalAmount: number;
    subtotal: number;  // from Order model
    taxAmount: number;
    serviceChargeAmount: number;
    packagingFeeAmount: number;
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
    const searchParams = useSearchParams();
    const { t, locale } = useTranslation();

    const merchantCode = params.merchantCode as string;
    const orderNumber = params.orderNumber as string;
    const mode = searchParams.get('mode') || 'takeaway';

    const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

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

            try {
                const publicResponse = await fetch(`/api/public/orders/${orderNumber}`);
                if (publicResponse.ok) {
                    const publicData = await publicResponse.json();
                    if (publicData.success) {
                        setOrder(publicData.data);
                    } else {
                        setError(publicData.error || 'Order not found');
                    }
                } else {
                    setError('Order not found');
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
                setError('Failed to load order details');
            } finally {
                setIsLoading(false);
            }
        };

        if (orderNumber) {
            fetchOrder();
        }
    }, [orderNumber, router]);

    const formatCurrency = (amount: number): string => {
        // Handle undefined/null amount
        if (amount === undefined || amount === null || isNaN(amount)) {
            return '-';
        }

        const currency = order?.merchant?.currency || merchantCurrency;

        if (currency === 'AUD') {
            return `A$${amount.toFixed(2)}`;
        }

        if (currency === 'IDR') {
            const formatted = new Intl.NumberFormat('id-ID', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(Math.round(amount));
            return `Rp ${formatted}`;
        }

        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: currency,
        }).format(amount);
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
            // Dynamic import for PDF generator (client-side only)
            const { generateOrderReceiptPdf } = await import('@/lib/utils/generateOrderPdf');

            // Prepare data for PDF generation
            const receiptData = {
                orderNumber: order.orderNumber,
                merchantName: order.merchant?.name || 'Merchant',
                merchantCode: merchantCode,
                merchantAddress: order.merchant?.address,
                merchantPhone: order.merchant?.phone,
                merchantLogo: (order.merchant as { logoUrl?: string })?.logoUrl,
                orderType: order.orderType as 'DINE_IN' | 'TAKEAWAY',
                tableNumber: order.tableNumber,
                customerName: auth.customer.name,
                customerEmail: auth.customer.email,
                customerPhone: auth.customer.phone,
                placedAt: order.placedAt,
                items: (order.orderItems || []).map((item) => ({
                    menuName: item.menuName,
                    quantity: item.quantity,
                    price: Number(item.menuPrice) || 0,
                    addons: (item.addons || []).map((addon) => ({
                        name: addon.addonName,
                        price: Number(addon.addonPrice) || 0,
                    })),
                    notes: item.notes,
                })),
                subtotal: Number(order.subtotal) || 0,
                taxAmount: Number(order.taxAmount) || 0,
                serviceChargeAmount: Number(order.serviceChargeAmount) || 0,
                packagingFeeAmount: Number(order.packagingFeeAmount) || 0,
                totalAmount: Number(order.totalAmount) || 0,
                paymentMethod: order.payment?.paymentMethod,
                paymentStatus: order.payment?.status,
                currency: order.merchant?.currency || merchantCurrency,
                // Staff who recorded the payment
                recordedBy: order.payment?.paidBy ? {
                    name: order.payment.paidBy.name,
                    email: order.payment.paidBy.email,
                } : null,
                // Language for receipt
                language: locale as 'en' | 'id',
            };

            // Generate and download PDF
            await generateOrderReceiptPdf(receiptData);
            showSuccess(t('customer.receipt.downloadSuccess'));

        } catch (error) {
            console.error('Download receipt error:', error);
            showError(t('customer.receipt.downloadFailed'));
        } finally {
            setDownloadingReceipt(false);
        }
    };

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
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
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
                            {order.orderType === 'DINE_IN' ? t('customer.track.dineInOrder') : t('customer.track.takeawayOrder')}
                            {order.tableNumber && ` • Table ${order.tableNumber}`}
                        </p>
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
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(Number(order.subtotal) || 0)}</span>
                        </div>
                        {Number(order.taxAmount) > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax</span>
                                <span>{formatCurrency(Number(order.taxAmount))}</span>
                            </div>
                        )}
                        {Number(order.serviceChargeAmount) > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Service Charge</span>
                                <span>{formatCurrency(Number(order.serviceChargeAmount))}</span>
                            </div>
                        )}
                        {Number(order.packagingFeeAmount) > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Packaging Fee</span>
                                <span>{formatCurrency(Number(order.packagingFeeAmount))}</span>
                            </div>
                        )}
                        <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between font-bold text-gray-900">
                                <span>Total</span>
                                <span className="text-orange-500">{formatCurrency(Number(order.totalAmount) || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    {order.payment && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Payment Method</span>
                                <span className="font-medium text-gray-900 capitalize">
                                    {order.payment.paymentMethod ? order.payment.paymentMethod.replace(/_/g, ' ').toLowerCase() : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">Payment Status</span>
                                <span className={`font-medium ${order.payment.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {order.payment.status || '-'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Download Receipt Button */}
                <button
                    onClick={handleDownloadReceipt}
                    disabled={downloadingReceipt}
                    className="w-full py-2 text-white bg-orange-500 font-semibold rounded-xl text-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {downloadingReceipt ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>{t('customer.receipt.downloading')}</span>
                        </>
                    ) : (
                        <>
                            <FaFileDownload className="w-5 h-5" />
                            <span>{t('customer.receipt.downloadReceipt')}</span>
                        </>
                    )}
                </button>
            </main>
        </div>
    );
}
