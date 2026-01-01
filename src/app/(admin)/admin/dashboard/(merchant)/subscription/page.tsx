"use client";

import React from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import SubscriptionStatusBadge from "@/components/subscription/SubscriptionStatusBadge";
import BalanceCard from "@/components/subscription/BalanceCard";
import SuspendedAlert from "@/components/subscription/SuspendedAlert";
import { useTranslation } from "@/lib/i18n/useTranslation";

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

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Merchant Subscription Page
 * 
 * Shows subscription status, balance, and transaction history
 * Supports dual language (EN/ID)
 */
export default function SubscriptionPage() {
    const { t, locale } = useTranslation();

    // Fetch subscription data
    const {
        data: subscriptionResponse,
        error: subscriptionError,
        isLoading: subscriptionLoading
    } = useSWRStatic<ApiResponse<SubscriptionData>>('/api/merchant/subscription');

    // Fetch balance data (for deposit mode)
    const {
        data: balanceResponse,
    } = useSWRStatic<ApiResponse<BalanceInfo>>('/api/merchant/balance');

    // Fetch transactions
    const {
        data: transactionsResponse,
        isLoading: transactionsLoading
    } = useSWRStatic<ApiResponse<{ transactions: TransactionData[] }>>('/api/merchant/balance/transactions?limit=10');

    const subscription = subscriptionResponse?.data?.subscription;
    const pricing = subscriptionResponse?.data?.pricing;
    const balanceInfo = balanceResponse?.data;
    const transactions = transactionsResponse?.data?.transactions || [];

    const formatCurrency = (amount: number, currency: string) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return t('subscription.transactions.type.deposit');
            case 'ORDER_FEE': return t('subscription.transactions.type.orderFee');
            case 'SUBSCRIPTION': return t('subscription.transactions.type.subscription');
            case 'REFUND': return t('subscription.transactions.type.refund');
            case 'ADJUSTMENT': return t('subscription.transactions.type.adjustment');
            default: return type;
        }
    };

    const getSubscriptionTypeLabel = (type: string) => {
        switch (type) {
            case 'TRIAL': return t('subscription.status.trial');
            case 'DEPOSIT': return t('subscription.status.deposit');
            case 'MONTHLY': return t('subscription.status.monthly');
            default: return type;
        }
    };

    if (subscriptionLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    </div>
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                </div>
            </div>
        );
    }

    if (subscriptionError || !subscription) {
        return (
            <div className="flex min-h-100 items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {t('subscription.failedToLoad')}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        {t('subscription.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    const currency = pricing?.currency || 'IDR';

    return (
        <div>
            <PageBreadcrumb pageTitle={t('subscription.pageTitle')} />

            {/* Suspended Alert */}
            {subscription.status === 'SUSPENDED' && (
                <SuspendedAlert type={subscription.type} reason={subscription.suspendReason || undefined} />
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Subscription Info Card */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('subscription.status.title')}
                            </h2>
                            <SubscriptionStatusBadge
                                type={subscription.type}
                                status={subscription.status}
                                daysRemaining={subscription.daysRemaining}
                                balance={balanceInfo?.balance}
                                currency={currency}
                                size="lg"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Type info */}
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('subscription.status.type')}
                                </p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                    {getSubscriptionTypeLabel(subscription.type)}
                                </p>
                            </div>

                            {/* Expiry/Balance info */}
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                {subscription.type === 'TRIAL' && subscription.trialEndsAt && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('subscription.status.trialEnds')}
                                        </p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                            {formatDate(subscription.trialEndsAt)}
                                        </p>
                                    </>
                                )}
                                {subscription.type === 'MONTHLY' && subscription.currentPeriodEnd && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('subscription.status.validUntil')}
                                        </p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                            {formatDate(subscription.currentPeriodEnd)}
                                        </p>
                                    </>
                                )}
                                {subscription.type === 'DEPOSIT' && balanceInfo && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('subscription.status.currentBalance')}
                                        </p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(balanceInfo.balance, currency)}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Pricing info */}
                        {pricing && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    {t('subscription.pricing.title')}
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('subscription.pricing.minimumDeposit')}
                                        </span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.depositMinimum, currency)}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('subscription.pricing.orderFee')}
                                        </span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.orderFee, currency)}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {t('subscription.pricing.monthly')}
                                        </span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.monthlyPrice, currency)}{t('subscription.pricing.perMonth')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upgrade button */}
                        <div className="mt-6">
                            <Link
                                href="/admin/dashboard/subscription/topup"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                                    bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                {subscription.type === 'TRIAL'
                                    ? t('subscription.actions.upgrade')
                                    : t('subscription.actions.topupExtend')}
                            </Link>
                        </div>

                        {/* Switch Subscription Type Section */}
                        {subscription.type !== 'TRIAL' && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                    {t('subscription.switch.title') || 'Switch Subscription Type'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    {subscription.type === 'MONTHLY'
                                        ? (t('subscription.switch.toDeposit') || 'Switch to Deposit mode for pay-per-order billing.')
                                        : (t('subscription.switch.toMonthly') || 'Switch to Monthly subscription for fixed monthly fee.')}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {subscription.type === 'MONTHLY' ? (
                                        <button
                                            onClick={async () => {
                                                if (!confirm(t('subscription.switch.confirmDeposit') || 'Switch to Deposit mode? You can top up balance after switching.')) return;
                                                try {
                                                    const token = localStorage.getItem('accessToken');
                                                    const res = await fetch('/api/merchant/subscription/switch-type', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`,
                                                        },
                                                        body: JSON.stringify({ newType: 'DEPOSIT' }),
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        window.location.reload();
                                                    } else {
                                                        alert(data.message);
                                                    }
                                                } catch (_err) {
                                                    alert('Failed to switch subscription type');
                                                }
                                            }}
                                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 
                                                text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 
                                                dark:hover:bg-gray-700 transition-colors"
                                        >
                                            {t('subscription.switch.switchToDeposit') || 'Switch to Deposit Mode'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                if (!confirm(t('subscription.switch.confirmMonthly') || 'Switch to Monthly subscription? Your balance will be preserved.')) return;
                                                try {
                                                    const token = localStorage.getItem('accessToken');
                                                    const res = await fetch('/api/merchant/subscription/switch-type', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}`,
                                                        },
                                                        body: JSON.stringify({ newType: 'MONTHLY' }),
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        window.location.reload();
                                                    } else {
                                                        alert(data.message);
                                                    }
                                                } catch (_err) {
                                                    alert('Failed to switch subscription type');
                                                }
                                            }}
                                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 
                                                text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 
                                                dark:hover:bg-gray-700 transition-colors"
                                        >
                                            {t('subscription.switch.switchToMonthly') || 'Switch to Monthly'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transaction History */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('subscription.transactions.title')}
                            </h2>
                            {transactions.length > 0 && (
                                <Link
                                    href="/admin/dashboard/subscription/transactions"
                                    className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 
                                        dark:hover:text-orange-300 font-medium"
                                >
                                    {t('subscription.transactions.viewAll')} →
                                </Link>
                            )}
                        </div>

                        {transactionsLoading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                                ))}
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                        />
                                    </svg>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {t('subscription.transactions.empty')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                                ${tx.amount >= 0
                                                    ? 'bg-green-100 dark:bg-green-900/30'
                                                    : 'bg-red-100 dark:bg-red-900/30'
                                                }`}
                                            >
                                                <svg
                                                    className={`w-5 h-5 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    {tx.amount >= 0 ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    )}
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {getTransactionTypeLabel(tx.type)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {tx.description || formatDateTime(tx.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {t('subscription.transactions.balance')} {formatCurrency(tx.balanceAfter, currency)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Balance Card (for deposit mode) */}
                    {subscription.type === 'DEPOSIT' && balanceInfo && (
                        <BalanceCard
                            balance={balanceInfo.balance}
                            currency={balanceInfo.currency}
                            orderFee={balanceInfo.orderFee}
                            estimatedOrders={balanceInfo.estimatedOrders}
                            isLow={balanceInfo.isLow}
                            lastTopupAt={balanceInfo.lastTopupAt ? new Date(balanceInfo.lastTopupAt) : null}
                        />
                    )}

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                            {t('subscription.quickActions.title')}
                        </h3>
                        <div className="space-y-3">
                            <Link
                                href="/admin/dashboard/subscription/topup"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 
                                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {t('subscription.quickActions.topup')}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('subscription.quickActions.topupDesc')}
                                    </p>
                                </div>
                            </Link>

                            <Link
                                href="/admin/dashboard/subscription/topup?plan=monthly"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 
                                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {t('subscription.quickActions.monthly')}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('subscription.quickActions.monthlyDesc')}
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
