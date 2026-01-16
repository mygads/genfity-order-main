"use client";

import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ToastContainer from "@/components/ui/ToastContainer";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useSWRConfig } from "swr";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaDollarSign, FaSyncAlt, FaMoneyBillWave } from "react-icons/fa";

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
    minDepositIdr: number;
    // AUD
    depositMinimumAud: number;
    orderFeeAud: number;
    monthlyPriceAud: number;
    minDepositAud: number;
    completedOrderEmailFeeIdr?: number;
    completedOrderEmailFeeAud?: number;
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
    const { toasts, success: showSuccess, error: showError } = useToast();
    const { mutate } = useSWRConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'pricing' | 'bank' | 'deposit' | 'email'>('pricing');

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
        minDepositIdr: 50000,
        // AUD
        depositMinimumAud: 15,
        orderFeeAud: 0.04,
        monthlyPriceAud: 15,
        minDepositAud: 10,
        completedOrderEmailFeeIdr: 0,
        completedOrderEmailFeeAud: 0,
        // Bank IDR
        bankNameIdr: '',
        bankAccountIdr: '',
        bankAccountNameIdr: '',
        // Bank AUD
        bankNameAud: '',
        bankAccountAud: '',
        bankAccountNameAud: '',
    });

    // Load plan data into form
    useEffect(() => {
        if (plan) {
            setFormData({
                trialDays: plan.trialDays,
                depositMinimumIdr: plan.depositMinimumIdr,
                orderFeeIdr: plan.orderFeeIdr,
                monthlyPriceIdr: plan.monthlyPriceIdr,
                completedOrderEmailFeeIdr: plan.completedOrderEmailFeeIdr ?? 0,
                minDepositIdr: plan.minDepositIdr || 50000,
                depositMinimumAud: plan.depositMinimumAud,
                orderFeeAud: plan.orderFeeAud,
                monthlyPriceAud: plan.monthlyPriceAud,
                completedOrderEmailFeeAud: plan.completedOrderEmailFeeAud ?? 0,
                minDepositAud: plan.minDepositAud || 10,
                bankNameIdr: plan.bankNameIdr || '',
                bankAccountIdr: plan.bankAccountIdr || '',
                bankAccountNameIdr: plan.bankAccountNameIdr || '',
                bankNameAud: plan.bankNameAud || '',
                bankAccountAud: plan.bankAccountAud || '',
                bankAccountNameAud: plan.bankAccountNameAud || '',
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

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
                <div className="mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        {t("admin.subscriptionSettings.title")}
                    </h3>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('pricing')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'pricing'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaDollarSign className="w-4 h-4" />
                        {t("admin.subscriptionSettings.tabs.pricing")}
                    </button>
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'bank'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaSyncAlt className="w-4 h-4" />
                        {t("admin.subscriptionSettings.tabs.bank")}
                    </button>
                    <button
                        onClick={() => setActiveTab('deposit')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'deposit'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaMoneyBillWave className="w-4 h-4" />
                        {t("admin.subscriptionSettings.tabs.deposit")}
                    </button>
                    <button
                        onClick={() => setActiveTab('email')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
              ${activeTab === 'email'
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        <FaMoneyBillWave className="w-4 h-4" />
                        {t("admin.subscriptionSettings.tabs.emailFee")}
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
                  focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 transition-colors"
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
                bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Minimum Deposit Tab */}
                {activeTab === 'deposit' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            {t("admin.subscriptionSettings.tabs.deposit")}
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("admin.subscriptionSettings.depositIdr")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.minDepositIdr}
                                        onChange={(e) => handleChange('minDepositIdr', Number(e.target.value))}
                                        min={0}
                                        step={1000}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("admin.subscriptionSettings.depositAud")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.minDepositAud}
                                        onChange={(e) => handleChange('minDepositAud', Number(e.target.value))}
                                        min={0}
                                        step={1}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}

                {/* Email Fee Tab */}
                {activeTab === 'email' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            {t("admin.subscriptionSettings.tabs.emailFee")}
                        </h2>

                        <div className="grid gap-6 sm:grid-cols-2 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("admin.subscriptionSettings.emailFeeIdr")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                                    <input
                                        type="number"
                                        value={formData.completedOrderEmailFeeIdr}
                                        onChange={(e) => handleChange('completedOrderEmailFeeIdr', Number(e.target.value))}
                                        min={0}
                                        step={100}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t("admin.subscriptionSettings.emailFeeAud")}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">A$</span>
                                    <input
                                        type="number"
                                        value={formData.completedOrderEmailFeeAud}
                                        onChange={(e) => handleChange('completedOrderEmailFeeAud', Number(e.target.value))}
                                        min={0}
                                        step={0.01}
                                        className="w-full px-4 py-2 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 
                                            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                            focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg font-medium text-white
                bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 transition-colors"
                        >
                            {isSubmitting ? t("admin.subscriptionSettings.saving") : t("admin.subscriptionSettings.saveChanges")}
                        </button>
                    </div>
                )}

            </div>

            <ToastContainer toasts={toasts} />
        </div>
    );
}
