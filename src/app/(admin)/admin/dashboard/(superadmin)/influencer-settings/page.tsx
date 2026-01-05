"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useSWRConfig } from "swr";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaDollarSign, FaSyncAlt, FaMoneyBillWave, FaPercent, FaWallet } from "react-icons/fa";

interface SubscriptionPlan {
    id: string;
    // Influencer Settings
    influencerFirstCommissionPercent: number;
    influencerRecurringCommissionPercent: number;
    influencerMinWithdrawalIdr: number;
    influencerMinWithdrawalAud: number;
    // Merchant Withdrawal
    minWithdrawalIdr: number;
    minWithdrawalAud: number;
    // Platform Fees (taken from influencer commission)
    platformFirstReferralFeePercent: number;
    platformRecurringReferralFeePercent: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Influencer Settings Page (Super Admin)
 * 
 * Configure influencer commission and withdrawal settings
 */
export default function InfluencerSettingsPage() {
    const { t } = useTranslation();
    const { success: showSuccess, error: showError } = useToast();
    const { mutate } = useSWRConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'commission' | 'withdrawal' | 'platformFees' | 'merchantWithdrawal'>('commission');

    const {
        data: response,
        isLoading
    } = useSWRStatic<ApiResponse<SubscriptionPlan[]>>('/api/admin/subscription-plans');

    const plan = response?.data?.[0];

    const [formData, setFormData] = useState({
        influencerFirstCommissionPercent: 10,
        influencerRecurringCommissionPercent: 5,
        influencerMinWithdrawalIdr: 100000,
        influencerMinWithdrawalAud: 20,
        // Merchant Withdrawal
        minWithdrawalIdr: 100000,
        minWithdrawalAud: 20,
        // Platform Fees
        platformFirstReferralFeePercent: 20,
        platformRecurringReferralFeePercent: 20,
    });

    // Load plan data into form
    useEffect(() => {
        if (plan) {
            setFormData({
                influencerFirstCommissionPercent: plan.influencerFirstCommissionPercent || 10,
                influencerRecurringCommissionPercent: plan.influencerRecurringCommissionPercent || 5,
                influencerMinWithdrawalIdr: plan.influencerMinWithdrawalIdr || 100000,
                influencerMinWithdrawalAud: plan.influencerMinWithdrawalAud || 20,
                // Merchant Withdrawal
                minWithdrawalIdr: plan.minWithdrawalIdr || 100000,
                minWithdrawalAud: plan.minWithdrawalAud || 20,
                // Platform Fees
                platformFirstReferralFeePercent: plan.platformFirstReferralFeePercent || 20,
                platformRecurringReferralFeePercent: plan.platformRecurringReferralFeePercent || 20,
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

            showSuccess(t("common.success"), t("admin.influencerSettings.success"));
            mutate('/api/admin/subscription-plans');
        } catch (err: unknown) {
            showError(t("common.error"), err instanceof Error ? err.message : t("admin.influencerSettings.error"));
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
            <PageBreadcrumb pageTitle={t("admin.influencerSettings.title")} />

            <div className="max-w-3xl">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setActiveTab('commission')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'commission'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaDollarSign className="w-4 h-4" />
                        {t("admin.influencerSettings.commission.title")}
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawal')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'withdrawal'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaMoneyBillWave className="w-4 h-4" />
                        {t("admin.influencerSettings.withdrawal.title")}
                    </button>
                    <button
                        onClick={() => setActiveTab('platformFees')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'platformFees'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaPercent className="w-4 h-4" />
                        Platform Fees
                    </button>
                    <button
                        onClick={() => setActiveTab('merchantWithdrawal')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'merchantWithdrawal'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaWallet className="w-4 h-4" />
                        Merchant Withdrawal
                    </button>
                </div>

                {/* Commissioner Tab */}
                {activeTab === 'commission' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {t("admin.influencerSettings.commission.title")}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            {t("admin.influencerSettings.commission.subtitle")}
                        </p>

                        {/* Commission Info Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-6">
                            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaDollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    <span className="font-medium text-orange-900 dark:text-orange-200">First Payment</span>
                                </div>
                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                    Commission when merchant makes their first deposit or subscription payment after signing up via referral.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaSyncAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                                    {t("admin.influencerSettings.commission.firstPayment")}
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
                                    Recommended: 10%
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("admin.influencerSettings.commission.recurringPayment")}
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
                                    Recommended: 5%
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.influencerSettings.saving") : t("admin.influencerSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Withdrawal Tab */}
                {activeTab === 'withdrawal' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {t("admin.influencerSettings.withdrawal.title")}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            {t("admin.influencerSettings.withdrawal.subtitle")}
                        </p>

                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            {/* IDR Minimum */}
                            <div>
                                <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                        IDR
                                    </span>
                                    Minimum Withdrawal
                                </h3>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.influencerMinWithdrawalIdr}
                                        onChange={(e) => handleChange('influencerMinWithdrawalIdr', Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Default: Rp 100.000
                                </p>
                            </div>

                            {/* AUD Minimum */}
                            <div>
                                <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                    <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                        AUD
                                    </span>
                                    Minimum Withdrawal
                                </h3>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.influencerMinWithdrawalAud}
                                        onChange={(e) => handleChange('influencerMinWithdrawalAud', Number(e.target.value))}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Default: A$ 20.00
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.influencerSettings.saving") : t("admin.influencerSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Platform Fees Tab */}
                {activeTab === 'platformFees' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Platform Referral Fees
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Configure the percentage the platform takes from influencer referral commissions.
                        </p>

                        {/* Info Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 mb-6">
                            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaPercent className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    <span className="font-medium text-orange-900 dark:text-orange-200">First Payment Fee</span>
                                </div>
                                <p className="text-xs text-orange-700 dark:text-orange-300">
                                    Platform fee taken from influencer&apos;s first payment commission.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaPercent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    <span className="font-medium text-purple-900 dark:text-purple-200">Recurring Fee</span>
                                </div>
                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                    Platform fee taken from influencer&apos;s recurring payment commissions.
                                </p>
                            </div>
                        </div>

                        {/* Fee Settings */}
                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    First Payment Fee (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.platformFirstReferralFeePercent}
                                        onChange={(e) => handleChange('platformFirstReferralFeePercent', Number(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={1}
                                        className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: 20%
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Recurring Payment Fee (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={formData.platformRecurringReferralFeePercent}
                                        onChange={(e) => handleChange('platformRecurringReferralFeePercent', Number(e.target.value))}
                                        min={0}
                                        max={100}
                                        step={1}
                                        className="w-full px-4 py-2 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: 20%
                                </p>
                            </div>
                        </div>

                        {/* Example Calculation */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 mb-6">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Example Calculation
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                If influencer earns A$10 commission and platform fee is {formData.platformFirstReferralFeePercent}%:
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-sm">
                                <div className="text-gray-900 dark:text-white">
                                    <span className="text-gray-500">Influencer gets:</span> A${(10 * (100 - formData.platformFirstReferralFeePercent) / 100).toFixed(2)}
                                </div>
                                <div className="text-gray-900 dark:text-white">
                                    <span className="text-gray-500">Platform gets:</span> A${(10 * formData.platformFirstReferralFeePercent / 100).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.influencerSettings.saving") : t("admin.influencerSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Merchant Withdrawal Tab */}
                {activeTab === 'merchantWithdrawal' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Merchant Minimum Withdrawal
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Configure the minimum withdrawal amount for merchants (not influencers).
                        </p>

                        {/* Info Card */}
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-6">
                            <div className="flex items-start gap-3">
                                <FaWallet className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-900 dark:text-green-200">About Merchant Withdrawal</p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                        This is the minimum balance required for merchants to request a withdrawal.
                                        Setting appropriate minimums helps reduce processing overhead.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            {/* IDR Minimum */}
                            <div>
                                <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                    <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                        IDR
                                    </span>
                                    Minimum Withdrawal
                                </h3>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.minWithdrawalIdr}
                                        onChange={(e) => handleChange('minWithdrawalIdr', Number(e.target.value))}
                                        min={0}
                                        step={10000}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: Rp 100,000
                                </p>
                            </div>

                            {/* AUD Minimum */}
                            <div>
                                <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-4">
                                    <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                                        AUD
                                    </span>
                                    Minimum Withdrawal
                                </h3>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.minWithdrawalAud}
                                        onChange={(e) => handleChange('minWithdrawalAud', Number(e.target.value))}
                                        min={0}
                                        step={5}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: A$ 20
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.influencerSettings.saving") : t("admin.influencerSettings.saveChanges")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
