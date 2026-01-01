"use client";

import React from "react";
import Link from "next/link";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubscriptionRequiredProps {
    children: React.ReactNode;
    /** If true, shows a blocking overlay instead of replacing content */
    showOverlay?: boolean;
    /** Custom message to show when subscription is required */
    message?: string;
}

/**
 * Subscription Required Guard Component
 * 
 * Wraps content that requires an active subscription.
 * Shows a subscription required message when subscription is suspended/expired.
 * 
 * @example
 * <SubscriptionRequired>
 *   <MerchantSettingsForm />
 * </SubscriptionRequired>
 */
export default function SubscriptionRequired({
    children,
    showOverlay = false,
    message,
}: SubscriptionRequiredProps) {
    const { t } = useTranslation();
    const { isLoading, isSuspended, hasNoSubscription, subscriptionType, suspendReason } = useSubscriptionStatus();

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    // Active subscription - show content
    if (!isSuspended) {
        return <>{children}</>;
    }

    // Get appropriate message
    const getMessage = () => {
        if (message) return message;
        if (hasNoSubscription) return t("subscription.alert.noSubscription");
        switch (subscriptionType) {
            case 'TRIAL':
                return t("subscription.alert.trialExpired");
            case 'DEPOSIT':
                return t("subscription.alert.depositDepleted");
            case 'MONTHLY':
                return t("subscription.alert.monthlyExpired");
            default:
                return suspendReason || t("subscription.alert.suspended");
        }
    };

    // Suspended subscription - show overlay or replace content
    const subscriptionMessage = (
        <div className={`${showOverlay ? 'absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm' : ''}`}>
            <div className="max-w-md mx-auto p-6 text-center">
                {/* Warning Icon */}
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t("subscription.required.title")}
                </h2>

                {/* Message */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {getMessage()} {t("subscription.required.message")}
                </p>

                {/* Action Button */}
                <Link
                    href="/admin/dashboard/subscription/topup"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 
                        bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    {t("subscription.alert.renewButton")}
                </Link>

                {/* View Subscription Details */}
                <Link
                    href="/admin/dashboard/subscription"
                    className="block mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400"
                >
                    {t("subscription.required.viewDetails")} →
                </Link>
            </div>
        </div>
    );

    if (showOverlay) {
        return (
            <div className="relative">
                {children}
                {subscriptionMessage}
            </div>
        );
    }

    return subscriptionMessage;
}
