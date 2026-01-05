"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useSWRConfig } from "swr";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaMoneyBillWave, FaWallet, FaPercent, FaSave } from "react-icons/fa";

interface SubscriptionPlan {
    id: string;
    // Financial Settings
    minDepositIdr: number;
    minDepositAud: number;
    minWithdrawalIdr: number;
    minWithdrawalAud: number;
    // Referral Fees (platform takes from referral commission)
    platformFirstReferralFeePercent: number;
    platformRecurringReferralFeePercent: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Financial Settings Page (Super Admin)
 * 
 * Configure platform-wide financial settings:
 * - Minimum deposit amounts (IDR/AUD)
 * - Minimum withdrawal amounts (IDR/AUD)
 * - Platform referral fee percentages
 */
export default function FinancialSettingsPage() {
    const { t } = useTranslation();
    const { success: showSuccess, error: showError } = useToast();
    const { mutate } = useSWRConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal' | 'fees'>('deposit');

    const {
        data: response,
        isLoading
    } = useSWRStatic<ApiResponse<SubscriptionPlan[]>>('/api/admin/subscription-plans');

    const plan = response?.data?.[0];

    const [formData, setFormData] = useState({
        minDepositIdr: 50000,
        minDepositAud: 10,
        minWithdrawalIdr: 100000,
        minWithdrawalAud: 20,
        platformFirstReferralFeePercent: 20,
        platformRecurringReferralFeePercent: 20,
    });

    // Load plan data into form
    useEffect(() => {
        if (plan) {
            setFormData({
                minDepositIdr: plan.minDepositIdr || 50000,
                minDepositAud: plan.minDepositAud || 10,
                minWithdrawalIdr: plan.minWithdrawalIdr || 100000,
                minWithdrawalAud: plan.minWithdrawalAud || 20,
                platformFirstReferralFeePercent: plan.platformFirstReferralFeePercent || 20,
                platformRecurringReferralFeePercent: plan.platformRecurringReferralFeePercent || 20,
            });
        }
    }, [plan]);

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: typeof value === 'string' ? Number(value) : value,
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

            showSuccess(t("common.success"), "Financial settings updated successfully");
            mutate('/api/admin/subscription-plans');
        } catch (err: unknown) {
            showError(t("common.error"), err instanceof Error ? err.message : "Failed to update financial settings");
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
            <PageBreadcrumb pageTitle={t("admin.nav.financialSettings")} />

            <div className="max-w-3xl">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() => setActiveTab('deposit')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                            ${activeTab === 'deposit'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaMoneyBillWave className="w-4 h-4" />
                        Minimum Deposit
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawal')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                            ${activeTab === 'withdrawal'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaWallet className="w-4 h-4" />
                        Minimum Withdrawal
                    </button>
                    <button
                        onClick={() => setActiveTab('fees')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                            ${activeTab === 'fees'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaPercent className="w-4 h-4" />
                        Platform Fees
                    </button>
                </div>

                {/* Deposit Tab */}
                {activeTab === 'deposit' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Minimum Deposit Settings
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Configure the minimum deposit amount for merchants in different currencies.
                        </p>

                        {/* Info Card */}
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                            <div className="flex items-start gap-3">
                                <FaMoneyBillWave className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-200">About Minimum Deposit</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        This is the minimum amount merchants must deposit to top up their balance.
                                        Set appropriate amounts based on local currency values.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Deposit Settings */}
                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Deposit (IDR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.minDepositIdr}
                                        onChange={(e) => handleChange('minDepositIdr', e.target.value)}
                                        min={0}
                                        step={1000}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: Rp 50,000
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Deposit (AUD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.minDepositAud}
                                        onChange={(e) => handleChange('minDepositAud', e.target.value)}
                                        min={0}
                                        step={1}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: A$ 10
                                </p>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 
                                    text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <FaSave className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Withdrawal Tab */}
                {activeTab === 'withdrawal' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Minimum Withdrawal Settings
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Configure the minimum withdrawal amount for merchants and influencers.
                        </p>

                        {/* Info Card */}
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-6">
                            <div className="flex items-start gap-3">
                                <FaWallet className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-900 dark:text-green-200">About Minimum Withdrawal</p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                        This is the minimum balance required to request a withdrawal.
                                        Setting appropriate minimums helps reduce processing overhead.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Withdrawal Settings */}
                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Withdrawal (IDR)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.minWithdrawalIdr}
                                        onChange={(e) => handleChange('minWithdrawalIdr', e.target.value)}
                                        min={0}
                                        step={10000}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: Rp 100,000
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimum Withdrawal (AUD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.minWithdrawalAud}
                                        onChange={(e) => handleChange('minWithdrawalAud', e.target.value)}
                                        min={0}
                                        step={5}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Recommended: A$ 20
                                </p>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 
                                    text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <FaSave className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Fees Tab */}
                {activeTab === 'fees' && (
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
                                        onChange={(e) => handleChange('platformFirstReferralFeePercent', e.target.value)}
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
                                        onChange={(e) => handleChange('platformRecurringReferralFeePercent', e.target.value)}
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

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 
                                    text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <FaSave className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
