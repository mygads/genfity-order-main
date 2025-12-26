"use client";

import React from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import SubscriptionStatusBadge from "@/components/subscription/SubscriptionStatusBadge";
import BalanceCard from "@/components/subscription/BalanceCard";
import SuspendedAlert from "@/components/subscription/SuspendedAlert";

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
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
 */
export default function SubscriptionPage() {
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
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return 'Top Up';
            case 'ORDER_FEE': return 'Biaya Pesanan';
            case 'SUBSCRIPTION': return 'Langganan';
            case 'REFUND': return 'Refund';
            case 'ADJUSTMENT': return 'Penyesuaian';
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
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Gagal memuat data langganan
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const currency = pricing?.currency || 'IDR';

    return (
        <div>
            <PageBreadcrumb pageTitle="Langganan" />

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
                                Status Langganan
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
                                <p className="text-sm text-gray-500 dark:text-gray-400">Jenis Langganan</p>
                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                    {subscription.type === 'TRIAL' && 'Masa Trial'}
                                    {subscription.type === 'DEPOSIT' && 'Mode Deposit'}
                                    {subscription.type === 'MONTHLY' && 'Langganan Bulanan'}
                                </p>
                            </div>

                            {/* Expiry/Balance info */}
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                {subscription.type === 'TRIAL' && subscription.trialEndsAt && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Trial Berakhir</p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                            {formatDate(subscription.trialEndsAt)}
                                        </p>
                                    </>
                                )}
                                {subscription.type === 'MONTHLY' && subscription.currentPeriodEnd && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Berlaku Sampai</p>
                                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                            {formatDate(subscription.currentPeriodEnd)}
                                        </p>
                                    </>
                                )}
                                {subscription.type === 'DEPOSIT' && balanceInfo && (
                                    <>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Saat Ini</p>
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
                                    Harga Langganan
                                </h3>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Minimum Deposit:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.depositMinimum, currency)}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Biaya/Pesanan:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.orderFee, currency)}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Bulanan:</span>
                                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(pricing.monthlyPrice, currency)}/bulan
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
                                {subscription.type === 'TRIAL' ? 'Upgrade Langganan' : 'Top Up / Perpanjang'}
                            </Link>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Riwayat Transaksi
                        </h2>

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
                                <p className="text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
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
                                                Saldo: {formatCurrency(tx.balanceAfter, currency)}
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
                            Aksi Cepat
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
                                    <p className="font-medium text-gray-900 dark:text-white">Top Up Saldo</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tambah saldo deposit</p>
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
                                    <p className="font-medium text-gray-900 dark:text-white">Langganan Bulanan</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Bayar tetap per bulan</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
