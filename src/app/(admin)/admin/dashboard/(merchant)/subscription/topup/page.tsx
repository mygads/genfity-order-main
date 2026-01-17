"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getCurrencyConfig } from "@/lib/constants/location";
import { fetchJsonWithAuth } from "@/lib/utils/apiClient";
import { getAdminUser } from "@/lib/utils/adminAuth";
import { FaCalendarAlt, FaChartLine, FaInfoCircle, FaLock, FaWallet } from "react-icons/fa";

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
        status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
        isValid?: boolean;
        daysRemaining?: number | null;
        trialEndsAt?: string | null;
        currentPeriodEnd?: string | null;
        suspendReason?: string | null;
    };
    balance?: {
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

interface PaymentRequestData {
    id: string;
    type: string;
    status: string;
    currency: string;
    amount: number;
    monthsRequested: number | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    expiresAt: string | null;
    createdAt?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

type BalanceInfo = {
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
 * Top Up / Upgrade Subscription Page
 * 
 * Allows merchant to choose plan type and initiate payment
 * Supports dual language (EN/ID)
 */
export default function TopUpPage() {
    return (
        <Suspense fallback={<TopUpPageSkeleton />}>
            <TopUpPageContent />
        </Suspense>
    );
}

function TopUpPageSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
            <div className="max-w-xl mx-auto">
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        </div>
    );
}

function TopUpPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success: showSuccess, error: showError } = useToast();
    const { t, locale } = useTranslation();

    const [isOwner, setIsOwner] = useState<boolean>(true);

    const [step, setStep] = useState<'select' | 'payment' | 'confirm'>('select');
    const [selectedPlan, setSelectedPlan] = useState<'deposit' | 'monthly'>('deposit');
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [monthsSelected, setMonthsSelected] = useState<number>(1);
    const [transferNotes, setTransferNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequestData | null>(null);
    const [activePaymentRequest, setActivePaymentRequest] = useState<PaymentRequestData | null>(null);
    const [activeRequestError, setActiveRequestError] = useState<string | null>(null);

    const getPaymentRequestStatusLabel = (status: string) => {
        const key = `subscription.paymentRequest.status.${status}`;
        const value = t(key);
        return value === key ? status : value;
    };

    const getPaymentRequestTypeLabel = (type: string) => {
        const key = `subscription.paymentRequest.type.${type}`;
        const value = t(key);
        return value === key ? type : value;
    };

    const getPaymentRequestStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
            case 'CONFIRMED':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case 'VERIFIED':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            case 'EXPIRED':
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    // Fetch subscription data
    const {
        data: subscriptionResponse,
        isLoading
    } = useSWRStatic<ApiResponse<SubscriptionData>>('/api/merchant/subscription');

    const { data: balanceResponse, error: balanceError } = useSWRStatic<ApiResponse<BalanceInfo>>(
        '/api/merchant/balance'
    );
    const { data: usageSummaryResponse, error: usageError } = useSWRStatic<ApiResponse<UsageSummary>>(
        '/api/merchant/balance/usage-summary'
    );

    const _subscription = subscriptionResponse?.data?.subscription;
    const pricing = subscriptionResponse?.data?.pricing;
    const currency = pricing?.currency || 'IDR';

    const balanceInfo = balanceResponse?.data;
    const usageSummary = usageSummaryResponse?.data;

    useEffect(() => {
        const user = getAdminUser();
        const merchantRole = typeof window !== 'undefined' ? localStorage.getItem('merchantRole') : null;
        setIsOwner(user?.role === 'MERCHANT_OWNER' || merchantRole === 'OWNER');
    }, []);

    // Set default deposit amount
    useEffect(() => {
        if (!pricing || depositAmount !== 0) return;

        const min = pricing.depositMinimum;
        const fallback = currency === 'AUD' ? 50 : 10000;
        const next = typeof min === 'number' && Number.isFinite(min) && min > 0 ? min : fallback;
        setDepositAmount(next);
    }, [pricing, depositAmount, currency]);

    // Check URL params for pre-selected plan
    useEffect(() => {
        const plan = searchParams.get('plan');
        if (plan === 'monthly') {
            setSelectedPlan('monthly');
        }
    }, [searchParams]);

    const currencyStep = useMemo(() => {
        const cfg = getCurrencyConfig(currency);
        return cfg?.decimals === 0 ? 1 : 0.01;
    }, [currency]);

    const usageEstimateEpsilon = useMemo(() => {
        const cfg = getCurrencyConfig(currency);
        const decimals = typeof cfg?.decimals === 'number' ? cfg.decimals : 2;
        // If the value would render as 0.00 (or 0), treat it as effectively zero.
        return 0.5 * Math.pow(10, -Math.max(0, decimals));
    }, [currency]);

    const depositPresets = useMemo(() => {
        const min = pricing?.depositMinimum ?? 0;
        if (!(min > 0)) return [];
        const base = currency === 'AUD'
            ? [min, Math.max(50, min), Math.max(100, min * 2), Math.max(200, min * 4)]
            : [min, min * 2, min * 3, min * 5];

        const uniq = Array.from(new Set(base.map(v => Math.round(v)))).filter(v => v > 0);
        uniq.sort((a, b) => a - b);
        return uniq;
    }, [pricing?.depositMinimum, currency]);

    const avgDailyUsage = useMemo(() => {
        const totalLast30 = usageSummary?.last30Days?.total;
        if (!(typeof totalLast30 === 'number' && Number.isFinite(totalLast30)) || totalLast30 <= 0) {
            return null;
        }
        const avg = totalLast30 / 30;
        if (!(typeof avg === 'number' && Number.isFinite(avg)) || avg <= 0) return null;
        if (avg < usageEstimateEpsilon) return null;
        return avg;
    }, [usageSummary?.last30Days?.total, usageEstimateEpsilon]);

    const estimatedDaysRemaining = useMemo(() => {
        const currentBalance = balanceInfo?.balance ?? subscriptionResponse?.data?.balance?.amount;
        if (!(typeof currentBalance === 'number' && Number.isFinite(currentBalance)) || currentBalance <= 0) {
            return null;
        }
        if (!(typeof avgDailyUsage === 'number' && Number.isFinite(avgDailyUsage)) || avgDailyUsage <= 0) {
            return null;
        }
        const days = currentBalance / avgDailyUsage;
        if (!Number.isFinite(days) || days < 0) return null;
        // Avoid displaying absurd values when usage is extremely low.
        return Math.min(days, 3650);
    }, [avgDailyUsage, balanceInfo?.balance, subscriptionResponse?.data?.balance?.amount]);

    const monthlyEstimated = useMemo(() => {
        if (selectedPlan !== 'monthly') return null;
        const months = typeof monthsSelected === 'number' && Number.isFinite(monthsSelected) && monthsSelected > 0 ? monthsSelected : 1;

        const now = new Date();
        const currentEnd = _subscription?.currentPeriodEnd ? new Date(_subscription.currentPeriodEnd) : null;
        const baseDate = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;

        const validUntil = new Date(baseDate);
        validUntil.setMonth(validUntil.getMonth() + months);

        const diffMs = validUntil.getTime() - now.getTime();
        const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        return { validUntil, days };
    }, [monthsSelected, selectedPlan, _subscription?.currentPeriodEnd]);

    const getTotalAmount = () => {
        if (selectedPlan === 'deposit') {
            return depositAmount;
        }
        return (pricing?.monthlyPrice || 0) * monthsSelected;
    };

    const isValidDeposit = () => {
        if (selectedPlan === 'deposit') {
            const min = pricing?.depositMinimum || 0;
            return typeof depositAmount === 'number'
                && Number.isFinite(depositAmount)
                && depositAmount >= min;
        }
        return typeof monthsSelected === 'number' && Number.isFinite(monthsSelected) && monthsSelected >= 1;
    };

    const continueDisabledReason = useMemo(() => {
        if (!isOwner) return t('subscription.topup.ownerOnly');
        if (isSubmitting) return t('subscription.topup.processing');
        if (activePaymentRequest && (activePaymentRequest.status === 'PENDING' || activePaymentRequest.status === 'CONFIRMED')) {
            return t('subscription.topup.pendingRequestExists');
        }
        if (selectedPlan === 'deposit') {
            const min = pricing?.depositMinimum || 0;
            if (!(typeof depositAmount === 'number' && Number.isFinite(depositAmount)) || depositAmount <= 0) {
                return t('subscription.topup.enterAmount');
            }
            if (depositAmount < min) {
                return t('subscription.topup.minimumDeposit').replace('{amount}', formatCurrency(min, currency, locale));
            }
        }
        return null;
    }, [activePaymentRequest, currency, depositAmount, isOwner, isSubmitting, locale, pricing?.depositMinimum, selectedPlan, t]);

    const handleCreatePaymentRequest = async () => {
        if (!isValidDeposit()) {
            return;
        }

        if (!isOwner) {
            showError(t('subscription.toast.failed'), t('subscription.topup.ownerOnly')); 
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await fetchJsonWithAuth<ApiResponse<PaymentRequestData>>('/api/merchant/payment-request', {
                method: 'POST',
                body: JSON.stringify({
                    type: selectedPlan === 'deposit' ? 'DEPOSIT_TOPUP' : 'MONTHLY_SUBSCRIPTION',
                    amount: selectedPlan === 'deposit' ? depositAmount : undefined,
                    monthsRequested: selectedPlan === 'monthly' ? monthsSelected : undefined,
                }),
            });

            setPaymentRequest(data.data);
            setStep('payment');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('subscription.toast.createFailed');
            showError(t('subscription.toast.failed'), message);

            // If this is a conflict, fetch and surface the active request.
            if (typeof message === 'string' && message.toLowerCase().includes('pending payment request')) {
                try {
                    const active = await fetchJsonWithAuth<ApiResponse<PaymentRequestData | null>>(
                        `/api/merchant/payment-request/active`
                    );
                    const value = active?.data || null;
                    const normalized = value && (value.status === 'PENDING' || value.status === 'CONFIRMED') ? value : null;
                    setActivePaymentRequest(normalized);
                    setActiveRequestError(normalized ? null : message);
                } catch {
                    setActiveRequestError(message);
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchActivePaymentRequest = async () => {
        try {
            const active = await fetchJsonWithAuth<ApiResponse<PaymentRequestData | null>>(
                `/api/merchant/payment-request/active`
            );
            const value = active?.data || null;
            const normalized = value && (value.status === 'PENDING' || value.status === 'CONFIRMED') ? value : null;
            setActivePaymentRequest(normalized);
            setActiveRequestError(null);
        } catch (error: unknown) {
            setActivePaymentRequest(null);
            setActiveRequestError(error instanceof Error ? error.message : 'Failed to load payment requests');
        }
    };

    const handleCancelActiveRequest = async () => {
        if (!activePaymentRequest) return;
        if (!isOwner) {
            showError(t('subscription.toast.failed'), t('subscription.topup.ownerOnly'));
            return;
        }

        setIsSubmitting(true);
        try {
            await fetchJsonWithAuth(`/api/merchant/payment-request/${activePaymentRequest.id}/cancel`, {
                method: 'POST',
            });
            showSuccess(
                t('subscription.toast.success'),
                locale === 'id' ? 'Pengajuan pembayaran berhasil dibatalkan.' : 'Payment request cancelled.'
            );
            setActivePaymentRequest(null);
            setActiveRequestError(null);
            // If user was blocked on step, keep them on select.
        } catch (error: unknown) {
            showError(
                t('subscription.toast.failed'),
                error instanceof Error ? error.message : (locale === 'id' ? 'Gagal membatalkan pengajuan.' : 'Failed to cancel request.')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        // Proactively load active request so we can show the state even before 409.
        fetchActivePaymentRequest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConfirmPayment = async () => {
        if (!paymentRequest) return;

        if (!isOwner) {
            showError(t('subscription.toast.failed'), t('subscription.topup.ownerOnly')); 
            return;
        }

        setIsSubmitting(true);
        try {
            await fetchJsonWithAuth(`/api/merchant/payment-request/${paymentRequest.id}/confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    transferNotes,
                }),
            });

            setStep('confirm');
            showSuccess(t('subscription.toast.success'), t('subscription.toast.paymentConfirmed'));
        } catch (error: unknown) {
            showError(
                t('subscription.toast.failed'),
                error instanceof Error ? error.message : t('subscription.toast.confirmFailed')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSuccess(t('subscription.toast.success'), t('subscription.transfer.copied'));
    };

    const getMonthLabel = (count: number) => {
        return count === 1 ? t('subscription.topup.month') : t('subscription.topup.months');
    };

    if (isLoading) {
        return <TopUpPageSkeleton />;
    }

    const currentSubType = _subscription?.type || 'NONE';
    const currentPeriodEnd = _subscription?.currentPeriodEnd || null;
    const showDepositInsights = selectedPlan === 'deposit';
    const showSubscriptionInsights = currentSubType === 'MONTHLY' || selectedPlan === 'monthly';

    const currentBalance = balanceInfo?.balance ?? subscriptionResponse?.data?.balance?.amount ?? null;

    return (
        <div>
            <PageBreadcrumb
                pageTitle={step === 'confirm' ? t('subscription.topup.paymentConfirmed') : t('subscription.topup.pageTitle')}
            />

            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('subscription.topup.selectPaymentType')}
                    </div>
                    <Link
                        href="/admin/dashboard/subscription"
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                        {t('subscription.confirm.backToSubscription')}
                    </Link>
                </div>

                {!isOwner && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-amber-700 dark:text-amber-300">
                                <FaLock />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold">{t('subscription.topup.ownerOnlyTitle')}</div>
                                <div className="text-sm opacity-90">{t('subscription.topup.ownerOnlyDesc')}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Select Plan */}
                {step === 'select' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="mb-6 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {t('subscription.topup.selectPaymentType')}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('subscription.topup.subtitle')}
                                </p>
                            </div>
                            <div className="hidden items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-700/40 dark:text-gray-300 sm:flex">
                                <FaInfoCircle className="text-gray-400" />
                                <span>{t('subscription.topup.help')}</span>
                            </div>
                        </div>

                        {(activePaymentRequest || activeRequestError) && (
                            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="font-semibold">{t('subscription.topup.pendingRequestTitle')}</div>
                                        {activePaymentRequest ? (
                                            <div className="mt-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentRequestStatusBadge(activePaymentRequest.status)}`}
                                                    >
                                                        {getPaymentRequestStatusLabel(activePaymentRequest.status)}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-gray-900/20 dark:text-amber-200">
                                                        {getPaymentRequestTypeLabel(activePaymentRequest.type)}
                                                    </span>
                                                </div>

                                                <div className="mt-3 grid gap-2 text-sm">
                                                    <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-900/20">
                                                        <span className="text-amber-900/80 dark:text-amber-200/80">{t('subscription.topup.pendingRequestAmount')}</span>
                                                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                                                            {formatCurrency(activePaymentRequest.amount, activePaymentRequest.currency, locale)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-1 text-sm opacity-90">{activeRequestError}</div>
                                        )}
                                    </div>

                                    {activePaymentRequest && (
                                        <button
                                            type="button"
                                            onClick={handleCancelActiveRequest}
                                            disabled={isSubmitting || !isOwner}
                                            className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                        >
                                            {t('subscription.topup.cancelPreviousSubmission')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Plan Options */}
                        <div className="space-y-4 mb-6">
                            {/* Deposit Option */}
                            <label
                                className={`block p-4 rounded-xl border-2 cursor-pointer transition-all
                                    ${selectedPlan === 'deposit'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value="deposit"
                                        checked={selectedPlan === 'deposit'}
                                        onChange={() => setSelectedPlan('deposit')}
                                        className="mt-1 text-brand-500 focus:ring-brand-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {t('subscription.topup.depositMode')}
                                            </h3>
                                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                {t('subscription.topup.payPerOrder')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('subscription.topup.depositDescription')
                                                .replace('{min}', formatCurrency(pricing?.depositMinimum || 0))
                                                .replace('{fee}', formatCurrency(pricing?.orderFee || 0))}
                                        </p>

                                        {selectedPlan === 'deposit' && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <div className="mb-4">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        {t('subscription.topup.quickPresets')}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {depositPresets.map((amount) => (
                                                            <button
                                                                key={amount}
                                                                type="button"
                                                                onClick={() => setDepositAmount(amount)}
                                                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors
                                                                    ${depositAmount === amount
                                                                        ? 'bg-brand-500 text-white'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                                                    }`}
                                                            >
                                                                {formatCurrency(amount, currency, locale)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {t('subscription.topup.depositAmount')}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={depositAmount}
                                                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                                                    min={pricing?.depositMinimum || 0}
                                                    step={currencyStep}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                                                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                                        focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                />
                                                {depositAmount < (pricing?.depositMinimum || 0) && (
                                                    <p className="text-sm text-red-500 mt-1">
                                                        {t('subscription.topup.minimumDeposit')
                                                            .replace('{amount}', formatCurrency(pricing?.depositMinimum || 0, currency, locale))}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </label>

                            {/* Monthly Option */}
                            <label
                                className={`block p-4 rounded-xl border-2 cursor-pointer transition-all
                                    ${selectedPlan === 'monthly'
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value="monthly"
                                        checked={selectedPlan === 'monthly'}
                                        onChange={() => setSelectedPlan('monthly')}
                                        className="mt-1 text-brand-500 focus:ring-brand-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {t('subscription.topup.monthlyMode')}
                                            </h3>
                                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                {formatCurrency(pricing?.monthlyPrice || 0)}{t('subscription.pricing.perMonth')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {t('subscription.topup.noOrderFee')}
                                        </p>

                                        {selectedPlan === 'monthly' && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {t('subscription.topup.duration')}
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[1, 3, 6, 12].map((months) => (
                                                        <button
                                                            key={months}
                                                            type="button"
                                                            onClick={() => setMonthsSelected(months)}
                                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                                                                ${monthsSelected === months
                                                                    ? 'bg-brand-500 text-white'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {months} {getMonthLabel(months)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                {t('subscription.topup.totalPayment')}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(getTotalAmount(), currency, locale)}
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleCreatePaymentRequest}
                            disabled={Boolean(continueDisabledReason) || !isValidDeposit()}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white
                                bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                                transition-colors"
                        >
                            {isSubmitting ? t('subscription.topup.processing') : t('subscription.topup.continuePayment')}
                        </button>

                        {continueDisabledReason && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {continueDisabledReason}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Payment Details */}
                {step === 'payment' && paymentRequest && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('subscription.transfer.title')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {t('subscription.transfer.subtitle')}
                        </p>

                        {/* Bank Details */}
                        <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {t('subscription.transfer.bank')}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {paymentRequest.bankName || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {t('subscription.transfer.accountNumber')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                        {paymentRequest.bankAccountNumber || '-'}
                                    </span>
                                    {paymentRequest.bankAccountNumber && (
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(paymentRequest.bankAccountNumber!)}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            title="Copy"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {t('subscription.transfer.accountName')}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {paymentRequest.bankAccountName || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {t('subscription.transfer.amount')}
                                </span>
                                <span className="text-xl font-bold text-brand-600">
                                    {formatCurrency(paymentRequest.amount, paymentRequest.currency, locale)}
                                </span>
                            </div>
                        </div>

                        {/* Transfer Notes */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('subscription.transfer.notes')}
                            </label>
                            <textarea
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder={t('subscription.transfer.notesPlaceholder')}
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                                    placeholder:text-gray-400"
                            />
                        </div>

                        {/* Confirm Button */}
                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={isSubmitting}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white
                                bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                                transition-colors"
                        >
                            {isSubmitting ? t('subscription.topup.processing') : t('subscription.transfer.confirmPaid')}
                        </button>

                        {/* Back Button */}
                        <button
                            type="button"
                            onClick={() => setStep('select')}
                            disabled={isSubmitting}
                            className="w-full mt-3 py-3 px-4 rounded-lg font-medium text-gray-700 dark:text-gray-300
                                bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                                transition-colors"
                        >
                            {t('subscription.transfer.back')}
                        </button>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 'confirm' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('subscription.confirm.title')}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            {t('subscription.confirm.description')}
                        </p>

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 mb-6">
                            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className="font-medium">{t('subscription.confirm.status')}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => router.push('/admin/dashboard/subscription')}
                                className="py-3 px-4 rounded-lg font-semibold text-white
                                    bg-brand-500 hover:bg-brand-600 transition-colors"
                            >
                                {t('subscription.confirm.backToSubscription')}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/admin/dashboard')}
                                className="py-3 px-4 rounded-lg font-medium text-gray-700 dark:text-gray-300
                                    bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                                    transition-colors"
                            >
                                {t('subscription.confirm.toDashboard')}
                            </button>
                        </div>
                    </div>
                )}
                    </div>

                    <aside className="space-y-6">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="text-brand-600">
                                    <FaWallet />
                                </div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                    {t('subscription.topup.summaryTitle')}
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-gray-500 dark:text-gray-400">{t('subscription.topup.currentPlan')}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{currentSubType}</span>
                                </div>

                                {typeof currentBalance === 'number' && (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-gray-500 dark:text-gray-400">{t('subscription.topup.currentBalance')}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(currentBalance, currency, locale)}
                                        </span>
                                    </div>
                                )}

                                {showSubscriptionInsights && currentPeriodEnd && (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <FaCalendarAlt className="text-gray-400" />
                                            {t('subscription.topup.validUntil')}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatDate(currentPeriodEnd, locale)}
                                        </span>
                                    </div>
                                )}

                                {selectedPlan === 'monthly' && monthlyEstimated && (
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
                                        <div className="mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                            <FaCalendarAlt className="text-gray-400" />
                                            <span className="font-medium">{t('subscription.topup.subscriptionEstimate')}</span>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('subscription.topup.estimatedSubscriptionDays')}</span>
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                    {monthlyEstimated.days} {t('subscription.topup.days')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('subscription.topup.estimatedValidUntil')}</span>
                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                    {formatDate(monthlyEstimated.validUntil.toISOString(), locale)}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-gray-400">
                                                {t('subscription.topup.subscriptionEstimateNote')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showDepositInsights && (
                                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
                                        <div className="mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                            <FaChartLine className="text-gray-400" />
                                            <span className="font-medium">{t('subscription.topup.usageInsights')}</span>
                                        </div>

                                        {usageError ? (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {t('subscription.topup.usageOwnerOnlyHint')}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('subscription.topup.avgDailyUsage')}</span>
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                        {typeof avgDailyUsage === 'number'
                                                            ? formatCurrency(avgDailyUsage, currency, locale)
                                                            : t('subscription.topup.notEnoughData')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('subscription.topup.estimatedDaysRemaining')}</span>
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                        {typeof estimatedDaysRemaining === 'number'
                                                            ? `${Math.max(0, Math.floor(estimatedDaysRemaining))} ${t('subscription.topup.days')}`
                                                            : t('subscription.topup.notEnoughData')}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-400">
                                                    {t('subscription.topup.estimateNote')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {(balanceError || usageError) && (
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                <div className="mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                    <FaInfoCircle className="text-gray-400" />
                                    <div className="font-semibold">{t('subscription.topup.permissionsTitle')}</div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('subscription.topup.permissionsDesc')}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
