"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import SuspendedAlert from "@/components/subscription/SuspendedAlert";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import AlertDialog from "@/components/modals/AlertDialog";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useContextualHint, CONTEXTUAL_HINTS } from "@/lib/tutorial/components/ContextualHint";
import { FaWallet, FaCalendarAlt, FaClock, FaExchangeAlt, FaArrowRight, FaCheckCircle, FaExclamationTriangle, FaHistory, FaCreditCard, FaInfoCircle, FaTicketAlt } from "react-icons/fa";
import type { ReceiptSettings } from "@/lib/types/receiptSettings";

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
        status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
        isValid: boolean;
        daysRemaining: number | null;
        trialEndsAt: string | null;
        currentPeriodEnd: string | null;
        suspendReason: string | null;
    };
    balance: {
        amount: number;
        currency: string;
    } | null;
    pricing: {
        currency: string;
        depositMinimum: number;
        orderFee: number;
        monthlyPrice: number;
    };
}

interface TransactionData {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
}

interface BalanceInfo {
    balance: number;
    currency: string;
    lastTopupAt: string | null;
    isLow: boolean;
    orderFee: number;
    estimatedOrders: number;
    billingSummary: {
        yesterday: number;
        lastWeek: number;
        lastMonth: number;
    };
}

interface CanSwitchData {
    canSwitchToDeposit: boolean;
    canSwitchToMonthly: boolean;
    currentType: string;
    hasActiveMonthly: boolean;
    hasPositiveBalance: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

type ReceiptSettingsApiData = {
    receiptSettings: ReceiptSettings;
    completedOrderEmailFee?: number;
    currentBalance?: number;
};

type UsageSummary = {
    today: {
        orderFee: number;
        orderFeeCount: number;
        completedOrderEmailFee: number;
        completedOrderEmailFeeCount: number;
        total: number;
    };
    last30Days: {
        orderFee: number;
        orderFeeCount: number;
        completedOrderEmailFee: number;
        completedOrderEmailFeeCount: number;
        total: number;
    };
};

/**
 * Merchant Subscription Page - Redesigned
 * Professional, clean, modern UI with dual language support
 */
export default function SubscriptionPage() {
    const { t, locale } = useTranslation();
    const { showHint } = useContextualHint();
    const [switching, setSwitching] = useState(false);
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [switchErrorOpen, setSwitchErrorOpen] = useState(false);
    const [switchErrorMessage, setSwitchErrorMessage] = useState<string>("");
    const [pendingSwitchType, setPendingSwitchType] = useState<'DEPOSIT' | 'MONTHLY' | null>(null);
    
    // Voucher redeem modal state
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [redeemResult, setRedeemResult] = useState<{
        success: boolean;
        message: string;
        voucherType?: 'BALANCE' | 'SUBSCRIPTION_DAYS';
        valueApplied?: number;
        autoSwitchTriggered?: boolean;
        newSubType?: string;
    } | null>(null);

    // Fetch all data
    const { data: subscriptionResponse, error: subscriptionError, isLoading: subscriptionLoading } =
        useSWRStatic<ApiResponse<SubscriptionData>>('/api/merchant/subscription');
    const { data: balanceResponse } = useSWRStatic<ApiResponse<BalanceInfo>>('/api/merchant/balance');
    const { data: transactionsResponse, isLoading: transactionsLoading } =
        useSWRStatic<ApiResponse<{ transactions: TransactionData[] }>>('/api/merchant/balance/transactions?limit=5');
    const { data: canSwitchResponse } = useSWRStatic<ApiResponse<CanSwitchData>>('/api/merchant/subscription/can-switch');
    const { data: receiptSettingsResponse } = useSWRStatic<ApiResponse<ReceiptSettingsApiData>>('/api/merchant/receipt-settings');
    const { data: usageSummaryResponse } = useSWRStatic<ApiResponse<UsageSummary>>('/api/merchant/balance/usage-summary');

    const subscription = subscriptionResponse?.data?.subscription;
    const pricing = subscriptionResponse?.data?.pricing;
    const balanceInfo = balanceResponse?.data;
    const canSwitch = canSwitchResponse?.data;
    const transactions = transactionsResponse?.data?.transactions || [];
    const receiptSettings = receiptSettingsResponse?.data?.receiptSettings;
    const completedOrderEmailFee = receiptSettingsResponse?.data?.completedOrderEmailFee ?? 0;
    const usageSummary = usageSummaryResponse?.data;

    // Show contextual hint on first visit
    useEffect(() => {
        if (!subscriptionLoading) {
            showHint(CONTEXTUAL_HINTS.subscriptionFirstVisit);
            // Show low balance warning if applicable (only for DEPOSIT mode)
            if (balanceInfo?.isLow && subscription?.type === 'DEPOSIT') {
                setTimeout(() => showHint(CONTEXTUAL_HINTS.subscriptionLowBalance), 3000);
            }
        }
    }, [subscriptionLoading, balanceInfo?.isLow, showHint]);

    // Helpers
    const formatCurrency = (amount: number, currency: string) => {
        const sign = amount < 0 ? '-' : '';
        const value = Math.abs(amount);
        if (currency === 'AUD') {
            return `${sign}A$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `${sign}Rp ${value.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateStr: string) => {
        const dateLocale = locale === 'id' ? 'id-ID' : 'en-AU';
        return new Date(dateStr).toLocaleDateString(dateLocale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateStr: string) => {
        const dateLocale = locale === 'id' ? 'id-ID' : 'en-AU';
        return new Date(dateStr).toLocaleString(dateLocale, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionTypeLabel = (type: string) => {
        const labels: Record<string, { en: string; id: string }> = {
            'DEPOSIT': { en: 'Top Up', id: 'Isi Saldo' },
            'ORDER_FEE': { en: 'Order Fee', id: 'Biaya Pesanan' },
            'COMPLETED_ORDER_EMAIL_FEE': { en: 'Completed Order Email Fee', id: 'Biaya Email Pesanan Selesai' },
            'SUBSCRIPTION': { en: 'Subscription', id: 'Langganan' },
            'REFUND': { en: 'Refund', id: 'Pengembalian' },
            'ADJUSTMENT': { en: 'Adjustment', id: 'Penyesuaian' },
        };
        return labels[type]?.[locale] || type;
    };

    const handleSwitch = async (newType: 'DEPOSIT' | 'MONTHLY') => {
        // Open confirmation modal instead of browser confirm
        setPendingSwitchType(newType);
        setSwitchModalOpen(true);
    };

    // Handle voucher redemption
    const handleRedeemVoucher = async () => {
        if (!voucherCode.trim()) return;

        setRedeeming(true);
        setRedeemResult(null);

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/merchant/vouchers/redeem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ code: voucherCode.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                setRedeemResult({
                    success: true,
                    message: data.message,
                    voucherType: data.data.voucherType,
                    valueApplied: data.data.valueApplied,
                    autoSwitchTriggered: data.data.autoSwitchTriggered,
                    newSubType: data.data.newSubType,
                });
                setVoucherCode('');
                // Reload page after 2 seconds to refresh subscription status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setRedeemResult({
                    success: false,
                    message: data.message || (locale === 'id' ? 'Gagal menukarkan voucher' : 'Failed to redeem voucher'),
                });
            }
        } catch (error) {
            setRedeemResult({
                success: false,
                message: locale === 'id' ? 'Terjadi kesalahan. Silakan coba lagi.' : 'An error occurred. Please try again.',
            });
        } finally {
            setRedeeming(false);
        }
    };

    const confirmSwitch = async () => {
        if (!pendingSwitchType) return;

        setSwitchModalOpen(false);
        setSwitching(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/merchant/subscription/switch-type', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ newType: pendingSwitchType }),
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                setSwitchErrorMessage(data.message || (locale === 'id' ? 'Gagal mengganti tipe langganan' : 'Failed to switch subscription type'));
                setSwitchErrorOpen(true);
            }
        } catch {
            setSwitchErrorMessage(locale === 'id' ? 'Gagal mengganti tipe langganan' : 'Failed to switch subscription type');
            setSwitchErrorOpen(true);
        } finally {
            setSwitching(false);
        }
    };

    // Loading state
    if (subscriptionLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                    ))}
                </div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            </div>
        );
    }

    // Error state
    if (subscriptionError || !subscription) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <FaExclamationTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {locale === 'id' ? 'Gagal Memuat Data' : 'Failed to Load Data'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {locale === 'id'
                            ? 'Terjadi kesalahan saat memuat data langganan. Silakan coba lagi.'
                            : 'An error occurred while loading subscription data. Please try again.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
                    >
                        {locale === 'id' ? 'Coba Lagi' : 'Try Again'}
                    </button>
                </div>
            </div>
        );
    }

    const currency = pricing?.currency || 'IDR';
    const isActive = subscription.status === 'ACTIVE';
    const isTrial = subscription.type === 'TRIAL';
    const isDeposit = subscription.type === 'DEPOSIT';
    const isMonthly = subscription.type === 'MONTHLY';

    const estimatedEmailsRemaining = (() => {
        if (!receiptSettings?.sendCompletedOrderEmailToCustomer) return null;
        if (!completedOrderEmailFee || completedOrderEmailFee <= 0) return null;
        const currentBalance = balanceInfo?.balance ?? 0;
        if (!Number.isFinite(currentBalance) || currentBalance <= 0) return 0;
        return Math.floor(currentBalance / completedOrderEmailFee);
    })();

    // Status colors
    const getStatusColor = () => {
        if (!isActive) return 'from-red-500 to-red-600';
        if (isTrial) return 'from-purple-500 to-indigo-600';
        if (isDeposit) return 'from-emerald-500 to-teal-600';
        if (isMonthly) return 'from-blue-500 to-indigo-600';
        return 'from-gray-500 to-gray-600';
    };

    const getStatusIcon = () => {
        if (!isActive) return <FaExclamationTriangle className="w-6 h-6" />;
        if (isTrial) return <FaClock className="w-6 h-6" />;
        if (isDeposit) return <FaWallet className="w-6 h-6" />;
        if (isMonthly) return <FaCalendarAlt className="w-6 h-6" />;
        return <FaInfoCircle className="w-6 h-6" />;
    };

    const getTypeLabel = () => {
        if (isTrial) return locale === 'id' ? 'Masa Percobaan' : 'Trial Period';
        if (isDeposit) return locale === 'id' ? 'Mode Deposit' : 'Deposit Mode';
        if (isMonthly) return locale === 'id' ? 'Langganan Bulanan' : 'Monthly Subscription';
        return locale === 'id' ? 'Tidak Ada' : 'None';
    };

    const getStatusLabel = () => {
        if (isActive) return locale === 'id' ? 'Aktif' : 'Active';
        if (subscription.status === 'SUSPENDED') return locale === 'id' ? 'Ditangguhkan' : 'Suspended';
        return locale === 'id' ? 'Dibatalkan' : 'Cancelled';
    };

    return (
        <div className="space-y-4">
            <PageBreadcrumb pageTitle={locale === 'id' ? 'Langganan' : 'Subscription'} />

            <AlertDialog
                isOpen={switchErrorOpen}
                title={t('common.error') || 'Error'}
                message={switchErrorMessage || (locale === 'id' ? 'Gagal mengganti tipe langganan' : 'Failed to switch subscription type')}
                variant="danger"
                onClose={() => setSwitchErrorOpen(false)}
            />

            {/* Suspended Alert */}
            {subscription.status === 'SUSPENDED' && (
                <SuspendedAlert type={subscription.type} reason={subscription.suspendReason || undefined} />
            )}

            {/* Hero Card - Main Status */}
            <div className={`relative overflow-hidden rounded-xl bg-linear-to-r ${getStatusColor()} p-4 sm:p-6 text-white`}>
                <div className="absolute top-0 right-0 w-64 h-64 transform translate-x-1/3 -translate-y-1/3">
                    <div className="w-full h-full rounded-full bg-white/10" />
                </div>
                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Left: Status Info */}
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                                {getStatusIcon()}
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-medium mb-1">
                                    {locale === 'id' ? 'Status Langganan' : 'Subscription Status'}
                                </p>
                                <h2 className="text-xl sm:text-2xl font-bold mb-1">{getTypeLabel()}</h2>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-white/20' : 'bg-red-400/30'
                                        }`}>
                                        {getStatusLabel()}
                                    </span>
                                    {subscription.daysRemaining !== null && isActive && (
                                        <span className="text-white/80 text-sm">
                                            {subscription.daysRemaining} {locale === 'id' ? 'hari tersisa' : 'days remaining'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Key Metric */}
                        <div className="lg:text-right">
                            {isTrial && subscription.trialEndsAt && (
                                <div>
                                    <p className="text-white/70 text-xs mb-1">
                                        {locale === 'id' ? 'Berakhir Pada' : 'Ends On'}
                                    </p>
                                    <p className="text-lg sm:text-xl font-bold">{formatDate(subscription.trialEndsAt)}</p>
                                </div>
                            )}
                            {isMonthly && subscription.currentPeriodEnd && (
                                <div>
                                    <p className="text-white/70 text-xs mb-1">
                                        {locale === 'id' ? 'Berlaku Hingga' : 'Valid Until'}
                                    </p>
                                    <p className="text-lg sm:text-xl font-bold">{formatDate(subscription.currentPeriodEnd)}</p>
                                </div>
                            )}
                            {isDeposit && balanceInfo && (
                                <div>
                                    <p className="text-white/70 text-xs mb-1">
                                        {locale === 'id' ? 'Saldo Saat Ini' : 'Current Balance'}
                                    </p>
                                    <p className="text-lg sm:text-xl font-bold">{formatCurrency(balanceInfo.balance, currency)}</p>
                                    {balanceInfo.estimatedOrders > 0 && (
                                        <p className="text-white/70 text-sm mt-1">
                                            ~{balanceInfo.estimatedOrders} {locale === 'id' ? 'pesanan tersisa' : 'orders remaining'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                            href="/admin/dashboard/subscription/topup"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
                        >
                            <FaCreditCard className="w-3.5 h-3.5" />
                            {isTrial
                                ? (locale === 'id' ? 'Upgrade Sekarang' : 'Upgrade Now')
                                : (locale === 'id' ? 'Top Up / Perpanjang' : 'Top Up / Extend')}
                        </Link>
                        <button
                            onClick={() => setRedeemModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                            <FaTicketAlt className="w-3.5 h-3.5" />
                            {locale === 'id' ? 'Tukar Voucher' : 'Redeem Voucher'}
                        </button>
                        <Link
                            href="/admin/dashboard/subscription/transactions"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                            <FaCreditCard className="w-3.5 h-3.5" />
                            {locale === 'id' ? 'Riwayat Transaksi' : 'Transactions'}
                        </Link>
                        <Link
                            href="/admin/dashboard/subscription/history"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                            <FaHistory className="w-3.5 h-3.5" />
                            {locale === 'id' ? 'Riwayat Event' : 'Event History'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Balance Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <FaWallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {locale === 'id' ? 'Saldo' : 'Balance'}
                        </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(balanceInfo?.balance || 0, currency)}
                    </p>
                    {balanceInfo?.isLow && isDeposit && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <FaExclamationTriangle className="w-3 h-3" />
                            {locale === 'id' ? 'Saldo rendah' : 'Low balance'}
                        </p>
                    )}
                </div>

                {/* Estimated Orders Card - Only for Deposit mode */}
                {isDeposit && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FaCreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? 'Estimasi Pesanan' : 'Est. Orders'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            ~{balanceInfo?.estimatedOrders || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'id' ? 'Pesanan tersisa' : 'Orders remaining'}
                        </p>
                    </div>
                )}

                {/* Yesterday Billing Card - Only for Deposit mode */}
                {isDeposit && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                <FaHistory className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? 'Tagihan Kemarin' : 'Yesterday'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(balanceInfo?.billingSummary?.yesterday || 0, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'id' ? 'Biaya pesanan' : 'Order fees'}
                        </p>
                    </div>
                )}

                {/* Last Week Billing Card - Only for Deposit mode */}
                {isDeposit && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <FaCalendarAlt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? '7 Hari Terakhir' : 'Last 7 Days'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(balanceInfo?.billingSummary?.lastWeek || 0, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'id' ? 'Biaya pesanan' : 'Order fees'}
                        </p>
                    </div>
                )}

                {/* Last Month Billing Card - Only for Deposit mode */}
                {isDeposit && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <FaCalendarAlt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? '30 Hari Terakhir' : 'Last 30 Days'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(balanceInfo?.billingSummary?.lastMonth || 0, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'id' ? 'Biaya pesanan' : 'Order fees'}
                        </p>
                    </div>
                )}

                {/* Email Usage Today (only if receipt email enabled) */}
                {receiptSettings?.sendCompletedOrderEmailToCustomer && usageSummary && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <FaInfoCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? 'Pemakaian Email Hari Ini' : 'Email Usage Today'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(-usageSummary.today.completedOrderEmailFee, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {usageSummary.today.completedOrderEmailFeeCount} {locale === 'id' ? 'email' : 'emails'}
                        </p>
                        {typeof estimatedEmailsRemaining === 'number' && completedOrderEmailFee > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {locale === 'id'
                                    ? `Perkiraan sisa: ${estimatedEmailsRemaining} email (biaya ${formatCurrency(completedOrderEmailFee, currency)}/email)`
                                    : `Estimated remaining: ${estimatedEmailsRemaining} emails (${formatCurrency(completedOrderEmailFee, currency)}/email)`}
                            </p>
                        )}
                    </div>
                )}

                {/* Deposit Usage Today (only in deposit mode) */}
                {isDeposit && usageSummary && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                <FaWallet className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? 'Pemakaian Saldo Hari Ini' : 'Deposit Usage Today'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(-usageSummary.today.orderFee, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {usageSummary.today.orderFeeCount} {locale === 'id' ? 'biaya pesanan' : 'order fees'}
                        </p>
                    </div>
                )}

                {/* Combined Usage (Deposit + Email) */}
                {isDeposit && receiptSettings?.sendCompletedOrderEmailToCustomer && usageSummary && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <FaHistory className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {locale === 'id' ? 'Total Pemakaian' : 'Total Usage'}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(-usageSummary.today.total, currency)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {locale === 'id'
                                ? `30 hari: ${formatCurrency(-usageSummary.last30Days.total, currency)}`
                                : `Last 30 days: ${formatCurrency(-usageSummary.last30Days.total, currency)}`}
                        </p>
                    </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Left Column - Payment Options with integrated Switch */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Payment Options */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {locale === 'id' ? 'Pilihan Pembayaran' : 'Payment Options'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {locale === 'id'
                                    ? 'Pilih metode pembayaran yang sesuai dengan kebutuhan bisnis Anda'
                                    : 'Choose the payment method that suits your business needs'}
                            </p>
                        </div>

                        <div className="p-4 grid gap-3 sm:grid-cols-2">
                            {/* Deposit Option */}
                            <div
                                className={`relative p-4 rounded-lg border-2 transition-all ${isDeposit
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                    : 'border-gray-200 dark:border-gray-600'
                                    } ${!isDeposit && !isTrial && canSwitch?.canSwitchToDeposit ? 'hover:shadow-md cursor-pointer hover:border-emerald-300' : ''}`}
                                onClick={() => {
                                    if (!isDeposit && !isTrial && canSwitch?.canSwitchToDeposit) {
                                        handleSwitch('DEPOSIT');
                                    }
                                }}
                            >
                                {isDeposit && (
                                    <div className="absolute top-3 right-3">
                                        <FaCheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                                    <FaWallet className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                    {locale === 'id' ? 'Mode Deposit' : 'Deposit Mode'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {locale === 'id'
                                        ? 'Bayar sesuai pesanan. Cocok untuk bisnis dengan volume bervariasi.'
                                        : 'Pay per order. Best for businesses with varying volume.'}
                                </p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    {locale === 'id' ? 'Bayar sesuai pemakaian' : 'Pay as you go'}
                                </p>
                                {/* Switch button for non-deposit mode */}
                                {!isDeposit && !isTrial && canSwitch?.canSwitchToDeposit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSwitch('DEPOSIT');
                                        }}
                                        disabled={switching}
                                        className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        <FaExchangeAlt className="w-3 h-3" />
                                        {locale === 'id' ? 'Beralih' : 'Switch'}
                                    </button>
                                )}
                            </div>

                            {/* Monthly Option */}
                            <div
                                className={`relative p-4 rounded-lg border-2 transition-all ${isMonthly
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                                    : 'border-gray-200 dark:border-gray-600'
                                    } ${!isMonthly && !isTrial && canSwitch?.canSwitchToMonthly ? 'hover:shadow-md cursor-pointer hover:border-blue-300' : ''}`}
                                onClick={() => {
                                    if (!isMonthly && !isTrial && canSwitch?.canSwitchToMonthly) {
                                        handleSwitch('MONTHLY');
                                    }
                                }}
                            >
                                {isMonthly && (
                                    <div className="absolute top-3 right-3">
                                        <FaCheckCircle className="w-5 h-5 text-blue-500" />
                                    </div>
                                )}
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                                    <FaCalendarAlt className="w-6 h-6 text-blue-600" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                    {locale === 'id' ? 'Langganan Bulanan' : 'Monthly Subscription'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {locale === 'id'
                                        ? 'Biaya tetap, tanpa biaya pesanan. Cocok untuk volume tinggi.'
                                        : 'Fixed fee, no order charges. Best for high volume.'}
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                    {locale === 'id' ? 'Tanpa biaya per pesanan' : 'No per-order fee'}
                                </p>
                                {/* Switch button for non-monthly mode */}
                                {!isMonthly && !isTrial && canSwitch?.canSwitchToMonthly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSwitch('MONTHLY');
                                        }}
                                        disabled={switching}
                                        className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        <FaExchangeAlt className="w-3 h-3" />
                                        {locale === 'id' ? 'Beralih' : 'Switch'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status indicators at bottom */}
                        {!isTrial && canSwitch && (canSwitch.hasActiveMonthly || canSwitch.hasPositiveBalance) && (
                            <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                                {canSwitch.hasActiveMonthly && (
                                    <span className="flex items-center gap-1">
                                        <FaCheckCircle className="w-3 h-3 text-blue-500" />
                                        {locale === 'id' ? 'Bulanan aktif' : 'Monthly active'}
                                    </span>
                                )}
                                {canSwitch.hasPositiveBalance && (
                                    <span className="flex items-center gap-1">
                                        <FaCheckCircle className="w-3 h-3 text-emerald-500" />
                                        {locale === 'id' ? 'Saldo tersedia' : 'Balance available'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Recent Transactions */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {locale === 'id' ? 'Transaksi Terakhir' : 'Recent Transactions'}
                            </h3>
                            {transactions.length > 0 && (
                                <Link
                                    href="/admin/dashboard/subscription/transactions"
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    {locale === 'id' ? 'Lihat Semua' : 'View All'}
                                </Link>
                            )}
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {transactionsLoading ? (
                                <div className="p-4 space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <FaHistory className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        {locale === 'id' ? 'Belum ada transaksi' : 'No transactions yet'}
                                    </p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount >= 0
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                : 'bg-red-100 dark:bg-red-900/30'
                                                }`}>
                                                {tx.amount >= 0 ? (
                                                    <span className="text-emerald-600 font-bold text-sm">+</span>
                                                ) : (
                                                    <span className="text-red-600 font-bold text-sm">−</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {getTransactionTypeLabel(tx.type)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateTime(tx.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* Switch Mode Confirmation Modal */}
            < ConfirmDialog
                isOpen={switchModalOpen}
                title={pendingSwitchType === 'DEPOSIT'
                    ? (locale === 'id' ? 'Beralih ke Mode Deposit?' : 'Switch to Deposit Mode?')
                    : (locale === 'id' ? 'Beralih ke Langganan Bulanan?' : 'Switch to Monthly Subscription?')
                }
                message={pendingSwitchType === 'DEPOSIT'
                    ? (locale === 'id'
                        ? 'Langganan bulanan akan dijeda dan Anda akan mulai menggunakan saldo deposit. Biaya per pesanan akan dikenakan untuk setiap order yang diterima.'
                        : 'Monthly subscription will be paused and you\'ll start using your deposit balance. A fee per order will be charged for each accepted order.')
                    : (locale === 'id'
                        ? 'Anda akan beralih ke langganan bulanan tanpa biaya per pesanan. Saldo deposit Anda akan tetap tersimpan dan dapat digunakan di kemudian hari.'
                        : 'You\'ll switch to monthly subscription with no per-order fees. Your deposit balance will be preserved and can be used later.')
                }
                confirmText={locale === 'id' ? 'Ya, Beralih' : 'Yes, Switch'}
                cancelText={locale === 'id' ? 'Batal' : 'Cancel'}
                variant="info"
                onConfirm={confirmSwitch}
                onCancel={() => {
                    setSwitchModalOpen(false);
                    setPendingSwitchType(null);
                }}
            />

            {/* Redeem Voucher Modal */}
            {redeemModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                                        <FaTicketAlt className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {locale === 'id' ? 'Tukar Voucher' : 'Redeem Voucher'}
                                    </h2>
                                </div>
                                <button 
                                    onClick={() => {
                                        setRedeemModalOpen(false);
                                        setVoucherCode('');
                                        setRedeemResult(null);
                                    }} 
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Result display */}
                            {redeemResult && (
                                <div className={`mb-4 p-4 rounded-lg ${
                                    redeemResult.success 
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        {redeemResult.success ? (
                                            <FaCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <FaExclamationTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium ${redeemResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                {redeemResult.message}
                                            </p>
                                            {redeemResult.success && redeemResult.autoSwitchTriggered && (
                                                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                                                    {locale === 'id' 
                                                        ? `Mode langganan berubah ke ${redeemResult.newSubType}` 
                                                        : `Subscription mode changed to ${redeemResult.newSubType}`}
                                                </p>
                                            )}
                                            {redeemResult.success && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                                    {locale === 'id' ? 'Halaman akan dimuat ulang...' : 'Page will reload...'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Input field */}
                            {!redeemResult?.success && (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        {locale === 'id' 
                                            ? 'Masukkan kode voucher untuk menambah saldo atau hari langganan.' 
                                            : 'Enter your voucher code to add balance or subscription days.'}
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {locale === 'id' ? 'Kode Voucher' : 'Voucher Code'}
                                            </label>
                                            <input
                                                type="text"
                                                value={voucherCode}
                                                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                                placeholder={locale === 'id' ? 'Masukkan kode voucher' : 'Enter voucher code'}
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-center text-lg tracking-wider"
                                                disabled={redeeming}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && voucherCode.trim()) {
                                                        handleRedeemVoucher();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        {!redeemResult?.success && (
                            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                                <button
                                    onClick={() => {
                                        setRedeemModalOpen(false);
                                        setVoucherCode('');
                                        setRedeemResult(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                                >
                                    {locale === 'id' ? 'Batal' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleRedeemVoucher}
                                    disabled={redeeming || !voucherCode.trim()}
                                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                >
                                    {redeeming ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            {locale === 'id' ? 'Menukarkan...' : 'Redeeming...'}
                                        </>
                                    ) : (
                                        <>
                                            <FaTicketAlt className="w-4 h-4" />
                                            {locale === 'id' ? 'Tukarkan' : 'Redeem'}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}
