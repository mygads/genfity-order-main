'use client';

/**
 * Subscription Alerts Component
 * 
 * Wrapper component that displays:
 * - SuspendedAlert fixed at top for suspended merchants (full width warning, not scrollable)
 * - TrialBanner at bottom-right for active trial merchants
 * - UpgradePromptModal when trial is ending soon (7 days or less)
 * - Grace period warnings before full suspension
 * 
 * Shows for MERCHANT_OWNER and MERCHANT_STAFF roles.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import TrialBanner from '@/components/subscription/TrialBanner';
import SuspendedAlert from '@/components/subscription/SuspendedAlert';
import UpgradePromptModal from '@/components/subscription/UpgradePromptModal';

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
        status: string;
        isValid: boolean;
        daysRemaining: number | null;
        suspendReason: string | null;
        graceDaysRemaining?: number | null;
        inGracePeriod?: boolean;
        pendingSuspension?: boolean;
        pendingSuspensionReason?: 'DEPOSIT_DEPLETED' | 'MONTHLY_EXPIRED' | 'TRIAL_EXPIRED' | null;
    };
    balance?: {
        amount: number;
        currency: string;
    } | null;
}

/**
 * SubscriptionAlerts
 * 
 * Displays subscription alerts based on merchant's subscription status:
 * - For MERCHANT_OWNER: Fixed banner at top when suspended, upgrade modal when trial ending
 * - For MERCHANT_STAFF: Same fixed banner at top when suspended
 */
export default function SubscriptionAlerts() {
    const { user, hasPermission } = useAuth();
    const { t } = useTranslation();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [modalDismissed, setModalDismissed] = useState(false);
    const [pendingDismissed, setPendingDismissed] = useState(false);

    // Show for merchant owners and staff
    const isMerchantOwner = user?.role === 'MERCHANT_OWNER';
    const isMerchantStaff = user?.role === 'MERCHANT_STAFF';
    const shouldFetch = isMerchantOwner || isMerchantStaff;
    const canManageSubscription = hasPermission(STAFF_PERMISSIONS.SUBSCRIPTION);

    const { data, isLoading, error } = useSWRWithAuth<{ success: boolean; data: SubscriptionData }>(
        shouldFetch ? '/api/merchant/subscription' : null,
        {
            revalidateOnFocus: false,
            refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        }
    );

    // Check if upgrade modal was dismissed
    useEffect(() => {
        const dismissed = localStorage.getItem('upgrade-prompt-dismissed');
        if (dismissed) {
            setModalDismissed(true);
        }
    }, []);

    // Show upgrade modal when trial is ending (only for owners)
    useEffect(() => {
        if (!data?.success || !isMerchantOwner || modalDismissed) return;

        const { subscription } = data.data;
        
        // Show modal if on trial with 7 days or less remaining
        if (
            subscription.type === 'TRIAL' && 
            subscription.status === 'ACTIVE' &&
            subscription.daysRemaining !== null && 
            subscription.daysRemaining <= 7 &&
            subscription.daysRemaining > 0
        ) {
            // Check if modal was shown this session
            const shownThisSession = sessionStorage.getItem('upgrade-modal-shown');
            if (!shownThisSession) {
                setShowUpgradeModal(true);
                sessionStorage.setItem('upgrade-modal-shown', 'true');
            }
        }
    }, [data, isMerchantOwner, modalDismissed]);

    useEffect(() => {
        if (!data?.success) return;
        if (!data.data.subscription.pendingSuspension) {
            setPendingDismissed(false);
        }
    }, [data]);

    // Don't show anything while loading or for non-merchants
    if (!shouldFetch || isLoading) {
        return null;
    }

    // Handle error or no data
    if (error || !data?.success) {
        return null;
    }

    const { subscription } = data.data;

    // Show SuspendedAlert if suspended or no subscription
    // But first check if in grace period
    if (subscription.status === 'SUSPENDED' || subscription.type === 'NONE') {
        return (
            <>
                <SuspendedAlert
                    type={subscription.type === 'NONE' ? 'MONTHLY' : subscription.type}
                    reason={subscription.suspendReason || (subscription.type === 'NONE' ? 'No active subscription' : undefined)}
                    graceDaysRemaining={subscription.graceDaysRemaining ?? undefined}
                />
                {showUpgradeModal && subscription.daysRemaining !== null && isMerchantOwner && (
                    <UpgradePromptModal
                        daysRemaining={subscription.daysRemaining}
                        onClose={() => setShowUpgradeModal(false)}
                        onDontShowAgain={() => setModalDismissed(true)}
                    />
                )}
            </>
        );
    }

    // Show grace period warning if in grace period
    if (subscription.inGracePeriod && subscription.graceDaysRemaining != null && subscription.graceDaysRemaining > 0) {
        return (
            <SuspendedAlert
                type={subscription.type}
                graceDaysRemaining={subscription.graceDaysRemaining ?? undefined}
            />
        );
    }

    // Show pending suspension warning for expired monthly or depleted deposit (nightly suspend)
    if (subscription.pendingSuspension && !pendingDismissed) {
        const pendingMessage = subscription.pendingSuspensionReason === 'DEPOSIT_DEPLETED'
            ? t('subscription.alert.pendingSuspensionDeposit')
            : subscription.pendingSuspensionReason === 'TRIAL_EXPIRED'
                ? t('subscription.alert.pendingSuspensionTrial')
                : t('subscription.alert.pendingSuspensionMonthly');

        return (
            <div className="fixed top-14 md:top-16 left-0 right-0 z-60 border-b-2 border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/95 shadow-lg">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                                {t('subscription.alert.pendingSuspensionTitle')}
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                {pendingMessage}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                        {canManageSubscription ? (
                            <Link
                                href="/admin/dashboard/subscription/topup"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 
                                    bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors
                                    text-sm sm:text-base"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {t('subscription.alert.renewButton')}
                            </Link>
                        ) : (
                            <div className="text-sm text-amber-700 dark:text-amber-300">
                                {t('subscription.alert.contactOwner')}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setPendingDismissed(true)}
                            className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white/80 p-2 text-amber-700 hover:bg-white dark:border-amber-700/40 dark:bg-amber-900/40 dark:text-amber-200"
                            aria-label={t('common.close')}
                        >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show TrialBanner and possibly UpgradeModal if on active trial
    if (subscription.type === 'TRIAL' && subscription.daysRemaining !== null && subscription.daysRemaining > 0) {
        return (
            <>
                <TrialBanner daysRemaining={subscription.daysRemaining} />
                {showUpgradeModal && isMerchantOwner && (
                    <UpgradePromptModal
                        daysRemaining={subscription.daysRemaining}
                        onClose={() => setShowUpgradeModal(false)}
                        onDontShowAgain={() => setModalDismissed(true)}
                    />
                )}
            </>
        );
    }

    return null;
}
