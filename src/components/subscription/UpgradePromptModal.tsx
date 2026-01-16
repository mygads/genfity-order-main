"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CloseIcon } from "@/icons";

interface PricingData {
    deposit: {
        minimumDeposit: number;
        orderFee: number;
    };
    monthly: {
        price: number;
    };
    currency: string;
}

interface UpgradePromptModalProps {
    daysRemaining: number;
    onClose: () => void;
    onDontShowAgain?: () => void;
}

/**
 * Upgrade Prompt Modal Component
 * 
 * Shows when trial is ending (7 days or less) to prompt merchant to select a plan.
 * Displays deposit vs monthly options with pricing from subscription settings.
 */
export default function UpgradePromptModal({
    daysRemaining,
    onClose,
    onDontShowAgain,
}: UpgradePromptModalProps) {
    const { t } = useTranslation();
    const [pricing, setPricing] = useState<PricingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<'DEPOSIT' | 'MONTHLY' | null>(null);

    // Fetch pricing data
    const fetchPricing = useCallback(async () => {
        try {
            const token = localStorage.getItem("accessToken");
            if (!token) return;

            // Fetch merchant profile to get currency
            const profileRes = await fetch("/api/merchant/profile", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileRes.json();
            const currency = profileData.data?.merchant?.currency || "AUD";

            // Fetch subscription plans
            const plansRes = await fetch("/api/merchant/subscription/plans", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const plansData = await plansRes.json();

            if (plansData.success && plansData.data) {
                const plans = plansData.data;
                const currencyKey = currency.toLowerCase();
                
                setPricing({
                    deposit: {
                        minimumDeposit: plans.deposit?.[currencyKey]?.minimumDeposit || 0,
                        orderFee: plans.deposit?.[currencyKey]?.orderFee || 0,
                    },
                    monthly: {
                        price: plans.monthly?.[currencyKey]?.price || 0,
                    },
                    currency,
                });
            }
        } catch (error) {
            console.error("Error fetching pricing:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPricing();
    }, [fetchPricing]);

    const formatCurrency = (amount: number) => {
        if (!pricing) return "";
        return pricing.currency === "AUD"
            ? `A$${amount.toFixed(2)}`
            : `Rp ${amount.toLocaleString("id-ID")}`;
    };

    const handleDontShowAgain = () => {
        localStorage.setItem("upgrade-prompt-dismissed", "true");
        onDontShowAgain?.();
        onClose();
    };

    const urgencyClass = daysRemaining <= 3 
        ? "text-red-600 dark:text-red-400" 
        : daysRemaining <= 7 
            ? "text-brand-600 dark:text-brand-400"
            : "text-brand-600 dark:text-brand-400";

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative z-[1000] w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
                {/* Header */}
                <div className="relative border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {t("subscription.upgrade.title")}
                        </h2>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {t("subscription.upgrade.subtitle")}
                        </p>
                        <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1 ${
                            daysRemaining <= 3 ? "bg-red-100 dark:bg-red-900/30" :
                            daysRemaining <= 7 ? "bg-brand-100 dark:bg-brand-900/30" :
                            "bg-brand-100 dark:bg-brand-900/30"
                        }`}>
                            <svg className={`w-4 h-4 ${urgencyClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className={`text-sm font-medium ${urgencyClass}`}>
                                {t("subscription.upgrade.trialEndsIn").replace("{days}", String(daysRemaining))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Plans */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Deposit Plan */}
                            <div
                                onClick={() => setSelectedPlan('DEPOSIT')}
                                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${
                                    selectedPlan === 'DEPOSIT'
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                        : "border-gray-200 hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-600"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
                                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t("subscription.upgrade.deposit.title")}
                                        </h3>
                                    </div>
                                    {selectedPlan === 'DEPOSIT' && (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    {t("subscription.upgrade.deposit.description")}
                                </p>

                                <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                    <div className="text-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t("subscription.upgrade.deposit.fee")}</span>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(pricing?.deposit.orderFee || 0)}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t(`subscription.upgrade.deposit.benefits.${i}` as keyof typeof t)}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Monthly Plan */}
                            <div
                                onClick={() => setSelectedPlan('MONTHLY')}
                                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${
                                    selectedPlan === 'MONTHLY'
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                        : "border-gray-200 hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-600"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t("subscription.upgrade.monthly.title")}
                                        </h3>
                                    </div>
                                    {selectedPlan === 'MONTHLY' && (
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    {t("subscription.upgrade.monthly.description")}
                                </p>

                                <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                                    <div className="text-center">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t("subscription.upgrade.monthly.price")}</span>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(pricing?.monthly.price || 0)}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {t(`subscription.upgrade.monthly.benefits.${i}` as keyof typeof t)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            onClick={handleDontShowAgain}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                            {t("subscription.upgrade.dontShowAgain")}
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            >
                                {t("subscription.upgrade.later")}
                            </button>
                            <Link
                                href={`/admin/dashboard/subscription/topup${selectedPlan ? `?plan=${selectedPlan.toLowerCase()}` : ''}`}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                                    selectedPlan 
                                        ? "bg-brand-500 hover:bg-brand-600"
                                        : "bg-gray-400 cursor-not-allowed"
                                }`}
                                onClick={(e) => {
                                    if (!selectedPlan) e.preventDefault();
                                }}
                            >
                                {t("subscription.upgrade.selectPlan")}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
