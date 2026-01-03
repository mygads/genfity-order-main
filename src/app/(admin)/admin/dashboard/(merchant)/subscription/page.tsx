"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import SuspendedAlert from "@/components/subscription/SuspendedAlert";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaWallet, FaCalendarAlt, FaClock, FaExchangeAlt, FaArrowRight, FaCheckCircle, FaExclamationTriangle, FaHistory, FaCreditCard, FaInfoCircle } from "react-icons/fa";

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

/**
 * Merchant Subscription Page - Redesigned
 * Professional, clean, modern UI with dual language support
 */
export default function SubscriptionPage() {
    const { t, locale } = useTranslation();
    const [switching, setSwitching] = useState(false);

    // Fetch all data
    const { data: subscriptionResponse, error: subscriptionError, isLoading: subscriptionLoading } = 
        useSWRStatic<ApiResponse<SubscriptionData>>('/api/merchant/subscription');
    const { data: balanceResponse } = useSWRStatic<ApiResponse<BalanceInfo>>('/api/merchant/balance');
    const { data: transactionsResponse, isLoading: transactionsLoading } = 
        useSWRStatic<ApiResponse<{ transactions: TransactionData[] }>>('/api/merchant/balance/transactions?limit=5');
    const { data: canSwitchResponse } = useSWRStatic<ApiResponse<CanSwitchData>>('/api/merchant/subscription/can-switch');

    const subscription = subscriptionResponse?.data?.subscription;
    const pricing = subscriptionResponse?.data?.pricing;
    const balanceInfo = balanceResponse?.data;
    const canSwitch = canSwitchResponse?.data;
    const transactions = transactionsResponse?.data?.transactions || [];

    // Helpers
    const formatCurrency = (amount: number, currency: string) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
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
            'SUBSCRIPTION': { en: 'Subscription', id: 'Langganan' },
            'REFUND': { en: 'Refund', id: 'Pengembalian' },
            'ADJUSTMENT': { en: 'Adjustment', id: 'Penyesuaian' },
        };
        return labels[type]?.[locale] || type;
    };

    const handleSwitch = async (newType: 'DEPOSIT' | 'MONTHLY') => {
        const confirmMsg = newType === 'DEPOSIT'
            ? (locale === 'id' 
                ? 'Beralih ke mode Deposit? Langganan bulanan akan dijeda dan Anda akan menggunakan saldo.'
                : 'Switch to Deposit mode? Monthly subscription will be paused and you\'ll use your balance.')
            : (locale === 'id'
                ? 'Beralih ke langganan Bulanan? Saldo Anda akan tetap tersimpan.'
                : 'Switch to Monthly subscription? Your balance will be preserved.');

        if (!confirm(confirmMsg)) return;

        setSwitching(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/merchant/subscription/switch-type', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ newType }),
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch {
            alert(locale === 'id' ? 'Gagal mengganti tipe langganan' : 'Failed to switch subscription type');
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

            {/* Suspended Alert */}
            {subscription.status === 'SUSPENDED' && (
                <SuspendedAlert type={subscription.type} reason={subscription.suspendReason || undefined} />
            )}

            {/* Hero Card - Main Status */}
            <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${getStatusColor()} p-4 sm:p-6 text-white`}>
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
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        isActive ? 'bg-white/20' : 'bg-red-400/30'
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
                    {balanceInfo?.isLow && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <FaExclamationTriangle className="w-3 h-3" />
                            {locale === 'id' ? 'Saldo rendah' : 'Low balance'}
                        </p>
                    )}
                </div>

                {/* Order Fee Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <FaCreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {locale === 'id' ? 'Biaya per Pesanan' : 'Fee per Order'}
                        </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(pricing?.orderFee || 0, currency)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {locale === 'id' ? 'Mode deposit saja' : 'Deposit mode only'}
                    </p>
                </div>

                {/* Monthly Price Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <FaCalendarAlt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {locale === 'id' ? 'Harga Bulanan' : 'Monthly Price'}
                        </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(pricing?.monthlyPrice || 0, currency)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {locale === 'id' ? 'Tanpa biaya pesanan' : 'No order fee'}
                    </p>
                </div>

                {/* Min Deposit Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <FaInfoCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {locale === 'id' ? 'Min. Deposit' : 'Min. Deposit'}
                        </span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(pricing?.depositMinimum || 0, currency)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {locale === 'id' ? 'Top up minimum' : 'Minimum top up'}
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Left Column - Payment Options & Switch */}
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
                            <Link
                                href="/admin/dashboard/subscription/topup?type=deposit"
                                className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                                    isDeposit 
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' 
                                        : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300'
                                }`}
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
                                <p className="text-base font-bold text-emerald-600">
                                    {formatCurrency(pricing?.orderFee || 0, currency)}
                                    <span className="text-sm font-normal text-gray-500">/{locale === 'id' ? 'pesanan' : 'order'}</span>
                                </p>
                            </Link>

                            {/* Monthly Option */}
                            <Link
                                href="/admin/dashboard/subscription/topup?type=monthly"
                                className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                                    isMonthly 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                                }`}
                            >
                                {isMonthly && (
                                    <div className="absolute top-2 right-2">
                                        <FaCheckCircle className="w-4 h-4 text-blue-500" />
                                    </div>
                                )}
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                                    <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                    {locale === 'id' ? 'Langganan Bulanan' : 'Monthly Subscription'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {locale === 'id' 
                                        ? 'Biaya tetap, tanpa biaya pesanan. Cocok untuk volume tinggi.'
                                        : 'Fixed fee, no order charges. Best for high volume.'}
                                </p>
                                <p className="text-base font-bold text-blue-600">
                                    {formatCurrency(pricing?.monthlyPrice || 0, currency)}
                                    <span className="text-sm font-normal text-gray-500">/{locale === 'id' ? 'bulan' : 'month'}</span>
                                </p>
                            </Link>
                        </div>
                    </div>

                    {/* Switch Mode Section - Only show when both available */}
                    {!isTrial && canSwitch && (canSwitch.canSwitchToDeposit || canSwitch.canSwitchToMonthly) && (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <FaExchangeAlt className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {locale === 'id' ? 'Ganti Mode Langganan' : 'Switch Subscription Mode'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {locale === 'id' 
                                            ? 'Anda memiliki kedua opsi aktif. Beralih kapan saja.'
                                            : 'You have both options active. Switch anytime.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {isMonthly && canSwitch.canSwitchToDeposit && (
                                    <button
                                        onClick={() => handleSwitch('DEPOSIT')}
                                        disabled={switching}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                                    >
                                        <FaWallet className="w-4 h-4" />
                                        {locale === 'id' ? 'Beralih ke Deposit' : 'Switch to Deposit'}
                                        <FaArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                                {isDeposit && canSwitch.canSwitchToMonthly && (
                                    <button
                                        onClick={() => handleSwitch('MONTHLY')}
                                        disabled={switching}
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                    >
                                        <FaCalendarAlt className="w-4 h-4" />
                                        {locale === 'id' ? 'Beralih ke Bulanan' : 'Switch to Monthly'}
                                        <FaArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
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
                        </div>
                    )}
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
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                tx.amount >= 0
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
                                        <p className={`text-sm font-semibold ${
                                            tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                                        }`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
