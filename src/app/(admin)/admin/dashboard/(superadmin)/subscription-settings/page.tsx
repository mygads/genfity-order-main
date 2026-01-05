"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useSWRConfig } from "swr";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubscriptionPlan {
    id: string;
    planKey: string;
    displayName: string;
    description: string | null;
    trialDays: number;
    // IDR
    depositMinimumIdr: number;
    orderFeeIdr: number;
    monthlyPriceIdr: number;
    // AUD
    depositMinimumAud: number;
    orderFeeAud: number;
    monthlyPriceAud: number;
    // Bank Info
    bankNameIdr: string | null;
    bankAccountIdr: string | null;
    bankAccountNameIdr: string | null;
    bankNameAud: string | null;
    bankAccountAud: string | null;
    bankAccountNameAud: string | null;
    // Influencer Commission
    influencerFirstCommissionPercent: number;
    influencerRecurringCommissionPercent: number;
    isActive: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Subscription Settings Page (Super Admin)
 * 
 * Configure pricing and bank account details
 */
export default function SubscriptionSettingsPage() {
    const { t } = useTranslation();
    const { success: showSuccess, error: showError } = useToast();
    const { mutate } = useSWRConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'pricing' | 'bank' | 'referral'>('pricing');

    const {
        data: response,
        isLoading
    } = useSWRStatic<ApiResponse<SubscriptionPlan[]>>('/api/admin/subscription-plans');

    const plan = response?.data?.[0];

    const [formData, setFormData] = useState({
        trialDays: 30,
        // IDR
        depositMinimumIdr: 100000,
        orderFeeIdr: 250,
        monthlyPriceIdr: 100000,
        // AUD
        depositMinimumAud: 15,
        orderFeeAud: 0.04,
        monthlyPriceAud: 15,
        // Bank IDR
        bankNameIdr: '',
        bankAccountIdr: '',
        bankAccountNameIdr: '',
        // Bank AUD
        bankNameAud: '',
        bankAccountAud: '',
        bankAccountNameAud: '',
        // Influencer Commission
        influencerFirstCommissionPercent: 10,
        influencerRecurringCommissionPercent: 5,
    });

    // Load plan data into form
    useEffect(() => {
        if (plan) {
            setFormData({
                trialDays: plan.trialDays,
                depositMinimumIdr: plan.depositMinimumIdr,
                orderFeeIdr: plan.orderFeeIdr,
                monthlyPriceIdr: plan.monthlyPriceIdr,
                depositMinimumAud: plan.depositMinimumAud,
                orderFeeAud: plan.orderFeeAud,
                monthlyPriceAud: plan.monthlyPriceAud,
                bankNameIdr: plan.bankNameIdr || '',
                bankAccountIdr: plan.bankAccountIdr || '',
                bankAccountNameIdr: plan.bankAccountNameIdr || '',
                bankNameAud: plan.bankNameAud || '',
                bankAccountAud: plan.bankAccountAud || '',
                bankAccountNameAud: plan.bankAccountNameAud || '',
                influencerFirstCommissionPercent: plan.influencerFirstCommissionPercent || 10,
                influencerRecurringCommissionPercent: plan.influencerRecurringCommissionPercent || 5,
            });
        }
    }, [plan]);

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async () => {
        if (!plan) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/admin/subscription-plans', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: plan.id,
                    ...formData,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update');
            }

            showSuccess(t("common.success"), t("admin.subscriptionSettings.success"));
            mutate('/api/admin/subscription-plans');
        } catch (err: unknown) {
            showError(t("common.error"), err instanceof Error ? err.message : t("admin.subscriptionSettings.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6" />
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle={t("admin.subscriptionSettings.title")} />

            <div className="max-w-3xl">
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('pricing')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'pricing'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        {t("admin.subscriptionSettings.tabs.pricing")}
                    </button>
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'bank'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        {t("admin.subscriptionSettings.tabs.bank")}
                    </button>
                    <button
                        onClick={() => setActiveTab('referral')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'referral'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        Referral Commission
                    </button>
                </div>

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            {t("admin.subscriptionSettings.tabs.pricing")}
                        </h2>

                        {/* Trial Days */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t("admin.subscriptionSettings.trialDays")}
                            </label>
                            <input
                                type="number"
                                value={formData.trialDays}
                                onChange={(e) => handleChange('trialDays', Number(e.target.value))}
                                min={1}
                                max={365}
                                className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>

                        {/* IDR Pricing */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    IDR
                                </span>
                                {t("admin.subscriptionSettings.idr.subtitle")}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.minimumDeposit")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                        <input
                                            type="number"
                                            value={formData.depositMinimumIdr}
                                            onChange={(e) => handleChange('depositMinimumIdr', Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.orderFee")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                        <input
                                            type="number"
                                            value={formData.orderFeeIdr}
                                            onChange={(e) => handleChange('orderFeeIdr', Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.monthlyPrice")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                        <input
                                            type="number"
                                            value={formData.monthlyPriceIdr}
                                            onChange={(e) => handleChange('monthlyPriceIdr', Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AUD Pricing */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    AUD
                                </span>
                                {t("admin.subscriptionSettings.aud.subtitle")}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.minimumDeposit")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                        <input
                                            type="number"
                                            value={formData.depositMinimumAud}
                                            onChange={(e) => handleChange('depositMinimumAud', Number(e.target.value))}
                                            step="0.01"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.orderFee")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                        <input
                                            type="number"
                                            value={formData.orderFeeAud}
                                            onChange={(e) => handleChange('orderFeeAud', Number(e.target.value))}
                                            step="0.01"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.monthlyPrice")}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                        <input
                                            type="number"
                                            value={formData.monthlyPriceAud}
                                            onChange={(e) => handleChange('monthlyPriceAud', Number(e.target.value))}
                                            step="0.01"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Bank Tab */}
                {activeTab === 'bank' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            {t("admin.subscriptionSettings.tabs.bank")}
                        </h2>

                        {/* IDR Bank */}
                        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                    IDR
                                </span>
                                {t("admin.subscriptionSettings.bank.idr.subtitle")}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.name")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankNameIdr}
                                        onChange={(e) => handleChange('bankNameIdr', e.target.value)}
                                        placeholder="BCA, Mandiri, BNI, dll"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.accountNumber")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankAccountIdr}
                                        onChange={(e) => handleChange('bankAccountIdr', e.target.value)}
                                        placeholder="1234567890"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.accountName")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankAccountNameIdr}
                                        onChange={(e) => handleChange('bankAccountNameIdr', e.target.value)}
                                        placeholder="PT Genfity Indonesia"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* AUD Bank */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                    AUD
                                </span>
                                {t("admin.subscriptionSettings.bank.aud.subtitle")}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.name")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankNameAud}
                                        onChange={(e) => handleChange('bankNameAud', e.target.value)}
                                        placeholder="Commonwealth, ANZ, NAB, etc."
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.bsb")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankAccountAud}
                                        onChange={(e) => handleChange('bankAccountAud', e.target.value)}
                                        placeholder="12-3456-7890123"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("admin.subscriptionSettings.bank.accountName")}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankAccountNameAud}
                                        onChange={(e) => handleChange('bankAccountNameAud', e.target.value)}
                                        placeholder="Genfity Pty Ltd"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Referral Tab */}
                {activeTab === 'referral' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Referral Commission Settings
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Configure the commission percentages for referral partners (influencers) when merchants make deposits or subscription payments.
                        </p>

                        {/* Commission Info Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-6">
                            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium text-orange-900 dark:text-orange-200">First Payment</span>
                                </div>
                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                    Commission when merchant makes their first deposit or subscription payment after signing up via referral.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="font-medium text-blue-900 dark:text-blue-200">Recurring Payment</span>
                                </div>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Commission for all subsequent payments made by the referred merchant (deposits, subscriptions, etc.).
                                </p>
                            </div>
                        </div>

                        {/* Commission Settings */}
                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    First Payment Commission (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.influencerFirstCommissionPercent}
                                        onChange={(e) => handleChange('influencerFirstCommissionPercent', Number(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: 10% for first payment
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Recurring Payment Commission (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.influencerRecurringCommissionPercent}
                                        onChange={(e) => handleChange('influencerRecurringCommissionPercent', Number(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: 5% for recurring payments
                                </p>
                            </div>
                        </div>

                        {/* Example Calculation */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 mb-6">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                Example Calculation
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <p>
                                    If a referred merchant deposits <strong>Rp 1,000,000</strong>:
                                </p>
                                <ul className="list-disc list-inside ml-2 space-y-1">
                                    <li>
                                        First payment: Referrer earns <strong>Rp {(1000000 * formData.influencerFirstCommissionPercent / 100).toLocaleString('id-ID')}</strong> ({formData.influencerFirstCommissionPercent}%)
                                    </li>
                                    <li>
                                        Recurring payment: Referrer earns <strong>Rp {(1000000 * formData.influencerRecurringCommissionPercent / 100).toLocaleString('id-ID')}</strong> ({formData.influencerRecurringCommissionPercent}%)
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
