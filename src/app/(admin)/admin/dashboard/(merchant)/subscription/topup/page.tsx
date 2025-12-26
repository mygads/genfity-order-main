"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
        status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    };
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
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Top Up / Upgrade Subscription Page
 * 
 * Allows merchant to choose plan type and initiate payment
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
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        </div>
    );
}

function TopUpPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success: showSuccess, error: showError } = useToast();

    const [step, setStep] = useState<'select' | 'payment' | 'confirm'>('select');
    const [selectedPlan, setSelectedPlan] = useState<'deposit' | 'monthly'>('deposit');
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [monthsSelected, setMonthsSelected] = useState<number>(1);
    const [transferNotes, setTransferNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState<PaymentRequestData | null>(null);

    // Fetch subscription data
    const {
        data: subscriptionResponse,
        isLoading
    } = useSWRStatic<ApiResponse<SubscriptionData>>('/api/merchant/subscription');

    const _subscription = subscriptionResponse?.data?.subscription;
    const pricing = subscriptionResponse?.data?.pricing;
    const currency = pricing?.currency || 'IDR';

    // Set default deposit amount
    useEffect(() => {
        if (pricing?.depositMinimum && depositAmount === 0) {
            setDepositAmount(pricing.depositMinimum);
        }
    }, [pricing?.depositMinimum, depositAmount]);

    // Check URL params for pre-selected plan
    useEffect(() => {
        const plan = searchParams.get('plan');
        if (plan === 'monthly') {
            setSelectedPlan('monthly');
        }
    }, [searchParams]);

    const formatCurrency = (amount: number) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const getTotalAmount = () => {
        if (selectedPlan === 'deposit') {
            return depositAmount;
        }
        return (pricing?.monthlyPrice || 0) * monthsSelected;
    };

    const handleCreatePaymentRequest = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/merchant/payment-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedPlan === 'deposit' ? 'DEPOSIT_TOPUP' : 'MONTHLY_SUBSCRIPTION',
                    amount: selectedPlan === 'deposit' ? depositAmount : undefined,
                    monthsRequested: selectedPlan === 'monthly' ? monthsSelected : undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create payment request');
            }

            setPaymentRequest(data.data);
            setStep('payment');
        } catch (error: unknown) {
            showError('Gagal', error instanceof Error ? error.message : 'Gagal membuat permintaan pembayaran');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!paymentRequest) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/merchant/payment-request/${paymentRequest.id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transferNotes,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to confirm payment');
            }

            setStep('confirm');
            showSuccess('Berhasil', 'Pembayaran dikonfirmasi! Menunggu verifikasi admin.');
        } catch (error: unknown) {
            showError('Gagal', error instanceof Error ? error.message : 'Gagal mengkonfirmasi pembayaran');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showSuccess('Berhasil', 'Disalin ke clipboard');
    };

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb
                pageTitle={step === 'confirm' ? 'Pembayaran Dikonfirmasi' : 'Top Up / Upgrade'}
            />

            <div className="max-w-2xl mx-auto">
                {/* Step 1: Select Plan */}
                {step === 'select' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            Pilih Jenis Pembayaran
                        </h2>

                        {/* Plan Options */}
                        <div className="space-y-4 mb-6">
                            {/* Deposit Option */}
                            <label
                                className={`block p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${selectedPlan === 'deposit'
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
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
                                        className="mt-1 text-orange-500 focus:ring-orange-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                Mode Deposit
                                            </h3>
                                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                                Bayar per Pesanan
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Minimum deposit {formatCurrency(pricing?.depositMinimum || 0)},
                                            biaya {formatCurrency(pricing?.orderFee || 0)} per pesanan
                                        </p>

                                        {selectedPlan === 'deposit' && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Jumlah Deposit
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={depositAmount}
                                                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                                                        min={pricing?.depositMinimum || 0}
                                                        step={currency === 'AUD' ? 5 : 10000}
                                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                              focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    />
                                                </div>
                                                {depositAmount < (pricing?.depositMinimum || 0) && (
                                                    <p className="text-sm text-red-500 mt-1">
                                                        Minimum deposit {formatCurrency(pricing?.depositMinimum || 0)}
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
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
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
                                        className="mt-1 text-orange-500 focus:ring-orange-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                Langganan Bulanan
                                            </h3>
                                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                                {formatCurrency(pricing?.monthlyPrice || 0)}/bulan
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Bayar tetap per bulan, tanpa biaya per pesanan
                                        </p>

                                        {selectedPlan === 'monthly' && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Durasi Langganan
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[1, 3, 6, 12].map((months) => (
                                                        <button
                                                            key={months}
                                                            type="button"
                                                            onClick={() => setMonthsSelected(months)}
                                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors
                                ${monthsSelected === months
                                                                    ? 'bg-orange-500 text-white'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {months} {months === 1 ? 'bulan' : 'bulan'}
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
                            <span className="font-medium text-gray-700 dark:text-gray-300">Total Pembayaran</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(getTotalAmount())}
                            </span>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleCreatePaymentRequest}
                            disabled={isSubmitting || (selectedPlan === 'deposit' && depositAmount < (pricing?.depositMinimum || 0))}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors"
                        >
                            {isSubmitting ? 'Memproses...' : 'Lanjutkan Pembayaran'}
                        </button>
                    </div>
                )}

                {/* Step 2: Payment Details */}
                {step === 'payment' && paymentRequest && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Transfer ke Rekening Berikut
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Silakan transfer sesuai jumlah di bawah ini
                        </p>

                        {/* Bank Details */}
                        <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Bank</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {paymentRequest.bankName || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">No. Rekening</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                        {paymentRequest.bankAccountNumber || '-'}
                                    </span>
                                    {paymentRequest.bankAccountNumber && (
                                        <button
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
                                <span className="text-gray-600 dark:text-gray-400">Atas Nama</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {paymentRequest.bankAccountName || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                                <span className="text-gray-600 dark:text-gray-400">Jumlah Transfer</span>
                                <span className="text-xl font-bold text-orange-600">
                                    {formatCurrency(paymentRequest.amount)}
                                </span>
                            </div>
                        </div>

                        {/* Transfer Notes */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Catatan Transfer (opsional)
                            </label>
                            <textarea
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="Contoh: Transfer dari BCA 0812xxx pada jam 10:00"
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                  placeholder:text-gray-400"
                            />
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={handleConfirmPayment}
                            disabled={isSubmitting}
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white
                bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors"
                        >
                            {isSubmitting ? 'Memproses...' : 'Saya Sudah Bayar'}
                        </button>

                        {/* Back Button */}
                        <button
                            onClick={() => setStep('select')}
                            disabled={isSubmitting}
                            className="w-full mt-3 py-3 px-4 rounded-lg font-medium text-gray-700 dark:text-gray-300
                bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors"
                        >
                            Kembali
                        </button>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 'confirm' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800 text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Pembayaran Dikonfirmasi!
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Pembayaran Anda sedang menunggu verifikasi admin.
                            Anda akan mendapat notifikasi setelah pembayaran diverifikasi.
                        </p>

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 mb-6">
                            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className="font-medium">Menunggu Verifikasi</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => router.push('/admin/dashboard/subscription')}
                                className="py-3 px-4 rounded-lg font-semibold text-white
                  bg-orange-500 hover:bg-orange-600 transition-colors"
                            >
                                Kembali ke Halaman Langganan
                            </button>
                            <button
                                onClick={() => router.push('/admin/dashboard')}
                                className="py-3 px-4 rounded-lg font-medium text-gray-700 dark:text-gray-300
                  bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                  transition-colors"
                            >
                                Ke Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
