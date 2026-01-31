"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { STAFF_PERMISSIONS } from "@/lib/constants/permissions";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { clearAdminAuth } from "@/lib/utils/adminAuth";
import { clearDriverAuth } from "@/lib/utils/driverAuth";
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import ConfirmDialog from "@/components/modals/ConfirmDialog";

interface SuspendedAlertProps {
    reason?: string;
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
    graceDaysRemaining?: number;
}

/**
 * Suspended Alert Component
 * 
 * Full-width banner at top of dashboard when subscription is suspended
 * Not dismissible - requires action
 */
export default function SuspendedAlert({ reason, type, graceDaysRemaining }: SuspendedAlertProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const { hasPermission, user } = useAuth();
    const { merchant } = useMerchant();
    const { showError } = useToast();
    const [isDismissed, setIsDismissed] = useState(false);
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const canManageSubscription = hasPermission(STAFF_PERMISSIONS.SUBSCRIPTION);
    const isMerchantStaff = user?.role === 'MERCHANT_STAFF';

    if (isDismissed) {
        return null;
    }

    const executeLeaveMerchant = async () => {
        if (!merchant?.id || isLeaving) return;
        setIsLeaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                clearAdminAuth();
                clearDriverAuth();
                router.push('/admin/login');
                return;
            }

            const response = await fetch(buildOrderApiUrl('/api/merchant/staff/leave'), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ merchantId: merchant.id }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || t("admin.staff.leaveMerchantError"));
            }

            clearAdminAuth();
            clearDriverAuth();
            router.push('/admin/login');
        } catch (err) {
            showError(err instanceof Error ? err.message : t("admin.staff.leaveMerchantError"), t("common.error"));
        } finally {
            setIsLeaving(false);
        }
    };

    // If in grace period, show grace period warning instead
    if (graceDaysRemaining !== undefined && graceDaysRemaining > 0) {
        return (
            <div className="fixed top-14 md:top-16 left-0 right-0 z-60 border-b-2 border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800/50 dark:bg-brand-900/95 shadow-lg">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                            <svg className="w-6 h-6 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-brand-800 dark:text-brand-200">
                                {t("subscription.grace.title")}
                            </h3>
                            <p className="text-sm text-brand-700 dark:text-brand-300 mt-1">
                                {graceDaysRemaining === 1 
                                    ? t("subscription.grace.lastDay")
                                    : t("subscription.grace.message").replace("{days}", String(graceDaysRemaining))
                                }
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                        {canManageSubscription ? (
                            <Link
                                href="/admin/dashboard/subscription/topup"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 
                                    bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors
                                    text-sm sm:text-base"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {t("subscription.grace.renewNow")}
                            </Link>
                        ) : (
                            <div className="text-sm text-brand-700 dark:text-brand-300">
                                {t("subscription.alert.contactOwner")}
                            </div>
                        )}
                        {isMerchantStaff && merchant?.id && (
                            <button
                                type="button"
                                onClick={() => setLeaveConfirmOpen(true)}
                                disabled={isLeaving}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 text-sm sm:text-base"
                            >
                                {isLeaving ? t("common.pleaseWait") : t("admin.staff.leaveMerchant")}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsDismissed(true)}
                            aria-label={t("common.close")}
                            title={t("common.close")}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-brand-200 bg-white text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/60 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const getMessage = () => {
        switch (type) {
            case 'NONE':
                return t("subscription.alert.noSubscription");
            case 'TRIAL':
                return t("subscription.alert.trialExpired");
            case 'DEPOSIT':
                return t("subscription.alert.depositDepleted");
            case 'MONTHLY':
                return t("subscription.alert.monthlyExpired");
            default:
                return reason || t("subscription.alert.suspended");
        }
    };

    return (
        <div className="fixed top-14 md:top-16 left-0 right-0 z-60 border-b-2 border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-900/95 shadow-lg">
            <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                    {/* Warning icon */}
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">
                            {t("subscription.alert.title")}
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {getMessage()} {t("subscription.alert.renewCta")}
                        </p>
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    {canManageSubscription ? (
                        <Link
                            href="/admin/dashboard/subscription/topup"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 
                                bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors
                                text-sm sm:text-base"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            {t("subscription.alert.renewButton")}
                        </Link>
                    ) : (
                        <div className="text-sm text-red-700 dark:text-red-300">
                            {t("subscription.alert.contactOwner")}
                        </div>
                    )}
                    {isMerchantStaff && merchant?.id && (
                        <button
                            type="button"
                            onClick={() => setLeaveConfirmOpen(true)}
                            disabled={isLeaving}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 text-sm sm:text-base"
                        >
                            {isLeaving ? t("common.pleaseWait") : t("admin.staff.leaveMerchant")}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsDismissed(true)}
                        aria-label={t("common.close")}
                        title={t("common.close")}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/60 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            <ConfirmDialog
                isOpen={leaveConfirmOpen}
                title={t("admin.staff.leaveMerchant")}
                message={t("admin.staff.leaveMerchantConfirm")}
                confirmText={t("admin.staff.leaveMerchant")}
                cancelText={t("common.cancel")}
                variant="warning"
                onConfirm={() => {
                    setLeaveConfirmOpen(false);
                    executeLeaveMerchant();
                }}
                onCancel={() => setLeaveConfirmOpen(false)}
            />
        </div>
    );
}
